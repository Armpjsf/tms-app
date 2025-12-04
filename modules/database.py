import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore

# ID ของ Google Sheet
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ" # <-- ใส่ ID ของคุณที่นี่
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

@st.cache_data(ttl=300)
def load_all_data():
    conn = get_connection()
    data = {}
    sheet_names = [
        "Jobs_Main", "Master_Drivers", "Master_Customers", "Master_Routes",
        "Fuel_Logs", "Maintenance_Logs", "Rate_Card", "System_Config",
        "Stock_Parts", "Repair_Tickets"
    ]
    for name in sheet_names:
        try:
            df = conn.read(spreadsheet=SHEET_URL, worksheet=name, ttl=0)
            data[name] = df
        except:
            data[name] = pd.DataFrame()

    # Pre-processing
    if not data['Jobs_Main'].empty:
        data['Jobs_Main']['Plan_Date'] = pd.to_datetime(data['Jobs_Main']['Plan_Date'], errors='coerce')
        for c in ['Est_Distance_KM', 'Price_Customer', 'Cost_Driver_Total']:
             if c in data['Jobs_Main'].columns:
                 data['Jobs_Main'][c] = pd.to_numeric(data['Jobs_Main'][c], errors='coerce').fillna(0)

    if not data['Master_Drivers'].empty:
        data['Master_Drivers']['Driver_ID'] = data['Master_Drivers']['Driver_ID'].astype(str)
        if 'Current_Mileage' in data['Master_Drivers'].columns:
            data['Master_Drivers']['Current_Mileage'] = pd.to_numeric(data['Master_Drivers']['Current_Mileage'], errors='coerce').fillna(0)

    if not data['Fuel_Logs'].empty:
        data['Fuel_Logs']['Odometer'] = pd.to_numeric(data['Fuel_Logs']['Odometer'], errors='coerce')
        data['Fuel_Logs']['Liters'] = pd.to_numeric(data['Fuel_Logs']['Liters'], errors='coerce')
        data['Fuel_Logs']['Price_Total'] = pd.to_numeric(data['Fuel_Logs']['Price_Total'], errors='coerce')
        data['Fuel_Logs']['Date_Time'] = pd.to_datetime(data['Fuel_Logs']['Date_Time'], errors='coerce')
        
    if not data['Maintenance_Logs'].empty:
        data['Maintenance_Logs']['Odometer'] = pd.to_numeric(data['Maintenance_Logs']['Odometer'], errors='coerce')
        data['Maintenance_Logs']['Date_Service'] = pd.to_datetime(data['Maintenance_Logs']['Date_Service'], errors='coerce')

    return data

def get_data(worksheet_name):
    if 'data_store' not in st.session_state:
        st.session_state.data_store = load_all_data()
    return st.session_state.data_store.get(worksheet_name, pd.DataFrame())

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
    st.cache_data.clear()
    if 'data_store' in st.session_state: del st.session_state['data_store']
    
def get_connection_direct():
    return get_connection()