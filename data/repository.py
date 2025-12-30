
import streamlit as st
import pandas as pd
import os
import json
from supabase import create_client, Client
from config.settings import settings
from utils.logger import logger
from data.models import SCHEMAS
from datetime import datetime, timedelta

# ============================================================
# Local Storage Fallback Settings
# ============================================================
LOCAL_STORAGE_DIR = "data/local_storage"
if not os.path.exists(LOCAL_STORAGE_DIR):
    os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

def _get_local_path(table_name: str) -> str:
    return os.path.join(LOCAL_STORAGE_DIR, f"{table_name}.json")

def _load_local_fallback(table_name: str) -> pd.DataFrame:
    """Load data from local JSON file."""
    path = _get_local_path(table_name)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return pd.DataFrame(data)
        except Exception as e:
            logger.error(f"Failed to load local fallback for {table_name}: {e}")
    
    # Return empty with schema if possible
    cols = SCHEMAS.get(table_name, [])
    # Add ad-hoc schemas for new tables if needed
    if table_name == "Vehicle_Parts_Current":
        cols = ['Vehicle_Plate', 'Position', 'Part_Type', 'Serial_No', 'Brand', 'Install_Date', 'Install_Odometer', 'Remark', 'Ticket_ID', 'Price']
    elif table_name == "Parts_Usage_History":
        cols = ['Vehicle_Plate', 'Position', 'Part_Type', 'Serial_No', 'Total_Distance_KM', 'Total_Days', 'Removal_Reason', 'Ticket_ID', 'Price']
    elif table_name == "Fuel_Logs":
        cols = ['Log_ID', 'Date_Time', 'Vehicle_Plate', 'Driver_ID', 'Odometer', 'Liters', 'Price_Total', 'Payment_Type', 'Vendor_ID', 'Slip_Image']
    elif table_name == "Master_Drivers":
        cols = ['Driver_ID', 'Driver_Name', 'Vehicle_Plate', 'Mobile_No', 'Active_Status', 'Bank_Name', 'Bank_Account']
        
    return pd.DataFrame(columns=cols)

def _save_local_fallback(table_name: str, df: pd.DataFrame):
    """Save data to local JSON file."""
    try:
        path = _get_local_path(table_name)
        # Convert to dict, handling timestamps
        data = df.to_dict(orient='records')
        
        # Serialize with date handling
        def json_serial(obj):
            if isinstance(obj, (datetime, pd.Timestamp)):
                return obj.isoformat()
            if pd.isna(obj): return None
            return obj
            
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, default=json_serial, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save local fallback for {table_name}: {e}")
        return False


# ============================================================
# Cache TTL (Time To Live) - Data จะ cache ไว้ 5 นาที
# ============================================================
CACHE_TTL_SECONDS = 60  # 1 minute (Reduced from 5 mins)


# ============================================================
# Cached fetch function (outside class for st.cache_data)
# ============================================================
@st.cache_data(ttl=CACHE_TTL_SECONDS, show_spinner=False)
def _cached_fetch(table_name: str, branch_id: str = "ALL", filters: dict = None, limit: int = None, date_column: str = None, days_back: int = None, columns: str = "*") -> pd.DataFrame:
    """
    Cached fetch from Supabase using st.cache_data.
    Supports filtering and limiting to optimize performance.
    """
    try:
        from services.supabase_client import get_supabase_client
        client = get_supabase_client()
        
        # Optimize selection: select specific columns if needed, else *
        query = client.table(table_name).select(columns)
        # Apply branch filter if needed
        tables_with_branch = ["Jobs_Main", "Master_Drivers", "Master_Customers", "Fuel_Logs"]
        if branch_id not in ["ALL", "HEAD"] and table_name in tables_with_branch:
            query = query.eq("Branch_ID", branch_id)
        # Apply custom filters
        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)
        # Apply date filtering
        if date_column and days_back:
            cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
            query = query.gte(date_column, cutoff_date)

        # Apply limit using range to ensure correct row count
        if limit:
            query = query.range(0, limit - 1)
        response = query.execute()
        data = response.data
        if not data:
            cols = SCHEMAS.get(table_name, [])
            return pd.DataFrame(columns=cols)
        return pd.DataFrame(data)
        
    except Exception as e:
        logger.error(f"Cached Fetch Error ({table_name}): {e}")
        
        # Handle "Table not found" (PGRST205) -> Use Local Fallback
        if "PGRST205" in str(e) or "Could not find the table" in str(e):
             logger.info(f"Table '{table_name}' not found in DB. switching to local storage.")
             return _load_local_fallback(table_name)
                
        # Show specific error in UI (Admin friendly)
        if hasattr(st, "session_state"):
            if "PGRST205" not in str(e):
                st.error(f"❌ Error fetching '{table_name}': {str(e)}")
            
        cols = SCHEMAS.get(table_name, [])
        return pd.DataFrame(columns=cols)


def clear_cache_for_table(table_name: str):
    """Clear cache for a specific table."""
    _cached_fetch.clear()


def clear_all_cache():
    """Clear all cached data."""
    _cached_fetch.clear()


class Repository:
    _instance = None
    last_error = None # Track last error
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Repository, cls).__new__(cls)
            cls._instance.client = cls._init_supabase()
            cls._instance.last_error = None
        return cls._instance

    @staticmethod
    def _init_supabase() -> Client:
        try:
            from services.supabase_client import get_supabase_client
            return get_supabase_client()
        except Exception as e:
            logger.error(f"Failed to init Supabase: {e}")
            return None

    def get_data(self, table_name: str, force_refresh: bool = False, filters: dict = None,
                 limit: int = None, date_column: str = None, days_back: int = None, columns: str = "*") -> pd.DataFrame:
        """Fetch data from Supabase with caching."""
        if force_refresh:
            clear_cache_for_table(table_name)
        
        # PERFORMANCE: Auto-filter Jobs_Main to recent data only
        if table_name == "Jobs_Main":
            if limit is None:
                limit = 1000  # Reduced from 2000 for faster queries
            if date_column is None and days_back is None:
                # Auto-filter to last 30 days unless explicitly overridden
                date_column = "Plan_Date"
                days_back = 30
            
        # Determine Branch Context
        # Check if "Show All Branches" debug mode is active (for Super Admin)
        if st.session_state.get("debug_show_all_branches", False) and st.session_state.get("role") == "SUPER_ADMIN":
            current_branch = "ALL"
        else:
            current_branch = st.session_state.get("branch_id", "ALL")
            
        return _cached_fetch(table_name, current_branch, filters, limit, date_column, days_back, columns)

    def upload_file(self, bucket_name: str, file_path: str, file_data: bytes, content_type: str = "application/pdf") -> str:
        """Upload file to Supabase Storage and return Public URL."""
        if not self.client: return None
        try:
            # Upload
            res = self.client.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            # Get Public URL
            return self.client.storage.from_(bucket_name).get_public_url(file_path)
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            return None

    def upload_base64_image(self, bucket_name: str, file_path_prefix: str, base64_str: str) -> str:
        """
        Decodes Base64 string and uploads to Supabase Storage.
        Returns the Public URL.
        """
        import base64
        import uuid
        
        try:
            # 1. Clean header (data:image/jpeg;base64,...)
            if "," in base64_str:
                header, data = base64_str.split(",", 1)
            else:
                data = base64_str
                
            # 2. Decode
            img_data = base64.b64decode(data)
            
            # 3. Generate Path
            ext = "jpg"
            if "png" in base64_str: ext = "png"
            file_name = f"{file_path_prefix}_{uuid.uuid4().hex[:8]}.{ext}"
            
            # 4. Upload
            return self.upload_file(bucket_name, file_name, img_data, content_type=f"image/{ext}")
        except Exception as e:
            logger.error(f"Base64 Upload Error: {e}")
            return None

    def update_field_bulk(self, table_name: str, id_col: str, ids: list, field: str, value: any) -> bool:
        """Update a specific field for multiple records."""
        if not self.client: return False
        try:
            self.client.table(table_name).update({field: value}).in_(id_col, ids).execute()
            clear_cache_for_table(table_name)
            return True
        except Exception as e:
            logger.error(f"Bulk Update Error ({table_name}): {e}")
            return False

    def _sanitize_record(self, record: dict) -> dict:
        """
        Clean record for Supabase compatibility:
        1. Replace NaN/NaT with None
        2. Filter out keys not in valid schema (optional, prevents API errors)
        3. Convert Numpy types to Python native
        """
        import numpy as np
        
        clean_record = {}
        for k, v in record.items():
            # Handle NaN / NaT / Inf
            if pd.isna(v) or v is np.nan or v is np.inf or v is -np.inf:
                clean_record[k] = None
            # Handle Timestamp -> str (ISO)
            elif isinstance(v, (pd.Timestamp, datetime)):
                 clean_record[k] = v.strftime('%Y-%m-%d %H:%M:%S') if not pd.isna(v) else None
            # Handle Empty Strings that should be None (optional)
            elif v == "" and k not in ["Job_ID", "Driver_ID"]: # Start lenient
                clean_record[k] = None
            else:
                clean_record[k] = v
        return clean_record

    def update_data(self, table_name: str, df: pd.DataFrame) -> bool:
        """Upsert data to Supabase (Robust Version)"""
        # If client not init, try local fallback immediately or fail?
        # Let's try to init first, if fails, assume offline/local mode?
        # But here we assume client exists or we caught "Table Not Found" later.
        
        if not self.client: 
            self.last_error = "Supabase Client not initialized"
            return False
        
        try:
            # Enforce Branch_ID on Save
            current_branch = st.session_state.get("branch_id", "ALL")
            if current_branch not in ["ALL", "HEAD"] and "Branch_ID" in df.columns:
                df["Branch_ID"] = current_branch

            # --- Robust Data Sanitization ---
            # 1. Convert DataFrame rows to Dicts
            raw_records = df.to_dict(orient='records')
            
            # 2. Clean each record individually
            data_to_save = [self._sanitize_record(r) for r in raw_records]
            
            # 3. Upsert
            self.client.table(table_name).upsert(data_to_save).execute()
            
            # Clear cache
            clear_cache_for_table(table_name)
            self.last_error = None
            return True
        except Exception as e:
            # Fallback for Missing Table
            if "PGRST205" in str(e) or "Could not find the table" in str(e):
                 logger.warning(f"Fallback: Saving {table_name} to local storage.")
                 if _save_local_fallback(table_name, df):
                     clear_cache_for_table(table_name)
                     return True
            
            logger.error(f"Update Error ({table_name}): {e}")
            self.last_error = str(e) # Capture explicit error
            return False

    def insert_record(self, table_name: str, record: dict) -> bool:
        if not self.client: return False
        try:
            # Enforce Branch_ID on Insert
            current_branch = st.session_state.get("branch_id", "ALL")
            tables_with_branch = ["Jobs_Main", "Fuel_Logs", "Repair_Tickets"]
            
            if current_branch not in ["ALL", "HEAD"] and table_name in tables_with_branch:
                record["Branch_ID"] = current_branch

            # --- Sanitize Single Record ---
            clean_record = self._sanitize_record(record)

            self.client.table(table_name).insert(clean_record).execute()
            
            # Clear cache for this table
            clear_cache_for_table(table_name)
            self.last_error = None
            return True
        except Exception as e:
            # Fallback for Missing Table
            if "PGRST205" in str(e) or "Could not find the table" in str(e):
                 logger.warning(f"Fallback: Inserting to local {table_name}.")
                 # Load existing
                 current_df = _load_local_fallback(table_name)
                 # Append new
                 record_df = pd.DataFrame([clean_record])
                 updated_df = pd.concat([current_df, record_df], ignore_index=True)
                 # Save
                 if _save_local_fallback(table_name, updated_df):
                     clear_cache_for_table(table_name)
                     return True
            
            logger.error(f"Insert Error ({table_name}): {e}")
            if hasattr(st, "session_state") and table_name != "System_Logs":
                st.error(f"⚠️ Database Error: {str(e)}")
            return False

    def upsert_record(self, table_name: str, record: dict) -> bool:
        """Efficiently upsert a single record without fetching the whole table."""
        if not self.client: return False
        try:
            # Enforce Branch_ID on Upsert
            current_branch = st.session_state.get("branch_id", "ALL")
            tables_with_branch = ["Jobs_Main", "Fuel_Logs", "Repair_Tickets"]
            
            if current_branch not in ["ALL", "HEAD"] and table_name in tables_with_branch and "Branch_ID" not in record:
                record["Branch_ID"] = current_branch

            # Sanitize
            clean_record = self._sanitize_record(record)
            
            # Execute
            self.client.table(table_name).upsert(clean_record).execute()
            
            # Clear cache
            clear_cache_for_table(table_name)
            self.last_error = None
            return True
        except Exception as e:
            logger.error(f"Upsert Error ({table_name}): {e}")
            self.last_error = str(e)
            return False


# Singleton instance
repo = Repository()


# ============================================================
# Compatibility functions for legacy imports from modules.database
# ============================================================

def get_data(table_name: str) -> pd.DataFrame:
    """Legacy compatibility: get_data function"""
    return repo.get_data(table_name)

def update_sheet(table_name: str, df: pd.DataFrame) -> bool:
    """Legacy compatibility: update_sheet function (upsert)"""
    return repo.update_data(table_name, df)

def append_to_sheet(table_name: str, row_data) -> bool:
    """Legacy compatibility: append_to_sheet function (insert)"""
    if isinstance(row_data, pd.DataFrame):
        row_data = row_data.to_dict(orient='records')[0]
    elif isinstance(row_data, list):
        return False
    return repo.insert_record(table_name, row_data)

def load_all_data() -> dict:
    """Legacy compatibility: load_all_data function"""
    clear_all_cache()  # Force refresh all
    tables = list(SCHEMAS.keys())
    data = {}
    for t in tables:
        data[t] = repo.get_data(t, force_refresh=True)
    return data

def fetch_from_supabase(table_name: str) -> pd.DataFrame:
    """Legacy compatibility: fetch_from_supabase function"""
    return repo._fetch_from_supabase(table_name)

def sync_data():
    """Clear all cache and force refresh"""
    clear_all_cache()
