# modules/database.py (Fixed: Empty Table Crash)

import streamlit as st
import pandas as pd
from supabase import create_client, Client
import time

# --- Configuration ---
try:
    SUPABASE_URL = st.secrets["supabase"]["url"]
    SUPABASE_KEY = st.secrets["supabase"]["key"]
except (KeyError, FileNotFoundError):
    st.error("❌ ไม่พบ Supabase Credentials ใน .streamlit/secrets.toml")
    st.stop()

# --- Schema Definitions (ป้องกัน Error กรณีตารางว่าง) ---
SCHEMAS = {
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Customer_Name", "Route_Name",
        "Vehicle_Type", "Cargo_Qty", "Total_Weight_kg", "Total_Volume_cbm", # เพิ่ม: น้ำหนัก/ปริมาตร
        "Origin_Location", "Dest_Location", "Total_Drop", # เพิ่ม: จำนวนจุดจอด
        "Est_Distance_KM", "GoogleMap_Link", 
        "Driver_ID", "Driver_Name", "Vehicle_Plate", 
        "Actual_Pickup_Time", "Actual_Delivery_Time", "Arrive_Dest_Time", 
        "Photo_Proof_Url", "Signature_Url", "Delivery_Lat", "Delivery_Lon", 
        "Price_Cust_Base", "Price_Cust_Extra", "Charge_Labor", "Charge_Wait", 
        "Price_Cust_Return", "Price_Cust_Fuel", "Price_Cust_Trailer", "Price_Cust_Other", "Price_Cust_Total", 
        "Cost_Driver_Base", "Cost_Driver_Extra", "Cost_Driver_Labor", "Cost_Driver_Wait", 
        "Cost_Driver_Return", "Cost_Driver_Fuel", "Cost_Driver_Trailer", "Cost_Driver_Other", "Cost_Driver_Total", 
        "Payment_Status", "PD", "Failed_Reason", "Failed_Time",
        "Rating", "Customer_Comment", "Barcodes",
        "Payment_Date", "Payment_Slip_Url",
        "Billing_Status", "Invoice_No", "Billing_Date",
        "Branch_ID", "Created_At", "Created_By", "Last_Updated" # เพิ่ม: Audit Log
    ],
    "Fuel_Logs": [
        "Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate", "Odometer", "Liters", 
        "Price_Total", "Station_Name", "Photo_Url", "Branch_ID", "Created_By"
    ],
    "Maintenance_Logs": [
        "Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer", 
        "Next_Due_Odometer", "Notes", "Cost", "Garage_Name", "Invoice_Ref" # เพิ่ม: อู่ซ่อม/เลขบิล
    ],
    "Repair_Tickets": [
        "Ticket_ID", "Date_Report", "Driver_ID", "Vehicle_Plate", "Issue_Type", "Description", 
        "Photo_Url", "Status", "Approver", "Cost_Total", "Date_Finish", "Remark"
    ],
    "Stock_Parts": [
        "Part_ID", "Part_Name", "Part_Model", "Qty_On_Hand", "Unit_Price", "Min_Level", "Location_Shelf" # เพิ่ม: จุดสั่งซื้อ/ชั้นวาง
    ],
    "Master_Drivers": [
        "Driver_ID", "Driver_Name", "Role", "Mobile_No", "Line_User_ID", "Password",
        "Vehicle_Plate", "Vehicle_Type", "Max_Weight_kg", "Max_Volume_cbm",
        "Insurance_Expiry", "Tax_Expiry", "Act_Expiry",
        "Current_Mileage", "Next_Service_Mileage", "Last_Service_Date",
        "Bank_Name", "Bank_Account_No", "Bank_Account_Name",
        "Driver_Score", "Current_Lat", "Current_Lon", "Last_Update", "Branch_ID", "Active_Status"
    ],
    "Master_Customers": [
        "Customer_ID", "Customer_Name", "Default_Origin", "Contact_Person", "Phone", 
        "Address", "Tax_ID", "Branch_ID", "Credit_Term", "Lat", "Lon", "GoogleMap_Link" # เพิ่ม: พิกัดลูกค้า
    ],
    "Master_Routes": [
        "Route_ID", "Route_Name", "Origin", "Destination", "Distance_KM", 
        "Standard_Price_4W", "Standard_Price_6W", "Standard_Price_10W", "Standard_Cost_Driver", "Branch_ID" # เพิ่ม: โครงสร้างราคามาตรฐาน
    ],
    "Rate_Card": ["Distance_Start", "Distance_End", "Price_4W", "Price_6W", "Price_10W", "Price_Trailer"], # ปรับ: ช่วงระยะทาง
    "Master_Users": ["Username", "Password", "Role", "Name", "Branch_ID", "Vehicle_Plate", "Active_Status"],
    "System_Config": ["Key", "Value", "Description", "Category"]
}

# --- Connection Helper ---
@st.cache_resource
def init_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Main Functions ---

def get_data(table_name):
    """ดึงข้อมูลจากตาราง Supabase มาเป็น DataFrame"""
    if 'data_store' not in st.session_state:
        st.session_state.data_store = {}
        
    if table_name in st.session_state.data_store:
        return st.session_state.data_store[table_name]

    return fetch_from_supabase(table_name)

def fetch_from_supabase(table_name):
    """ฟังก์ชันดึงข้อมูลดิบจาก Supabase"""
    supabase = init_supabase()
    try:
        response = supabase.table(table_name).select("*").execute()
        data = response.data
        
        # ✅ FIX: ถ้าไม่มีข้อมูล ให้คืน DataFrame ว่างๆ พร้อมชื่อคอลัมน์ที่ถูกต้อง
        if not data:
            cols = SCHEMAS.get(table_name, [])
            return pd.DataFrame(columns=cols)
            
        df = pd.DataFrame(data)
        
        # เก็บลง Cache
        if 'data_store' not in st.session_state: st.session_state.data_store = {}
        st.session_state.data_store[table_name] = df
        
        return df
    except Exception as e:
        # กรณี Error จริงๆ ก็คืนค่าว่างพร้อม Schema กันตายไว้ก่อน
        print(f"Supabase Fetch Error ({table_name}): {e}")
        cols = SCHEMAS.get(table_name, [])
        return pd.DataFrame(columns=cols)

def load_all_data():
    """โหลดทุกตาราง"""
    tables = list(SCHEMAS.keys())
    data = {}
    for t in tables:
        data[t] = fetch_from_supabase(t)
    return data

def append_to_sheet(table_name, row_data):
    """เพิ่มข้อมูลใหม่ (Insert)"""
    supabase = init_supabase()
    try:
        if isinstance(row_data, pd.DataFrame):
            row_data = row_data.to_dict(orient='records')[0]
        elif isinstance(row_data, list):
            return False 

        supabase.table(table_name).insert(row_data).execute()
        
        # Update Cache
        if 'data_store' in st.session_state and table_name in st.session_state.data_store:
            old_df = st.session_state.data_store[table_name]
            new_row_df = pd.DataFrame([row_data])
            # ป้องกัน Error ถ้า old_df ว่างเปล่า
            if old_df.empty:
                updated_df = new_row_df
            else:
                updated_df = pd.concat([old_df, new_row_df], ignore_index=True)
                
            st.session_state.data_store[table_name] = updated_df
            
        return True
    except Exception as e:
        st.error(f"Save Error: {e}")
        return False

def update_sheet(table_name, df):
    """อัปเดตข้อมูล (Upsert)"""
    supabase = init_supabase()
    try:
        data_to_save = df.to_dict(orient='records')
        response = supabase.table(table_name).upsert(data_to_save).execute()
        
        # Update Cache
        st.session_state.data_store[table_name] = df
        return True
    except Exception as e:
        st.error(f"Update Error: {e}")
        return False

# --- Config Class (Dummy) ---
class Config:
    SHEET_URL = "" 
    SHEET_ID = ""