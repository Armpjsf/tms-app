import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import time
import gspread
import logging
from functools import wraps

logger = logging.getLogger("tms.modules.database")
logger.setLevel(logging.INFO)

# ID ของ Google Sheet หลัก (Database)
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    # Wrap with try/except so caller can display friendly errors
    try:
        return st.connection("gsheets", type=GSheetsConnection)
    except Exception as e:
        logger.exception("Failed to get gsheets connection")
        raise

# --- 🔥 Decorator: ระบบรอแล้วลองใหม่ (Retry) เมื่อเจอ Error 429 ---
def retry_on_quota_error(max_retries=5, delay=2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    error_str = str(e)
                    # เช็คว่าเป็น Error 429 (Quota Exceeded) หรือไม่
                    if "429" in error_str or "Quota exceeded" in error_str or "rateLimitExceeded" in error_str:
                        wait_time = delay * (2 ** attempt)  # exponential backoff
                        logger.warning("Quota limit hit. Retrying in %ss... (Attempt %d/%d)", wait_time, attempt+1, max_retries)
                        time.sleep(wait_time)
                        continue
                    else:
                        # ถ้าเป็น Error อื่น ให้โยนออกไปให้ upper layer จัดการ
                        logger.exception("Non-quota error in %s", func.__name__)
                        raise
            # ถ้าลองครบแล้วยังไม่ได้ ให้ log และคืนค่า fallback ที่เหมาะสม
            logger.error("Max retries reached for %s. Last error: %s", func.__name__, last_exc)
            st.error("ระบบ Google Sheet ทำงานหนักเกินไป กรุณารอสักครู่แล้วลองใหม่")
            # คืนค่า fallback ตามชนิดฟังก์ชัน
            if func.__name__.startswith("load"):
                # สำหรับฟังก์ชันโหลด ให้คืน dict (as empty groups) หรือ DataFrame ว่างแล้วแต่กรณี
                # caller จะตรวจสอบ .empty หรือ keys ได้
                return {} if "group" in func.__name__ or "all" in func.__name__ else pd.DataFrame()
            return False
        return wrapper
    return decorator

# --- 1. Smart Caching: โหลดเป็นกลุ่ม (ใช้ Retry) ---

@st.cache_data(ttl=3600)
@retry_on_quota_error() 
def load_master_group():
    """โหลดข้อมูลหลักทีเดียว 5 Sheet"""
    conn = get_connection()
    data = {}
    sheets = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            # ensure DataFrame
            if df is None:
                df = pd.DataFrame()
            if name == 'Master_Drivers':
                if 'Driver_ID' in df.columns:
                    df['Driver_ID'] = df['Driver_ID'].astype(str)
            data[name] = df
        except Exception:
            logger.exception("Failed to read worksheet %s", name)
            data[name] = pd.DataFrame()
    return data

@st.cache_data(ttl=300)
@retry_on_quota_error()
def load_transaction_group():
    """โหลดข้อมูลงานทีเดียว 5 Sheet"""
    conn = get_connection()
    data = {}
    sheets = ["Jobs_Main", "Fuel_Logs", "Maintenance_Logs", "Stock_Parts", "Repair_Tickets"]
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            if df is None:
                df = pd.DataFrame()
            data[name] = df
        except Exception:
            logger.exception("Failed to read worksheet %s", name)
            data[name] = pd.DataFrame()

    # --- Pre-processing ---
    try:
        if 'Jobs_Main' in data and not getattr(data['Jobs_Main'], 'empty', True):
            if 'Plan_Date' in data['Jobs_Main'].columns:
                data['Jobs_Main']['Plan_Date'] = pd.to_datetime(data['Jobs_Main']['Plan_Date'], errors='coerce')
            for c in ['Est_Distance_KM', 'Price_Customer', 'Cost_Driver_Total']:
                 if c in data['Jobs_Main'].columns:
                     data['Jobs_Main'][c] = pd.to_numeric(data['Jobs_Main'][c], errors='coerce').fillna(0)

        if 'Fuel_Logs' in data and not getattr(data['Fuel_Logs'], 'empty', True):
            for c in ['Odometer', 'Liters', 'Price_Total']:
                if c in data['Fuel_Logs'].columns:
                    data['Fuel_Logs'][c] = pd.to_numeric(data['Fuel_Logs'][c], errors='coerce')
            if 'Date_Time' in data['Fuel_Logs'].columns:
                data['Fuel_Logs']['Date_Time'] = pd.to_datetime(data['Fuel_Logs']['Date_Time'], errors='coerce')

        if 'Maintenance_Logs' in data and not getattr(data['Maintenance_Logs'], 'empty', True):
            if 'Odometer' in data['Maintenance_Logs'].columns:
                data['Maintenance_Logs']['Odometer'] = pd.to_numeric(data['Maintenance_Logs']['Odometer'], errors='coerce')
            if 'Date_Service' in data['Maintenance_Logs'].columns:
                data['Maintenance_Logs']['Date_Service'] = pd.to_datetime(data['Maintenance_Logs']['Date_Service'], errors='coerce')
    except Exception:
        logger.exception("Error during transaction group preprocessing")

    return data

# --- Interface Functions ---

def get_data(worksheet_name):
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    try:
        if worksheet_name in masters:
            res = load_master_group() or {}
            return res.get(worksheet_name, pd.DataFrame())
        else:
            res = load_transaction_group() or {}
            return res.get(worksheet_name, pd.DataFrame())
    except Exception:
        logger.exception("get_data failed for %s", worksheet_name)
        return pd.DataFrame()

def load_all_data():
    # Clear caches if available
    try:
        if hasattr(load_master_group, "clear"):
            load_master_group.clear()
        if hasattr(load_transaction_group, "clear"):
            load_transaction_group.clear()
    except Exception:
        logger.exception("Failed to clear caches")
    # Return merged dict (safe)
    try:
        masters = load_master_group() or {}
        trans = load_transaction_group() or {}
        # ensure dict
        if not isinstance(masters, dict): masters = {}
        if not isinstance(trans, dict): trans = {}
        return {**masters, **trans}
    except Exception:
        logger.exception("load_all_data failed")
        return {}

# --- Update & Append (ใช้ Retry) ---

@retry_on_quota_error()
def append_to_sheet(worksheet_name, row_data_list):
    """เพิ่มข้อมูลโดยอ่านของเก่าแล้วต่อท้าย (Safe Append + Retry)"""
    conn = get_connection()
    
    # 1. อ่านข้อมูลปัจจุบัน
    try:
        current_df = conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
        if current_df is None:
            current_df = pd.DataFrame()
    except Exception:
        logger.exception("Failed to read current sheet %s", worksheet_name)
        current_df = pd.DataFrame()
    
    if current_df.empty:
        # กรณี Sheet ว่าง (สร้างใหม่)
        new_row_df = pd.DataFrame([row_data_list])
        updated_df = new_row_df
    else:
        # 2. สร้าง DataFrame แถวใหม่ (try to align columns)
        try:
            new_row_df = pd.DataFrame([row_data_list], columns=current_df.columns)
        except Exception:
            # fallback: create with inferred columns
            new_row_df = pd.DataFrame([row_data_list])
        # 3. รวมร่าง (Concat)
        updated_df = pd.concat([current_df, new_row_df], ignore_index=True)
    
    # 4. บันทึกกลับ
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=updated_df)
    
    # ล้าง Cache
    try:
        if hasattr(load_transaction_group, "clear"):
            load_transaction_group.clear()
    except Exception:
        logger.exception("Failed to clear transaction cache after append")
    return True

@retry_on_quota_error()
def update_sheet(worksheet_name, df):
    conn = get_connection()
    try:
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
    except Exception:
        logger.exception("Failed to update sheet %s", worksheet_name)
        raise
    
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    try:
        if worksheet_name in masters:
            if hasattr(load_master_group, "clear"): load_master_group.clear()
        else:
            if hasattr(load_transaction_group, "clear"): load_transaction_group.clear()
    except Exception:
        logger.exception("Failed to clear cache after update")

def get_connection_direct():
    return get_connection()