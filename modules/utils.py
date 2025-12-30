# modules/utils.py

import streamlit as st
import pandas as pd
from datetime import datetime
import pytz
from PIL import Image
import io
import base64
import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
from math import radians, cos, sin, asin, sqrt # Import Math functions here
from data.repository import get_data, update_sheet, append_to_sheet

# ==========================================
# 1. Date & Time Helpers
# ==========================================

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
        
        # 1. แก้ไขปี พ.ศ.
        if len(s) >= 4:
            years = re.findall(r'\d{4}', s)
            for year in years:
                if int(year) > 2400: # สันนิษฐานว่าเป็น พ.ศ.
                    s = s.replace(year, str(int(year) - 543))
        
        # 2. พยายามแปลงวันที่
        try:
            return pd.to_datetime(s, dayfirst=True)
        except:
            try:
                return pd.to_datetime(s)
            except:
                return pd.to_datetime(s, errors='coerce')
    except: 
        return pd.NaT

# ==========================================
# 2. Image Processing
# ==========================================

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

# ==========================================
# 3. Config & Calculations (Fuel/Cost)
# ==========================================

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

def get_vehicle_kpl(plate):
    """Calculates average KPL from Fuel_Logs."""
    try:
        df = get_data("Fuel_Logs")
        if df.empty: return 0.0
        
        df['Odometer'] = pd.to_numeric(df['Odometer'], errors='coerce')
        df['Liters'] = pd.to_numeric(df['Liters'], errors='coerce')
        
        my_logs = df[df['Vehicle_Plate'].astype(str) == str(plate)].dropna(subset=['Odometer', 'Liters']).sort_values(by='Odometer')
        if len(my_logs) < 2: return 0.0
        
        my_logs['Prev_Odo'] = my_logs['Odometer'].shift(1)
        my_logs['Dist_Run'] = my_logs['Odometer'] - my_logs['Prev_Odo']
        
        valid_trips = my_logs[(my_logs['Dist_Run'] > 0) & (my_logs['Liters'] > 0)]
        if valid_trips.empty: return 0.0
        
        valid_trips['KPL'] = valid_trips['Dist_Run'] / valid_trips['Liters']
        reliable_kpl = valid_trips[(valid_trips['KPL'] > 1.0) & (valid_trips['KPL'] < 20.0)]
        
        return reliable_kpl['KPL'].mean() if not reliable_kpl.empty else 0.0
    except: return 0.0

def _get_static_kpl(vehicle_type):
    try:
        rate_4w = get_config_value("fuel_4w", 11.5)
        rate_6w = get_config_value("fuel_6w", 5.5)
        rate_10w = get_config_value("fuel_10w", 3.5)
        
        v_type = str(vehicle_type)
        if "พ่วง" in v_type or "เทรลเลอร์" in v_type: return 2.75
        elif "10" in v_type: return rate_10w
        elif "6" in v_type: return rate_6w
        else: return rate_4w
    except: return 11.5

def get_consumption_rate_by_driver(driver_id):
    try:
        drivers = get_data("Master_Drivers")
        drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
        row = drivers[drivers['Driver_ID'] == str(driver_id)]
        
        if row.empty: return 11.5
        
        v_plate = str(row.iloc[0].get('Vehicle_Plate', ''))
        v_type = str(row.iloc[0].get('Vehicle_Type', '4 ล้อ'))
        
        actual_kpl = get_vehicle_kpl(v_plate)
        return actual_kpl if actual_kpl > 1.0 else _get_static_kpl(v_type)
    except: return 11.5

def calculate_driver_cost(plan_date, distance, vehicle_type, current_diesel_price=None, vehicle_plate=None, total_drops=1):
    try:
        try: distance = float(distance)
        except: return 0.0

        # 1. Base Rate (Fixed)
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
        
        base_rate = 0.0
        if not tier.empty:
            try: price = float(str(current_diesel_price).replace(',','')) if current_diesel_price else 30.00
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
            if target_col_idx < len(df.columns):
                cost_value = tier.iloc[0, target_col_idx]
                base_rate = float(str(cost_value).replace(',', ''))
        
        # 2. Dynamic Fuel
        diesel_price = float(str(current_diesel_price).replace(',','')) if current_diesel_price else get_config_value("fuel_diesel_price", 30.00)
        
        kpl_to_use = 0.0
        if vehicle_plate:
             actual_kpl = get_vehicle_kpl(vehicle_plate)
             kpl_to_use = actual_kpl if actual_kpl > 1.0 else _get_static_kpl(vehicle_type)
        else:
             kpl_to_use = _get_static_kpl(vehicle_type)
        
        dynamic_fuel_cost = 0.0
        if kpl_to_use > 0:
            fuel_cost_per_km = diesel_price / kpl_to_use
            dynamic_fuel_cost = distance * fuel_cost_per_km
        
        # 3. Other Costs
        depreciation_rate = get_config_value("cost_depreciation_per_km", 3.00)
        depreciation_cost = distance * depreciation_rate
        
        labor_cost_per_drop = get_config_value("cost_labor_per_drop", 50.00)
        labor_cost = total_drops * labor_cost_per_drop
        
        toll_fee = get_config_value("cost_default_toll", 100.00)

        final_cost = base_rate + dynamic_fuel_cost + depreciation_cost + labor_cost + toll_fee
        return final_cost
    except Exception as e: 
        print(f"Cost Calc Error: {e}")
        return 0.0

# ==========================================
# 4. Status & Maintenance
# ==========================================

def get_maintenance_status_all():
    try:
        drivers = get_data("Master_Drivers").copy()
        maint_logs = get_data("Maintenance_Logs").copy()
        if drivers.empty: return pd.DataFrame()
        
        drivers['Vehicle_Plate'] = drivers['Vehicle_Plate'].astype(str)
        drivers['Current_Mileage'] = pd.to_numeric(drivers['Current_Mileage'], errors='coerce').fillna(0)
        
        rules = {
            "ถ่ายน้ำมันเครื่อง": [get_config_value("maint_oil_km", 10000), get_config_value("maint_oil_days", 180)], 
            "เปลี่ยนยาง/ช่วงล่าง": [get_config_value("maint_tire_km", 50000), get_config_value("maint_tire_days", 730)], 
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
                days_run = (datetime.now() - last_date).days if pd.notna(last_date) else 0
                
                status, is_due, note = "✅ ปกติ", False, "-"
                
                if dist_run >= limit_km: 
                    status, note, is_due = "⚠️ ครบระยะทาง", f"เกิน {dist_run - limit_km:,.0f} กม.", True
                elif days_run >= limit_days: 
                    status, note, is_due = "⚠️ ครบกำหนดเวลา", f"เกิน {days_run - limit_days:,.0f} วัน", True
                elif dist_run >= (limit_km * 0.9): 
                    status, note = "🟡 ใกล้ครบระยะ", f"เหลือ {limit_km - dist_run:,.0f} กม."

                all_status.append({
                    "Vehicle_Plate": plate, "Driver_Name": row.get('Driver_Name','-'), 
                    "Service_Type": service_name, "Current_Mileage": row['Current_Mileage'],
                    "Last_Service_Odo": last_odo, "Distance_Run": dist_run,
                    "Status": status, "Note": note, "Is_Due": is_due
                })
        return pd.DataFrame(all_status)
    except: return pd.DataFrame()

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
        "PLANNED": "วางแผนแล้ว", "ASSIGNED": "จ่ายงานแล้ว", "PICKED_UP": "รับสินค้าแล้ว",
        "IN_TRANSIT": "กำลังขนส่ง", "DELIVERED": "ถึงปลายทางแล้ว", "COMPLETED": "ปิดงานสมบูรณ์",
        "FAILED": "ส่งไม่สำเร็จ", "CANCELLED": "ยกเลิกงาน", "Completed": "ปิดงานสมบูรณ์", "Pending": "รอดำเนินการ"
    }
    return mapping.get(str(status_code), str(status_code))

def get_fuel_prices():
    try:
        url = "https://gasprice.kapook.com/gasprice.php#ptt"
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
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
                        fuel_prices[current_section][match.group(1).strip()] = match.group(2).strip()
        return fuel_prices
    except: return {}

# ==========================================
# 5. Database Actions
# ==========================================

def create_new_job(job_data):
    try:
        if not job_data.get('Job_ID'): return False
        return append_to_sheet("Jobs_Main", job_data)
    except: return False

def create_fuel_log(fuel_data):
    try:
        if append_to_sheet("Fuel_Logs", fuel_data):
            if 'Odometer' in fuel_data and 'Vehicle_Plate' in fuel_data:
                drv = get_data("Master_Drivers")
                drv['Vehicle_Plate'] = drv['Vehicle_Plate'].astype(str)
                idx = drv[drv['Vehicle_Plate'] == str(fuel_data['Vehicle_Plate'])].index
                if not idx.empty:
                    try:
                        drv.at[idx[0], 'Current_Mileage'] = float(fuel_data['Odometer'])
                        drv.at[idx[0], 'Last_Update'] = get_thai_time_str()
                        update_sheet("Master_Drivers", drv)
                    except: pass
            return True
        return False
    except: return False

def log_maintenance_record(record):
    try: return append_to_sheet("Maintenance_Logs", record)
    except: return False

def create_repair_ticket(ticket_data):
    try: return append_to_sheet("Repair_Tickets", ticket_data)
    except: return False

def update_job_status(job_id, new_status, timestamp, distance_run=0, photo_data="-", signature_data="-", rating=0, comment="-", delivery_lat="-", delivery_lon="-", failed_reason=None):
    try:
        df_jobs = get_data("Jobs_Main")
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        
        driver_id = None
        if not idx.empty:
            i = idx[0]
            df_jobs.at[i, 'Job_Status'] = new_status
            
            if new_status == "DELIVERED":
                df_jobs.at[i, 'Arrive_Dest_Time'] = timestamp
            elif new_status == "Completed":
                df_jobs.at[i, 'Actual_Delivery_Time'] = timestamp
                
            if photo_data != "-": df_jobs.at[i, 'Photo_Proof_Url'] = photo_data
            if signature_data != "-": df_jobs.at[i, 'Signature_Url'] = signature_data
            if rating > 0: df_jobs.at[i, 'Rating'] = rating
            if comment != "-": df_jobs.at[i, 'Customer_Comment'] = comment
            if failed_reason: df_jobs.at[i, 'Failed_Reason'] = failed_reason
            
            if delivery_lat != "-": df_jobs.at[i, 'Delivery_Lat'] = delivery_lat
            if delivery_lon != "-": df_jobs.at[i, 'Delivery_Lon'] = delivery_lon
            
            driver_id = df_jobs.at[i, 'Driver_ID']
            update_sheet("Jobs_Main", df_jobs)
        
        # Update Driver Mileage
        if driver_id:
            df_drivers = get_data("Master_Drivers")
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            
            if not d_idx.empty:
                i_drv = d_idx[0]
                need_update = False
                if new_status in ["Completed", "DELIVERED"] and distance_run > 0:
                    try:
                        current = pd.to_numeric(df_drivers.at[i_drv, 'Current_Mileage'], errors='coerce')
                        if pd.isna(current): current = 0
                        df_drivers.at[i_drv, 'Current_Mileage'] = current + float(distance_run)
                        need_update = True
                    except: pass

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

def sync_to_legacy_sheet(start_date, end_date):
    # Placeholder to prevent crash. 
    # Logic to be implemented if specific legacy sheet schema is provided.
    return True, "Feature disabled in this version"

def deduct_stock_item(part_name, qty_used):
    try:
        df_stock = get_data("Stock_Parts").copy()
        if df_stock.empty: return False, "ไม่พบข้อมูลสต็อก"
        
        df_stock['Qty_On_Hand'] = pd.to_numeric(df_stock['Qty_On_Hand'], errors='coerce').fillna(0)
        
        idx = df_stock[df_stock['Part_Name'] == part_name].index
        if idx.empty: return False, f"ไม่พบอะไหล่ '{part_name}'"
        
        current_qty = df_stock.at[idx[0], 'Qty_On_Hand']
        try: qty_val = float(qty_used)
        except: return False, "จำนวนไม่ถูกต้อง"

        if qty_val <= 0: return False, "จำนวนต้อง > 0"
        if current_qty < qty_val: return False, f"ของไม่พอ! (มี {current_qty} / จะเบิก {qty_val})"
        
        new_qty = current_qty - qty_val
        df_stock.at[idx[0], 'Qty_On_Hand'] = new_qty
        update_sheet("Stock_Parts", df_stock)
        return True, f"ตัดสต็อกสำเร็จ (เหลือ {new_qty})"
    except Exception as e: return False, f"Error: {str(e)}"

def send_telegram_notify(message, image_data=None):
    try:
        token = get_config_value("telegram_token", "")
        chat_id = get_config_value("telegram_chat_id", "")
        if not token or not chat_id: return False, "No Config"

        url_msg = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(url_msg, data={"chat_id": chat_id, "text": message, "parse_mode": "HTML"})

        if image_data and len(str(image_data)) > 100:
            try:
                header, encoded = str(image_data).split(",", 1)
                img_bytes = base64.b64decode(encoded)
                url_photo = f"https://api.telegram.org/bot{token}/sendPhoto"
                files = {'photo': ('epod_proof.jpg', img_bytes, 'image/jpeg')}
                requests.post(url_photo, data={"chat_id": chat_id, "caption": "📸 หลักฐาน ePOD"}, files=files)
            except: pass
        return True, "Sent"
    except Exception as e: return False, str(e)

def calculate_distance(lat1, lon1, lat2, lon2):
    try:
        lon1, lat1, lon2, lat2 = map(radians, [float(lon1), float(lat1), float(lon2), float(lat2)])
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a)) 
        return c * 6371
    except: return 9999.0

def solve_route_tsp(drops_df):
    try:
        if 'Lat' not in drops_df.columns or 'Lon' not in drops_df.columns: return drops_df
        unvisited = drops_df.copy()
        unvisited['Lat'] = pd.to_numeric(unvisited['Lat'], errors='coerce').fillna(0)
        unvisited['Lon'] = pd.to_numeric(unvisited['Lon'], errors='coerce').fillna(0)
        
        current_lat, current_lon = 13.7563, 100.5018 
        sorted_indices = []
        
        while not unvisited.empty:
            unvisited['dist_temp'] = unvisited.apply(lambda x: calculate_distance(current_lat, current_lon, x['Lat'], x['Lon']), axis=1)
            nearest = unvisited.nsmallest(1, 'dist_temp')
            if not nearest.empty:
                idx = nearest.index[0]
                sorted_indices.append(idx)
                current_lat = nearest.iloc[0]['Lat']
                current_lon = nearest.iloc[0]['Lon']
                unvisited = unvisited.drop(idx)
            else: break
        return drops_df.loc[sorted_indices].reset_index(drop=True)
    except: return drops_df

def get_manual_content():
    return """
# คู่มือการใช้งานระบบ Logis-Pro 360
... (เนื้อหาคู่มือ) ...
    """