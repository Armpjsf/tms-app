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

try:
    from dotenv import load_dotenv # type: ignore
except ImportError:
    def load_dotenv(*args, **kwargs): return False

load_dotenv()
T = TypeVar('T')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = int(os.getenv('MAX_RETRIES', 5))
INITIAL_RETRY_DELAY = int(os.getenv('INITIAL_RETRY_DELAY', 5))
CACHE_TTL = int(os.getenv('CACHE_TTL', 300))

class Config:
    SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
    SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
    MASTER_DATA_TTL = 3600
    TRANSACTION_DATA_TTL = 300
    BATCH_SIZE = 50
    CONNECTION_TIMEOUT = 30
    MAX_FAILURES = 3
    RESET_TIMEOUT = 300

# --- ✅ อัปเดต SCHEMA ให้รองรับเมนูใหม่ (หาง/ยาง) ---
SCHEMAS = {
    # 1. งานขนส่ง (35 คอลัมน์)
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Customer_Name", "Route_Name", 
        "Vehicle_Type", "Cargo_Qty", "Origin_Location", "Dest_Location", "Est_Distance_KM", 
        "GoogleMap_Link", "Driver_ID", "Driver_Name", "Vehicle_Plate", "Actual_Pickup_Time", 
        "Actual_Delivery_Time", "Arrive_Dest_Time", "Photo_Proof_Url", "Signature_Url", 
        "Price_Cust_Base", "Price_Cust_Fuel", "Price_Cust_Extra", "Price_Cust_Trailer", 
        "Price_Cust_Return", "Price_Cust_Other", "Price_Cust_Total", 
        "Cost_Driver_Base", "Cost_Driver_Fuel", "Cost_Driver_Extra", "Cost_Driver_Trailer", 
        "Cost_Driver_Return", "Cost_Driver_Other", "Cost_Driver_Total", "Payment_Status"
    ],
    
    # 2. ข้อมูลหลัก (Master Data)
    "Master_Drivers": [
        "Driver_ID", "Driver_Name", "Vehicle_Plate", "Vehicle_Type", "Mobile_No", 
        "Line_User_ID", "Password", "Driver_Score", "Current_Lat", "Current_Lon", 
        "Last_Update", "Current_Mileage", "Next_Service_Mileage", "Last_Service_Date", 
        "Insurance_Expiry", "Role"
    ],
    "Master_Customers": ["Customer_ID", "Customer_Name"],
    "Master_Routes": ["Route_Name", "Origin", "Destination", "Distance_KM", "Map_Link", "Map_Link Origin", "Map_Link Destination"],
    
    # ✅ เพิ่มใหม่: ข้อมูลหางลาก (Trailers)
    "Master_Trailers": [
        "Trailer_ID", "Type", "License_Plate", "Status", 
        "Weight_Capacity", "Insurance_Expiry", "Last_Inspection_Date", "Note"
    ],
    
    # ✅ เพิ่มใหม่: ข้อมูลยาง (Tires)
    "Master_Tires": [
        "Tire_Serial", "Brand", "Size", "Status", 
        "Install_Date", "Vehicle_Plate", "Position", "Mileage_Install", "Condition_Score"
    ],

    # 3. ข้อมูล Transaction อื่นๆ
    "Fuel_Logs": ["Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate", "Odometer", "Liters", "Price_Total", "Station_Name", "Photo_Url"],
    "Maintenance_Logs": ["Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer", "Description", "Cost", "Created_At"],
    "Repair_Tickets": ["Ticket_ID", "Date_Report", "Driver_ID", "Description", "Status", "Issue_Type", "Vehicle_Plate", "Photo_Url", "Cost_Total", "Date_Finish"],
    "Stock_Parts": ["Part_ID", "Part_Name", "Qty_On_Hand", "Unit_Price", "Last_Updated"],
    
    # 4. ตั้งค่าระบบ
    "System_Config": ["Key", "Value", "Description"],
    "Rate_Card": ["Distance_KM", "Price_4W", "Price_6W", "Price_10W"]
}

class ConnectionManager:
    _instance = None; _connection = None; _last_failure = None; _failure_count = 0; _lock = None
    def __new__(cls):
        if cls._instance is None: cls._instance = super(ConnectionManager, cls).__new__(cls); cls._instance._initialize()
        return cls._instance
    def _initialize(self):
        self._connection = None; self._last_failure = None; self._failure_count = 0; self._lock = threading.Lock()
    def get_connection(self):
        with self._lock:
            if self._is_circuit_open(): raise ConnectionError("Circuit open")
            if (self._connection is None or not hasattr(self._connection, 'connected')):
                try: self._connection = st.connection("gsheets", type=GSheetsConnection); self._failure_count = 0; self._last_failure = None
                except Exception as e: self._handle_connection_error(e); raise
        return self._connection
    def _handle_connection_error(self, error):
        self._failure_count += 1; self._last_failure = time.time(); logger.error(f"Connection failed: {error}")
    def _is_circuit_open(self):
        if self._failure_count < Config.MAX_FAILURES: return False
        if time.time() - (self._last_failure or 0) > Config.RESET_TIMEOUT: self._reset_circuit(); return False
        return True
    def _reset_circuit(self): self._failure_count = 0; self._last_failure = None

def get_connection() -> GSheetsConnection: return ConnectionManager().get_connection()

def retry_on_quota_error(max_retries: int = MAX_RETRIES, initial_delay: float = INITIAL_RETRY_DELAY):
    def decorator(func: T) -> T:
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0; delay = initial_delay
            while retries <= max_retries:
                try: return func(*args, **kwargs)
                except Exception as e:
                    if any(q in str(e).lower() for q in ["quota", "rate limit"]):
                        retries += 1; time.sleep(delay); delay *= 2
                    else: raise
            return pd.DataFrame() if "get" in func.__name__ else {}
        return wrapper
    return decorator

class CacheManager:
    _instance = None; _cache = {}; _timestamps = {}
    @classmethod
    def get_instance(cls):
        if cls._instance is None: cls._instance = cls()
        return cls._instance
    def get(self, key: str, ttl: int = 300):
        if key in self._cache:
            if (datetime.now() - self._timestamps[key]).total_seconds() < ttl: return self._cache[key]
            del self._cache[key]
        return None
    def set(self, key: str, value: Any, ttl: int = None):
        self._cache[key] = value
        self._timestamps[key] = datetime.now() + timedelta(seconds=ttl if ttl else 300)
    def clear(self, key: str = None):
        if key: self._cache.pop(key, None)
        else: self._cache.clear()

cache = CacheManager.get_instance()

@retry_on_quota_error()
def load_master_group() -> Dict[str, pd.DataFrame]:
    cache_key = "master_group"; cached = cache.get(cache_key, ttl=Config.MASTER_DATA_TTL)
    if cached is not None: return cached
    conn = get_connection(); data = {}
    # ✅ เพิ่ม Master_Trailers และ Master_Tires เข้ากลุ่ม Master
    sheets = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config", "Master_Trailers", "Master_Tires"]
    for sheet in sheets:
        try:
            df = conn.read(spreadsheet=Config.SHEET_URL, worksheet=sheet, ttl=0)
            data[sheet] = df if not df.empty else pd.DataFrame(columns=SCHEMAS.get(sheet, []))
        except: data[sheet] = pd.DataFrame(columns=SCHEMAS.get(sheet, []))
    cache.set(cache_key, data); return data

@retry_on_quota_error()
def load_transaction_group() -> Dict[str, pd.DataFrame]:
    cache_key = "transaction_group"; cached = cache.get(cache_key, ttl=Config.TRANSACTION_DATA_TTL)
    if cached is not None: return cached
    conn = get_connection(); data = {}
    for sheet in ["Jobs_Main", "Fuel_Logs", "Maintenance_Logs", "Stock_Parts", "Repair_Tickets"]:
        try:
            df = conn.read(spreadsheet=Config.SHEET_URL, worksheet=sheet, ttl=0)
            if sheet == "Jobs_Main" and not df.empty and 'Plan_Date' in df.columns:
                df['Plan_Date'] = pd.to_datetime(df['Plan_Date'], errors='coerce')
            data[sheet] = df if not df.empty else pd.DataFrame(columns=SCHEMAS.get(sheet, []))
        except: data[sheet] = pd.DataFrame(columns=SCHEMAS.get(sheet, []))
    cache.set(cache_key, data); return data

def get_data(worksheet_name: str, force_refresh: bool = False) -> pd.DataFrame:
    # ✅ อัปเดตรายชื่อ Master
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config", "Master_Trailers", "Master_Tires"]
    if force_refresh: cache.clear(f"{worksheet_name}_data")
    cached = cache.get(f"{worksheet_name}_data")
    if cached is not None and not force_refresh: return cached
    
    group = load_master_group() if worksheet_name in masters else load_transaction_group()
    df = group.get(worksheet_name, pd.DataFrame())
    
    # Safety: Create empty DF with correct schema if missing
    if df.empty and worksheet_name in SCHEMAS: 
        df = pd.DataFrame(columns=SCHEMAS[worksheet_name])
    
    cache.set(f"{worksheet_name}_data", df); return df

def load_all_data(force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
    if force_refresh: cache.clear()
    return {**load_master_group(), **load_transaction_group()}

@retry_on_quota_error()
def append_to_sheet(worksheet_name: str, row_data: Union[Dict[str, Any], List[Any]], batch_mode: bool = False) -> bool:
    try:
        conn = get_connection(); current_df = get_data(worksheet_name)
        rows = [row_data] if isinstance(row_data, dict) else row_data
        if not rows: return False
        
        if current_df.empty and worksheet_name in SCHEMAS:
            current_df = pd.DataFrame(columns=SCHEMAS[worksheet_name])
            
        new_rows = []
        for row in rows:
            if isinstance(row, dict):
                # Ensure all columns in schema are present
                row_dict = {col: row.get(col, '') for col in current_df.columns}
                new_rows.append(row_dict)
            elif isinstance(row, (list, tuple)):
                if len(row) <= len(current_df.columns):
                    new_rows.append(dict(zip(current_df.columns, row + ['']*(len(current_df.columns)-len(row)))))

        if not new_rows: return False
        updated_df = pd.concat([current_df, pd.DataFrame(new_rows)], ignore_index=True)
        conn.update(spreadsheet=Config.SHEET_URL, worksheet=worksheet_name, data=updated_df)
        cache.clear(f"{worksheet_name}_data")
        return True
    except Exception as e:
        logger.error(f"Append error: {e}"); return False

@retry_on_quota_error()
def update_sheet(worksheet_name: str, df: pd.DataFrame, batch_size: int = None) -> bool:
    try:
        conn = get_connection()
        conn.update(spreadsheet=Config.SHEET_URL, worksheet=worksheet_name, data=df)
        cache.clear(f"{worksheet_name}_data")
        return True
    except Exception as e:
        logger.error(f"Update error: {e}"); return False