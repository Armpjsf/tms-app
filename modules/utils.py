import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import pytz # type: ignore
from PIL import Image # type: ignore
import io
import base64
import requests
from bs4 import BeautifulSoup # type: ignore
import re
from modules.database import get_data, update_sheet, get_connection_direct

# --- Utility Functions ---
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

# --- Config & Calculations ---
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
        row = drivers[drivers['Driver_ID'].astype(str) == str(driver_id)]
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
            if "ระยะทาง" in str(col_name) or "Distance" in str(col_name): dist_col_idx = i; break
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
        
        cost = tier.iloc[0, dist_col_idx + 1 + (group_offset * 3) + veh_offset]
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
        rules = {"ถ่ายน้ำมันเครื่อง": [oil_km, oil_days], "เปลี่ยนยาง/ช่วงล่าง": [tire_km, tire_days], "เช็คระยะทั่วไป": [20000, 365]}
        
        all_status = []
        for service_name, (limit_km, limit_days) in rules.items():
            merged = drivers.copy()
            merged['Last_Service_Odo'] = 0
            merged['Date_Service'] = pd.NaT
            if not maint_logs.empty:
                svc_logs = maint_logs[maint_logs['Service_Type'] == service_name].copy()
                if not svc_logs.empty:
                    svc_logs['Odometer'] = pd.to_numeric(svc_logs['Odometer'], errors='coerce')
                    svc_logs['Date_Service'] = pd.to_datetime(svc_logs['Date_Service'], errors='coerce')
                    svc_logs = svc_logs.sort_values('Date_Service')
                    last_svc = svc_logs.groupby('Vehicle_Plate').last()[['Odometer', 'Date_Service']]
                    for idx, row in merged.iterrows():
                        plate = row['Vehicle_Plate']
                        if plate in last_svc.index:
                            merged.at[idx, 'Last_Service_Odo'] = last_svc.at[plate, 'Odometer']
                            merged.at[idx, 'Date_Service'] = last_svc.at[plate, 'Date_Service']
            merged['Dist_Run'] = merged['Current_Mileage'] - merged['Last_Service_Odo']
            now = datetime.now()
            merged['Days_Run'] = (now - merged['Date_Service']).dt.days.fillna(0)
            
            for _, row in merged.iterrows():
                dist_run = row['Dist_Run']
                days_run = row['Days_Run']
                status = "✅ ปกติ"; is_due = False; note = ""
                if dist_run >= limit_km: status = "⚠️ ครบระยะทาง"; note = f"เกิน {dist_run - limit_km:,.0f} กม."; is_due = True
                elif days_run >= limit_days: status = "⚠️ ครบกำหนดเวลา"; note = f"เกิน {days_run - limit_days:,.0f} วัน"; is_due = True
                elif dist_run >= (limit_km * 0.9): status = "🟡 ใกล้ครบระยะ"; note = f"เหลือ {limit_km - dist_run:,.0f} กม."
                all_status.append({"Vehicle_Plate": row['Vehicle_Plate'], "Driver_Name": row['Driver_Name'], "Service_Type": service_name, "Current_Mileage": row['Current_Mileage'], "Last_Service_Odo": row['Last_Service_Odo'], "Distance_Run": f"{dist_run:,.0f} กม.", "Status": status, "Note": note, "Is_Due": is_due})
        return pd.DataFrame(all_status)
    except: return pd.DataFrame()

def get_last_fuel_odometer(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0
        return float(df[df['Vehicle_Plate'].astype(str) == str(plate)]['Odometer'].max())
    except: return 0

def calculate_actual_consumption(plate):
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0, 0, 0
        my_logs = df[df['Vehicle_Plate'].astype(str) == str(plate)].sort_values(by='Odometer')
        if len(my_logs) < 2: return 0, 0, 0
        total_dist = my_logs.iloc[-1]['Odometer'] - my_logs.iloc[0]['Odometer']
        total_liters = my_logs.iloc[1:]['Liters'].sum()
        if total_liters > 0: return total_dist / total_liters, total_dist, total_liters
        else: return 0, 0, 0
    except: return 0, 0, 0

def get_status_label_th(status_code: str) -> str:
    mapping = {"PLANNED": "วางแผนแล้ว", "ASSIGNED": "จ่ายงานแล้ว", "PICKED_UP": "รับของแล้ว", "IN_TRANSIT": "กำลังส่ง", "DELIVERED": "ถึงแล้ว", "COMPLETED": "ปิดงาน", "FAILED": "ส่งไม่สำเร็จ"}
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
            if section.name == 'h3': current_section = section.get_text(strip=True); fuel_prices[current_section] = {}
            elif section.name == 'ul' and current_section:
                for item in section.find_all('li'):
                    text = item.get_text(separator=" ", strip=True)
                    match = re.search(r'(.+?)\s+([\d,]+\.\d{2})', text)
                    if match: fuel_prices[current_section][match.group(1).strip()] = match.group(2).strip()
        return fuel_prices
    except: return {}

# --- Database Update Wrappers ---
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
        conn = get_connection_direct()
        # To avoid circular logic with cache, we use direct connection update here logic if complex,
        # but for simplicity, we reload full df, update, and save.
        df_jobs = get_data("Jobs_Main")
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
            update_sheet("Jobs_Main", df_jobs)
        
        if new_status == "Completed" and driver_id and distance_run > 0:
            df_drivers = get_data("Master_Drivers")
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            if not d_idx.empty:
                try:
                    current = pd.to_numeric(df_drivers.at[d_idx[0], 'Current_Mileage'], errors='coerce')
                    if pd.isna(current): current = 0
                    df_drivers.at[d_idx[0], 'Current_Mileage'] = current + distance_run
                    df_drivers.at[d_idx[0], 'Last_Update'] = get_thai_time_str()
                    update_sheet("Master_Drivers", df_drivers)
                except: pass
        return True
    except: return False

def simple_update_job_status(job_id, new_status, extra_updates=None):
    try:
        df_jobs = get_data("Jobs_Main")
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        if idx.empty: return False
        i = idx[0]
        df_jobs.at[i, 'Job_Status'] = new_status
        if extra_updates:
            for k, v in extra_updates.items(): df_jobs.at[i, k] = v
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

def log_maintenance_record(record):
    try:
        df = get_data("Maintenance_Logs")
        updated_df = pd.concat([df, pd.DataFrame([record])], ignore_index=True)
        update_sheet("Maintenance_Logs", updated_df)
        return True
    except: return False

def sync_to_legacy_sheet(start_date, end_date):
    # --- 📌 ตั้งค่าไฟล์ปลายทาง ---
    TARGET_ID = "1yy7TPgjW34rra6pBRCXaXb0IIDm1UpkuPcyRQ9POGw4"
    TARGET_URL = f"https://docs.google.com/spreadsheets/d/{TARGET_ID}/edit"
    TARGET_WORKSHEET = "MASTER" 
    # --------------------------
    
    try:
        # 1. เตรียมข้อมูลใหม่ (New Data)
        df_jobs = get_data("Jobs_Main")
        df_drivers = get_data("Master_Drivers")
        if df_jobs.empty: return False, "ไม่มีข้อมูลงานในระบบ"
        
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
                    if "ดีเซล" in k: current_fuel_price = v.replace(" บาท/ลิตร", ""); break
        except: pass

        if 'Plan_Date' in df_jobs.columns:
            df_jobs['Plan_Date'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
            mask = (df_jobs['Plan_Date'].dt.date >= start_date) & (df_jobs['Plan_Date'].dt.date <= end_date)
            df_export = df_jobs[mask].copy()
        else: return False, "ไม่พบคอลัมน์วันที่"
        
        if df_export.empty: return False, "ไม่พบงานในช่วงวันที่เลือก"

        # สร้าง Data ใหม่ (List of Dicts)
        final_data = []
        for _, row in df_export.iterrows():
            d_id = str(row.get('Driver_ID', ''))
            price_cust = float(pd.to_numeric(row.get('Price_Customer', 0), errors='coerce'))
            price_drv = float(pd.to_numeric(row.get('Cost_Driver_Total', 0), errors='coerce'))
            date_str = row['Plan_Date'].strftime('%d/%m/%Y') if pd.notna(row['Plan_Date']) else "-"

            # สร้าง dict ให้ตรงกับหัวตารางเดิม (A-AA)
            # หมายเหตุ: ชื่อ Key ต้องตรงกับชื่อหัวตารางใน Google Sheet เป๊ะๆ (ถ้ามี)
            # แต่ถ้า Google Sheet ไม่มีหัวตาราง หรือเป็นแถวว่างๆ เราจะใช้วิธี "ตำแหน่งคอลัมน์" แทน
            record = {
                'วันที่': date_str,                                   # A
                'รหัสลูกค้า': row.get('Customer_ID', '-'),            # B
                'ลูกค้า': row.get('Customer_Name', '-'),              # C
                'ประเภทรถ': row.get('Vehicle_Type', '-'),             # D (ชื่อซ้ำระวัง!) -> ถ้าชื่อซ้ำให้ใช้ชื่ออื่นแล้วค่อยแก้ตอน map
                # ** เพื่อความชัวร์ เราจะใช้ DataFrame แบบไม่มี Header แล้วอ้างอิงตำแหน่งเอา **
                # (ข้ามไปสร้าง DataFrame ด้านล่าง)
            }
            
            # สร้าง Row แบบ List เรียงลำดับ A -> AA (27 คอลัมน์)
            row_list = [
                date_str,                                   # A วันที่
                row.get('Customer_ID', '-'),                # B รหัสลูกค้า
                row.get('Customer_Name', '-'),              # C ลูกค้า
                row.get('Vehicle_Type', '-'),               # D ประเภทรถ (ลูกค้า)
                '-',                                        # E จำนวนสินค้า
                row.get('Origin_Location', '-'),            # F ต้นทาง
                row.get('Dest_Location', '-'),              # G ปลายทาง
                row.get('Est_Distance_KM', 0),              # H ระยะทาง
                current_fuel_price,                         # I ราคาน้ำมัน
                price_cust,                                 # J ราคา (ลูกค้า)
                '-',                                        # K ค่าจัดเรียง
                '-',                                        # L พ่วง
                '-',                                        # M อื่นๆ
                '-',                                        # N ตีกลับ
                price_cust,                                 # O รวม (ลูกค้า)
                row.get('Vehicle_Plate', '-'),              # P ทะเบียน
                driver_map.get(d_id, '-'),                  # Q ชื่อ
                veh_map.get(d_id, '-'),                     # R ประเภทรถ (รถร่วม)
                row.get('Origin_Location', '-'),            # S ต้นทาง
                row.get('Dest_Location', '-'),              # T ปลายทาง
                row.get('Est_Distance_KM', 0),              # U ระยะทาง
                price_drv,                                  # V ราคา (รถร่วม)
                '-',                                        # W ค่าจัดเรียง
                '-',                                        # X พ่วง
                '-',                                        # Y อื่นๆ
                '-',                                        # Z ตีกลับ
                price_drv                                   # AA รวม (รถร่วม)
            ]
            final_data.append(row_list)
        
        # แปลงเป็น DataFrame (ข้อมูลใหม่)
        df_new = pd.DataFrame(final_data)

        # --- 🔥 ส่วนที่เพิ่ม: อ่านของเก่า + ต่อท้าย ---
        conn = get_connection_direct()
        
        try:
            # 1. อ่านข้อมูลเก่าทั้งหมดมาก่อน (แบบไม่มี Header เพื่อกันเรื่องชื่อซ้ำ)
            # header=None จะทำให้อ่านบรรทัดที่ 1, 2, 3 มาเป็น Data ด้วย
            df_old = conn.read(spreadsheet=TARGET_URL, worksheet=TARGET_WORKSHEET, ttl=0, header=None)
            
            # 2. ตรวจสอบความกว้าง (จำนวนคอลัมน์)
            # ถ้าของเก่ามีคอลัมน์มากกว่าของใหม่ ให้เติมของใหม่ให้ครบ
            if not df_old.empty:
                max_cols = max(df_old.shape[1], 27)
                # ปรับ df_new ให้มีจำนวนคอลัมน์เท่ากับ max_cols
                # (เติม NaN ไปก่อนถ้าขาด)
                if df_new.shape[1] < max_cols:
                    for i in range(df_new.shape[1], max_cols):
                        df_new[i] = None
                # ปรับ df_old ให้เท่ากัน (เผื่อของเก่าสั้นกว่า)
                if df_old.shape[1] < max_cols:
                    for i in range(df_old.shape[1], max_cols):
                        df_old[i] = None
                
                # ตั้งชื่อคอลัมน์ให้เหมือนกัน (เป็นตัวเลข 0, 1, 2...) เพื่อให้ concat ได้
                df_old.columns = range(max_cols)
                df_new.columns = range(max_cols)

                # 3. รวมร่าง (เอาของเก่าตั้ง + ต่อด้วยของใหม่)
                df_final = pd.concat([df_old, df_new], ignore_index=True)
            else:
                df_final = df_new
        except:
            # ถ้าอ่านของเก่าไม่ได้ (เช่น ไฟล์ว่าง)
            df_final = df_new

        # 4. เขียนกลับลงไป (แบบไม่มี Header เพราะเราอ่านมาแบบดิบๆ รวมหัวตารางมาแล้ว)
        # ใช้ update แต่เขียนข้อมูลชุดใหญ่ทับลงไปเลย
        conn.update(spreadsheet=TARGET_URL, worksheet=TARGET_WORKSHEET, data=df_final)
        
        return True, f"✅ เพิ่มข้อมูล {len(final_data)} รายการ ต่อท้ายเรียบร้อย (รวม {len(df_final)} บรรทัด)"

    except Exception as e: return False, f"Error: {str(e)}"

def get_manual_content():
    return """
# 📘 คู่มือการใช้งานระบบ Logis-Pro 360
(รายละเอียดคู่มือย่อ...)
    """

# --- (วางต่อท้ายสุดของไฟล์ modules/utils.py) ---

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