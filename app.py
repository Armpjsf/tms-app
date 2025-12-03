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

# ID ของ Google Sheet ของคุณ
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
    except Exception as e:
        # st.error(f"Error reading {worksheet_name}: {e}")
        return pd.DataFrame()

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)

@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8')

# --- ฟังก์ชันย่อรูปภาพ (ป้องกัน Google Sheet เต็ม/พัง) ---
def compress_image(image_file):
    if image_file is None:
        return "-"
    try:
        # เปิดรูป
        img = Image.open(image_file)
        # แปลงเป็น RGB (เผื่อเป็น PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # ย่อขนาด (Max Width 600px)
        max_width = 600
        ratio = max_width / float(img.size[0])
        new_height = int((float(img.size[1]) * float(ratio)))
        img = img.resize((max_width, new_height), Image.LANCZOS)
        
        # บันทึกลง Buffer (ลดคุณภาพเหลือ 50%)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=50)
        img_bytes = buffer.getvalue()
        
        # แปลงเป็น Base64 string
        encoded = base64.b64encode(img_bytes).decode()
        return f"data:image/jpeg;base64,{encoded}"
    except Exception as e:
        print(f"Image Error: {e}")
        return "-"

# ---------------------------------------------------------
# 3. Business Logic Functions
# ---------------------------------------------------------
def get_status_label_th(status_code: str) -> str:
    """แปลงโค้ดสถานะเป็นข้อความภาษาไทยสำหรับแสดงผล"""
    mapping = {
        "PLANNED": "วางแผนแล้ว",
        "ASSIGNED": "จ่ายงานให้คนขับแล้ว",
        "PICKED_UP": "รับสินค้าแล้ว",
        "IN_TRANSIT": "กำลังขนส่ง",
        "DELIVERED": "ถึงปลายทางแล้ว",
        "COMPLETED": "ปิดงานสมบูรณ์",
        "FAILED": "ส่งไม่สำเร็จ",
        "CANCELLED": "ยกเลิกงาน",
        "Completed": "ปิดงานสมบูรณ์",
        "Pending": "รอดำเนินการ",
        "": "ไม่ทราบสถานะ",
    }
    return mapping.get(str(status_code), str(status_code))

def calculate_driver_cost(plan_date, distance, vehicle_type):
    """คำนวณค่าจ้าง (อ้างอิง Tab Rate_Card)"""
    try:
        rates = get_data("Rate_Card")
        if rates.empty: return 0
        
        # แปลงข้อมูลวันที่ (รองรับหลาย Format)
        plan_date = pd.to_datetime(plan_date)
        rates['Start_Date'] = pd.to_datetime(rates['Start_Date'], dayfirst=True, errors='coerce')
        rates['End_Date'] = pd.to_datetime(rates['End_Date'], dayfirst=True, errors='coerce')
        rates['Max_KM'] = pd.to_numeric(rates['Max_KM'], errors='coerce')
        
        # 1. กรองช่วงวันที่
        active_rate = rates[(rates['Start_Date'] <= plan_date) & (rates['End_Date'] >= plan_date)]
        if active_rate.empty:
            # ใช้อันล่าสุดถ้าหาไม่เจอ
            if not rates['Start_Date'].isnull().all():
                active_rate = rates[rates['Start_Date'] == rates['Start_Date'].max()]
            else:
                return 0 

        # 2. กรองระยะทาง
        tier = active_rate[active_rate['Max_KM'] >= distance].sort_values(by='Max_KM').head(1)
        if tier.empty:
            tier = active_rate[active_rate['Max_KM'] == active_rate['Max_KM'].max()]

        # 3. เลือกราคาตามประเภทรถ
        price = 0
        v_type_str = str(vehicle_type)
        if "4" in v_type_str: price = tier.iloc[0]['Price_4W']
        elif "6" in v_type_str: price = tier.iloc[0]['Price_6W']
        elif "10" in v_type_str: price = tier.iloc[0]['Price_10W']
            
        return float(price)
    except: return 0

def calculate_customer_price_from_master_rate_card(distance_km, vehicle_type, fuel_band="30.01-33"):
    """คำนวณราคาค่าขนส่งลูกค้าจากตาราง MasterRate_Card"""
    try:
        df = get_data("MasterRate_Card")
        if df.empty:
            return float(distance_km) * 35

        # หา column index ของ band ราคาน้ำมันที่มีข้อความ fuel_band
        band_col = None
        for r in range(df.shape[0]):
            for c in range(df.shape[1]):
                val = str(df.iat[r, c])
                if fuel_band in val:
                    band_col = c
                    break
            if band_col is not None:
                break

        if band_col is None:
            return float(distance_km) * 35

        # หา column index สำหรับระยะทาง
        dist_col = 0
        for idx, col in enumerate(df.columns):
            col_str = str(col)
            if "ระยะทาง" in col_str or "distance" in col_str.lower():
                dist_col = idx
                break

        records = []
        for r in range(df.shape[0]):
            raw_dist = df.iat[r, dist_col]
            dist_val = pd.to_numeric(str(raw_dist).replace(",", ""), errors='coerce')
            if pd.isna(dist_val):
                continue

            # 3 คอลัมน์ถัดจาก band คือราคา 4,6,10 ล้อ ตามไฟล์ master เดิม
            vals = []
            for offset in range(3):
                col_i = band_col + offset
                if col_i >= df.shape[1]:
                    vals.append(float('nan'))
                else:
                    cell = str(df.iat[r, col_i]).replace(",", "").replace('"', "")
                    vals.append(pd.to_numeric(cell, errors='coerce'))

            if all(pd.isna(v) for v in vals):
                continue

            records.append({
                "distance": float(dist_val),
                "price_4": float(vals[0]) if not pd.isna(vals[0]) else None,
                "price_6": float(vals[1]) if not pd.isna(vals[1]) else None,
                "price_10": float(vals[2]) if not pd.isna(vals[2]) else None,
            })

        if not records:
            return float(distance_km) * 35

        # เรียงตามระยะทาง แล้วเลือก tier แรกที่ระยะทาง >= distance_km
        records = sorted(records, key=lambda x: x["distance"])
        target = None
        for rec in records:
            if rec["distance"] >= distance_km:
                target = rec
                break
        if target is None:
            target = records[-1]

        v_type_str = str(vehicle_type)
        price = None
        if "4" in v_type_str:
            price = target["price_4"]
        elif "6" in v_type_str:
            price = target["price_6"]
        elif "10" in v_type_str:
            price = target["price_10"]

        if price is None or pd.isna(price):
            return float(distance_km) * 35
        return float(price)
    except:
        return float(distance_km) * 35

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
            
            # บันทึกรูปและลายเซ็น (ถ้ามี)
            if photo_data != "-":
                df_jobs.at[i, 'Photo_Proof_Url'] = photo_data
            if signature_data != "-":
                df_jobs.at[i, 'Signature_Url'] = signature_data

            driver_id = df_jobs.at[i, 'Driver_ID']
            conn.update(spreadsheet=SHEET_URL, worksheet="Jobs_Main", data=df_jobs)
        
        # Sync Mileage to Driver
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
        if idx.empty:
            return False
        i = idx[0]
        df_jobs.at[i, 'Job_Status'] = new_status
        if extra_updates:
            for k, v in extra_updates.items():
                df_jobs.at[i, k] = v
        conn.update(spreadsheet=SHEET_URL, worksheet="Jobs_Main", data=df_jobs)
        return True
    except:
        return False

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
    """ดึงราคาน้ำมันล่าสุดจาก kapook.com (แก้ไข Regex แล้ว)"""
    try:
        url = "https://gasprice.kapook.com/gasprice.php#ptt"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8'
        
        if response.status_code != 200:
            print(f"Server returned status: {response.status_code}")
            return {}
            
        soup = BeautifulSoup(response.text, 'html.parser')
        fuel_prices = {}
        current_section = ""
        
        for section in soup.find_all(['h3', 'ul']):
            if section.name == 'h3':
                current_section = section.get_text(strip=True)
                fuel_prices[current_section] = {}
            elif section.name == 'ul' and current_section:
                for item in section.find_all('li'):
                    # ใช้ separator=" " เพื่อกันชื่อกับราคาติดกัน เช่น "Gasohol 9535.50" -> "Gasohol 95 35.50"
                    text = item.get_text(separator=" ", strip=True)
                    
                    # Regex ใหม่: 
                    # (.+?)   = ชื่อน้ำมัน (เอาทั้งหมดข้างหน้า)
                    # \s+     = ช่องว่าง
                    # ([\d,]+\.\d{2}) = ตัวเลขที่มีจุดทศนิยม 2 ตำแหน่ง (ราคา)
                    match = re.search(r'(.+?)\s+([\d,]+\.\d{2})', text)
                    
                    if match:
                        fuel_type = match.group(1).strip()
                        price = match.group(2).strip()
                        
                        # ลบพวกตัวเลขที่อาจติดมาในชื่อน้ำมัน (Clean up) ถ้าจำเป็น
                        # แต่ Regex นี้จะแยก "แก๊สโซฮอล์ 95" (Group 1) กับ "31.85" (Group 2) ออกจากกันได้ถูกต้อง
                        
                        fuel_prices[current_section][fuel_type] = price
        
        return fuel_prices
        
    except requests.RequestException as e:
        print(f"Connection error: {str(e)}")
        return {}
    except Exception as e:
        print(f"Parsing error: {str(e)}")
        return {}

# ---------------------------------------------------------
# 4. Main Application Logic
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
# 5. Admin Panel (แก้ไข Tab 7 เพิ่มเครื่องมือคำนวณราคา)
# ---------------------------------------------------------
def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    # เปลี่ยนชื่อ Tab 7 เป็น "⛽ ราคาน้ำมัน & 🧮 คำนวณราคา"
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Data", "🔧 งานซ่อม", "⛽ น้ำมัน", "🔩 สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน & 🧮 คำนวณราคา"
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
        if not customers_df.empty and 'Customer_ID' in customers_df.columns and 'Customer_Name' in customers_df.columns:
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
                
                vehicle_type = st.selectbox("ประเภทรถ (คำนวณค่าจ้าง)", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                route_name = st.text_input("ชื่อเส้นทาง")
            
            st.divider()
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("จุดรับสินค้า", value="คลังสินค้า A")
            with c4: dest = st.text_input("จุดส่งสินค้า")
            
            c5, c6 = st.columns(2)
            with c5: 
                est_dist = st.number_input("ระยะทาง (กม.)", min_value=0, value=100)
                st.caption("*ใช้ระยะทางนี้คำนวณค่าจ้างอัตโนมัติ")
            with c6: 
                map_link = st.text_input("Google Map Link (ถ้ามี)")

            st.divider()
            st.markdown("**Option ค่าบริการเพิ่มเติม**")
            o1, o2, o3 = st.columns(3)
            with o1:
                floors = st.number_input("ยกขึ้นชั้น (นับจากชั้น 2)", min_value=0, value=0)
            with o2:
                extra_helpers = st.number_input("เพิ่มคนลงของ (คน)", min_value=0, value=0)
            with o3:
                waiting_blocks = st.number_input("รอเกิน 3 ชม. (ชุด 3 ชม.)", min_value=0, value=0)

            o4, o5 = st.columns(2)
            with o4:
                is_return = st.checkbox("สินค้าคืน (+50%)", value=False)
            with o5:
                overnight_nights = st.number_input("ค้างคืน (คืน)", min_value=0, value=0)

            if st.form_submit_button("✅ บันทึกและจ่ายงาน", type="primary", use_container_width=True):
                customer_id = customer_map_id.get(selected_customer_raw, None)
                customer_name = customer_map_name.get(selected_customer_raw, "")
                if driver_id and customer_id is not None:
                    calc_cost = calculate_driver_cost(plan_date, est_dist, vehicle_type)
                    base_price = calculate_customer_price_from_master_rate_card(est_dist, vehicle_type, "30.01-33")

                    surcharge = 0
                    if floors > 0: surcharge += floors * 100
                    if extra_helpers > 0: surcharge += extra_helpers * 300
                    if waiting_blocks > 0: surcharge += waiting_blocks * 300
                    if overnight_nights > 0: surcharge += overnight_nights * 1000

                    price_customer = base_price + surcharge
                    if is_return: price_customer = price_customer * 1.5
                    
                    new_job = {
                        "Job_ID": auto_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer_id, "Customer_Name": customer_name,
                        "Route_Name": route_name, 
                        "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": map_link,
                        "Driver_ID": driver_id, "Vehicle_Plate": auto_plate, 
                        "Est_Distance_KM": est_dist,
                        "Price_Customer": price_customer,
                        "Cost_Driver_Total": calc_cost, 
                        "Actual_Delivery_Time": "", "Photo_Proof_Url": "", "Signature_Url": ""
                    }
                    if create_new_job(new_job):
                        st.success(f"จ่ายงานสำเร็จ! ต้นทุน: {calc_cost:,.0f} / ราคา: {price_customer:,.0f}")
                        time.sleep(1)
                        st.rerun()
        
        st.write("---")
        st.subheader("รายการงานล่าสุด")
        jobs_admin_view = get_data("Jobs_Main")
        st.dataframe(jobs_admin_view, use_container_width=True)

        # ฟอร์มเปลี่ยนคนขับ (กรณีฉุกเฉิน)
        if not jobs_admin_view.empty and not drivers_df.empty:
            with st.expander("เปลี่ยนคนขับ (กรณีฉุกเฉิน)"):
                editable_jobs = jobs_admin_view[jobs_admin_view['Job_Status'].isin([
                    'PLANNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'
                ])] if 'Job_Status' in jobs_admin_view.columns else jobs_admin_view

                if editable_jobs.empty:
                    st.info("ไม่มีงานที่สามารถเปลี่ยนคนขับได้")
                else:
                    c_ch1, c_ch2 = st.columns(2)
                    with c_ch1:
                        job_id_selected = st.selectbox(
                            "เลือกงาน (Job_ID)",
                            editable_jobs['Job_ID'].astype(str).unique()
                        )
                    with c_ch2:
                        new_driver_select = st.selectbox("เลือกคนขับใหม่", driver_options, key="new_drv_sel")
                    
                    if st.button("บันทึกการเปลี่ยนคนขับ"):
                        new_d_id = new_driver_select.split(" : ")[0]
                        new_plate = driver_map.get(new_driver_select, "")
                        updates = {"Driver_ID": new_d_id, "Vehicle_Plate": new_plate}
                        if simple_update_job_status(job_id_selected, "ASSIGNED", updates):
                            st.success(f"เปลี่ยนคนขับงาน {job_id_selected} เป็น {new_d_id} สำเร็จ")
                            time.sleep(1)
                            st.rerun()

        # Dashboard Summary in Tab 1 (Optional)
        st.divider()
        st.subheader("Control Tower - ภาพรวมงานขนส่ง")
        df_ctrl = get_data("Jobs_Main")
        if not df_ctrl.empty:
            if 'Plan_Date' in df_ctrl.columns:
                df_ctrl['Plan_Date'] = pd.to_datetime(df_ctrl['Plan_Date'], errors='coerce')
            if 'Job_Status' in df_ctrl.columns:
                df_ctrl['Job_Status_TH'] = df_ctrl['Job_Status'].apply(get_status_label_th)

            c_f1, c_f2 = st.columns(2)
            with c_f1:
                date_min = df_ctrl['Plan_Date'].min() if 'Plan_Date' in df_ctrl.columns else None
                date_max = df_ctrl['Plan_Date'].max() if 'Plan_Date' in df_ctrl.columns else None
                if pd.notna(date_min) and pd.notna(date_max):
                    start_default = date_min.date()
                    end_default = date_max.date()
                    date_range = st.date_input("ช่วงวันที่", (start_default, end_default))
                    if isinstance(date_range, tuple) and len(date_range) == 2:
                        start_d, end_d = date_range
                        mask_date = (df_ctrl['Plan_Date'].dt.date >= start_d) & (df_ctrl['Plan_Date'].dt.date <= end_d)
                        df_ctrl = df_ctrl[mask_date]
            with c_f2:
                if 'Job_Status' in df_ctrl.columns:
                    status_unique = sorted(df_ctrl['Job_Status'].dropna().unique())
                    status_selected = st.multiselect("สถานะ", status_unique, default=status_unique)
                    df_ctrl = df_ctrl[df_ctrl['Job_Status'].isin(status_selected)]

            cols_view = [c for c in [
                'Job_ID', 'Plan_Date', 'Customer_Name', 'Route_Name',
                'Driver_ID', 'Vehicle_Plate', 'Job_Status_TH',
                'Actual_Delivery_Time'
            ] if c in df_ctrl.columns]
            st.dataframe(df_ctrl[cols_view], use_container_width=True)
            
            # ePOD Viewer
            st.markdown("**ePOD Viewer**")
            job_ids = df_ctrl['Job_ID'].astype(str).unique()
            selected_job_id_epod = st.selectbox("เลือกงานดูรูป ePOD", job_ids, key="epod_sel")
            if selected_job_id_epod:
                row = df_ctrl[df_ctrl['Job_ID'].astype(str) == str(selected_job_id_epod)]
                if not row.empty:
                    rec = row.iloc[0]
                    col1, col2 = st.columns(2)
                    with col1:
                        st.caption("รูปสินค้า")
                        img_data = rec.get('Photo_Proof_Url', '-')
                        if len(str(img_data)) > 50: # Check if base64/url
                            st.image(img_data, use_container_width=True)
                        else: st.info("-")
                    with col2:
                        st.caption("ลายเซ็น")
                        sig_data = rec.get('Signature_Url', '-')
                        if len(str(sig_data)) > 50:
                            st.image(sig_data, use_container_width=True)
                        else: st.info("-")

    # --- Tab 2: Profit & Data ---
    with tab2:
        st.subheader("📊 วิเคราะห์กำไรและข้อมูล")
        
        df_jobs = get_data("Jobs_Main")
        df_repair = get_data("Repair_Tickets") 
        df_fuel = get_data("Fuel_Logs")
        
        if not df_jobs.empty and 'Plan_Date' in df_jobs.columns:
            df_jobs['Plan_Date'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
            df_jobs['Month_Year'] = df_jobs['Plan_Date'].dt.strftime('%Y-%m')
        
        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("วันที่เริ่มต้น", value=datetime.today())
        with col2:
            end_date = st.date_input("วันที่สิ้นสุด", value=datetime.today())
        
        if not df_jobs.empty:
            mask = (df_jobs['Plan_Date'].dt.date >= start_date) & (df_jobs['Plan_Date'].dt.date <= end_date)
            filtered_df = df_jobs[mask].copy()
            
            if 'Price_Customer' in filtered_df.columns:
                filtered_df['Revenue'] = pd.to_numeric(filtered_df['Price_Customer'], errors='coerce').fillna(0)
            else: filtered_df['Revenue'] = 0
                
            if 'Cost_Driver_Total' in filtered_df.columns:
                filtered_df['Expense'] = pd.to_numeric(filtered_df['Cost_Driver_Total'], errors='coerce').fillna(0)
            else: filtered_df['Expense'] = 0
                
            filtered_df['Profit'] = filtered_df['Revenue'] - filtered_df['Expense']
            
            total_fuel = pd.to_numeric(df_fuel['Price_Total'], errors='coerce').sum() if not df_fuel.empty else 0
            total_repair = pd.to_numeric(df_repair['Cost_Total'], errors='coerce').sum() if not df_repair.empty else 0
            
            total_revenue = filtered_df['Revenue'].sum()
            total_expense = filtered_df['Expense'].sum()
            net_profit = total_revenue - (total_expense + total_fuel + total_repair)
            
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("รายรับรวม", f"{total_revenue:,.0f} บาท")
            k2.metric("ค่าจ้างรถร่วม", f"{total_expense:,.0f} บาท")
            k3.metric("ค่าน้ำมัน+ซ่อม", f"{total_fuel + total_repair:,.0f} บาท")
            k4.metric("กำไรสุทธิ", f"{net_profit:,.0f} บาท")
            
            if 'Month_Year' in filtered_df.columns:
                monthly_data = filtered_df.groupby('Month_Year').agg({'Revenue': 'sum', 'Expense': 'sum'}).reset_index()
                if not monthly_data.empty:
                    fig = px.bar(monthly_data, x='Month_Year', y=['Revenue', 'Expense'], barmode='group')
                    st.plotly_chart(fig, use_container_width=True)
            
            csv = convert_df_to_csv(filtered_df)
            st.download_button("ดาวน์โหลดข้อมูล (CSV)", data=csv, file_name='profit_report.csv', mime='text/csv')

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔧 รายการแจ้งซ่อม")
        tickets = get_data("Repair_Tickets")
        if not tickets.empty:
            st.dataframe(tickets, use_container_width=True)
            with st.expander("อนุมัติ/ปิดงานซ่อม"):
                ticket_id = st.selectbox("Ticket ID", tickets['Ticket_ID'].unique())
                if ticket_id:
                    c1, c2 = st.columns(2)
                    with c1: new_status = st.selectbox("สถานะ", ["Approved", "Done"], index=0)
                    with c2: cost = st.number_input("ค่าใช้จ่ายจริง (บาท)", 0.0)
                    if st.button("อัปเดตสถานะ"):
                        idx = tickets[tickets['Ticket_ID'] == ticket_id].index[0]
                        tickets.at[idx, 'Status'] = new_status
                        tickets.at[idx, 'Cost_Total'] = cost
                        if new_status == "Done":
                            tickets.at[idx, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                        update_sheet("Repair_Tickets", tickets)
                        st.success("บันทึกแล้ว")
                        st.rerun()
        else:
            st.info("ไม่มีรายการแจ้งซ่อม")

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ประวัติการเติมน้ำมัน")
        fuel_logs = get_data("Fuel_Logs")
        if not fuel_logs.empty:
            st.dataframe(fuel_logs, use_container_width=True)
        else:
            st.info("ไม่มีข้อมูล")

    # --- Tab 5: Stock ---
    with tab5:
        c1, c2 = st.columns([2, 1])
        parts = get_data("Stock_Parts")
        with c1:
            st.subheader("รายการอะไหล่")
            st.dataframe(parts, use_container_width=True)
        with c2:
            st.subheader("รับเข้า")
            with st.form("add_part"):
                p_name = st.text_input("ชื่ออะไหล่")
                p_qty = st.number_input("จำนวน", 1)
                if st.form_submit_button("เพิ่ม"):
                    new_part = {"Part_ID": f"P-{len(parts)+1:03d}", "Part_Name": p_name, "Qty_On_Hand": p_qty}
                    update_sheet("Stock_Parts", pd.concat([parts, pd.DataFrame([new_part])], ignore_index=True))
                    st.rerun()

    # --- Tab 6: GPS ---
    with tab6:
        st.subheader("📍 ตำแหน่งรถปัจจุบัน")
        drivers = get_data("Master_Drivers")
        if not drivers.empty:
            drivers = drivers.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
            drivers['lat'] = pd.to_numeric(drivers['lat'], errors='coerce')
            drivers['lon'] = pd.to_numeric(drivers['lon'], errors='coerce')
            active = drivers.dropna(subset=['lat', 'lon'])
            
            if not active.empty:
                st.map(active[['lat', 'lon']])
                display_cols = ['Driver_Name', 'Vehicle_Plate', 'Last_Update']
                display_cols = [col for col in display_cols if col in active.columns]
                st.dataframe(active[display_cols])
            else:
                st.warning("ไม่พบพิกัดรถ")
        else:
            st.warning("ไม่พบข้อมูลคนขับ")
    
    # --- Tab 7: Fuel Prices & Price Calculator (ส่วนที่เพิ่มใหม่) ---
    with tab7:
        # ส่วนที่ 1: เครื่องมือคำนวณราคา (Price Calculator)
        st.subheader("🧮 ประเมินราคาค่าขนส่ง (Quotation Check)")
        st.caption("ตรวจสอบราคาก่อนเปิดงานจริง (ใช้เรตเดียวกับหน้าจ่ายงาน)")
        
        with st.container(border=True):
            col_cal1, col_cal2 = st.columns(2)
            
            with col_cal1:
                calc_date = st.date_input("วันที่ขนส่ง (เพื่อดึงเรต)", datetime.today(), key="calc_date")
                calc_vehicle = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"], key="calc_veh")
                calc_dist = st.number_input("ระยะทางประมาณการ (กม.)", min_value=0, value=100, key="calc_dist")
                
            with col_cal2:
                st.markdown("**Option เสริม**")
                c_opt1, c_opt2 = st.columns(2)
                with c_opt1:
                    calc_floors = st.number_input("ยกขึ้นชั้น", 0, key="calc_fl")
                    calc_helpers = st.number_input("เพิ่มคนยก", 0, key="calc_hlp")
                with c_opt2:
                    calc_wait = st.number_input("รอเกิน 3 ชม.", 0, key="calc_wt")
                    calc_night = st.number_input("ค้างคืน", 0, key="calc_nt")
                calc_return = st.checkbox("สินค้าคืน (+50%)", key="calc_ret")

            if st.button("🚀 คำนวณราคา", type="primary", use_container_width=True):
                # 1. คำนวณต้นทุน Driver
                est_cost = calculate_driver_cost(calc_date, calc_dist, calc_vehicle)
                
                # 2. คำนวณราคาลูกค้า Base Price
                est_base_price = calculate_customer_price_from_master_rate_card(calc_dist, calc_vehicle, "30.01-33")
                
                # 3. คำนวณ Surcharge
                surcharge = 0
                if calc_floors > 0: surcharge += calc_floors * 100
                if calc_helpers > 0: surcharge += calc_helpers * 300
                if calc_wait > 0: surcharge += calc_wait * 300
                if calc_night > 0: surcharge += calc_night * 1000
                
                est_total_price = est_base_price + surcharge
                if calc_return:
                    est_total_price = est_total_price * 1.5
                
                est_profit = est_total_price - est_cost
                margin_percent = (est_profit / est_total_price * 100) if est_total_price > 0 else 0
                
                # แสดงผลลัพธ์
                st.divider()
                r1, r2, r3 = st.columns(3)
                r1.metric("💰 ราคาเสนอขาย (Revenue)", f"{est_total_price:,.2f} บาท")
                r2.metric("🚚 ต้นทุนรถร่วม (Cost)", f"{est_cost:,.2f} บาท")
                r3.metric("📈 กำไรเบื้องต้น (Profit)", f"{est_profit:,.2f} บาท", f"{margin_percent:.1f}%")
                
                st.info(f"หมายเหตุ: ราคาพื้นฐาน {est_base_price:,.2f} บาท + Option {surcharge:,.2f} บาท")

        st.divider()

        # ส่วนที่ 2: ราคาน้ำมัน (Fuel Prices) - ของเดิม
        st.subheader("⛽ ราคาน้ำมันล่าสุด")
        st.caption("อัปเดตล่าสุดจาก kapook.com")
        
        if 'fuel_prices' not in st.session_state:
            st.session_state.fuel_prices = {}
        
        if st.button("🔄 อัปเดตราคาล่าสุด", key="update_fuel"):
            with st.spinner("กำลังดึงข้อมูลราคาน้ำมันล่าสุด..."):
                fuel_prices = get_fuel_prices()
                if fuel_prices:
                    st.session_state.fuel_prices = fuel_prices
                    st.success("อัปเดตราคาน้ำมันเรียบร้อยแล้ว!")
                else:
                    st.error("ไม่สามารถดึงข้อมูลราคาน้ำมันได้")
        
        if st.session_state.fuel_prices:
            # PTT
            if 'ราคาน้ำมัน ปตท. (ptt)' in st.session_state.fuel_prices:
                ptt = st.session_state.fuel_prices['ราคาน้ำมัน ปตท. (ptt)']
                st.markdown("### ปตท. (PTT)")
                fuel_data = []
                for fuel, price in ptt.items():
                    unit = "บาท/กก." if "NGV" in fuel else "บาท/ลิตร"
                    fuel_data.append([fuel, f"{price} {unit}"])
                st.table(pd.DataFrame(fuel_data, columns=["ประเภทน้ำมัน", "ราคา"]))
            
            # Others
            other_stations = [s for s in st.session_state.fuel_prices.keys() if s != 'ราคาน้ำมัน ปตท. (ptt)']
            if other_stations:
                with st.expander("🔄 ดูราคาจากปั้มอื่นๆ"):
                    for station in other_stations:
                        st.markdown(f"#### {station}")
                        station_prices = st.session_state.fuel_prices[station]
                        station_data = []
                        for fuel, price in station_prices.items():
                            unit = "บาท/กก." if "NGV" in fuel else "บาท/ลิตร"
                            station_data.append([fuel, f"{price} {unit}"])
                        if station_data:
                            st.table(pd.DataFrame(station_data, columns=["ประเภทน้ำมัน", "ราคา"]))
        else:
            st.info("กรุณากดปุ่ม 'อัปเดตราคาล่าสุด' เพื่อดึงข้อมูล")

# ---------------------------------------------------------
# 6. Driver App (Mobile)
# ---------------------------------------------------------
def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱")
        st.info(f"คุณ: {st.session_state.driver_name}")
        if st.button("🚪 Logout", key="drv_out"):
            st.session_state.logged_in = False
            st.rerun()

    if 'page' not in st.session_state: 
        st.session_state.page = "list"
    
    # GPS Check-in
    c1, c2 = st.columns([3,1])
    with c1: 
        st.subheader("เมนูหลัก")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📍 เช็คอิน"):
            update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
            st.toast("ส่งพิกัดเรียบร้อย")

    menu = st.radio("เลือกรายการ:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
    st.write("---")
    
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Job_Status'] = df['Job_Status'].fillna('Pending')
                my_jobs = df[(df['Driver_ID'] == str(st.session_state.driver_id)) & (df['Job_Status'] != 'Completed')]
                
                if my_jobs.empty:
                    st.success("ไม่มีงานค้าง")
                else:
                    for i, job in my_jobs.iterrows():
                        with st.container(border=True):
                            st.markdown(f"**{job['Route_Name']}**")
                            st.caption(f"ส่ง: {job['Dest_Location']}")
                            
                            origin_enc = urllib.parse.quote(str(job['Origin_Location']))
                            dest_enc = urllib.parse.quote(str(job['Dest_Location']))
                            nav_url = f"https://www.google.com/maps/dir/?api=1&origin={origin_enc}&destination={dest_enc}&travelmode=driving"
                            
                            c_btn1, c_btn2 = st.columns(2)
                            c_btn1.link_button("🗺️ นำทาง", nav_url, use_container_width=True)
                            
                            if c_btn2.button("ส่งของ >", key=f"j_{job['Job_ID']}", use_container_width=True):
                                st.session_state.current_job = job.to_dict()
                                st.session_state.page = "action"
                                st.rerun()
            else: st.error("ไม่พบข้อมูล")

        elif st.session_state.page == "action":
            job = st.session_state.current_job
            df_cur = get_data("Jobs_Main")
            current_status = job.get('Job_Status', '')
            if not df_cur.empty and 'Job_ID' in df_cur.columns:
                try:
                    row = df_cur[df_cur['Job_ID'].astype(str) == str(job['Job_ID'])]
                    if not row.empty:
                        current_status = row.iloc[0].get('Job_Status', current_status)
                except: pass
            
            if st.button("< กลับ"):
                st.session_state.page = "list"
                st.rerun()
            
            st.info(f"ลูกค้า: {job['Customer_ID']}")
            st.caption(f"สถานะปัจจุบัน: {get_status_label_th(current_status)}")
            st.write(f"ส่งที่: {job['Dest_Location']}")
            
            st.write("---")
            st.write("🛠 **อัปเดตสถานะงาน**")
            c_s1, c_s2, c_s3, c_s4 = st.columns(4)
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with c_s1:
                if st.button("รับสินค้าแล้ว", key="btn_pickup"):
                    if simple_update_job_status(job['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now_str}):
                        st.toast("อัปเดตสถานะเป็นรับสินค้าแล้ว")
                        st.rerun()
            with c_s2:
                if st.button("ออกเดินทาง", key="btn_transit"):
                    if simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None):
                        st.toast("อัปเดตสถานะเป็นออกเดินทาง")
                        st.rerun()
            with c_s3:
                if st.button("ถึงปลายทาง", key="btn_delivered"):
                    if simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now_str}):
                        st.toast("อัปเดตสถานะเป็นถึงปลายทางแล้ว")
                        st.rerun()
            with c_s4:
                failed_reason = st.text_input("เหตุผลส่งไม่สำเร็จ", key="failed_reason")
                if st.button("ส่งไม่สำเร็จ", key="btn_failed"):
                    updates = {"Failed_Reason": failed_reason, "Failed_Time": now_str}
                    if simple_update_job_status(job['Job_ID'], "FAILED", updates):
                        st.toast("อัปเดตสถานะเป็นส่งไม่สำเร็จ")
                        st.rerun()

            st.write("---")
            st.write("📸 **หลักฐานการส่ง (ePOD)**")
            img = st.camera_input("ถ่ายรูปสินค้า")
            st.write("✍️ **ลายเซ็นผู้รับ (ถ่ายรูปกระดาษเซ็น)**")
            sig = st.camera_input("ถ่ายรูปใบเซ็นรับ", key="sig_cam")

            if st.button("✅ ยืนยันปิดงาน", type="primary", use_container_width=True):
                if img:
                    with st.spinner("กำลังบันทึกและย่อรูป..."):
                        img_str = compress_image(img)
                        sig_str = compress_image(sig) if sig else "-"
                        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        dist = float(job.get('Est_Distance_KM', job.get('Price_Customer', 0)))
                        
                        update_job_status(job['Job_ID'], "Completed", now, dist, img_str, sig_str)
                        st.success("สำเร็จ!")
                        time.sleep(2)
                        st.session_state.page = "list"
                        st.rerun()
                else:
                    st.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")

    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกการเติมน้ำมัน")
        with st.form("fuel"):
            f_station = st.text_input("ปั๊ม/สถานที่")
            f_odo = st.number_input("เลขไมล์", min_value=0)
            f_liters = st.number_input("ลิตร", 0.0)
            f_price = st.number_input("ยอดเงิน (บาท)", 0.0)
            f_img = st.camera_input("ถ่ายรูปสลิป")
            
            if st.form_submit_button("บันทึก"):
                if f_price > 0:
                    img_str = compress_image(f_img)
                    fuel_data = {
                        "Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}",
                        "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "Driver_ID": st.session_state.driver_id,
                        "Vehicle_Plate": st.session_state.vehicle_plate,
                        "Odometer": f_odo, "Liters": f_liters, "Price_Total": f_price,
                        "Station_Name": f_station, "Photo_Url": img_str
                    }
                    if create_fuel_log(fuel_data):
                        st.success("บันทึกแล้ว")

    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("แจ้งอาการเสีย")
        with st.form("rep"):
            issue = st.selectbox("หมวดหมู่", ["เครื่องยนต์", "ยาง", "ช่วงล่าง", "อื่นๆ"])
            desc = st.text_area("รายละเอียด")
            f_img = st.camera_input("ถ่ายรูปอาการเสีย")
            
            if st.form_submit_button("ส่งเรื่อง"):
                img_str = compress_image(f_img)
                data = {
                    "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}",
                    "Date_Report": datetime.now().strftime("%Y-%m-%d"), 
                    "Driver_ID": st.session_state.driver_id, "Description": desc, 
                    "Status": "Pending", "Issue_Type": issue, 
                    "Vehicle_Plate": st.session_state.vehicle_plate,
                    "Photo_Url": img_str
                }
                if create_repair_ticket(data):
                    st.success("ส่งแล้ว รออนุมัติ")

# ---------------------------------------------------------
# 7. Login Page
# ---------------------------------------------------------
def login_page():
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        with st.form("login"):
            u = st.text_input("User ID")
            p = st.text_input("Password", type="password")
            if st.form_submit_button("Login", use_container_width=True):
                drivers = get_data("Master_Drivers")
                if not drivers.empty:
                    drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
                    user = drivers[drivers['Driver_ID'] == u]
                    if not user.empty and str(user.iloc[0]['Password']) == p:
                        st.session_state.logged_in = True
                        st.session_state.driver_id = u
                        st.session_state.driver_name = user.iloc[0]['Driver_Name']
                        st.session_state.vehicle_plate = user.iloc[0].get('Vehicle_Plate', '-')
                        st.session_state.user_role = user.iloc[0].get('Role', 'Driver')
                        st.rerun()
                    else: st.error("รหัสผ่านผิด")
                else: st.error("ไม่พบฐานข้อมูล")

if __name__ == "__main__":
    main()