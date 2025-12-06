import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore

# ID ของ Google Sheet หลัก (Database)
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

# --- 1. Smart Caching: โหลดเป็นกลุ่ม (Group Load) ---

@st.cache_data(ttl=3600) 
def load_master_group():
    """โหลดข้อมูลหลักทีเดียว 5 Sheet"""
    conn = get_connection()
    data = {}
    sheets = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            if name == 'Master_Drivers':
                df['Driver_ID'] = df['Driver_ID'].astype(str)
            data[name] = df
        except:
            data[name] = pd.DataFrame()
    return data

@st.cache_data(ttl=300) 
def load_transaction_group():
    """โหลดข้อมูลงานทีเดียว 5 Sheet"""
    conn = get_connection()
    data = {}
    sheets = ["Jobs_Main", "Fuel_Logs", "Maintenance_Logs", "Stock_Parts", "Repair_Tickets"]
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            data[name] = df
        except:
            data[name] = pd.DataFrame()

    # --- Pre-processing ---
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
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    if worksheet_name in masters:
        return load_master_group().get(worksheet_name, pd.DataFrame())
    else:
        return load_transaction_group().get(worksheet_name, pd.DataFrame())

def load_all_data():
    load_master_group.clear()
    load_transaction_group.clear()
    return {**load_master_group(), **load_transaction_group()}

# --- Update & Append (แก้กลับเป็น Standard Update เพื่อความเสถียร) ---

def append_to_sheet(worksheet_name, row_data_list):
    """เพิ่มข้อมูลโดยอ่านของเก่าแล้วต่อท้าย (Safe Append)"""
    try:
        conn = get_connection()
        
        # 1. อ่านข้อมูลปัจจุบัน (แบบ Real-time เพื่อความชัวร์)
        current_df = conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
        
        # 2. สร้าง DataFrame แถวใหม่
        # ใช้ชื่อคอลัมน์จาก current_df เพื่อให้ตรงกันเป๊ะ
        if current_df.empty:
            # กรณี Sheet ว่างเปล่า (ไม่ควรเกิดขึ้นถ้ามี Header)
            return False
            
        new_row_df = pd.DataFrame([row_data_list], columns=current_df.columns)
        
        # 3. รวมร่าง (Concat)
        updated_df = pd.concat([current_df, new_row_df], ignore_index=True)
        
        # 4. บันทึกกลับ (Update ทั้ง Sheet)
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=updated_df)
        
        # ล้าง Cache กลุ่ม Transaction เพื่อให้เห็นข้อมูลใหม่ทันที
        load_transaction_group.clear()
        
        return True
    except Exception as e:
        st.error(f"เกิดข้อผิดพลาดในการบันทึก ({worksheet_name}): {str(e)}")
        return False

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
    
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    if worksheet_name in masters:
        load_master_group.clear()
    else:
        load_transaction_group.clear()

def get_connection_direct():
    return get_connection()