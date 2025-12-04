import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import plotly.express as px # type: ignore
from datetime import datetime
import time
from streamlit_js_eval import get_geolocation # type: ignore
import base64
from PIL import Image # type: ignore
import io
import urllib.parse
import requests
from bs4 import BeautifulSoup # type: ignore
import re

# ---------------------------------------------------------
# 1. ตั้งค่าหน้าเว็บ & Database Config
# ---------------------------------------------------------
st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

# ID ของ Google Sheet
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

# ---------------------------------------------------------
# 2. Helper Functions (เครื่องมือช่วย)
# ---------------------------------------------------------
def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

def get_data(worksheet_name):
    conn = get_connection()
    try:
        return conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
    except:
        return pd.DataFrame()

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)

@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8-sig')

def compress_image(image_file):
    if image_file is None: return "-"
    try:
        img = Image.open(image_file)
        if img.mode != 'RGB': img = img.convert('RGB')
        max_width = 600
        ratio = max_width / float(img.size[0])
        new_height = int((float(img.size[1]) * float(ratio)))
        img = img.resize((max_width, new_height), Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=50)
        img_bytes = buffer.getvalue()
        encoded = base64.b64encode(img_bytes).decode()
        return f"data:image/jpeg;base64,{encoded}"
    except: return "-"

def process_multiple_images(image_file_list):
    if not image_file_list: return "-"
    try:
        images = []
        total_height = 0
        max_width = 400
        for img_file in image_file_list:
            img = Image.open(img_file)
            if img.mode != 'RGB': img = img.convert('RGB')
            ratio = max_width / float(img.size[0])
            new_height = int(float(img.size[1]) * float(ratio))
            img = img.resize((max_width, new_height), Image.LANCZOS)
            images.append(img)
            total_height += new_height
        
        merged_img = Image.new('RGB', (max_width, total_height), (255, 255, 255))
        y_offset = 0
        for img in images:
            merged_img.paste(img, (0, y_offset))
            y_offset += img.size[1]
            
        buffer = io.BytesIO()
        merged_img.save(buffer, format="JPEG", quality=40)
        encoded = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/jpeg;base64,{encoded}"
    except: return "-"

# --- ระบบ Config (ดึงค่าจาก Sheet System_Config) ---
# --- ระบบ Config (ฉบับแก้ปัญหาชื่อคอลัมน์ไม่ตรง) ---
def get_config_value(key, default_value):
    try:
        df = get_data("System_Config")
        if df.empty: return default_value
        
        # 1. พยายามหาคอลัมน์ Key (ไม่ว่าจะชื่อ Key เฉยๆ หรือ Key (ห้ามแก้))
        key_col = "Key"
        for col in df.columns:
            if "Key" in col: # ขอแค่มีคำว่า Key ก็เอา
                key_col = col
                break
                
        # 2. พยายามหาคอลัมน์ Value
        val_col = "Value"
        for col in df.columns:
            if "Value" in col: # ขอแค่มีคำว่า Value ก็เอา
                val_col = col
                break
        
        # 3. ค้นหาค่า
        if key_col in df.columns and val_col in df.columns:
            row = df[df[key_col] == key]
            if not row.empty:
                return float(row.iloc[0][val_col])
                
        return default_value
    except:
        return default_value

def get_consumption_rate_by_driver(driver_id):
    """หาอัตรากินน้ำมัน (ดึงค่าจาก Config)"""
    try:
        # ดึง Config มารอไว้
        rate_4w = get_config_value("fuel_4w", 11.5)
        rate_6w = get_config_value("fuel_6w", 5.5)
        rate_10w = get_config_value("fuel_10w", 3.5)
        
        drivers = get_data("Master_Drivers")
        if drivers.empty: return rate_4w
        
        drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
        row = drivers[drivers['Driver_ID'] == str(driver_id)]
        if row.empty: return rate_4w
        
        v_type = str(row.iloc[0].get('Vehicle_Type', '4 ล้อ'))
        
        if "พ่วง" in v_type or "เทรลเลอร์" in v_type: return 2.75 # Hardcode ไว้ก่อนหรือเพิ่ม config ได้
        elif "10" in v_type: return rate_10w
        elif "6" in v_type: return rate_6w
        else: return rate_4w
            
    except: return 11.5

def get_maintenance_status_all():
    """คำนวณสถานะซ่อมบำรุง (ดึงเกณฑ์จาก Config)"""
    try:
        drivers = get_data("Master_Drivers")
        maint_logs = get_data("Maintenance_Logs")
        if drivers.empty: return pd.DataFrame()
        
        drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
        drivers['Current_Mileage'] = pd.to_numeric(drivers['Current_Mileage'], errors='coerce').fillna(0)
        
        # ดึงเกณฑ์จาก Config
        oil_km = get_config_value("maint_oil_km", 10000)
        oil_days = get_config_value("maint_oil_days", 180)
        tire_km = get_config_value("maint_tire_km", 50000)
        tire_days = get_config_value("maint_tire_days", 730)
        
        rules = {
            "ถ่ายน้ำมันเครื่อง": [oil_km, oil_days],
            "เปลี่ยนยาง/ช่วงล่าง": [tire_km, tire_days],
            "เช็คระยะทั่วไป": [20000, 365] 
        }
        
        status_list = []
        for _, car in drivers.iterrows():
            plate = car.get('Vehicle_Plate', '-')
            cur_odo = car['Current_Mileage']
            
            for service_name, criteria in rules.items():
                limit_km, limit_days = criteria[0], criteria[1]
                last_service_odo = 0
                last_service_date = None
                
                if not maint_logs.empty:
                    maint_logs['Vehicle_Plate'] = maint_logs['Vehicle_Plate'].astype(str)
                    logs = maint_logs[(maint_logs['Vehicle_Plate'] == str(plate)) & (maint_logs['Service_Type'] == service_name)]
                    if not logs.empty:
                        last_service_odo = pd.to_numeric(logs['Odometer'], errors='coerce').max()
                        logs['Date_Service'] = pd.to_datetime(logs['Date_Service'], errors='coerce')
                        last_service_date = logs['Date_Service'].max()
                
                distance_run = cur_odo - last_service_odo
                days_run = (datetime.now() - last_service_date).days if last_service_date else 0
                
                status = "✅ ปกติ"
                is_due = False
                note = ""
                
                if distance_run >= limit_km:
                    status = "⚠️ ครบระยะทาง"
                    note = f"เกิน {distance_run - limit_km:,.0f} กม."
                    is_due = True
                elif days_run >= limit_days:
                    status = "⚠️ ครบกำหนดเวลา"
                    note = f"เกิน {days_run - limit_days} วัน"
                    is_due = True
                elif distance_run >= (limit_km * 0.9):
                    status = "🟡 ใกล้ครบระยะ"
                    note = f"เหลือ {limit_km - distance_run:,.0f} กม."
                
                status_list.append({
                    "Vehicle_Plate": plate, "Driver_Name": car['Driver_Name'], "Service_Type": service_name,
                    "Current_Mileage": cur_odo, "Last_Service_Odo": last_service_odo,
                    "Distance_Run": f"{distance_run:,.0f} กม.", "Days_Run": f"{days_run} วัน",
                    "Status": status, "Note": note, "Is_Due": is_due
                })
        return pd.DataFrame(status_list)
    except: return pd.DataFrame()

def get_last_fuel_odometer(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0
        df['Vehicle_Plate'] = df['Vehicle_Plate'].astype(str)
        my_logs = df[df['Vehicle_Plate'] == str(plate)]
        if my_logs.empty: return 0
        return float(pd.to_numeric(my_logs['Odometer'], errors='coerce').max())
    except: return 0

def calculate_actual_consumption(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0, 0, 0
        df['Vehicle_Plate'] = df['Vehicle_Plate'].astype(str)
        df['Odometer'] = pd.to_numeric(df['Odometer'], errors='coerce')
        df['Liters'] = pd.to_numeric(df['Liters'], errors='coerce')
        my_logs = df[df['Vehicle_Plate'] == str(plate)].sort_values(by='Odometer')
        if len(my_logs) < 2: return 0, 0, 0
        
        first_odo = my_logs.iloc[0]['Odometer']
        last_odo = my_logs.iloc[-1]['Odometer']
        total_dist = last_odo - first_odo
        total_liters = my_logs.iloc[1:]['Liters'].sum()
        
        if total_liters > 0: return total_dist / total_liters, total_dist, total_liters
        else: return 0, 0, 0
    except: return 0, 0, 0

def get_status_label_th(status_code: str) -> str:
    mapping = {
        "PLANNED": "วางแผนแล้ว", "ASSIGNED": "จ่ายงานให้คนขับแล้ว", "PICKED_UP": "รับสินค้าแล้ว",
        "IN_TRANSIT": "กำลังขนส่ง", "DELIVERED": "ถึงปลายทางแล้ว", "COMPLETED": "ปิดงานสมบูรณ์",
        "FAILED": "ส่งไม่สำเร็จ", "CANCELLED": "ยกเลิกงาน", "Completed": "ปิดงานสมบูรณ์", "Pending": "รอดำเนินการ"
    }
    return mapping.get(str(status_code), str(status_code))

def calculate_driver_cost(plan_date, distance, vehicle_type, current_diesel_price=None):
    try:
        df = get_data("Rate_Card")
        if df.empty: return 0
        dist_col_idx = 0
        for i, col_name in enumerate(df.columns):
            if "ระยะทาง" in str(col_name) or "Distance" in str(col_name):
                dist_col_idx = i
                break
        else:
            if "Unnamed" in str(df.columns[0]): dist_col_idx = 1
        
        dist_col_name = df.columns[dist_col_idx]
        df[dist_col_name] = pd.to_numeric(df[dist_col_name], errors='coerce')
        tier = df[df[dist_col_name] >= distance].sort_values(by=dist_col_name).head(1)
        if tier.empty: tier = df.sort_values(by=dist_col_name).tail(1)
        if tier.empty: return 0

        price = float(current_diesel_price) if current_diesel_price else 30.00
        group_offset = 1
        if price <= 27.00: group_offset = 0
        elif 27.01 <= price <= 30.00: group_offset = 1
        elif 30.01 <= price <= 32.00: group_offset = 2
        elif price > 32.00: group_offset = 3
            
        veh_offset = 0 
        if "6" in str(vehicle_type): veh_offset = 1
        elif "10" in str(vehicle_type): veh_offset = 2

        final_col_idx = dist_col_idx + 1 + (group_offset * 3) + veh_offset
        cost = tier.iloc[0, final_col_idx]
        return float(str(cost).replace(',', ''))
    except: return 0

def create_new_job(job_data):
    try:
        df = get_data("Jobs_Main")
        updated_df = pd.concat([df, pd.DataFrame([job_data])], ignore_index=True)
        update_sheet("Jobs_Main", updated_df)
        return True
    except: return False

def create_repair_ticket(ticket_data):
    try:
        df = get_data("Repair_Tickets")
        updated_df = pd.concat([df, pd.DataFrame([ticket_data])], ignore_index=True)
        update_sheet("Repair_Tickets", updated_df)
        return True
    except: return False

def create_fuel_log(fuel_data):
    try:
        df = get_data("Fuel_Logs")
        updated_df = pd.concat([df, pd.DataFrame([fuel_data])], ignore_index=True)
        update_sheet("Fuel_Logs", updated_df)
        
        # อัปเดตเลขไมล์ล่าสุดลง Master_Drivers ด้วย
        if 'Odometer' in fuel_data and 'Vehicle_Plate' in fuel_data:
            drv = get_data("Master_Drivers")
            drv['Vehicle_Plate'] = drv['Vehicle_Plate'].astype(str)
            idx = drv[drv['Vehicle_Plate'] == str(fuel_data['Vehicle_Plate'])].index
            if not idx.empty:
                drv.at[idx[0], 'Current_Mileage'] = fuel_data['Odometer']
                update_sheet("Master_Drivers", drv)
        return True
    except: return False

def update_job_status(job_id, new_status, timestamp, distance_run=0, photo_data="-", signature_data="-"):
    try:
        conn = get_connection()
        df_jobs = conn.read(spreadsheet=SHEET_URL, worksheet="Jobs_Main", ttl=0)
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        
        driver_id = None
        if not idx.empty:
            i = idx[0]
            df_jobs.at[i, 'Job_Status'] = new_status
            df_jobs.at[i, 'Actual_Delivery_Time'] = timestamp
            if photo_data != "-": df_jobs.at[i, 'Photo_Proof_Url'] = photo_data
            if signature_data != "-": df_jobs.at[i, 'Signature_Url'] = signature_data
            driver_id = df_jobs.at[i, 'Driver_ID']
            conn.update(spreadsheet=SHEET_URL, worksheet="Jobs_Main", data=df_jobs)
        
        if new_status == "Completed" and driver_id and distance_run > 0:
            df_drivers = conn.read(spreadsheet=SHEET_URL, worksheet="Master_Drivers", ttl=0)
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            if not d_idx.empty:
                try:
                    current = pd.to_numeric(df_drivers.at[d_idx[0], 'Current_Mileage'], errors='coerce')
                    if pd.isna(current): current = 0
                    df_drivers.at[d_idx[0], 'Current_Mileage'] = current + distance_run
                    df_drivers.at[d_idx[0], 'Last_Update'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df_drivers)
                except: pass
        return True
    except: return False

def simple_update_job_status(job_id, new_status, extra_updates=None):
    try:
        conn = get_connection()
        df_jobs = conn.read(spreadsheet=SHEET_URL, worksheet="Jobs_Main", ttl=0)
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        if idx.empty: return False
        i = idx[0]
        df_jobs.at[i, 'Job_Status'] = new_status
        if extra_updates:
            for k, v in extra_updates.items():
                df_jobs.at[i, k] = v
        conn.update(spreadsheet=SHEET_URL, worksheet="Jobs_Main", data=df_jobs)
        return True
    except: return False

def update_driver_location(driver_id, lat, lon):
    try:
        conn = get_connection()
        df = conn.read(spreadsheet=SHEET_URL, worksheet="Master_Drivers", ttl=0)
        df['Driver_ID'] = df['Driver_ID'].astype(str)
        idx = df[df['Driver_ID'] == str(driver_id)].index
        if not idx.empty:
            df.at[idx[0], 'Current_Lat'] = lat
            df.at[idx[0], 'Current_Lon'] = lon
            df.at[idx[0], 'Last_Update'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df)
            return True
        return False
    except: return False

def get_fuel_prices():
    try:
        url = "https://gasprice.kapook.com/gasprice.php#ptt"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8'
        if response.status_code != 200: return {}
        soup = BeautifulSoup(response.text, 'html.parser')
        fuel_prices = {}
        current_section = ""
        for section in soup.find_all(['h3', 'ul']):
            if section.name == 'h3':
                current_section = section.get_text(strip=True)
                fuel_prices[current_section] = {}
            elif section.name == 'ul' and current_section:
                for item in section.find_all('li'):
                    text = item.get_text(separator=" ", strip=True)
                    match = re.search(r'(.+?)\s+([\d,]+\.\d{2})', text)
                    if match:
                        fuel_type = match.group(1).strip()
                        price = match.group(2).strip()
                        fuel_prices[current_section][fuel_type] = price
        return fuel_prices
    except: return {}

def log_maintenance_record(record):
    try:
        df = get_data("Maintenance_Logs")
        updated_df = pd.concat([df, pd.DataFrame([record])], ignore_index=True)
        update_sheet("Maintenance_Logs", updated_df)
        return True
    except: return False

# ---------------------------------------------------------
# 4. Main
# ---------------------------------------------------------
def main():
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False
        st.session_state.user_role = ""
        st.session_state.driver_id = ""

    if not st.session_state.logged_in:
        login_page()
    else:
        if st.session_state.user_role == "Admin":
            admin_flow()
        else:
            driver_flow()

# ---------------------------------------------------------
# 5. Admin Panel
# ---------------------------------------------------------
def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    # เพิ่ม Tab 8 (ตั้งค่า)
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Data", "🔧 MMS", "⛽ น้ำมัน", "🔩 สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน/คำนวณ", "⚙️ ตั้งค่าระบบ"
    ])

    # --- Tab 1: จ่ายงาน ---
    with tab1:
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        driver_options = []
        driver_map = {}
        if not drivers_df.empty:
             drivers_only = drivers_df[drivers_df['Role'] == 'Driver']
             for _, row in drivers_only.iterrows():
                 label = f"{row['Driver_ID']} : {row['Driver_Name']} ({row['Vehicle_Plate']})"
                 driver_options.append(label)
                 driver_map[label] = row.get('Vehicle_Plate', '')

        customers_df = get_data("Master_Customers")
        customer_options = []
        customer_map_id = {}
        customer_map_name = {}
        if not customers_df.empty and 'Customer_ID' in customers_df.columns:
            for _, row in customers_df.iterrows():
                label = f"{row['Customer_ID']} : {row['Customer_Name']}"
                customer_options.append(label)
                customer_map_id[label] = row['Customer_ID']
                customer_map_name[label] = row['Customer_Name']

        with st.form("create_job_form"):
            c1, c2 = st.columns(2)
            with c1:
                auto_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                st.text_input("Job ID", value=auto_id, disabled=True)
                plan_date = st.date_input("วันที่นัดหมาย", datetime.today())
                selected_customer_raw = st.selectbox("ลูกค้า", customer_options) if customer_options else ""
            with c2:
                selected_driver_raw = st.selectbox("เลือกคนขับ", driver_options)
                driver_id = selected_driver_raw.split(" : ")[0] if selected_driver_raw else ""
                auto_plate = driver_map.get(selected_driver_raw, "")
                vehicle_type = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                route_name = st.text_input("ชื่อเส้นทาง")
            
            st.divider()
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("จุดรับสินค้า", value="คลังสินค้า A")
            with c4: dest = st.text_input("จุดส่งสินค้า")
            c5, c6 = st.columns(2)
            with c5: est_dist = st.number_input("ระยะทาง (กม.)", min_value=0, value=100)
            with c6: map_link = st.text_input("Google Map Link")

            st.divider()
            # ดึงค่า Config มาใช้แสดง Default
            def_profit = get_config_value("price_profit", 1000)
            def_floor = get_config_value("opt_floor", 100)
            def_helper = get_config_value("opt_helper", 300)
            def_wait = get_config_value("opt_wait", 300)
            def_night = get_config_value("opt_night", 1000)

            st.markdown("**Option (คำนวณ Auto)**")
            o1, o2, o3 = st.columns(3)
            with o1: floors = st.number_input(f"ยกขึ้นชั้น ({def_floor:.0f}/ชั้น)", 0)
            with o2: extra_helpers = st.number_input(f"เพิ่มคนยก ({def_helper:.0f}/คน)", 0)
            with o3: waiting_blocks = st.number_input(f"รอเกิน ({def_wait:.0f}/3ชม.)", 0)
            o4, o5 = st.columns(2)
            with o4: is_return = st.checkbox("สินค้าคืน (+50%)", False)
            with o5: overnight_nights = st.number_input(f"ค้างคืน ({def_night:.0f}/คืน)", 0)

            st.divider()
            st.markdown("### 💰 กำหนดราคาเอง (Override)")
            m_col1, m_col2 = st.columns(2)
            with m_col1: manual_customer_price = st.number_input("ราคาขาย (บาท)", 0.0)
            with m_col2: manual_driver_cost = st.number_input("ต้นทุน (บาท)", 0.0)

            if st.form_submit_button("✅ จ่ายงาน", type="primary"):
                customer_id = customer_map_id.get(selected_customer_raw, None)
                customer_name = customer_map_name.get(selected_customer_raw, "")
                if driver_id and customer_id is not None:
                    # Auto Price
                    auto_cost = calculate_driver_cost(plan_date, est_dist, vehicle_type)
                    base_price = auto_cost + def_profit if auto_cost > 0 else 0
                    
                    surcharge = 0
                    if floors > 0: surcharge += floors * def_floor
                    if extra_helpers > 0: surcharge += extra_helpers * def_helper
                    if waiting_blocks > 0: surcharge += waiting_blocks * def_wait
                    if overnight_nights > 0: surcharge += overnight_nights * def_night
                    
                    auto_price_customer = base_price + surcharge
                    if is_return: auto_price_customer = auto_price_customer * 1.5
                    
                    final_customer_price = manual_customer_price if manual_customer_price > 0 else auto_price_customer
                    final_driver_cost = manual_driver_cost if manual_driver_cost > 0 else auto_cost

                    new_job = {
                        "Job_ID": auto_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer_id, "Customer_Name": customer_name,
                        "Route_Name": route_name, "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": map_link,
                        "Driver_ID": driver_id, "Vehicle_Plate": auto_plate, 
                        "Est_Distance_KM": est_dist, "Price_Customer": final_customer_price,
                        "Cost_Driver_Total": final_driver_cost, "Actual_Delivery_Time": "", "Photo_Proof_Url": "", "Signature_Url": ""
                    }
                    if create_new_job(new_job):
                        st.success("จ่ายงานสำเร็จ!")
                        time.sleep(1)
                        st.rerun()
        
        st.write("---")
        st.subheader("รายการงานล่าสุด")
        jobs_admin_view = get_data("Jobs_Main")
        if not jobs_admin_view.empty:
            st.dataframe(jobs_admin_view, use_container_width=True,
                column_config={
                    "Photo_Proof_Url": st.column_config.ImageColumn("รูป ePOD"),
                    "GoogleMap_Link": st.column_config.LinkColumn("แผนที่งาน", display_text="เปิด Map")
                }
            )

    # --- Tab 2: Profit ---
    with tab2:
        st.subheader("📊 สรุปข้อมูล")
        df_jobs = get_data("Jobs_Main")
        df_fuel = get_data("Fuel_Logs")
        df_drivers = get_data("Master_Drivers")
        
        driver_map_name = {}
        driver_map_type = {}
        driver_map_link = {}
        
        if not df_drivers.empty:
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            for _, r in df_drivers.iterrows():
                driver_map_name[r['Driver_ID']] = r.get('Driver_Name', '-')
                driver_map_type[r['Driver_ID']] = r.get('Vehicle_Type', '-')
                lat = r.get('Current_Lat')
                lon = r.get('Current_Lon')
                if pd.notna(lat) and pd.notna(lon):
                    driver_map_link[r['Driver_ID']] = f"https://www.google.com/maps?q={lat},{lon}"
                else: driver_map_link[r['Driver_ID']] = "-"

        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1: start_date = st.date_input("📅 เริ่มต้น", datetime.today().replace(day=1))
            with c2: end_date = st.date_input("📅 สิ้นสุด", datetime.today())

        if not df_jobs.empty:
            if 'Plan_Date' in df_jobs.columns:
                df_jobs['Plan_Date'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
                mask = (df_jobs['Plan_Date'].dt.date >= start_date) & (df_jobs['Plan_Date'].dt.date <= end_date)
                df_filtered = df_jobs[mask].copy()
            else: df_filtered = df_jobs.copy()

            for c in ['Est_Distance_KM', 'Price_Customer', 'Cost_Driver_Total']:
                if c in df_filtered.columns: df_filtered[c] = pd.to_numeric(df_filtered[c], errors='coerce').fillna(0)
            
            df_filtered['Driver_Name'] = df_filtered['Driver_ID'].astype(str).map(driver_map_name).fillna(df_filtered['Driver_ID'])
            if 'Vehicle_Type' not in df_filtered.columns:
                df_filtered['Vehicle_Type'] = df_filtered['Driver_ID'].astype(str).map(driver_map_type).fillna('-')
            if 'Customer_Name' not in df_filtered.columns: df_filtered['Customer_Name'] = '-'
            df_filtered['Current_Location_Link'] = df_filtered['Driver_ID'].astype(str).map(driver_map_link).fillna('-')

            st.markdown("### 🏆 Fleet Performance")
            summary = df_filtered.groupby('Vehicle_Plate').agg({
                'Job_ID': 'count', 'Est_Distance_KM': 'sum', 'Price_Customer': 'sum', 'Cost_Driver_Total': 'sum',
                'Driver_Name': 'first', 'Current_Location_Link': 'first',
                'Customer_Name': lambda x: ", ".join(sorted(set([str(i) for i in x if str(i) != '-'])))
            }).reset_index()
            
            fuel_sum = pd.DataFrame()
            if not df_fuel.empty:
                df_fuel['Date_Time'] = pd.to_datetime(df_fuel['Date_Time'], errors='coerce')
                mask_f = (df_fuel['Date_Time'].dt.date >= start_date) & (df_fuel['Date_Time'].dt.date <= end_date)
                df_ff = df_fuel[mask_f].copy()
                df_ff['Liters'] = pd.to_numeric(df_ff['Liters'], errors='coerce').fillna(0)
                df_ff['Price_Total'] = pd.to_numeric(df_ff['Price_Total'], errors='coerce').fillna(0)
                fuel_sum = df_ff.groupby('Vehicle_Plate').agg({'Liters': 'sum', 'Price_Total': 'sum'}).reset_index().rename(columns={'Price_Total': 'Fuel_Cost'})

            if not summary.empty:
                fleet = pd.merge(summary, fuel_sum, on='Vehicle_Plate', how='left').fillna(0)
                fleet['Profit'] = fleet['Price_Customer'] - fleet['Cost_Driver_Total'] - fleet['Fuel_Cost']
                fleet = fleet[['Vehicle_Plate', 'Driver_Name', 'Current_Location_Link', 'Job_ID', 'Customer_Name', 'Est_Distance_KM', 'Liters', 'Fuel_Cost', 'Cost_Driver_Total', 'Price_Customer', 'Profit']]
                fleet.columns = ['ทะเบียน', 'คนขับ', '📍 แผนที่', 'เที่ยว', 'ลูกค้า', 'ระยะทาง', 'น้ำมัน(ลิตร)', 'ค่าน้ำมัน', 'ค่าจ้าง', 'รายรับ', 'กำไร']
                st.dataframe(fleet, use_container_width=True, column_config={"📍 แผนที่": st.column_config.LinkColumn(display_text="เปิด Map"), "รายรับ": st.column_config.NumberColumn(format="%d"), "กำไร": st.column_config.NumberColumn(format="%d")})
                st.download_button("📥 Load CSV", convert_df_to_csv(fleet), "fleet_summary.csv")
            else: st.info("ไม่พบข้อมูล")

            st.divider()
            st.markdown("### 🌸 Customer View")
            if not df_filtered.empty:
                cols = ['Plan_Date', 'Customer_Name', 'Vehicle_Type', 'Origin_Location', 'Dest_Location', 'Est_Distance_KM', 'Price_Customer']
                cols = [c for c in cols if c in df_filtered.columns]
                cust = df_filtered[cols].copy()
                cust['Plan_Date'] = cust['Plan_Date'].dt.strftime('%d/%m/%Y')
                st.dataframe(cust, use_container_width=True)
                st.download_button("📥 Load Customer CSV", convert_df_to_csv(cust), "cust_report.csv")

            st.divider()
            st.markdown("### 🚙 Driver View")
            if not df_filtered.empty:
                cols_d = ['Vehicle_Plate', 'Driver_Name', 'Vehicle_Type', 'Origin_Location', 'Dest_Location', 'Est_Distance_KM', 'Cost_Driver_Total']
                cols_d = [c for c in cols_d if c in df_filtered.columns]
                drv = df_filtered[cols_d].copy()
                st.dataframe(drv, use_container_width=True)
                st.download_button("📥 Load Driver CSV", convert_df_to_csv(drv), "drv_report.csv")
        else: st.warning("ไม่มีข้อมูล")

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔔 แจ้งเตือนเช็คระยะ")
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            alerts = maint_df[maint_df['Is_Due'] == True]
            if not alerts.empty:
                st.error(f"⚠️ ถึงกำหนด {len(alerts)} รายการ")
                st.dataframe(alerts[['Vehicle_Plate', 'Service_Type', 'Status', 'Current_Mileage', 'Last_Service_Odo']], use_container_width=True)
            else: st.success("✅ รถทุกคันปกติ")
            with st.expander("ดูสถานะทั้งหมด"): st.dataframe(maint_df)
        
        with st.expander("🛠️ บันทึกการเข้าศูนย์ (Reset รอบ)"):
            with st.form("add_maint"):
                c1, c2 = st.columns(2)
                with c1:
                    d = get_data("Master_Drivers")
                    plates = d['Vehicle_Plate'].unique() if not d.empty else []
                    m_plate = st.selectbox("ทะเบียน", plates)
                    m_type = st.selectbox("รายการ", ["ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง/ช่วงล่าง", "เช็คระยะทั่วไป"])
                with c2:
                    m_date = st.date_input("วันที่", datetime.today())
                    m_odo = st.number_input("เลขไมล์", 0)
                    m_note = st.text_input("หมายเหตุ")
                if st.form_submit_button("บันทึก"):
                    rec = {"Log_ID": f"MT-{datetime.now().strftime('%y%m%d%H%M')}", "Date_Service": m_date.strftime("%Y-%m-%d"), "Vehicle_Plate": m_plate, "Service_Type": m_type, "Odometer": m_odo, "Notes": m_note}
                    if log_maintenance_record(rec): st.success("บันทึกแล้ว"); time.sleep(1); st.rerun()

        st.divider()
        st.subheader("🔧 แจ้งซ่อม (Breakdown)")
        tk = get_data("Repair_Tickets")
        if not tk.empty:
            st.dataframe(tk, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})
            with st.expander("อนุมัติงาน"):
                tid = st.selectbox("Ticket ID", tk['Ticket_ID'].unique())
                if tid:
                    c1, c2 = st.columns(2)
                    with c1: ns = st.selectbox("สถานะ", ["Approved", "Done"])
                    with c2: co = st.number_input("ค่าใช้จ่าย", 0.0)
                    if st.button("อัปเดต"):
                        idx = tk[tk['Ticket_ID']==tid].index[0]
                        tk.at[idx, 'Status'] = ns; tk.at[idx, 'Cost_Total'] = co
                        if ns=="Done": tk.at[idx, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                        update_sheet("Repair_Tickets", tk); st.success("Updated"); st.rerun()

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ประวัติการเติมน้ำมัน")
        fl = get_data("Fuel_Logs")
        if not fl.empty: st.dataframe(fl, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูปสลิป")})
        else: st.info("ไม่มีข้อมูล")

    # --- Tab 5: Stock ---
    with tab5:
        c1, c2 = st.columns([2, 1])
        parts = get_data("Stock_Parts")
        with c1: st.subheader("รายการอะไหล่"); st.dataframe(parts, use_container_width=True)
        with c2:
            st.subheader("รับเข้า")
            with st.form("add_part"):
                pn = st.text_input("ชื่ออะไหล่"); pq = st.number_input("จำนวน", 1)
                if st.form_submit_button("เพิ่ม"):
                    np = {"Part_ID": f"P-{len(parts)+1:03d}", "Part_Name": pn, "Qty_On_Hand": pq}
                    update_sheet("Stock_Parts", pd.concat([parts, pd.DataFrame([np])], ignore_index=True)); st.rerun()

    # --- Tab 6: GPS ---
    with tab6:
        st.subheader("📍 ตำแหน่งรถ")
        drv = get_data("Master_Drivers")
        if not drv.empty:
            drv = drv.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
            drv['lat'] = pd.to_numeric(drv['lat'], errors='coerce')
            drv['lon'] = pd.to_numeric(drv['lon'], errors='coerce')
            act = drv.dropna(subset=['lat', 'lon']).copy()
            if not act.empty:
                st.map(act[['lat', 'lon']])
                st.divider()
                act['Link'] = act.apply(lambda r: f"https://www.google.com/maps?q={r['lat']},{r['lon']}", axis=1)
                st.dataframe(act[['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Link']], use_container_width=True, column_config={"Link": st.column_config.LinkColumn("แผนที่", display_text="เปิด Map 🗺️")})
            else: st.warning("ไม่พบพิกัด")
        else: st.warning("ไม่พบข้อมูล")

    # --- Tab 7: Calc ---
    with tab7:
        st.subheader("🧮 คำนวณราคา (Cost + Profit)")
        # ดึง Config
        conf_profit = get_config_value("price_profit", 1000)
        
        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1:
                cd = st.date_input("วันที่", datetime.today())
                cv = st.selectbox("รถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                dis = st.number_input("ระยะทาง", 100)
            with c2:
                st.markdown("**Option**")
                o1, o2 = st.columns(2)
                with o1: fl = st.number_input("ยกชั้น", 0); hp = st.number_input("คนยก", 0)
                with o2: wt = st.number_input("รอ", 0); nt = st.number_input("ค้างคืน", 0)
                ret = st.checkbox("สินค้าคืน")

            if st.button("🚀 คำนวณ"):
                cur_dsl = 30.00
                cost = calculate_driver_cost(cd, dis, cv, current_diesel_price=cur_dsl)
                base = cost + conf_profit if cost > 0 else 0
                
                # ดึง Config Option
                sur = 0
                sur += fl * get_config_value("opt_floor", 100)
                sur += hp * get_config_value("opt_helper", 300)
                sur += wt * get_config_value("opt_wait", 300)
                sur += nt * get_config_value("opt_night", 1000)
                
                total = base + sur
                if ret: total = total * 1.5
                
                profit = total - cost
                st.divider()
                k1, k2, k3 = st.columns(3)
                k1.metric("ราคาขาย", f"{total:,.0f}")
                k2.metric("ต้นทุน", f"{cost:,.0f}")
                k3.metric("กำไร", f"{profit:,.0f}")

    # --- Tab 8: Settings (New!) ---
    with tab8:
        st.subheader("⚙️ ตั้งค่าระบบ (System Config)")
        st.caption("แก้ไขค่าต่างๆ ที่ใช้คำนวณในระบบได้ที่นี่ (กดแก้ไขในตารางแล้วกดบันทึก)")
        
        config_df = get_data("System_Config")
        
        if not config_df.empty:
            # ใช้ Data Editor ให้แก้ได้เลย
            edited_df = st.data_editor(
                config_df,
                use_container_width=True,
                num_rows="dynamic",
                disabled=["Key", "Description"], # ห้ามแก้ Key กับคำอธิบาย
                column_config={
                    "Value": st.column_config.NumberColumn("ค่าที่กำหนด", required=True),
                    "Key": st.column_config.TextColumn("รหัส (ห้ามแก้)", disabled=True),
                    "Description": st.column_config.TextColumn("คำอธิบาย", disabled=True)
                }
            )
            
            if st.button("💾 บันทึกการตั้งค่า", type="primary"):
                update_sheet("System_Config", edited_df)
                st.success("บันทึกเรียบร้อย! (ระบบจะใช้ค่าใหม่ทันที)")
                time.sleep(1)
                st.rerun()
        else:
            st.error("ไม่พบข้อมูล Config กรุณาสร้าง Sheet 'System_Config' ก่อน")

# ---------------------------------------------------------
# 6. Driver App
# ---------------------------------------------------------
def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱"); st.info(f"คุณ: {st.session_state.driver_name}")
        if st.button("🚪 Logout"): st.session_state.logged_in = False; st.rerun()

    if 'page' not in st.session_state: st.session_state.page = "list"
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("เมนูหลัก")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📍 เช็คอิน"): update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude']); st.toast("OK")

    menu = st.radio("เลือก:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True); st.write("---")
    
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                my = df[(df['Driver_ID'] == str(st.session_state.driver_id)) & (df['Job_Status'] != 'Completed')]
                if not my.empty:
                    for i, j in my.iterrows():
                        with st.container(border=True):
                            st.write(f"**{j['Route_Name']}** -> {j['Dest_Location']}")
                            if st.button("ส่งของ >", key=f"j_{j['Job_ID']}"): st.session_state.current_job = j.to_dict(); st.session_state.page = "action"; st.rerun()
                else: st.success("ไม่มีงาน")
        elif st.session_state.page == "action":
            j = st.session_state.current_job
            st.info(f"ลูกค้า: {j['Customer_ID']}"); st.write(f"ส่ง: {j['Dest_Location']}")
            if st.button("< กลับ"): st.session_state.page = "list"; st.rerun()
            
            c1, c2 = st.columns(2)
            with c1: 
                if st.button("รับของ"): simple_update_job_status(j['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}); st.toast("OK")
            with c2:
                if st.button("ถึงปลายทาง"): simple_update_job_status(j['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}); st.toast("OK")
            
            st.write("---")
            st.write("📸 **หลักฐาน (ePOD)**")
            u1 = st.file_uploader("เลือกรูป", accept_multiple_files=True, key="ep1")
            c1 = st.camera_input("ถ่ายรูป", key="ep2")
            sig = st.camera_input("ลายเซ็น", key="sig")
            
            if st.button("✅ ปิดงาน", type="primary"):
                imgs = []
                if u1: imgs.extend(u1)
                if c1: imgs.append(c1)
                if imgs:
                    img_str = process_multiple_images(imgs)
                    sig_str = compress_image(sig) if sig else "-"
                    dist = float(j.get('Est_Distance_KM', 0))
                    update_job_status(j['Job_ID'], "Completed", datetime.now().strftime("%Y-%m-%d %H:%M:%S"), dist, img_str, sig_str)
                    st.success("สำเร็จ"); time.sleep(1); st.session_state.page = "list"; st.rerun()
                else: st.error("ถ่ายรูปก่อน")

    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกน้ำมัน")
        pl = st.session_state.vehicle_plate
        last = get_last_fuel_odometer(pl)
        # ดึง Config มาคำนวณ
        rate = get_consumption_rate_by_driver(st.session_state.driver_id)
        
        st.info(f"ไมล์ล่าสุด: {last:,.0f} | เรต: {rate} กม./ลิตร")
        st = st.text_input("ปั๊ม")
        odo = st.number_input("ไมล์ปัจจุบัน", int(last))
        
        run = odo - last
        if run > 0: st.success(f"วิ่ง: {run} กม. | ควรเติม: {run/rate:.1f} ลิตร")
        
        lit = st.number_input("ลิตร", 0.0); money = st.number_input("บาท", 0.0)
        u2 = st.file_uploader("รูปสลิป", accept_multiple_files=True, key="fl1")
        c2 = st.camera_input("ถ่ายสลิป", key="fl2")
        
        if st.button("บันทึก"):
            imgs = []
            if u2: imgs.extend(u2)
            if c2: imgs.append(c2)
            if money > 0 and imgs:
                img_str = process_multiple_images(imgs)
                create_fuel_log({"Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}", "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "Driver_ID": st.session_state.driver_id, "Vehicle_Plate": pl, "Odometer": odo, "Liters": lit, "Price_Total": money, "Station_Name": st, "Photo_Url": img_str})
                st.success("Saved"); st.rerun()

    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("แจ้งซ่อม")
        # เช็คระยะ (ดึงจาก Config)
        maint = get_maintenance_status_all()
        if not maint.empty:
            my = maint[(maint['Vehicle_Plate']==str(st.session_state.vehicle_plate)) & (maint['Is_Due']==True)]
            if not my.empty: st.error("⚠️ ถึงรอบเช็คระยะแล้ว!"); st.dataframe(my[['Service_Type', 'Status']])
        
        with st.form("rp"):
            issue = st.selectbox("หมวด", ["เครื่องยนต์", "ยาง", "ช่วงล่าง"])
            desc = st.text_area("รายละเอียด")
            u3 = st.file_uploader("รูป", accept_multiple_files=True)
            if st.form_submit_button("ส่ง"):
                if u3:
                    img_str = process_multiple_images(u3)
                    create_repair_ticket({"Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}", "Date_Report": datetime.now().strftime("%Y-%m-%d"), "Driver_ID": st.session_state.driver_id, "Description": desc, "Status": "Pending", "Issue_Type": issue, "Vehicle_Plate": st.session_state.vehicle_plate, "Photo_Url": img_str})
                    st.success("Sent")

def login_page():
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        with st.form("login"):
            u = st.text_input("User ID"); p = st.text_input("Password", type="password")
            if st.form_submit_button("Login"):
                d = get_data("Master_Drivers")
                if not d.empty:
                    d['Driver_ID'] = d['Driver_ID'].astype(str)
                    usr = d[d['Driver_ID'] == u]
                    if not usr.empty and str(usr.iloc[0]['Password']) == p:
                        st.session_state.logged_in = True; st.session_state.driver_id = u; st.session_state.driver_name = usr.iloc[0]['Driver_Name']; st.session_state.vehicle_plate = usr.iloc[0].get('Vehicle_Plate', '-'); st.session_state.user_role = usr.iloc[0].get('Role', 'Driver'); st.rerun()
                    else: st.error("ผิด")

if __name__ == "__main__":
    main()