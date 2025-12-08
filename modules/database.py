"""
Database module for handling all Google Sheets operations in the TMS_ePOD system.
Fixed version: Removed lru_cache from get_data to prevent 'unhashable type: DataFrame' error.
"""
import os
import json
import time
import logging
import threading
from functools import lru_cache, wraps
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union, List, Tuple, Type, TypeVar, Callable

import pandas as pd # type: ignore
import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore

# ทำให้ dotenv เป็น optional: ถ้าไม่มี lib นี้ (เช่น บน cloud) ก็ไม่ต้อง error
try:
    from dotenv import load_dotenv # type: ignore
except ImportError:  # บาง environment อาจไม่ได้ติดตั้ง python-dotenv
    def load_dotenv(*args, **kwargs):
        return False

# Load environment variables
load_dotenv()

# Type variable for generic function return type
T = TypeVar('T')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = int(os.getenv('MAX_RETRIES', 5))
INITIAL_RETRY_DELAY = int(os.getenv('INITIAL_RETRY_DELAY', 5))  # seconds
CACHE_TTL = int(os.getenv('CACHE_TTL', 300))  # 5 minutes

class Config:
    SHEET_ID = os.getenv('GOOGLE_SHEET_ID', "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ")
    SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
    MASTER_DATA_TTL = int(os.getenv('MASTER_DATA_TTL', 3600))
    TRANSACTION_DATA_TTL = int(os.getenv('TRANSACTION_DATA_TTL', 300))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 50))
    CONNECTION_TIMEOUT = int(os.getenv('CONNECTION_TIMEOUT', 30))
    MAX_FAILURES = int(os.getenv('MAX_FAILURES', 3))
    RESET_TIMEOUT = int(os.getenv('RESET_TIMEOUT', 300))

# --- Schema Definition ---
SCHEMAS = {
    # Jobs_Main: อ้างอิงจาก TMS_DEMO - Jobs_Main.csv
    # Job_ID,Job_Status,Plan_Date,Customer_ID,Route_Name,Origin_Location,Dest_Location,
    # GoogleMap_Link,Driver_ID,Vehicle_Plate,Actual_Pickup_Time,Actual_Delivery_Time,
    # Photo_Proof_Url,Signature_Url,Price_Customer,Cost_Driver_Total,Cost_Fuel,
    # Cost_Labor_Extra,Est_Distance_KM
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Route_Name",
        "Origin_Location", "Dest_Location", "GoogleMap_Link", "Driver_ID",
        "Vehicle_Plate", "Actual_Pickup_Time", "Actual_Delivery_Time",
        "Photo_Proof_Url", "Signature_Url", "Price_Customer",
        "Cost_Driver_Total", "Cost_Fuel", "Cost_Labor_Extra",
        "Est_Distance_KM"
    ],

    # Fuel_Logs: ตรงกับ TMS_DEMO - Fuel_Logs.csv
    "Fuel_Logs": [
        "Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate",
        "Odometer", "Liters", "Price_Total", "Station_Name", "Photo_Url"
    ],

    # Maintenance_Logs: ยังไม่มี CSV แยก ใช้ตามโครงสร้างเดิม
    "Maintenance_Logs": [
        "Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer"
    ],

    # Repair_Tickets: ยังไม่มี CSV แยก ใช้ตามโครงสร้างเดิม
    "Repair_Tickets": [
        "Ticket_ID", "Date_Report", "Driver_ID", "Description", "Status",
        "Issue_Type", "Vehicle_Plate", "Photo_Url", "Cost_Total", "Date_Finish"
    ],

    # Stock_Parts: อ้างอิงจาก TMS_DEMO - Stock_Parts.csv
    # Part_ID,Part_Name,Qty_On_Hand,Unit_Price
    "Stock_Parts": [
        "Part_ID", "Part_Name", "Qty_On_Hand", "Unit_Price"
    ],

    # Master_Drivers: อ้างอิงจาก TMS_DEMO - Master_Drivers.csv
    # Driver_ID,Driver_Name,Vehicle_Plate,Vehicle_Type,Mobile_No,Line_User_ID,
    # Password,Driver_Score,Current_Lat,Current_Lon,Last_Update,Current_Mileage,
    # Next_Service_Mileage,Last_Service_Date,Insurance_Expiry,Role
    "Master_Drivers": [
        "Driver_ID", "Driver_Name", "Vehicle_Plate", "Vehicle_Type",
        "Mobile_No", "Line_User_ID", "Password", "Driver_Score",
        "Current_Lat", "Current_Lon", "Last_Update", "Current_Mileage",
        "Next_Service_Mileage", "Last_Service_Date", "Insurance_Expiry",
        "Role"
    ],

    # Master_Customers / Master_Routes: ยังไม่มี CSV ตัวอย่าง ใช้ schema เดิมไว้ก่อน
    "Master_Customers": ["Customer_ID", "Customer_Name"],
    "Master_Routes": [
        "Route_Name", "Origin", "Destination", "Distance_KM",
        "Map_Link", "Map_Link Origin", "Map_Link Destination"
    ],

    # System_Config: อ้างอิงจาก TMS_DEMO - System_Config.csv (เพิ่ม Description)
    # Key,Value,Description
    "System_Config": ["Key", "Value", "Description"],

    # Rate_Card: ใน Google Sheet โครงสร้างจริงอาจเป็น header 2 แถว
    # ที่นี่กำหนดแบบ logical schema ไว้สำหรับกรณีที่ต้องสร้าง DataFrame เปล่า
    "Rate_Card": ["Distance_KM", "Price_4W", "Price_6W", "Price_10W"]
}

class ConnectionManager:
    _instance = None
    _connection = None
    _last_failure = None
    _failure_count = 0
    _lock = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConnectionManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._connection = None
        self._last_failure = None
        self._failure_count = 0
        self._lock = threading.Lock()

    def get_connection(self):
        with self._lock:
            if self._is_circuit_open():
                raise ConnectionError("Circuit open")
            
            if (self._connection is None or not hasattr(self._connection, 'connected')):
                try:
                    self._connection = st.connection("gsheets", type=GSheetsConnection)
                    self._failure_count = 0
                    self._last_failure = None
                except Exception as e:
                    self._handle_connection_error(e)
                    raise
        return self._connection

    def _handle_connection_error(self, error):
        self._failure_count += 1
        self._last_failure = time.time()
        logger.error(f"Connection failed: {error}")

    def _is_circuit_open(self):
        if self._failure_count < Config.MAX_FAILURES: return False
        if time.time() - (self._last_failure or 0) > Config.RESET_TIMEOUT:
            self._reset_circuit()
            return False
        return True

    def _reset_circuit(self):
        self._failure_count = 0
        self._last_failure = None

def get_connection() -> GSheetsConnection:
    return ConnectionManager().get_connection()

def retry_on_quota_error(max_retries: int = MAX_RETRIES, initial_delay: float = INITIAL_RETRY_DELAY):
    def decorator(func: T) -> T:
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            delay = initial_delay
            while retries <= max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if any(q in str(e).lower() for q in ["quota", "rate limit"]):
                        retries += 1
                        time.sleep(delay)
                        delay *= 2
                    else:
                        raise
            return pd.DataFrame() if "get" in func.__name__ else {}
        return wrapper
    return decorator

# --- Cache Management ---
class CacheManager:
    _instance = None
    _cache = {}
    _timestamps = {}
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None: cls._instance = cls()
        return cls._instance
    
    def get(self, key: str, ttl: int = 300):
        if key in self._cache:
            if (datetime.now() - self._timestamps[key]).total_seconds() < ttl:
                return self._cache[key]
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = None):
        self._cache[key] = value
        if ttl is not None:
            self._timestamps[key] = datetime.now() + timedelta(seconds=ttl)
        else:
            self._timestamps[key] = datetime.now()
    
    def clear(self, key: str = None):
        if key: self._cache.pop(key, None)
        else: self._cache.clear()

cache = CacheManager.get_instance()

@retry_on_quota_error()
def load_master_group() -> Dict[str, pd.DataFrame]:
    cache_key = "master_group"
    cached_data = cache.get(cache_key, ttl=Config.MASTER_DATA_TTL)
    if cached_data is not None: return cached_data
    
    conn = get_connection()
    data = {}
    sheets_config = {
        "Master_Drivers": {"dtype": {"Driver_ID": str, "Vehicle_Plate": str, "Current_Mileage": float, "Mobile_No": str, "Password": str}, "required_cols": None},
        "Master_Customers": {"dtype": {"Customer_ID": str}, "required_cols": None},
        "Master_Routes": {"dtype": {"Distance_KM": float}, "required_cols": None},
        "Rate_Card": {
            "dtype": {}, 
            "required_cols": None 
        },
        "System_Config": {"dtype": {}, "required_cols": ["Key", "Value"]}
    }
    
    for sheet_name, config in sheets_config.items():
        try:
            read_kwargs = {"ttl": 0}
            if config["required_cols"]: read_kwargs["usecols"] = config["required_cols"]
            df = conn.read(spreadsheet=Config.SHEET_URL, worksheet=sheet_name, **read_kwargs)
            
            if df.empty:
                data[sheet_name] = pd.DataFrame(columns=SCHEMAS.get(sheet_name, []))
                continue

            for col, dtype in config["dtype"].items():
                if col in df.columns:
                    df[col] = df[col].astype(dtype, errors='ignore')
            data[sheet_name] = df
        except Exception:
            data[sheet_name] = pd.DataFrame(columns=SCHEMAS.get(sheet_name, []))
            
    cache.set(cache_key, data)
    return data

@retry_on_quota_error()
def load_transaction_group() -> Dict[str, pd.DataFrame]:
    cache_key = "transaction_group"
    cached_data = cache.get(cache_key, ttl=Config.TRANSACTION_DATA_TTL)
    if cached_data is not None: return cached_data
    
    conn = get_connection()
    data = {}
    sheets_config = {
        # NOTE: ไม่แปลง Job_ID เป็นตัวเลข เพื่อไม่ให้กลายเป็น NaN
        "Jobs_Main": {"dtype": {'Est_Distance_KM': float, 'Price_Customer': float, 'Cost_Driver_Total': float}, "date_columns": ['Plan_Date'], "required_cols": None},
        "Fuel_Logs": {"dtype": {'Log_ID': str, 'Odometer': float, 'Liters': float, 'Price_Total': float}, "date_columns": ['Date_Time'], "required_cols": None},
        "Maintenance_Logs": {"dtype": {"Log_ID": str, "Odometer": float}, "date_columns": ['Date_Service'], "required_cols": None},
        "Stock_Parts": {"dtype": {"Part_ID": str, "Qty_On_Hand": float}, "required_cols": None},
        "Repair_Tickets": {"dtype": {"Ticket_ID": str, "Cost_Total": float}, "date_columns": ['Date_Report'], "required_cols": None}
    }
    
    for sheet_name, config in sheets_config.items():
        try:
            read_kwargs = {"ttl": 0}
            if config["required_cols"]: read_kwargs["usecols"] = config["required_cols"]
            df = conn.read(spreadsheet=Config.SHEET_URL, worksheet=sheet_name, **read_kwargs)
            
            if df.empty:
                data[sheet_name] = pd.DataFrame(columns=SCHEMAS.get(sheet_name, []))
                continue

            for col, dtype in config["dtype"].items():
                if col in df.columns:
                    # แปลงเฉพาะคอลัมน์ตัวเลขเท่านั้น ไม่แตะคอลัมน์รหัสที่เป็นข้อความ
                    if dtype != str:
                        df[col] = pd.to_numeric(df[col], errors='coerce').astype(dtype, errors='ignore')
            
            for col in config.get("date_columns", []):
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            data[sheet_name] = df
        except Exception as e:
            logger.error(f"Error loading {sheet_name}: {e}")
            data[sheet_name] = pd.DataFrame(columns=SCHEMAS.get(sheet_name, []))
    
    cache.set(cache_key, data)
    return data

# !!! CRITICAL FIX: Removed @lru_cache to prevent 'unhashable type: DataFrame' error !!!
def get_data(worksheet_name: str, force_refresh: bool = False) -> pd.DataFrame:
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    
    if force_refresh:
        if worksheet_name in masters: load_master_group.clear()
        else: load_transaction_group.clear()
        cache.clear(f"{worksheet_name}_data")
    
    # Try custom cache first
    cache_key = f"{worksheet_name}_data"
    cached_df = cache.get(cache_key)
    if cached_df is not None and not force_refresh: return cached_df
    
    # Load from group
    if worksheet_name in masters: group_data = load_master_group()
    else: group_data = load_transaction_group()
    
    df = group_data.get(worksheet_name, pd.DataFrame())
    
    if df.empty and worksheet_name in SCHEMAS:
        df = pd.DataFrame(columns=SCHEMAS[worksheet_name])
    
    cache.set(cache_key, df)
    return df

def load_all_data(force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
    if force_refresh:
        cache.clear()
    return {**load_master_group(), **load_transaction_group()}

@retry_on_quota_error()
def append_to_sheet(worksheet_name: str, row_data: Union[Dict[str, Any], List[Any]], batch_mode: bool = False) -> bool:
    try:
        conn = get_connection()
        current_df = get_data(worksheet_name)
        rows = [row_data] if isinstance(row_data, dict) else row_data
        
        if not rows: return False
        
        # Validate columns
        if current_df.empty and worksheet_name in SCHEMAS:
            current_df = pd.DataFrame(columns=SCHEMAS[worksheet_name])
            
        new_rows = []
        for row in rows:
            if isinstance(row, dict):
                new_rows.append({col: row.get(col, '') for col in current_df.columns})
            elif isinstance(row, (list, tuple)):
                if len(row) <= len(current_df.columns):
                    new_rows.append(dict(zip(current_df.columns, row + ['']*(len(current_df.columns)-len(row)))))

        if not new_rows: return False
        new_df = pd.DataFrame(new_rows)
        updated_df = pd.concat([current_df, new_df], ignore_index=True)
        
        conn.update(spreadsheet=Config.SHEET_URL, worksheet=worksheet_name, data=updated_df)
        cache.clear(f"{worksheet_name}_data")
        return True
    except Exception as e:
        logger.error(f"Append error: {e}")
        return False

@retry_on_quota_error()
def update_sheet(worksheet_name: str, df: pd.DataFrame, batch_size: int = None) -> bool:
    try:
        conn = get_connection()
        conn.update(spreadsheet=Config.SHEET_URL, worksheet=worksheet_name, data=df)
        cache.clear(f"{worksheet_name}_data")
        return True
    except Exception as e:
        logger.error(f"Update error: {e}")
        return False