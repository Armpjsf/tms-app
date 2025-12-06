import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore

# ID ของ Google Sheet
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

# --- 1. Smart Caching: โหลดเป็นกลุ่ม (Group Load) ---

@st.cache_data(ttl=3600) 
def load_master_group():
    """โหลดข้อมูลหลักทีเดียว 5 Sheet (Drivers, Customers, Routes, Rate, Config)"""
    conn = get_connection()
    data = {}
    sheets = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            # Pre-process Master Data
            if name == 'Master_Drivers':
                df['Driver_ID'] = df['Driver_ID'].astype(str)
            data[name] = df
        except:
            data[name] = pd.DataFrame()
    return data

@st.cache_data(ttl=300) 
def load_transaction_group():
    """โหลดข้อมูลงานทีเดียว 5 Sheet (Jobs, Fuel, Maintenance, Stock, Tickets)"""
    conn = get_connection()
    data = {}
    sheets = ["Jobs_Main", "Fuel_Logs", "Maintenance_Logs", "Stock_Parts", "Repair_Tickets"]
    
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            data[name] = df
        except:
            data[name] = pd.DataFrame()

    # --- Pre-processing (ทำทีเดียวตรงนี้เลย) ---
    if not data['Jobs_Main'].empty:
        if 'Plan_Date' in data['Jobs_Main'].columns:
            data['Jobs_Main']['Plan_Date'] = pd.to_datetime(data['Jobs_Main']['Plan_Date'], errors='coerce')
        for c in ['Est_Distance_KM', 'Price_Customer', 'Cost_Driver_Total']:
             if c in data['Jobs_Main'].columns:
                 data['Jobs_Main'][c] = pd.to_numeric(data['Jobs_Main'][c], errors='coerce').fillna(0)

    if not data['Fuel_Logs'].empty:
        for c in ['Odometer', 'Liters', 'Price_Total']:
            if c in data['Fuel_Logs'].columns:
                data['Fuel_Logs'][c] = pd.to_numeric(data['Fuel_Logs'][c], errors='coerce')
        if 'Date_Time' in data['Fuel_Logs'].columns:
            data['Fuel_Logs']['Date_Time'] = pd.to_datetime(data['Fuel_Logs']['Date_Time'], errors='coerce')

    if not data['Maintenance_Logs'].empty:
        if 'Odometer' in data['Maintenance_Logs'].columns:
            data['Maintenance_Logs']['Odometer'] = pd.to_numeric(data['Maintenance_Logs']['Odometer'], errors='coerce')
        if 'Date_Service' in data['Maintenance_Logs'].columns:
            data['Maintenance_Logs']['Date_Service'] = pd.to_datetime(data['Maintenance_Logs']['Date_Service'], errors='coerce')
            
    return data

# --- Interface Functions ---

def get_data(worksheet_name):
    """ดึงข้อมูลจาก Cache กลุ่มที่ถูกต้อง"""
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    
    if worksheet_name in masters:
        # ดึงจาก Master Group (ถ้ายังไม่มีใน Cache ระบบจะโหลด 5 แผ่นนี้พร้อมกัน)
        return load_master_group().get(worksheet_name, pd.DataFrame())
    else:
        # ดึงจาก Transaction Group
        return load_transaction_group().get(worksheet_name, pd.DataFrame())

def load_all_data():
    """โหลดข้อมูลทั้งหมด (ใช้สำหรับปุ่ม Refresh หรือตอนเริ่มแอพ)"""
    # การเรียกฟังก์ชันนี้จะไปกระตุ้นให้ Cache ทำงาน
    m = load_master_group()
    t = load_transaction_group()
    return {**m, **t} # คืนค่าเป็น Dict รวม

# --- Update & Append ---

def append_to_sheet(worksheet_name, row_data_list):
    """เพิ่มแถวใหม่ (Append) - เร็วที่สุด"""
    try:
        conn = get_connection()
        sh = conn.client.open_by_key(SHEET_ID)
        wks = sh.worksheet(worksheet_name)
        wks.append_row(row_data_list)
        
        # ล้าง Cache เฉพาะกลุ่ม Transaction (เพื่อให้โหลดใหม่ครั้งหน้า)
        load_transaction_group.clear()
        return True
    except Exception as e:
        print(f"Append Error: {e}")
        return False

def update_sheet(worksheet_name, df):
    """เขียนทับทั้ง Sheet (Update)"""
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
    
    # ล้าง Cache ตามกลุ่ม
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    if worksheet_name in masters:
        load_master_group.clear()
    else:
        load_transaction_group.clear()

def get_connection_direct():
    return get_connection()