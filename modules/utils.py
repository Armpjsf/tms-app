# modules/utils.py
import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import pytz  # type: ignore
from PIL import Image  # type: ignore
import io
import base64
import requests
from bs4 import BeautifulSoup  # type: ignore
import re
import urllib.parse
from modules.database import get_data, update_sheet, append_to_sheet

# --- Utility Functions ---
@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8-sig')

def get_thai_time_str():
    tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

def get_thai_date_str():
    tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(tz).strftime("%Y-%m-%d")

def parse_flexible_date(s):
    try:
        s = str(s).strip()
        if not s or s.lower() == 'nan' or s.lower() == 'nat': return pd.NaT
        
        # 1. แก้ไขปี พ.ศ. (ถ้ามี 4 หลักและมากกว่า 2400 ให้ลบ 543)
        # รองรับทั้งแบบ 2568-12-01 และ 01/12/2568
        if len(s) >= 4:
            # หาปี 4 หลักในข้อความ
            import re
            years = re.findall(r'\d{4}', s)
            for year in years:
                if int(year) > 2400: # สันนิษฐานว่าเป็น พ.ศ.
                    s = s.replace(year, str(int(year) - 543))
        
        # 2. พยายามแปลงวันที่ (ลองหลายแบบ)
        try:
            # ลองแบบ Day First ก่อน (ไทย/UK: 31/12/2025)
            return pd.to_datetime(s, dayfirst=True)
        except:
            try:
                # ถ้าไม่ได้ ลองแบบมาตรฐาน (ISO: 2025-12-31)
                return pd.to_datetime(s)
            except:
                # ถ้ายังมี format แปลกๆ เช่น 12/31/2025 (US)
                return pd.to_datetime(s, errors='coerce')
                
    except: 
        return pd.NaT

# --- Image Processing ---
def compress_image(image_file):
    if image_file is None: return "-"
    try:
        if isinstance(image_file, str): return image_file
        img = Image.open(image_file)
        if img.mode != 'RGB': img = img.convert('RGB')
        max_width = 600
        ratio = max_width / float(img.size[0])
        new_height = int((float(img.size[1]) * float(ratio)))
        img = img.resize((max_width, new_height), Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=50)
        encoded = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/jpeg;base64,{encoded}"
    except: return "-"

def process_multiple_images(image_file_list):
    if not image_file_list: return "-"
    try:
        images = []
        total_height = 0
        max_width = 400
        for img_file in image_file_list:
            try:
                if isinstance(img_file, str): continue
                img = Image.open(img_file)
                if img.mode != 'RGB': img = img.convert('RGB')
                ratio = max_width / float(img.size[0])
                new_height = int(float(img.size[1]) * float(ratio))
                img = img.resize((max_width, new_height), Image.LANCZOS)
                images.append(img)
                total_height += new_height
            except: continue
            
        if not images: return "-"

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

# --- Config & Calculations ---
def get_config_value(key, default_value):
    try:
        df = get_data("System_Config")
        if df.empty: return default_value
        key_col, val_col = "Key", "Value"
        for col in df.columns:
            if "Key" in col: key_col = col
            if "Value" in col: val_col = col
            
        row = df[df[key_col].astype(str) == str(key)]
        if not row.empty: 
            val = str(row.iloc[0][val_col]).replace(',', '')
            return float(val)
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

def calculate_driver_cost(plan_date, distance, vehicle_type, current_diesel_price=None):
    try:
        df = get_data("Rate_Card")
        if df.empty: return 0
        
        dist_col_idx = 0
        for i, col_name in enumerate(df.columns):
            if "ระยะทาง" in str(col_name) or "Distance" in str(col_name): 
                dist_col_idx = i; break
        
        dist_col_name = df.columns[dist_col_idx]
        df[dist_col_name] = pd.to_numeric(df[dist_col_name], errors='coerce').fillna(0)
        
        tier = df[df[dist_col_name] >= float(distance)].sort_values(by=dist_col_name).head(1)
        if tier.empty: tier = df.sort_values(by=dist_col_name).tail(1)
        if tier.empty: return 0

        try:
            price = float(str(current_diesel_price).replace(',','')) if current_diesel_price else 30.00
        except: price = 30.00

        group_offset = 1 
        if price <= 27.00: group_offset = 0
        elif 27.01 <= price <= 30.00: group_offset = 1
        elif 30.01 <= price <= 32.00: group_offset = 2
        elif price > 32.00: group_offset = 3
        
        veh_offset = 0 
        if "6" in str(vehicle_type): veh_offset = 1
        elif "10" in str(vehicle_type): veh_offset = 2
        
        target_col_idx = dist_col_idx + 1 + (group_offset * 3) + veh_offset
        if target_col_idx >= len(df.columns): return 0
        
        cost = tier.iloc[0, target_col_idx]
        return float(str(cost).replace(',', ''))
    except: return 0

# --- Status & Maintenance ---
def get_maintenance_status_all():
    try:
        drivers = get_data("Master_Drivers").copy()
        maint_logs = get_data("Maintenance_Logs").copy()
        
        if drivers.empty: return pd.DataFrame()
        
        drivers['Vehicle_Plate'] = drivers['Vehicle_Plate'].astype(str)
        drivers['Current_Mileage'] = pd.to_numeric(drivers['Current_Mileage'], errors='coerce').fillna(0)
        
        oil_km = get_config_value("maint_oil_km", 10000)
        oil_days = get_config_value("maint_oil_days", 180)
        tire_km = get_config_value("maint_tire_km", 50000)
        tire_days = get_config_value("maint_tire_days", 730)
        
        rules = {
            "ถ่ายน้ำมันเครื่อง": [oil_km, oil_days], 
            "เปลี่ยนยาง/ช่วงล่าง": [tire_km, tire_days], 
            "เช็คระยะทั่วไป": [20000, 365]
        }
        
        all_status = []
        if not maint_logs.empty:
            maint_logs['Odometer'] = pd.to_numeric(maint_logs['Odometer'], errors='coerce').fillna(0)
            maint_logs['Date_Service'] = pd.to_datetime(maint_logs['Date_Service'], errors='coerce')
        
        for service_name, (limit_km, limit_days) in rules.items():
            for _, row in drivers.iterrows():
                plate = row['Vehicle_Plate']
                last_odo = 0
                last_date = pd.NaT
                
                if not maint_logs.empty:
                    svc = maint_logs[
                        (maint_logs['Service_Type'] == service_name) & 
                        (maint_logs['Vehicle_Plate'].astype(str) == plate)
                    ]
                    if not svc.empty:
                        last = svc.sort_values('Date_Service').iloc[-1]
                        last_odo = last['Odometer']
                        last_date = last['Date_Service']

                dist_run = row['Current_Mileage'] - last_odo
                days_run = 0
                if pd.notna(last_date):
                    days_run = (datetime.now() - last_date).days
                
                status = "✅ ปกติ"
                is_due = False
                note = "-"
                
                if dist_run >= limit_km: 
                    status = "⚠️ ครบระยะทาง"
                    note = f"เกิน {dist_run - limit_km:,.0f} กม."
                    is_due = True
                elif days_run >= limit_days: 
                    status = "⚠️ ครบกำหนดเวลา"
                    note = f"เกิน {days_run - limit_days:,.0f} วัน"
                    is_due = True
                elif dist_run >= (limit_km * 0.9): 
                    status = "🟡 ใกล้ครบระยะ"
                    note = f"เหลือ {limit_km - dist_run:,.0f} กม."

                all_status.append({
                    "Vehicle_Plate": plate, 
                    "Driver_Name": row.get('Driver_Name','-'), 
                    "Service_Type": service_name, 
                    "Current_Mileage": row['Current_Mileage'],
                    "Last_Service_Odo": last_odo,
                    "Distance_Run": dist_run,
                    "Status": status, 
                    "Note": note, 
                    "Is_Due": is_due
                })
        return pd.DataFrame(all_status)
    except Exception as e: 
        print(f"Maint Error: {e}")
        return pd.DataFrame()

def get_last_fuel_odometer(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0
        df_plate = df[df['Vehicle_Plate'].astype(str) == str(plate)].copy()
        if df_plate.empty: return 0
        df_plate['Odometer'] = pd.to_numeric(df_plate['Odometer'], errors='coerce').fillna(0)
        return float(df_plate['Odometer'].max())
    except: return 0

def calculate_actual_consumption(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0, 0, 0
        
        df['Odometer'] = pd.to_numeric(df['Odometer'], errors='coerce')
        df['Liters'] = pd.to_numeric(df['Liters'], errors='coerce')
        
        my_logs = df[df['Vehicle_Plate'].astype(str) == str(plate)].dropna(subset=['Odometer']).sort_values(by='Odometer')
        
        if len(my_logs) < 2: return 0, 0, 0
        
        total_dist = my_logs.iloc[-1]['Odometer'] - my_logs.iloc[0]['Odometer']
        total_liters = my_logs.iloc[1:]['Liters'].sum()
        
        if total_liters > 0: return total_dist / total_liters, total_dist, total_liters
        else: return 0, 0, 0
    except: return 0, 0, 0

def get_status_label_th(status_code: str) -> str:
    mapping = {
        "PLANNED": "วางแผนแล้ว", "ASSIGNED": "จ่ายงานแล้ว", 
        "PICKED_UP": "รับสินค้าแล้ว", "IN_TRANSIT": "กำลังขนส่ง", 
        "DELIVERED": "ถึงปลายทางแล้ว", "COMPLETED": "ปิดงานสมบูรณ์", 
        "FAILED": "ส่งไม่สำเร็จ", "CANCELLED": "ยกเลิกงาน", 
        "Completed": "ปิดงานสมบูรณ์", "Pending": "รอดำเนินการ"
    }
    return mapping.get(str(status_code), str(status_code))

def get_fuel_prices():
    try:
        url = "https://gasprice.kapook.com/gasprice.php#ptt"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return {}
        
        soup = BeautifulSoup(response.content.decode('utf-8', 'ignore'), 'html.parser')
        fuel_prices = {}
        current_section = ""
        
        for section in soup.find_all(['h3', 'ul']):
            if section.name == 'h3': 
                current_section = section.get_text(strip=True)
                fuel_prices[current_section] = {}
            elif section.name == 'ul' and current_section:
                for item in section.find_all('li'):
                    text = item.get_text(separator=" ", strip=True)
                    match = re.search(r'(.+?)\s+([\d]+\.\d{2})', text)
                    if match:
                        name = match.group(1).strip()
                        price = match.group(2).strip()
                        fuel_prices[current_section][name] = price
        return fuel_prices
    except: return {}

def create_new_job(job_data):
    try:
        if not job_data.get('Job_ID'): return False
        return append_to_sheet("Jobs_Main", job_data)
    except Exception as e: 
        print(f"Create Job Error: {e}")
        return False

def create_fuel_log(fuel_data):
    try:
        if append_to_sheet("Fuel_Logs", fuel_data):
            if 'Odometer' in fuel_data and 'Vehicle_Plate' in fuel_data:
                drv = get_data("Master_Drivers")
                drv['Vehicle_Plate'] = drv['Vehicle_Plate'].astype(str)
                idx = drv[drv['Vehicle_Plate'] == str(fuel_data['Vehicle_Plate'])].index
                if not idx.empty:
                    try:
                        new_odo = float(fuel_data['Odometer'])
                        drv.at[idx[0], 'Current_Mileage'] = new_odo
                        drv.at[idx[0], 'Last_Update'] = get_thai_time_str()
                        update_sheet("Master_Drivers", drv)
                    except: pass
            return True
        return False
    except: return False

def log_maintenance_record(record):
    try:
        return append_to_sheet("Maintenance_Logs", record)
    except: return False

def create_repair_ticket(ticket_data):
    try:
        return append_to_sheet("Repair_Tickets", ticket_data)
    except: return False

# modules/utils.py

def update_job_status(job_id, new_status, timestamp, distance_run=0, photo_data="-", signature_data="-", rating=0, comment="-"):
    try:
        # 1. อัปเดตสถานะงานใน Jobs_Main
        df_jobs = get_data("Jobs_Main")
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        
        driver_id = None
        if not idx.empty:
            i = idx[0]
            df_jobs.at[i, 'Job_Status'] = new_status
            
            # บันทึกเวลาตามสถานะ
            if new_status == "DELIVERED":
                df_jobs.at[i, 'Arrive_Dest_Time'] = timestamp
            elif new_status == "Completed":
                df_jobs.at[i, 'Actual_Delivery_Time'] = timestamp
                
            if photo_data != "-": df_jobs.at[i, 'Photo_Proof_Url'] = photo_data
            if signature_data != "-": df_jobs.at[i, 'Signature_Url'] = signature_data
            
            # --- ส่วนที่เพิ่มใหม่: บันทึกความพึงพอใจ ---
            if rating > 0: df_jobs.at[i, 'Rating'] = rating
            if comment != "-": df_jobs.at[i, 'Customer_Comment'] = comment
            # ---------------------------------------
            
            driver_id = df_jobs.at[i, 'Driver_ID']
            update_sheet("Jobs_Main", df_jobs)
        
        # 2. อัปเดตข้อมูลคนขับ (เลขไมล์ และ สถานะ Offline)
        if driver_id:
            df_drivers = get_data("Master_Drivers")
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            
            if not d_idx.empty:
                i_drv = d_idx[0]
                need_update = False
                
                # 2.1 อัปเดตเลขไมล์ (สะสมระยะทาง)
                if new_status in ["Completed", "DELIVERED"] and distance_run > 0:
                    try:
                        current = pd.to_numeric(df_drivers.at[i_drv, 'Current_Mileage'], errors='coerce')
                        if pd.isna(current): current = 0
                        df_drivers.at[i_drv, 'Current_Mileage'] = current + float(distance_run)
                        need_update = True
                    except: pass

                # 2.2 ตั้งค่า Offline (ล้างพิกัด GPS) เมื่อจบงาน
                if new_status == "Completed":
                    df_drivers.at[i_drv, 'Current_Lat'] = ""
                    df_drivers.at[i_drv, 'Current_Lon'] = ""
                    need_update = True

                if need_update:
                    df_drivers.at[i_drv, 'Last_Update'] = get_thai_time_str()
                    update_sheet("Master_Drivers", df_drivers)

        return True
    except Exception as e:
        print(f"Update Job Error: {e}") 
        return False

def simple_update_job_status(job_id, new_status, extra_updates=None):
    try:
        df_jobs = get_data("Jobs_Main")
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        if idx.empty: return False
        
        i = idx[0]
        df_jobs.at[i, 'Job_Status'] = new_status
        if extra_updates:
            for k, v in extra_updates.items(): 
                df_jobs.at[i, k] = v
        update_sheet("Jobs_Main", df_jobs)
        return True
    except: return False

def update_driver_location(driver_id, lat, lon):
    try:
        df = get_data("Master_Drivers")
        df['Driver_ID'] = df['Driver_ID'].astype(str)
        idx = df[df['Driver_ID'] == str(driver_id)].index
        if not idx.empty:
            df.at[idx[0], 'Current_Lat'] = lat
            df.at[idx[0], 'Current_Lon'] = lon
            df.at[idx[0], 'Last_Update'] = get_thai_time_str()
            update_sheet("Master_Drivers", df)
            return True
        return False
    except: return False

def sync_to_legacy_sheet(start_date, end_date):
    df_jobs = get_data("Jobs_Main")
    if df_jobs.empty: return False, "ไม่มีข้อมูล"
    
    if 'Plan_Date' in df_jobs.columns:
        df_jobs['Plan_Date_Obj'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
        mask = (df_jobs['Plan_Date_Obj'].dt.date >= start_date) & (df_jobs['Plan_Date_Obj'].dt.date <= end_date)
        df_export = df_jobs[mask]
        return True, f"พร้อม Export: {len(df_export)} รายการ (ระบบจำลอง)"
    else: return False, "ไม่มีคอลัมน์วันที่"

def deduct_stock_item(part_name, qty_used):
    try:
        df_stock = get_data("Stock_Parts").copy()
        if df_stock.empty: return False, "ไม่พบข้อมูลสต็อก"
        
        df_stock['Qty_On_Hand'] = pd.to_numeric(df_stock['Qty_On_Hand'], errors='coerce').fillna(0)
        
        idx = df_stock[df_stock['Part_Name'] == part_name].index
        if idx.empty: return False, f"ไม่พบอะไหล่ '{part_name}'"
        
        current_qty = df_stock.at[idx[0], 'Qty_On_Hand']
        if current_qty < qty_used:
            return False, f"ของไม่พอ! (มี {current_qty} / จะเบิก {qty_used})"
        
        new_qty = current_qty - qty_used
        df_stock.at[idx[0], 'Qty_On_Hand'] = new_qty
        
        update_sheet("Stock_Parts", df_stock)
        return True, f"ตัดสต็อกสำเร็จ (เหลือ {new_qty})"
    except Exception as e:
        return False, f"Error: {str(e)}"


def get_manual_content():
    return """
# คู่มือการใช้งานระบบ Logis-Pro 360

## ภาพรวมระบบ
ระบบนี้แบ่งการใช้งานเป็น 2 ส่วนหลัก:
1. **Admin (Control Tower):** ใช้งานผ่านคอมพิวเตอร์ เพื่อจ่ายงาน, ดูรายงาน, และตรวจสอบตำแหน่งรถ
2. **Driver (Driver App):** ใช้งานผ่านมือถือ เพื่อดูงาน, ปิดงาน (ePOD), และบันทึกการเติมน้ำมัน

---

## 🖥️ ส่วนที่ 1: สำหรับ Admin

### 1. 📝 Tab 1: จ่ายงาน (Create Job)
* **เลือกเส้นทาง:** เลือก "กลุ่มงาน" และ "ปลายทาง" แล้วกดปุ่ม "⬇️ ใช้ข้อมูลนี้" ระบบจะดึงข้อมูลมาเติมให้อัตโนมัติ
* **เลือกคนขับ:** เลือกรถที่ต้องการจ่ายงาน (เลือกได้หลายคันพร้อมกัน)
* **Option เสริม:** ใส่จำนวนชั้นที่ต้องยก, คนยก, หรือค้างคืน
* **💰 กำหนดราคาเอง:** หากต้องการระบุราคาเหมาพิเศษ ให้กรอกช่องนี้ (ถ้าปล่อย 0 ระบบจะคำนวณ Auto ตาม Rate Card)
* กดปุ่ม **"✅ ยืนยันจ่ายงาน (ทุกคัน)"**

### 2. 📊 Tab 2: Profit & Data (รายงาน)
* **ตัวเลือกวันที่:** เลือกช่วงวันที่ต้องการดูข้อมูล (ระบบรองรับทั้งปี พ.ศ. และ ค.ศ.)
* **ตาราง Fleet Performance:** ดูสรุปว่ารถแต่ละคัน วิ่งกี่เที่ยว, ใช้น้ำมันกี่ลิตร, กำไรสุทธิเท่าไหร่
* **📍 แผนที่:** ในตารางมีคอลัมน์กดเพื่อดูตำแหน่งรถล่าสุดได้ทันที
* **📤 ส่งข้อมูลบัญชี:** เลื่อนลงล่างสุด กดปุ่ม "🚀 Sync Accounting" เพื่อส่งข้อมูลเข้า Google Sheet บัญชี

### 3. 🔧 Tab 3: MMS (งานซ่อม & บำรุงรักษา)
* **🔔 แจ้งเตือน:** ถ้ารถคันไหนวิ่งครบระยะ (น้ำมันเครื่อง/ยาง) จะมีแถบสีแดงแจ้งเตือน
* **🛠️ บันทึกการเข้าศูนย์:** เมื่อซ่อมเสร็จ ให้มาบันทึกที่นี่เพื่อ Reset รอบการเตือน

### 4. ⚙️ Tab 8: ตั้งค่าระบบ
* ใช้สำหรับปรับเปลี่ยน **ราคากลาง, อัตรากินน้ำมัน, ค่าแรงยก** โดยไม่ต้องแก้โค้ด

---

## 📱 ส่วนที่ 2: สำหรับ Driver (คนขับรถ)

### 1. 📦 เมนู "งานของฉัน"
* **ดูงาน:** กดปุ่ม "ทำ >" เพื่อเริ่มงาน
* **นำทาง:** กดปุ่ม "🗺️ นำทาง" ระบบจะเปิด Google Maps พาไปปลายทางทันที
* **อัปเดตสถานะ:** กดปุ่ม "รับของ", "ออกเดินทาง", "ถึงแล้ว" ตามลำดับ
* **ปิดงาน (ePOD):**
    1. กด "📂 เลือกรูป" (เลือกจากอัลบั้มได้หลายรูป) หรือ "📸 ถ่ายรูป" (ถ่ายสด)
    2. ถ่ายรูป **ลายเซ็น** ลูกค้า
    3. กด "✅ ยืนยันปิดงาน"

### 2. ⛽ เมนู "เติมน้ำมัน" (สำคัญ!)
* **กรอกไมล์ปัจจุบัน:** ใส่เลขไมล์ที่หน้าปัดรถ ระบบจะคำนวณระยะทางที่วิ่งมา
* **💡 ระบบช่วยคำนวณ:** จะมีแถบสีเขียวขึ้นบอกว่า "วิ่งมา xxx กม. ควรเติมประมาณ yy ลิตร"
* **ถ่ายรูป:** ถ่ายรูปสลิปและเลขไมล์ -> กดบันทึก

### 3. 🔧 เมนู "แจ้งซ่อม"
* ถ้าถึงรอบถ่ายน้ำมันเครื่อง/เปลี่ยนยาง จะมี **ตัวหนังสือสีแดง** เตือนทันที ให้แจ้งหัวหน้างานผ่านเมนูนี้

---
**💡 Tips:** หากข้อมูลไม่ขึ้น ให้กดปุ่ม "🔄 รีเฟรชข้อมูลล่าสุด" ที่เมนูซ้ายมือ
    """