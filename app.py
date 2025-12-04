import streamlit as st # type: ignore
import pandas as pd # type: ignore
import plotly.express as px # type: ignore
from datetime import datetime
import time
import base64
from PIL import Image # type: ignore
import io
import urllib.parse
import requests
from bs4 import BeautifulSoup # type: ignore
import re
import pytz # type: ignore

# --- IMPORT OPTIONAL LIBS (ป้องกัน Error หากลืมลง Requirements) ---
try:
    from streamlit_gsheets import GSheetsConnection # type: ignore
    from streamlit_js_eval import get_geolocation # type: ignore
except ImportError as e:
    st.error(f"❌ Library Missing: {e}")
    st.stop()

# ---------------------------------------------------------
# 1. Config & Init (ต้องอยู่บรรทัดแรกสุดของ Streamlit)
# ---------------------------------------------------------
st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

# ID ของ Google Sheet
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

# ---------------------------------------------------------
# 2. Helper Functions
# ---------------------------------------------------------
def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

@st.cache_data(ttl=300)
def get_data(worksheet_name):
    conn = get_connection()
    try:
        return conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
    except:
        return pd.DataFrame()

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)
    st.cache_data.clear()

@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8-sig')

def get_thai_time_str():
    tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

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

def get_config_value(key, default_value):
    try:
        df = get_data("System_Config")
        if df.empty: return default_value
        
        key_col, val_col = "Key", "Value"
        for col in df.columns:
            if "Key" in col: key_col = col
            if "Value" in col: val_col = col
        
        row = df[df[key_col] == key]
        if not row.empty: return float(row.iloc[0][val_col])
        return default_value
    except: return default_value

def get_consumption_rate_by_driver(driver_id):
    try:
        rate_4w = get_config_value("fuel_4w", 11.5)
        rate_6w = get_config_value("fuel_6w", 5.5)
        rate_10w = get_config_value("fuel_10w", 3.5)
        
        drivers = get_data("Master_Drivers")
        if drivers.empty: return rate_4w
        
        drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
        row = drivers[drivers['Driver_ID'] == str(driver_id)]
        if row.empty: return rate_4w
        
        v_type = str(row.iloc[0].get('Vehicle_Type', '4 ล้อ'))
        if "พ่วง" in v_type or "เทรลเลอร์" in v_type: return 2.75
        elif "10" in v_type: return rate_10w
        elif "6" in v_type: return rate_6w
        else: return rate_4w
    except: return 11.5

def get_maintenance_status_all():
    try:
        drivers = get_data("Master_Drivers")
        maint_logs = get_data("Maintenance_Logs")
        if drivers.empty: return pd.DataFrame()
        
        drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
        drivers['Current_Mileage'] = pd.to_numeric(drivers['Current_Mileage'], errors='coerce').fillna(0)
        
        oil_km = get_config_value("maint_oil_km", 10000)
        oil_days = get_config_value("maint_oil_days", 180)
        tire_km = get_config_value("maint_tire_km", 50000)
        tire_days = get_config_value("maint_tire_days", 730)
        
        rules = {"ถ่ายน้ำมันเครื่อง": [oil_km, oil_days], "เปลี่ยนยาง/ช่วงล่าง": [tire_km, tire_days], "เช็คระยะทั่วไป": [20000, 365]}
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
                    status = "⚠️ ครบระยะทาง"; note = f"เกิน {distance_run - limit_km:,.0f} กม."; is_due = True
                elif days_run >= limit_days:
                    status = "⚠️ ครบกำหนดเวลา"; note = f"เกิน {days_run - limit_days} วัน"; is_due = True
                elif distance_run >= (limit_km * 0.9):
                    status = "🟡 ใกล้ครบระยะ"; note = f"เหลือ {limit_km - distance_run:,.0f} กม."
                
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
            st.cache_data.clear()
        
        if new_status == "Completed" and driver_id and distance_run > 0:
            df_drivers = conn.read(spreadsheet=SHEET_URL, worksheet="Master_Drivers", ttl=0)
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            if not d_idx.empty:
                try:
                    current = pd.to_numeric(df_drivers.at[d_idx[0], 'Current_Mileage'], errors='coerce')
                    if pd.isna(current): current = 0
                    df_drivers.at[d_idx[0], 'Current_Mileage'] = current + distance_run
                    df_drivers.at[d_idx[0], 'Last_Update'] = get_thai_time_str()
                    conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df_drivers)
                    st.cache_data.clear()
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
        st.cache_data.clear()
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
            df.at[idx[0], 'Last_Update'] = get_thai_time_str()
            conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df)
            st.cache_data.clear()
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

def sync_to_legacy_sheet(start_date, end_date):
    TARGET_ID = "1yy7TPgjW34rra6pBRCXaXb0IIDm1UpkuPcyRQ9POGw4"
    TARGET_URL = f"https://docs.google.com/spreadsheets/d/{TARGET_ID}/edit"
    TARGET_WORKSHEET = "Summary_Admin"
    
    try:
        df_jobs = get_data("Jobs_Main")
        df_drivers = get_data("Master_Drivers")
        if df_jobs.empty: return False, "ไม่มีข้อมูล"

        driver_map, veh_map = {}, {}
        if not df_drivers.empty:
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            for _, r in df_drivers.iterrows():
                driver_map[r['Driver_ID']] = r.get('Driver_Name', '-')
                veh_map[r['Driver_ID']] = r.get('Vehicle_Type', '-')

        current_fuel_price = "-"
        try:
            fuel_data = get_fuel_prices()
            if fuel_data:
                ptt = fuel_data.get('ราคาน้ำมัน ปตท. (ptt)', {})
                for k, v in ptt.items():
                    if "ดีเซล" in k:
                        current_fuel_price = v.replace(" บาท/ลิตร", "")
                        break
        except: pass

        if 'Plan_Date' in df_jobs.columns:
            df_jobs['Plan_Date'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
            mask = (df_jobs['Plan_Date'].dt.date >= start_date) & (df_jobs['Plan_Date'].dt.date <= end_date)
            df_export = df_jobs[mask].copy()
        else: return False, "ไม่พบคอลัมน์วันที่"
        
        if df_export.empty: return False, "ไม่พบงานในช่วงวันที่เลือก"

        final_data = []
        for _, row in df_export.iterrows():
            d_id = str(row.get('Driver_ID', ''))
            price_cust = float(pd.to_numeric(row.get('Price_Customer', 0), errors='coerce'))
            price_drv = float(pd.to_numeric(row.get('Cost_Driver_Total', 0), errors='coerce'))
            date_str = row['Plan_Date'].strftime('%d/%m/%Y') if pd.notna(row['Plan_Date']) else "-"

            record = {
                'วันที่': date_str, 'รหัสลูกค้า': row.get('Customer_ID', '-'), 'ลูกค้า': row.get('Customer_Name', '-'),
                'ประเภทรถ (ลูกค้า)': row.get('Vehicle_Type', '-'), 'จำนวนสินค้า': '-', 'ต้นทาง': row.get('Origin_Location', '-'),
                'ปลายทาง': row.get('Dest_Location', '-'), 'ระยะทาง (ลูกค้า)': row.get('Est_Distance_KM', 0),
                'ราคาน้ำมัน': current_fuel_price, 'ราคา (ลูกค้า)': price_cust, 'ค่าจัดเรียง/ค้างคืน': '-',
                'พ่วง (ลูกค้า)': '-', 'อื่นๆ (ลูกค้า)': '-', 'ตีกลับ (ลูกค้า)': '-', 'รวม (ลูกค้า)': price_cust,
                'ทะเบียน': row.get('Vehicle_Plate', '-'), 'ชื่อคนขับ': driver_map.get(d_id, '-'),
                'ประเภทรถ (คนขับ)': veh_map.get(d_id, '-'), 'ต้นทาง (รถร่วม)': row.get('Origin_Location', '-'),
                'ปลายทาง (รถร่วม)': row.get('Dest_Location', '-'), 'ระยะทาง (รถร่วม)': row.get('Est_Distance_KM', 0),
                'ราคา (รถร่วม)': price_drv, 'ค่าจัดเรียง (รถร่วม)': '-', 'พ่วง (รถร่วม)': '-',
                'อื่นๆ (รถร่วม)': '-', 'ตีกลับ (รถร่วม)': '-', 'รวม (รถร่วม)': price_drv
            }
            final_data.append(record)

        df_final = pd.DataFrame(final_data)
        conn = get_connection()
        conn.update(spreadsheet=TARGET_URL, worksheet=TARGET_WORKSHEET, data=df_final)
        return True, f"ส่งข้อมูล {len(df_final)} รายการ เรียบร้อย!"
    except Exception as e: return False, f"Error: {str(e)}"

def get_manual_content():
    return """
# 📘 คู่มือการใช้งานระบบ Logis-Pro 360

## 🌟 ภาพรวมระบบ
ระบบนี้แบ่งการใช้งานเป็น 2 ส่วนหลัก:
1. **Admin (Control Tower):** ใช้งานผ่านคอมพิวเตอร์ เพื่อจ่ายงาน, ดูรายงาน, และตรวจสอบตำแหน่งรถ
2. **Driver (Driver App):** ใช้งานผ่านมือถือ เพื่อดูงาน, ปิดงาน (ePOD), และบันทึกการเติมน้ำมัน

---

## 🖥️ ส่วนที่ 1: สำหรับ Admin

### 1. 📝 Tab 1: จ่ายงาน (Create Job)
* **เลือกเส้นทาง:** เลือก "กลุ่มงาน" และ "ปลายทาง" แล้วกดปุ่ม "⬇️ ใช้ข้อมูลเส้นทางนี้" ระบบจะดึงข้อมูลมาเติมให้อัตโนมัติ
* **เลือกคนขับ:** เลือกรถที่ต้องการจ่ายงาน
* **Option เสริม:** ใส่จำนวนชั้นที่ต้องยก, คนยก, หรือค้างคืน
* **💰 กำหนดราคาเอง:** หากต้องการระบุราคาเหมาพิเศษ ให้กรอกช่องนี้ (ถ้าปล่อย 0 ระบบจะคำนวณ Auto)
* กดปุ่ม **"✅ บันทึกและจ่ายงาน"**

### 2. 📊 Tab 2: Profit & Data (รายงาน)
* **ตาราง Fleet Performance:** ดูสรุปว่ารถแต่ละคัน วิ่งกี่เที่ยว, ใช้น้ำมันกี่ลิตร, กำไรเท่าไหร่
* **📍 แผนที่:** ในตารางมีคอลัมน์กดเพื่อดูตำแหน่งรถได้ทันที
* **📤 ส่งข้อมูลบัญชี:** เลื่อนลงล่างสุด กดปุ่ม "🚀 ส่งข้อมูลเข้า Sheet เดิม" เพื่อส่งข้อมูลเข้า Google Sheet บัญชี

### 3. 🔧 Tab 3: MMS (งานซ่อม & บำรุงรักษา)
* **🔔 แจ้งเตือน:** ถ้ารถคันไหนวิ่งครบระยะ (น้ำมันเครื่อง/ยาง) จะมีแถบสีแดงแจ้งเตือน
* **🛠️ บันทึกการเข้าศูนย์:** เมื่อซ่อมเสร็จ ให้มาบันทึกที่นี่เพื่อ Reset รอบการเตือน

### 4. ⚙️ Tab 8: ตั้งค่าระบบ
* ใช้สำหรับปรับเปลี่ยน **ราคากลาง, อัตรากินน้ำมัน, ค่าแรงยก** โดยไม่ต้องแก้โค้ด

---

## 📱 ส่วนที่ 2: สำหรับ Driver (คนขับรถ)

### 1. 📦 เมนู "งานของฉัน"
* **ดูงาน:** กดปุ่ม "ส่งของ >" เพื่อเริ่มงาน
* **นำทาง:** กดปุ่ม "🗺️ นำทาง" ระบบจะเปิด Google Maps พาไปปลายทางทันที
* **ปิดงาน (ePOD):**
    1. กด "📂 เลือกรูป" (เลือกจากอัลบั้มได้หลายรูป) หรือ "📸 ถ่ายรูป" (ถ่ายสด)
    2. ถ่ายรูป **ลายเซ็น** ลูกค้า
    3. กด "✅ ยืนยันปิดงาน"

### 2. ⛽ เมนู "เติมน้ำมัน" (สำคัญ!)
* **กรอกไมล์ปัจจุบัน:** ใส่เลขไมล์ที่หน้าปัดรถ แล้ว **แตะที่ว่าง 1 ครั้ง**
* **💡 ระบบคำนวณ:** จะมีแถบสีเขียวขึ้นบอกว่า "วิ่งมา xxx กม. ควรเติมประมาณ yy ลิตร"
* **ถ่ายรูป:** ถ่ายรูปสลิปและเลขไมล์ -> กดบันทึก

### 3. 🔧 เมนู "แจ้งซ่อม"
* ถ้าถึงรอบถ่ายน้ำมันเครื่อง/เปลี่ยนยาง จะมี **ตัวหนังสือสีแดง** เตือนทันที ให้แจ้งหัวหน้างาน

---
**💡 Tips:** หากข้อมูลไม่ขึ้น ให้กดปุ่ม "🔄 รีเฟรชข้อมูลล่าสุด" ที่เมนูซ้ายมือ
    """

# ---------------------------------------------------------
# 3. Admin Flow
# ---------------------------------------------------------
def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"): st.cache_data.clear(); st.rerun()
        if st.button("🚪 Logout", type="secondary"): st.session_state.logged_in = False; st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    # Init Session Vars (ป้องกันหน้าขาว)
    if 'form_route_name' not in st.session_state: st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state: st.session_state.form_origin = ""
    if 'form_dest' not in st.session_state: st.session_state.form_dest = ""
    if 'form_link_org' not in st.session_state: st.session_state.form_link_org = ""
    if 'form_link_dest' not in st.session_state: st.session_state.form_link_dest = ""
    if 'form_dist' not in st.session_state: st.session_state.form_dist = 100.0

    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Data", "🔧 MMS", "⛽ น้ำมัน", "🔩 สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน/คำนวณ", "⚙️ ตั้งค่าระบบ", "📖 คู่มือ"
    ])

    with tab1:
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        customers_df = get_data("Master_Customers")
        routes_df = get_data("Master_Routes")
        
        driver_options = []
        driver_map = {}
        if not drivers_df.empty:
             target_drivers = pd.DataFrame()
             if 'Role' in drivers_df.columns:
                 roles = drivers_df['Role'].astype(str).str.lower().str.strip()
                 target_drivers = drivers_df[roles.isin(['driver', 'คนขับ'])]
             if target_drivers.empty: target_drivers = drivers_df
             for _, row in target_drivers.iterrows():
                 d_id = str(row.get('Driver_ID', ''))
                 d_name = str(row.get('Driver_Name', ''))
                 d_plate = str(row.get('Vehicle_Plate', ''))
                 if d_id and d_id.lower() not in ['nan', 'none', '', 'null']:
                     label = f"{d_id} : {d_name} ({d_plate})"
                     driver_options.append(label)
                     driver_map[label] = d_plate

        customer_options = []
        customer_map_id = {}
        customer_map_name = {}
        if not customers_df.empty and 'Customer_ID' in customers_df.columns:
            for _, row in customers_df.iterrows():
                label = f"{row['Customer_ID']} : {row['Customer_Name']}"
                customer_options.append(label)
                customer_map_id[label] = row['Customer_ID']
                customer_map_name[label] = row['Customer_Name']

        st.markdown("##### 📍 เลือกเส้นทางมาตรฐาน (Step-by-Step)")
        unique_routes = ["-- กำหนดเอง (Custom) --"]
        if not routes_df.empty:
            raw_routes = routes_df['Route_Name'].dropna().astype(str).unique()
            unique_routes += [r for r in raw_routes if r.strip() != '']

        c_sel1, c_sel2 = st.columns(2)
        selected_main_route = c_sel1.selectbox("1. เลือกกลุ่มงาน/เส้นทาง", unique_routes)
        dest_options = ["-"]
        if selected_main_route != "-- กำหนดเอง (Custom) --":
            sub_df = routes_df[routes_df['Route_Name'] == selected_main_route]
            dest_options = sub_df['Destination'].unique().tolist()
        
        selected_dest_point = c_sel2.selectbox("2. เลือกปลายทาง", dest_options, key="selector_dest_point")

        if selected_dest_point and selected_dest_point != "-":
             target_row = routes_df[(routes_df['Route_Name'] == selected_main_route) & (routes_df['Destination'] == selected_dest_point)]
             if not target_row.empty:
                 row = target_row.iloc[0]
                 if st.button("⬇️ ใช้ข้อมูลเส้นทางนี้ (กดเพื่อเติมคำในช่อง)", use_container_width=True):
                     st.session_state.form_route_name = selected_main_route
                     st.session_state.form_origin = row.get('Origin', '')
                     st.session_state.form_dest = row.get('Destination', '')
                     st.session_state.form_link_org = row.get('Map_Link Origin', row.get('Map_Link', ''))
                     st.session_state.form_link_dest = row.get('Map_Link Destination', '')
                     st.session_state.form_dist = float(pd.to_numeric(row.get('Distance_KM', 0), errors='coerce'))
                     st.success("ดึงข้อมูลเรียบร้อย!")

        st.divider()

        with st.form("create_job_form"):
            st.markdown("##### 📝 ข้อมูลงาน (แก้ไขได้)")
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
            
            route_name = st.text_input("ชื่อเส้นทาง (Job Name)", key="form_route_name")
            col_org1, col_org2 = st.columns(2)
            with col_org1: origin = st.text_input("จุดรับสินค้า (ต้นทาง)", key="form_origin")
            with col_org2: link_org = st.text_input("ลิ้งค์แผนที่ต้นทาง", key="form_link_org")
            col_dest1, col_dest2 = st.columns(2)
            with col_dest1: dest = st.text_input("จุดส่งสินค้า (ปลายทาง)", key="form_dest")
            with col_dest2: link_dest = st.text_input("ลิ้งค์แผนที่ปลายทาง", key="form_link_dest")
            col_dist1, col_dist2 = st.columns([1, 1])
            with col_dist1: est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
            with col_dist2:
                st.write(""); st.write("")
                if origin and dest:
                    dir_url = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(origin)}&destination={urllib.parse.quote(dest)}"
                    st.link_button("🗺️ เช็คระยะทาง (Google Maps)", dir_url)
                else: st.caption("พิมพ์ชื่อสถานที่เพื่อสร้างปุ่มเช็คระยะ")

            st.divider()
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
            with m_col1: manual_customer_price = st.number_input("ราคาขาย (บาท) [0=Auto]", 0.0)
            with m_col2: manual_driver_cost = st.number_input("ต้นทุน (บาท) [0=Auto]", 0.0)

            if st.form_submit_button("✅ บันทึกและจ่ายงาน", type="primary"):
                customer_id = customer_map_id.get(selected_customer_raw, None)
                customer_name = customer_map_name.get(selected_customer_raw, "")
                if driver_id and customer_id is not None:
                    current_diesel = 30.00
                    try:
                        prices = get_fuel_prices()
                        if prices:
                            ptt = prices.get('ราคาน้ำมัน ปตท. (ptt)', {})
                            for k, v in ptt.items():
                                if "ดีเซล" in k: current_diesel = float(v.replace(',','')); break
                    except: pass

                    auto_cost = calculate_driver_cost(plan_date, est_dist, vehicle_type, current_diesel_price=current_diesel)
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

                    final_map_link = ""
                    if link_dest: final_map_link = link_dest
                    elif link_org: final_map_link = link_org
                    elif origin and dest: final_map_link = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(origin)}&destination={urllib.parse.quote(dest)}"

                    new_job = {
                        "Job_ID": auto_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer_id, "Customer_Name": customer_name,
                        "Route_Name": route_name, "Origin_Location": origin, "Dest_Location": dest, 
                        "GoogleMap_Link": final_map_link, "Driver_ID": driver_id, "Vehicle_Plate": auto_plate, 
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
        
        if not jobs_admin_view.empty and not drivers_df.empty:
            with st.expander("เปลี่ยนคนขับ (กรณีฉุกเฉิน)"):
                editable_jobs = jobs_admin_view[jobs_admin_view['Job_Status'].isin(['PLANNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'])] if 'Job_Status' in jobs_admin_view.columns else jobs_admin_view
                if not editable_jobs.empty:
                    c_ch1, c_ch2 = st.columns(2)
                    with c_ch1:
                        job_id_selected = st.selectbox("เลือกงาน (Job_ID)", editable_jobs['Job_ID'].astype(str).unique())
                    with c_ch2:
                        new_driver_select = st.selectbox("เลือกคนขับใหม่", driver_options, key="new_drv_sel")
                    
                    if st.button("บันทึกการเปลี่ยนคนขับ"):
                        new_d_id = new_driver_select.split(" : ")[0]
                        new_plate = driver_map.get(new_driver_select, "")
                        updates = {"Driver_ID": new_d_id, "Vehicle_Plate": new_plate}
                        if simple_update_job_status(job_id_selected, "ASSIGNED", updates):
                            st.success(f"เปลี่ยนคนขับงาน {job_id_selected} สำเร็จ")
                            time.sleep(1)
                            st.rerun()

    with tab2:
        st.subheader("📊 สรุปข้อมูลการเดินรถและต้นทุน")
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
            col_d1, col_d2 = st.columns(2)
            with col_d1: start_date = st.date_input("📅 ตั้งแต่วันที่", value=datetime.today().replace(day=1))
            with col_d2: end_date = st.date_input("📅 ถึงวันที่", value=datetime.today())

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

            st.markdown("### 🏆 สรุปสมรรถนะรถรายคัน (Fleet Performance)")
            summary_jobs = df_filtered.groupby('Vehicle_Plate').agg({
                'Job_ID': 'count', 'Est_Distance_KM': 'sum', 'Price_Customer': 'sum', 'Cost_Driver_Total': 'sum',
                'Driver_Name': 'first', 'Current_Location_Link': 'first',
                'Customer_Name': lambda x: ", ".join(sorted(set([str(i) for i in x if str(i) != '-'])))
            }).reset_index()
            
            fuel_summary = pd.DataFrame()
            if not df_fuel.empty:
                df_fuel['Date_Time'] = pd.to_datetime(df_fuel['Date_Time'], errors='coerce')
                mask_fuel = (df_fuel['Date_Time'].dt.date >= start_date) & (df_fuel['Date_Time'].dt.date <= end_date)
                df_fuel_filt = df_fuel[mask_fuel].copy()
                df_fuel_filt['Liters'] = pd.to_numeric(df_fuel_filt['Liters'], errors='coerce').fillna(0)
                df_fuel_filt['Price_Total'] = pd.to_numeric(df_fuel_filt['Price_Total'], errors='coerce').fillna(0)
                fuel_summary = df_fuel_filt.groupby('Vehicle_Plate').agg({
                    'Liters': 'sum', 'Price_Total': 'sum'
                }).reset_index().rename(columns={'Price_Total': 'Fuel_Cost_Total'})

            if not summary_jobs.empty:
                fleet_stats = pd.merge(summary_jobs, fuel_summary, on='Vehicle_Plate', how='left').fillna(0)
                fleet_stats['Profit'] = fleet_stats['Price_Customer'] - fleet_stats['Cost_Driver_Total'] - fleet_stats['Fuel_Cost_Total']
                fleet_view = fleet_stats[['Vehicle_Plate', 'Driver_Name', 'Current_Location_Link', 'Job_ID', 'Customer_Name', 'Est_Distance_KM', 'Liters', 'Fuel_Cost_Total', 'Cost_Driver_Total', 'Price_Customer', 'Profit']]
                fleet_view.columns = ['ทะเบียนรถ', 'คนขับ', '📍 แผนที่ล่าสุด', 'จำนวนเที่ยว', 'ลูกค้าที่วิ่ง', 'ระยะทางรวม (กม.)', 'ใช้น้ำมัน (ลิตร)', 'ค่าน้ำมัน (บาท)', 'ค่าจ้างรถร่วม', 'รายรับรวม', 'กำไรสุทธิ']
                st.dataframe(fleet_view, use_container_width=True, column_config={"📍 แผนที่ล่าสุด": st.column_config.LinkColumn("📍 แผนที่ล่าสุด", display_text="เปิดแผนที่ 🗺️"), "รายรับรวม": st.column_config.NumberColumn(format="%d"), "กำไรสุทธิ": st.column_config.NumberColumn(format="%d"), "ค่าน้ำมัน (บาท)": st.column_config.NumberColumn(format="%d")})
                st.download_button("📥 ดาวน์โหลดสรุปรายคัน (.csv)", convert_df_to_csv(fleet_view), "fleet_summary.csv")
            else: st.info("ไม่พบข้อมูลงานในช่วงวันที่เลือก")

            st.divider()
            st.markdown(f"### 🌸 รายละเอียดงานฝั่งลูกค้า (Customer View)")
            if not df_filtered.empty:
                cols_cust = ['Plan_Date', 'Customer_ID', 'Customer_Name', 'Vehicle_Type', 'Origin_Location', 'Dest_Location', 'Est_Distance_KM', 'Price_Customer']
                cols_cust = [c for c in cols_cust if c in df_filtered.columns]
                customer_view = df_filtered[cols_cust].copy()
                if 'Plan_Date' in customer_view.columns: customer_view['Plan_Date'] = customer_view['Plan_Date'].dt.strftime('%d/%m/%Y')
                rename_map = {'Plan_Date': 'วันที่', 'Customer_ID': 'รหัสลูกค้า', 'Customer_Name': 'ลูกค้า', 'Vehicle_Type': 'ประเภทรถ', 'Origin_Location': 'ต้นทาง', 'Dest_Location': 'ปลายทาง', 'Est_Distance_KM': 'ระยะทาง (กม.)', 'Price_Customer': 'ราคาขาย (บาท)'}
                customer_view = customer_view.rename(columns=rename_map)
                st.dataframe(customer_view, use_container_width=True)
                st.download_button("📥 ดาวน์โหลดตารางลูกค้า (.csv)", convert_df_to_csv(customer_view), "customer_report.csv")

            st.divider()
            st.markdown(f"### 🚙 รายละเอียดต้นทุนรถร่วม (Driver View)")
            if not df_filtered.empty:
                cols_drv = ['Vehicle_Plate', 'Driver_Name', 'Vehicle_Type', 'Origin_Location', 'Dest_Location', 'Est_Distance_KM', 'Cost_Driver_Total']
                cols_drv = [c for c in cols_drv if c in df_filtered.columns]
                driver_view = df_filtered[cols_drv].copy()
                if 'Est_Distance_KM' in driver_view.columns: driver_view['Round_Trip_Dist'] = driver_view['Est_Distance_KM']
                rename_map_drv = {'Vehicle_Plate': 'ทะเบียน', 'Driver_Name': 'ชื่อคนขับ', 'Vehicle_Type': 'ประเภทรถ', 'Origin_Location': 'ต้นทาง', 'Dest_Location': 'ปลายทาง', 'Est_Distance_KM': 'ระยะทาง', 'Cost_Driver_Total': 'ค่าจ้าง (บาท)', 'Round_Trip_Dist': 'ระยะทาง ไป-กลับ'}
                driver_view = driver_view.rename(columns=rename_map_drv)
                st.dataframe(driver_view, use_container_width=True)
                st.download_button("📥 ดาวน์โหลดตารางรถร่วม (.csv)", convert_df_to_csv(driver_view), "driver_report.csv")
                
            st.divider()
            st.subheader("📤 เชื่อมต่อบัญชี (Sync to Summary_Admin)")
            c_sync1, c_sync2 = st.columns([3, 1])
            with c_sync1: st.info("ส่งข้อมูลงาน (ตามช่วงวันที่เลือกด้านบน) ไปยัง Google Sheet 'Summary_Admin' (คอลัมน์ A-AA)")
            with c_sync2:
                if st.button("🚀 ส่งข้อมูลเข้า Sheet เดิม", type="primary", use_container_width=True):
                    with st.spinner("กำลังส่งข้อมูล..."):
                        success, msg = sync_to_legacy_sheet(start_date, end_date)
                        if success: st.success(msg)
                        else: st.error(msg)
        else: st.warning("ยังไม่มีข้อมูลงานในระบบ")

    with tab3:
        st.subheader("🔔 แจ้งเตือนเช็คระยะ (Maintenance Alert)")
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            alerts = maint_df[maint_df['Is_Due'] == True]
            if not alerts.empty:
                st.error(f"⚠️ มีรายการต้องบำรุงรักษาด่วน {len(alerts)} รายการ!")
                st.dataframe(alerts[['Vehicle_Plate', 'Service_Type', 'Status', 'Current_Mileage', 'Last_Service_Odo']], use_container_width=True)
            else: st.success("✅ รถทุกคันสภาพปกติ ยังไม่ถึงรอบบำรุงรักษา")
            with st.expander("ดูสถานะรถทุกคัน"): st.dataframe(maint_df)
        else: st.info("กำลังประมวลผลข้อมูล...")

        st.divider()
        with st.expander("🛠️ บันทึกการเข้าศูนย์/เปลี่ยนถ่าย (Reset รอบ)"):
            with st.form("add_maint"):
                c1, c2 = st.columns(2)
                with c1:
                    drivers = get_data("Master_Drivers")
                    plates = drivers['Vehicle_Plate'].unique() if not drivers.empty else []
                    m_plate = st.selectbox("ทะเบียนรถ", plates)
                    m_type = st.selectbox("รายการที่ทำ", ["ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง/ช่วงล่าง", "เช็คระยะทั่วไป"])
                with c2:
                    m_date = st.date_input("วันที่ทำรายการ", datetime.today())
                    m_odo = st.number_input("เลขไมล์ตอนทำรายการ", min_value=0)
                    m_note = st.text_input("หมายเหตุ (เช่น ยี่ห้อน้ำมัน/ร้านที่ทำ)")
                if st.form_submit_button("บันทึกประวัติ (เริ่มนับรอบใหม่)"):
                    new_rec = {"Log_ID": f"MT-{datetime.now().strftime('%y%m%d%H%M')}", "Date_Service": m_date.strftime("%Y-%m-%d"), "Vehicle_Plate": m_plate, "Service_Type": m_type, "Odometer": m_odo, "Next_Due_Odometer": m_odo + (50000 if "ยาง" in m_type else 10000), "Notes": m_note}
                    if log_maintenance_record(new_rec): st.success("บันทึกเรียบร้อย! ระบบเริ่มนับรอบใหม่แล้ว"); time.sleep(1); st.rerun()

        st.divider()
        st.subheader("🔧 รายการแจ้งซ่อม (Breakdown Tickets)")
        tickets = get_data("Repair_Tickets")
        if not tickets.empty:
            st.dataframe(tickets, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูปอาการเสีย")})
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
                        if new_status == "Done": tickets.at[idx, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                        update_sheet("Repair_Tickets", tickets); st.success("บันทึกแล้ว"); st.rerun()
        else: st.info("ไม่มีรายการแจ้งซ่อม")

    with tab4:
        st.subheader("⛽ ประวัติการเติมน้ำมัน")
        fuel_logs = get_data("Fuel_Logs")
        if not fuel_logs.empty: 
            st.dataframe(fuel_logs, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูปสลิป/ไมล์", help="คลิกเพื่อดูรูปขยาย"), "Price_Total": st.column_config.NumberColumn("ยอดเงิน", format="%d บาท"), "Liters": st.column_config.NumberColumn("ลิตร", format="%.2f ลิตร")})
        else: st.info("ไม่มีข้อมูล")

    with tab5:
        c1, c2 = st.columns([2, 1])
        parts = get_data("Stock_Parts")
        with c1: st.subheader("รายการอะไหล่"); st.dataframe(parts, use_container_width=True)
        with c2:
            st.subheader("รับเข้า")
            with st.form("add_part"):
                p_name = st.text_input("ชื่ออะไหล่"); p_qty = st.number_input("จำนวน", 1)
                if st.form_submit_button("เพิ่ม"):
                    new_part = {"Part_ID": f"P-{len(parts)+1:03d}", "Part_Name": p_name, "Qty_On_Hand": p_qty}
                    update_sheet("Stock_Parts", pd.concat([parts, pd.DataFrame([new_part])], ignore_index=True)); st.rerun()

    with tab6:
        st.subheader("📍 ตำแหน่งรถปัจจุบัน")
        drivers = get_data("Master_Drivers")
        if not drivers.empty:
            drivers = drivers.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
            drivers['lat'] = pd.to_numeric(drivers['lat'], errors='coerce')
            drivers['lon'] = pd.to_numeric(drivers['lon'], errors='coerce')
            active = drivers.dropna(subset=['lat', 'lon']).copy()
            if not active.empty:
                st.map(active[['lat', 'lon']])
                st.divider()
                st.markdown("### 📋 รายละเอียดตำแหน่งรายคัน")
                active['Google_Maps_Link'] = active.apply(lambda row: f"https://www.google.com/maps?q={row['lat']},{row['lon']}", axis=1)
                display_cols = ['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Google_Maps_Link']
                display_cols = [c for c in display_cols if c in active.columns]
                st.dataframe(active[display_cols], use_container_width=True, column_config={"Driver_Name": "ชื่อคนขับ", "Vehicle_Plate": "ทะเบียนรถ", "Last_Update": "อัปเดตล่าสุด", "Google_Maps_Link": st.column_config.LinkColumn("📍 แผนที่", display_text="เปิด Google Maps 🗺️")})
            else: st.warning("⚠️ ไม่พบพิกัดรถ (คนขับยังไม่ได้กดเช็คอิน)")
        else: st.warning("ไม่พบข้อมูลคนขับในระบบ")
    
    with tab7:
        st.subheader("🧮 ประเมินราคาค่าขนส่ง (Cost + 1000)")
        st.caption("สูตรราคา: ต้นทุนรถร่วม + กำไร 1,000 บาท + Option เสริม")
        with st.container(border=True):
            col_cal1, col_cal2 = st.columns(2)
            with col_cal1:
                calc_date = st.date_input("วันที่ขนส่ง (เพื่อดึงเรต)", datetime.today(), key="calc_date")
                calc_vehicle = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"], key="calc_veh")
                calc_dist = st.number_input("ระยะทางประมาณการ (กม.)", min_value=0, value=100, key="calc_dist")
            with col_cal2:
                st.markdown("**Option เสริม (บวกเพิ่มจากราคาตั้ง)**")
                c_opt1, c_opt2 = st.columns(2)
                with c_opt1:
                    calc_floors = st.number_input("ยกขึ้นชั้น", 0, key="calc_fl")
                    calc_helpers = st.number_input("เพิ่มคนยก", 0, key="calc_hlp")
                with c_opt2:
                    calc_wait = st.number_input("รอเกิน 3 ชม.", 0, key="calc_wt")
                    calc_night = st.number_input("ค้างคืน", 0, key="calc_nt")
                calc_return = st.checkbox("สินค้าคืน (+50%)", key="calc_ret")

            if st.button("🚀 คำนวณราคา", type="primary", use_container_width=True):
                current_diesel = 30.00
                if 'fuel_prices' in st.session_state and st.session_state.fuel_prices:
                    ptt_data = st.session_state.fuel_prices.get('ราคาน้ำมัน ปตท. (ptt)', {})
                    for k, v in ptt_data.items():
                        if "ดีเซล" in k and "B7" in k: current_diesel = float(v.replace(',','')); break
                        elif "ดีเซล" in k: current_diesel = float(v.replace(',',''))
                
                st.caption(f"ℹ️ อ้างอิงราคาน้ำมันดีเซล: {current_diesel} บาท/ลิตร")
                est_cost = calculate_driver_cost(calc_date, calc_dist, calc_vehicle, current_diesel_price=current_diesel)
                
                if est_cost > 0: est_base_price = est_cost + 1000
                else: est_base_price = 0; st.warning("⚠️ ไม่พบต้นทุนรถร่วม (ตรวจสอบวันที่/ระยะทาง) ระบบจึงคำนวณราคาไม่ได้")

                surcharge = 0
                if calc_floors > 0: surcharge += calc_floors * 100
                if calc_helpers > 0: surcharge += calc_helpers * 300
                if calc_wait > 0: surcharge += calc_wait * 300
                if calc_night > 0: surcharge += calc_night * 1000
                
                est_total_price = est_base_price + surcharge
                if calc_return: est_total_price = est_total_price * 1.5
                
                est_profit = est_total_price - est_cost
                margin_percent = (est_profit / est_total_price * 100) if est_total_price > 0 else 0
                
                st.divider()
                r1, r2, r3 = st.columns(3)
                r1.metric("💰 ราคาเสนอขาย (Revenue)", f"{est_total_price:,.2f} บาท")
                r2.metric("🚚 ต้นทุนรถร่วม (Cost)", f"{est_cost:,.2f} บาท")
                r3.metric("📈 กำไร (Profit)", f"{est_profit:,.2f} บาท", f"{margin_percent:.1f}%")
                if est_cost > 0: st.success(f"✅ คิดราคาจาก: ต้นทุน ({est_cost:,.0f}) + กำไร (1,000) + Option ({surcharge:,.0f}) = {est_total_price:,.0f}")
        
        st.divider()
        st.subheader("⛽ ราคาน้ำมันล่าสุด")
        if st.button("🔄 อัปเดตราคาล่าสุด", key="update_fuel_new"):
            with st.spinner("กำลังดึงข้อมูล..."):
                fuel_prices = get_fuel_prices()
                if fuel_prices: st.session_state.fuel_prices = fuel_prices; st.success("อัปเดตแล้ว!")
                else: st.error("ดึงข้อมูลไม่สำเร็จ")
        
        if st.session_state.get('fuel_prices'):
            if 'ราคาน้ำมัน ปตท. (ptt)' in st.session_state.fuel_prices:
                ptt = st.session_state.fuel_prices['ราคาน้ำมัน ปตท. (ptt)']
                st.markdown("### ปตท. (PTT)")
                fuel_data = []
                for fuel, price in ptt.items():
                    unit = "บาท/กก." if "NGV" in fuel else "บาท/ลิตร"
                    fuel_data.append([fuel, f"{price} {unit}"])
                st.table(pd.DataFrame(fuel_data, columns=["ประเภทน้ำมัน", "ราคา"]))
            
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
                        if station_data: st.table(pd.DataFrame(station_data, columns=["ประเภทน้ำมัน", "ราคา"]))

    with tab8:
        st.subheader("⚙️ ตั้งค่าระบบ (System Config)")
        st.caption("แก้ไขค่าต่างๆ ที่ใช้คำนวณในระบบได้ที่นี่ (กดแก้ไขในตารางแล้วกดบันทึก)")
        config_df = get_data("System_Config")
        if not config_df.empty:
            edited_df = st.data_editor(config_df, use_container_width=True, num_rows="dynamic", disabled=["Key", "Description"], column_config={"Value": st.column_config.NumberColumn("ค่าที่กำหนด", required=True), "Key": st.column_config.TextColumn("รหัส (ห้ามแก้)", disabled=True), "Description": st.column_config.TextColumn("คำอธิบาย", disabled=True)})
            if st.button("💾 บันทึกการตั้งค่า", type="primary"):
                update_sheet("System_Config", edited_df)
                st.success("บันทึกเรียบร้อย! (ระบบจะใช้ค่าใหม่ทันที)"); time.sleep(1); st.rerun()
        else: st.error("ไม่พบข้อมูล Config กรุณาสร้าง Sheet 'System_Config' ก่อน")

    with tab9:
        st.subheader("📘 คู่มือการใช้งานระบบ (User Manual)")
        manual_text = get_manual_content()
        st.download_button(label="📥 ดาวน์โหลดคู่มือเก็บไว้ (.txt)", data=manual_text, file_name="LogisPro_Manual.txt", mime="text/plain", type="primary")
        st.divider()
        st.markdown(manual_text)

# ---------------------------------------------------------
# 6. Driver App
# ---------------------------------------------------------
def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱")
        st.info(f"คุณ: {st.session_state.driver_name}")
        with st.expander("❓ วิธีใช้งาน"):
            st.markdown("""
            1. **เช็คอิน:** กดปุ่ม 📍 เมื่อถึงจุดสำคัญ
            2. **งาน:** กด 'ส่งของ >' เพื่อเริ่มงาน
            3. **ปิดงาน:** ต้องถ่ายรูปของ + ลายเซ็น
            4. **เติมน้ำมัน:** ใส่เลขไมล์ > ระบบจะบอกยอดที่ควรเติม
            """)
        if st.button("🚪 Logout", key="drv_out"): st.session_state.logged_in = False; st.rerun()

    if 'page' not in st.session_state: st.session_state.page = "list"
    
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("เมนูหลัก")
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
                if my_jobs.empty: st.success("ไม่มีงานค้าง")
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
                                st.session_state.current_job = job.to_dict(); st.session_state.page = "action"; st.rerun()
            else: st.error("ไม่พบข้อมูล")

        elif st.session_state.page == "action":
            job = st.session_state.current_job
            df_cur = get_data("Jobs_Main")
            current_status = job.get('Job_Status', '')
            if not df_cur.empty and 'Job_ID' in df_cur.columns:
                try:
                    row = df_cur[df_cur['Job_ID'].astype(str) == str(job['Job_ID'])]
                    if not row.empty: current_status = row.iloc[0].get('Job_Status', current_status)
                except: pass
            
            if st.button("< กลับ"): st.session_state.page = "list"; st.rerun()
            st.info(f"ลูกค้า: {job['Customer_ID']}"); st.caption(f"สถานะปัจจุบัน: {get_status_label_th(current_status)}"); st.write(f"ส่งที่: {job['Dest_Location']}"); st.write("---"); st.write("🛠 **อัปเดตสถานะงาน**")
            c_s1, c_s2, c_s3, c_s4 = st.columns(4)
            now_str = get_thai_time_str()
            with c_s1: 
                if st.button("รับสินค้าแล้ว", key="btn_pickup"): simple_update_job_status(job['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now_str}); st.toast("อัปเดตสถานะเรียบร้อย"); st.rerun()
            with c_s2:
                if st.button("ออกเดินทาง", key="btn_transit"): simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None); st.toast("อัปเดตสถานะเรียบร้อย"); st.rerun()
            with c_s3:
                if st.button("ถึงปลายทาง", key="btn_delivered"): simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now_str}); st.toast("อัปเดตสถานะเรียบร้อย"); st.rerun()
            with c_s4:
                failed_reason = st.text_input("เหตุผลส่งไม่สำเร็จ", key="failed_reason")
                if st.button("ส่งไม่สำเร็จ", key="btn_failed"): updates = {"Failed_Reason": failed_reason, "Failed_Time": now_str}; simple_update_job_status(job['Job_ID'], "FAILED", updates); st.toast("อัปเดตสถานะเรียบร้อย"); st.rerun()

            st.write("---"); st.write("📸 **หลักฐานการส่ง (ePOD)**")
            uploaded_files = st.file_uploader("📂 1. เลือกรูปจากอัลบั้ม (ได้หลายรูป)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="epod_imgs_upload")
            st.write("📸 **2. หรือ ถ่ายรูปเดี๋ยวนี้**")
            cam_pic = st.camera_input("กดปุ่มเพื่อถ่ายรูป", key="epod_cam_input")
            
            all_images = []
            if uploaded_files: all_images.extend(uploaded_files)
            if cam_pic: all_images.append(cam_pic)
            
            if all_images: st.info(f"✅ รวมทั้งหมด {len(all_images)} รูป (พร้อมส่ง)")
            st.write("✍️ **ลายเซ็นผู้รับ**"); sig = st.camera_input("ถ่ายรูปใบเซ็นรับ", key="sig_cam")

            if st.button("✅ ยืนยันปิดงาน", type="primary", use_container_width=True):
                if all_images:
                    with st.spinner("กำลังรวมรูปและบันทึก..."):
                        img_str = process_multiple_images(all_images)
                        sig_str = compress_image(sig) if sig else "-"
                        now = get_thai_time_str()
                        dist = float(job.get('Est_Distance_KM', job.get('Price_Customer', 0)))
                        update_job_status(job['Job_ID'], "Completed", now, dist, img_str, sig_str)
                        st.success("สำเร็จ!"); time.sleep(2); st.session_state.page = "list"; st.rerun()
                else: st.error("กรุณาใส่รูปสินค้า (จากอัลบั้ม หรือ ถ่ายใหม่)")

    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกการเติมน้ำมัน")
        plate = st.session_state.vehicle_plate
        last_odo = get_last_fuel_odometer(plate)
        std_rate = get_consumption_rate_by_driver(st.session_state.driver_id)
        act_rate, total_km, total_fuel = calculate_actual_consumption(plate)
        
        with st.container(border=True):
            st.markdown(f"**📊 สถิติ: {plate}**")
            k1, k2 = st.columns(2)
            with k1: st.metric("เกณฑ์มาตรฐาน", f"{std_rate:.1f} กม./ลิตร")
            with k2:
                if act_rate > 0:
                    delta_val = act_rate - std_rate
                    st.metric("ทำได้จริงเฉลี่ย", f"{act_rate:.2f} กม./ลิตร", delta=f"{delta_val:.2f}", delta_color="normal")
                else: st.metric("ทำได้จริงเฉลี่ย", "-")

        if last_odo > 0: st.info(f"🔢 เลขไมล์เติมล่าสุด: {last_odo:,.0f}")
        else: st.warning("⚠️ ไม่พบประวัติ")

        f_station = st.text_input("ปั๊ม/สถานที่")
        f_odo = st.number_input("เลขไมล์ปัจจุบัน", min_value=int(last_odo), value=int(last_odo))
        
        calc_base_rate = act_rate if act_rate > 0 else std_rate
        dist_run = f_odo - last_odo
        suggest_liters = dist_run / calc_base_rate if calc_base_rate > 0 else 0
        
        if dist_run > 0: st.success(f"💡 วิ่งมา: {dist_run:,.0f} กม. | ⛽ ควรเติม: {suggest_liters:,.1f} ลิตร")
        else: st.caption("👈 กรุณากรอกเลขไมล์ปัจจุบัน")

        f_liters = st.number_input("จำนวนลิตรที่เติมจริง", 0.0)
        f_price = st.number_input("ยอดเงิน (บาท)", 0.0)
        
        st.markdown("**หลักฐานการเติม**")
        f_upload = st.file_uploader("📂 เลือกรูปสลิป/ไมล์ (จากอัลบั้ม)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="fuel_upload")
        f_cam = st.camera_input("📸 หรือ ถ่ายรูปเดี๋ยวนี้", key="fuel_cam")
        all_fuel_imgs = []
        if f_upload: all_fuel_imgs.extend(f_upload)
        if f_cam: all_fuel_imgs.append(f_cam)

        if st.button("บันทึกข้อมูล", type="primary", use_container_width=True):
            if f_price > 0 and f_liters > 0:
                if suggest_liters > 0 and f_liters > (suggest_liters * 1.2):
                    st.warning(f"⚠️ เตือน: เติมน้ำมันเยอะผิดปกติ"); time.sleep(2)
                
                if not all_fuel_imgs: st.error("กรุณาใส่รูปสลิป (จากอัลบั้ม หรือ ถ่ายใหม่)")
                else:
                    with st.spinner("กำลังบันทึก..."):
                        img_str = process_multiple_images(all_fuel_imgs)
                        fuel_data = {
                            "Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}",
                            "Date_Time": get_thai_time_str(),
                            "Driver_ID": st.session_state.driver_id,
                            "Vehicle_Plate": st.session_state.vehicle_plate,
                            "Odometer": f_odo, "Liters": f_liters, "Price_Total": f_price,
                            "Station_Name": f_station, "Photo_Url": img_str
                        }
                        if create_fuel_log(fuel_data): st.success("บันทึกข้อมูลสำเร็จ!"); time.sleep(1); st.rerun()
            else: st.error("กรุณากรอกข้อมูลให้ครบ")

    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("🔧 งานซ่อมบำรุง")
        plate = st.session_state.vehicle_plate
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            my_alerts = maint_df[(maint_df['Vehicle_Plate'] == str(plate)) & (maint_df['Is_Due'] == True)]
            if not my_alerts.empty:
                st.error("⚠️ แจ้งเตือน: รถของคุณถึงระยะบำรุงรักษาแล้ว!")
                for _, row in my_alerts.iterrows(): st.markdown(f"- **{row['Service_Type']}**: {row['Status']}")
                st.info("กรุณาแจ้ง Admin หรือดำเนินการนำรถเข้าเช็คทันที"); st.divider()
            else: st.success(f"✅ สภาพรถปกติ (ทะเบียน {plate})"); st.divider()

        st.write("📝 **แจ้งอาการเสีย/อุบัติเหตุ**")
        with st.form("rep"):
            issue = st.selectbox("หมวดหมู่", ["เครื่องยนต์", "ยาง", "ช่วงล่าง", "อื่นๆ"])
            desc = st.text_area("รายละเอียด")
            r_upload = st.file_uploader("📂 เลือกรูปอาการเสีย (จากอัลบั้ม)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="rep_upload")
            r_cam = st.camera_input("📸 หรือ ถ่ายรูปเดี๋ยวนี้", key="rep_cam")
            
            if st.form_submit_button("ส่งเรื่อง"):
                all_rep_imgs = []
                if r_upload: all_rep_imgs.extend(r_upload)
                if r_cam: all_rep_imgs.append(r_cam)
                
                if not all_rep_imgs: st.error("กรุณาใส่รูปอาการเสีย")
                else:
                    with st.spinner("กำลังส่งเรื่อง..."):
                        img_str = process_multiple_images(all_rep_imgs)
                        data = {
                            "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}",
                            "Date_Report": get_thai_time_str(), 
                            "Driver_ID": st.session_state.driver_id, "Description": desc, 
                            "Status": "Pending", "Issue_Type": issue, 
                            "Vehicle_Plate": st.session_state.vehicle_plate, "Photo_Url": img_str
                        }
                        if create_repair_ticket(data): st.success("ส่งแล้ว รออนุมัติ")

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

# ---------------------------------------------------------
# 8. Start App
# ---------------------------------------------------------
def main():
    try:
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
    except Exception as e:
        st.error(f"⚠️ เกิดข้อผิดพลาดในระบบ: {str(e)}")
        if st.button("กดปุ่มนี้เพื่อรีเซ็ตระบบ"):
            st.session_state.clear()
            st.rerun()

if __name__ == "__main__":
    main()