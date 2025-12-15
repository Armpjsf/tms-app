# modules/database.py
import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import time

SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

class Config:
    SHEET_ID = SHEET_ID
    SHEET_URL = SHEET_URL

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

SCHEMAS = {
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Customer_Name", "Route_Name",
        "Vehicle_Type", "Cargo_Qty", "Origin_Location", "Dest_Location", "Est_Distance_KM", 
        "GoogleMap_Link", "Driver_ID", "Driver_Name", "Vehicle_Plate", 
        "Actual_Pickup_Time", "Actual_Delivery_Time", "Arrive_Dest_Time", 
        "Photo_Proof_Url", "Signature_Url",
        "Price_Cust_Base", "Price_Cust_Fuel", "Price_Cust_Extra", "Price_Cust_Trailer", 
        "Price_Cust_Return", "Price_Cust_Other", "Price_Cust_Total",
        "Cost_Driver_Base", "Cost_Driver_Fuel", "Cost_Driver_Extra", "Cost_Driver_Trailer", 
        "Cost_Driver_Return", "Cost_Driver_Other", "Cost_Driver_Total",
        "Payment_Status", "PD", "Failed_Reason", "Failed_Time",
        "Rating", "Customer_Comment", "Barcodes",
        "Payment_Date", "Payment_Slip_Url",
        "Billing_Status", "Invoice_No", "Billing_Date"
    ],
    "Fuel_Logs": ["Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate", "Odometer", "Liters", "Price_Total", "Station_Name", "Photo_Url"],
    "Maintenance_Logs": ["Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer", "Next_Due_Odometer", "Notes"],
    "Repair_Tickets": ["Ticket_ID", "Date_Report", "Driver_ID", "Vehicle_Plate", "Issue_Type", "Description", "Photo_Url", "Status", "Approver", "Cost_Total", "Date_Finish"],
    "Stock_Parts": ["Part_ID", "Part_Name", "Qty_On_Hand", "Unit_Price"],
    
    # --- จัดเรียงคอลัมน์ Master_Drivers ใหม่ ให้เป็นหมวดหมู่ ---
    "Master_Drivers": [
        # 1. ข้อมูลส่วนตัว
        "Driver_ID", "Driver_Name", "Role", "Mobile_No", "Line_User_ID", "Password",
        
        # 2. ข้อมูลรถ
        "Vehicle_Plate", "Vehicle_Type", "Max_Weight_kg", "Max_Volume_cbm",
        
        # 3. เอกสารและวันหมดอายุ (Grouped)
        "Insurance_Expiry", "Tax_Expiry", "Act_Expiry",
        
        # 4. การบำรุงรักษา
        "Current_Mileage", "Next_Service_Mileage", "Last_Service_Date",
        
        # 5. ข้อมูลการเงิน
        "Bank_Name", "Bank_Account_No", "Bank_Account_Name",
        
        # 6. ระบบติดตาม
        "Driver_Score", "Current_Lat", "Current_Lon", "Last_Update"
    ],
    # --------------------------------------------------------

    "Master_Customers": [
        "Customer_ID", "Customer_Name", "Default_Origin", "Contact_Person", "Phone",
        "Address", "Tax_ID"  # <--- เพิ่ม 2 คอลัมน์นี้
    ],
    "Master_Routes": ["Route_Name", "Origin", "Map_Link Origin", "Destination", "Map_Link Destination", "Distance_KM"],
    "System_Config": ["Key", "Value", "Description"],
    "Rate_Card": ["Distance_KM", "Price_4W", "Price_6W", "Price_10W"]
}

def retry_on_quota_error(max_retries=3, delay=2):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "Quota" in error_str or "APIError" in error_str:
                        time.sleep(delay * (2 ** attempt))
                    else:
                        print(f"Database Error: {error_str}")
                        break
            return {} if "load" in func.__name__ else False
        return wrapper
    return decorator

@st.cache_data(ttl=60)
@retry_on_quota_error() 
def load_all_data():
    conn = get_connection()
    data = {}
    for name, schema_cols in SCHEMAS.items():
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            if df.empty or len(df.columns) == 0:
                df = pd.DataFrame(columns=schema_cols)
            
            # Auto-fill missing columns
            missing_cols = [c for c in schema_cols if c not in df.columns]
            if missing_cols:
                for c in missing_cols: df[c] = ""

            # Force specific columns to string
            cols_to_force_string = [
                'Job_ID', 'Driver_ID', 'Customer_ID', 'Vehicle_Plate', 
                'Bank_Account_No', 'Mobile_No', 'Bank_Account_Name'
            ]
            for col in cols_to_force_string:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.replace(r'\.0$', '', regex=True).str.strip()
                    df.loc[df[col] == 'nan', col] = ""
            
            # *** สำคัญ: จัดเรียงคอลัมน์ใหม่ตาม Schema เพื่อความสวยงาม ***
            # ถ้ามีคอลัมน์เกินมา (เช่น User สร้างเองใน Excel) ก็จะเก็บไว้ต่อท้าย
            valid_cols = [c for c in schema_cols if c in df.columns]
            extra_cols = [c for c in df.columns if c not in schema_cols]
            df = df[valid_cols + extra_cols]
            
            data[name] = df
        except:
            data[name] = pd.DataFrame(columns=schema_cols)
    return data

def get_data(worksheet_name):
    if 'data_store' not in st.session_state:
        st.session_state.data_store = load_all_data()
    df = st.session_state.data_store.get(worksheet_name, pd.DataFrame())
    if df.empty and worksheet_name in SCHEMAS:
        return pd.DataFrame(columns=SCHEMAS[worksheet_name])
    return df

@retry_on_quota_error()
def append_to_sheet(worksheet_name, row_data):
    conn = get_connection()
    try:
        current_df = conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
        if current_df.empty or len(current_df.columns) == 0:
            current_cols = SCHEMAS.get(worksheet_name, [])
            current_df = pd.DataFrame(columns=current_cols)
        else:
            current_cols = current_df.columns.tolist()

        if isinstance(row_data, dict):
            aligned_data = {k: row_data.get(k, "") for k in current_cols}
            new_row_df = pd.DataFrame([aligned_data])
        elif isinstance(row_data, list):
            new_row_df = pd.DataFrame([row_data], columns=current_cols)
        else: return False

        current_df = current_df.dropna(how='all')
        updated_df = pd.concat([current_df, new_row_df], ignore_index=True)
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=updated_df)
        st.session_state.data_store = load_all_data()
        return True
    except Exception as e:
        print(f"Append Error: {e}")
        return False

@retry_on_quota_error()
def update_sheet(worksheet_name, df):
    conn = get_connection()
    try:
        conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
        st.session_state.data_store = load_all_data()
        return True
    except: return False