import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import time

# --- 1. ตั้งค่าการเชื่อมต่อ ---
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ" # ตรวจสอบ ID ให้ตรงกับของคุณ
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

# --- 2. กำหนด SCHEMA (หัวตารางมาตรฐาน) ---
# ระบบจะใช้รายชื่อนี้กู้คืนหัวตารางถ้ามันหายไป
SCHEMAS = {
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Customer_Name", "Route_Name", 
        "Origin_Location", "Dest_Location", "GoogleMap_Link", "Driver_ID", "Vehicle_Plate", 
        "Est_Distance_KM", "Price_Customer", "Cost_Driver_Total", "Actual_Pickup_Time", 
        "Actual_Delivery_Time", "Photo_Proof_Url", "Signature_Url", "Failed_Reason", "Failed_Time", "Arrive_Dest_Time"
    ],
    "Fuel_Logs": [
        "Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate", "Odometer", 
        "Liters", "Price_Total", "Station_Name", "Photo_Url"
    ],
    "Maintenance_Logs": [
        "Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer"
    ],
    "Repair_Tickets": [
        "Ticket_ID", "Date_Report", "Driver_ID", "Description", "Status", 
        "Issue_Type", "Vehicle_Plate", "Photo_Url", "Cost_Total", "Date_Finish"
    ],
    "Stock_Parts": [
        "Part_ID", "Part_Name", "Qty_On_Hand"
    ],
    "Master_Drivers": [
        "Driver_ID", "Driver_Name", "Vehicle_Plate", "Vehicle_Type", "Role", 
        "Password", "Current_Lat", "Current_Lon", "Last_Update", "Current_Mileage"
    ],
    "Master_Customers": ["Customer_ID", "Customer_Name"],
    "Master_Routes": ["Route_Name", "Origin", "Destination", "Distance_KM", "Map_Link", "Map_Link Origin", "Map_Link Destination"],
    "System_Config": ["Key", "Value"],
    "Rate_Card": ["Distance_KM", "Price_4W", "Price_6W", "Price_10W"] # ตัวอย่าง (อาจปรับตาม Sheet จริง)
}

# --- Retry Decorator ---
def retry_on_quota_error(max_retries=3, delay=2):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "Quota" in error_str or "APIError" in error_str:
                        wait_time = delay * (2 ** attempt)
                        print(f"⚠️ Google Sheet Busy. Retrying in {wait_time}s... ({attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        print(f"❌ Database Error: {error_str}")
                        break
            st.toast("⚠️ การเชื่อมต่อฐานข้อมูลมีปัญหา (กรุณาลองใหม่)", icon="⚠️")
            return {} if "load" in func.__name__ else False
        return wrapper
    return decorator

# --- Load Functions ---

@st.cache_data(ttl=3600)
@retry_on_quota_error() 
def load_master_group():
    conn = get_connection()
    data = {}
    sheets = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            # ถ้าอ่านมาแล้วไม่มีหัวตาราง ให้แปะหัวตารางมาตรฐาน
            if name in SCHEMAS and (df.empty or isinstance(df.columns[0], int)):
                 df = pd.DataFrame(columns=SCHEMAS[name])
            
            # Pre-processing
            if name == 'Master_Drivers' and not df.empty:
                df['Driver_ID'] = df['Driver_ID'].astype(str)
                df['Vehicle_Plate'] = df['Vehicle_Plate'].astype(str)
            if name == 'Master_Customers' and not df.empty:
                df['Customer_ID'] = df['Customer_ID'].astype(str)
                
            data[name] = df
        except:
            data[name] = pd.DataFrame(columns=SCHEMAS.get(name, []))
    return data

@st.cache_data(ttl=300)
@retry_on_quota_error()
def load_transaction_group():
    conn = get_connection()
    data = {}
    sheets = ["Jobs_Main", "Fuel_Logs", "Maintenance_Logs", "Stock_Parts", "Repair_Tickets"]
    
    for name in sheets:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            if name in SCHEMAS and (df.empty or isinstance(df.columns[0], int)):
                 df = pd.DataFrame(columns=SCHEMAS[name])
            data[name] = df
        except:
            data[name] = pd.DataFrame(columns=SCHEMAS.get(name, []))

    # Pre-processing
    if not data.get('Jobs_Main', pd.DataFrame()).empty:
        df = data['Jobs_Main']
        if 'Plan_Date' in df.columns:
            df['Plan_Date'] = pd.to_datetime(df['Plan_Date'], errors='coerce')
        for col in ['Job_ID', 'Customer_ID', 'Driver_ID']:
             if col in df.columns: df[col] = df[col].astype(str)
        data['Jobs_Main'] = df

    if not data.get('Fuel_Logs', pd.DataFrame()).empty:
        df = data['Fuel_Logs']
        if 'Date_Time' in df.columns:
            df['Date_Time'] = pd.to_datetime(df['Date_Time'], errors='coerce')
        data['Fuel_Logs'] = df

    return data

# --- Interface Functions ---

def get_data(worksheet_name):
    masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
    try:
        if worksheet_name in masters:
            group_data = load_master_group()
            df = group_data.get(worksheet_name, pd.DataFrame())
        else:
            group_data = load_transaction_group()
            df = group_data.get(worksheet_name, pd.DataFrame())
            
        # Final Safety Check: ถ้า DF ว่าง ให้คืน DF ที่มีหัวตารางตาม Schema
        if df.empty and worksheet_name in SCHEMAS:
            return pd.DataFrame(columns=SCHEMAS[worksheet_name])
        return df if isinstance(df, pd.DataFrame) else pd.DataFrame()
    except:
        return pd.DataFrame(columns=SCHEMAS.get(worksheet_name, []))

def load_all_data():
    try:
        load_master_group.clear()
        load_transaction_group.clear()
        return {**load_master_group(), **load_transaction_group()}
    except: return {}

# --- Update & Append (หัวใจหลักที่แก้ไข) ---

@retry_on_quota_error()
def append_to_sheet(worksheet_name, row_data_list):
    conn = get_connection()
    try:
        # 1. อ่านข้อมูลปัจจุบัน
        current_df = conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
        
        # 2. ตรวจสอบและกู้คืนหัวตาราง (Schema Enforcement)
        expected_cols = SCHEMAS.get(worksheet_name, [])
        
        # ถ้าไม่มีข้อมูล หรือ หัวตารางดูเหมือนจะเป็นตัวเลข (0,1,2...) แสดงว่าหัวหาย
        if current_df.empty or (not current_df.empty and isinstance(current_df.columns[0], int)):
            if expected_cols:
                # สร้าง DF เปล่าที่มีหัวตารางถูกต้อง
                current_df = pd.DataFrame(columns=expected_cols)
        
        # 3. เตรียมข้อมูลใหม่ให้ตรงกับคอลัมน์
        cols = current_df.columns.tolist()
        if not cols and expected_cols:
            cols = expected_cols # ใช้ Schema ถ้าหาคอลัมน์ไม่เจอจริงๆ
            
        # ปรับขนาดข้อมูลให้เท่ากับคอลัมน์
        if len(row_data_list) < len(cols):
            row_data_list += [""] * (len(cols) - len(row_data_list))
        else:
            row_data_list = row_data_list[:len(cols)]
            
        new_row_df = pd.DataFrame([row_data_list], columns=cols)
        
        # 4. รวมและบันทึก
        updated_df = pd.concat([current_df, new_row_df], ignore_index=True)
        
        # Safety Check: ตรวจสอบครั้งสุดท้ายก่อนเขียนว่าหัวตารางเป็น String ไม่ใช่ Int
        if not updated_df.empty and isinstance(updated_df.columns[0], int):
             raise Exception("Header Integrity Check Failed: Aborting write to prevent data corruption.")
             
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=updated_df)
        
        load_transaction_group.clear()
        return True
    except Exception as e:
        print(f"Append Error: {e}")
        return False

@retry_on_quota_error()
def update_sheet(worksheet_name, df):
    conn = get_connection()
    try:
        # Safety: ถ้า DF ที่ส่งมาไม่มีหัว หรือหัวเป็นตัวเลข ห้ามเขียน
        if df.empty and worksheet_name in SCHEMAS:
             df = pd.DataFrame(columns=SCHEMAS[worksheet_name])
             
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
        
        masters = ["Master_Drivers", "Master_Customers", "Master_Routes", "Rate_Card", "System_Config"]
        if worksheet_name in masters:
            load_master_group.clear()
        else:
            load_transaction_group.clear()
        return True
    except: return False

def get_connection_direct():
    return get_connection()