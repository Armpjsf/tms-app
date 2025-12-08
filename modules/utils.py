import os
import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timedelta
import pytz # type: ignore
from PIL import Image, ImageFile # type: ignore
import io
import base64
import requests
from bs4 import BeautifulSoup # type: ignore
import re
import urllib.parse
import logging
from functools import lru_cache
from typing import Dict, List, Tuple, Optional, Union, Any
from modules.database import get_data, update_sheet, append_to_sheet, cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure PIL to be more resilient with image files
ImageFile.LOAD_TRUNCATED_IMAGES = True

# Constants
MAX_IMAGE_WIDTH = 1024
IMAGE_QUALITY = 70  # 0-100, higher means better quality but larger file size
CACHE_TTL = 300  # 5 minutes

# --- Utility Functions ---

def convert_df_to_csv(df: pd.DataFrame) -> bytes:
    """
    Convert DataFrame to CSV without caching to avoid 'unhashable type' error.
    """
    return df.to_csv(index=False).encode('utf-8-sig')

# Cached time functions with timezone awareness
_thai_tz = pytz.timezone('Asia/Bangkok')

@lru_cache(maxsize=None)
def get_thai_time_str() -> str:
    return datetime.now(_thai_tz).strftime("%Y-%m-%d %H:%M:%S")

@lru_cache(maxsize=None)
def get_thai_date_str() -> str:
    return datetime.now(_thai_tz).strftime("%Y-%m-%d")

@lru_cache(maxsize=100)
def _get_image_cache_key(image_file) -> str:
    try:
        if hasattr(image_file, 'name') and hasattr(image_file, 'size') and hasattr(image_file, 'last_modified'):
            return f"{image_file.name}_{image_file.size}_{image_file.last_modified}"
        return str(hash(str(image_file)))
    except:
        return str(id(image_file))

def compress_image(image_file, max_width: int = MAX_IMAGE_WIDTH, quality: int = IMAGE_QUALITY) -> str:
    if image_file is None: return "-"
        
    cache_key = f"img_{_get_image_cache_key(image_file)}_{max_width}_{quality}"
    cached = cache.get(cache_key)
    if cached is not None: return cached
    
    try:
        if hasattr(image_file, 'read'): img = Image.open(image_file)
        else: img = Image.open(io.BytesIO(image_file))
        
        if img.mode != 'RGB': img = img.convert('RGB')
        
        width_percent = max_width / float(img.size[0])
        new_height = int(float(img.size[1]) * float(width_percent))
        img = img.resize((max_width, new_height), Image.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        result = f"data:image/jpeg;base64,{encoded}"
        
        # Safety check for sheet limit (~50k chars)
        if len(result) > 45000: return "-"
        
        cache.set(cache_key, result, ttl=3600)
        return result
    except Exception as e:
        logger.error(f"Error compressing image: {str(e)}")
        return "-"

def process_multiple_images(image_file_list: List[Any], max_width: int = 800, quality: int = 70) -> str:
    if not image_file_list: return "-"
    try:
        processed_images = []
        total_height = 0
        for img_file in image_file_list:
            if hasattr(img_file, 'read'): img = Image.open(img_file)
            else: img = Image.open(io.BytesIO(img_file))
            if img.mode != 'RGB': img = img.convert('RGB')
            width_percent = max_width / float(img.size[0])
            new_height = int(float(img.size[1]) * float(width_percent))
            img = img.resize((max_width, new_height), Image.LANCZOS)
            processed_images.append(img)
            total_height += new_height
        
        if not processed_images: return "-"
        
        merged_img = Image.new('RGB', (max_width, total_height), (255, 255, 255))
        y_offset = 0
        for img in processed_images:
            merged_img.paste(img, (0, y_offset))
            y_offset += img.size[1]
        
        buffer = io.BytesIO()
        merged_img.save(buffer, format="JPEG", quality=quality, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        result = f"data:image/jpeg;base64,{encoded}"
        
        if len(result) > 45000: return "-"
        return result
    except Exception: return "-"

@lru_cache(maxsize=100)
def get_config_value(key: str, default_value: float) -> float:
    try:
        cache_key = f"config_{key}"
        cached = cache.get(cache_key)
        if cached is not None: return float(cached)
        
        df = get_data("System_Config")
        if df.empty: return default_value
            
        key_col = next((col for col in df.columns if "key" in col.lower()), df.columns[0])
        val_col = next((col for col in df.columns if "value" in col.lower() and col != key_col), df.columns[1])
        
        row = df[df[key_col].astype(str).str.strip().str.lower() == str(key).lower()]
        
        if not row.empty:
            val_str = str(row.iloc[0][val_col]).replace(',', '').strip()
            result = float(val_str)
            cache.set(cache_key, str(result), ttl=3600)
            return result
        return default_value
    except: return default_value

@lru_cache(maxsize=1000)
def get_consumption_rate_by_driver(driver_id: str) -> float:
    try:
        rate_4w = get_config_value("fuel_4w", 11.5)
        rate_6w = get_config_value("fuel_6w", 5.5)
        rate_10w = get_config_value("fuel_10w", 3.5)
        
        cache_key = f"driver_{driver_id}"
        cached_rate = cache.get(cache_key)
        if cached_rate is not None: return float(cached_rate)
        
        drivers = get_data("Master_Drivers")
        if drivers.empty: return rate_4w
        
        row = drivers[drivers['Driver_ID'].astype(str).str.strip() == str(driver_id).strip()]
        if row.empty: return rate_4w
            
        v_type = str(row.iloc[0].get('Vehicle_Type', '4 ล้อ')).lower()
        if any(x in v_type for x in ["พ่วง", "เทรลเลอร์"]): result = 2.75
        elif any(x in v_type for x in ["10", "สิบ"]): result = rate_10w
        elif any(x in v_type for x in ["6", "หก"]): result = rate_6w
        else: result = rate_4w
        
        cache.set(cache_key, str(result), ttl=86400)
        return result
    except: return 11.5

# [UPDATED] สูตรคำนวณสำหรับ MasterRate_Card.csv (ตารางซับซ้อน)
def calculate_driver_cost(
    plan_date: str, 
    distance: float, 
    vehicle_type: str, 
    current_diesel_price: Optional[float] = None
) -> float:
    try:
        # 1. โหลดข้อมูล Rate Card (เน้นอ่านจากไฟล์ CSV ในโปรเจ็กต์ก่อน)
        cache_key = "rate_card_local"
        df = cache.get(cache_key)

        if df is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            csv_path = os.path.join(base_dir, "TMS_DEMO - Rate_Card.csv")
            df = pd.DataFrame()

            # พยายามอ่านจากไฟล์ CSV ในเครื่องก่อน
            try:
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    logger.info(f"Loaded Rate_Card from local CSV: {csv_path}")
            except Exception as e:
                logger.error(f"Error loading local Rate_Card CSV: {e}")

            # ถ้า CSV ไม่มี/อ่านไม่ได้ ค่อย fallback ไปใช้ Google Sheet
            if df.empty:
                try:
                    df = get_data("Rate_Card", force_refresh=True)
                    logger.info("Loaded Rate_Card from Google Sheet as fallback")
                except Exception as e:
                    logger.error(f"Error loading Rate_Card from Google Sheet: {e}")

            if df.empty:
                logger.warning("Rate Card is empty from both CSV and Google Sheet")
                return 0.0

            cache.set(cache_key, df, ttl=86400)

        # 2. หาราคาน้ำมันปัจจุบัน (ถ้าไม่มี ให้ใช้ค่ากลางๆ หรือ 30.00)
        try:
            price = float(str(current_diesel_price).replace(',', '')) if current_diesel_price else 30.00
        except: price = 30.00

        # 3. ระบุ "กลุ่มคอลัมน์" ตามช่วงราคาน้ำมัน
        # MasterRate_Card:
        # Col 1-3: ราคาน้ำมัน 24.01-27
        # Col 4-6: ราคาน้ำมัน 27.01-30
        # Col 7-9: ราคาน้ำมัน 30.01-32
        # Col 10-12: ราคาน้ำมัน 32.01-35
        
        if price <= 27.00:
            col_group_start = 1
        elif 27.01 <= price <= 30.00:
            col_group_start = 4
        elif 30.01 <= price <= 32.00:
            col_group_start = 7
        else: # แพงกว่า 32.01
            col_group_start = 10

        # 4. ระบุ "offset" ตามประเภทรถ
        # ช่องที่ 1 ของกลุ่ม = 4 ล้อ
        # ช่องที่ 2 ของกลุ่ม = 6 ล้อ
        # ช่องที่ 3 ของกลุ่ม = 10 ล้อ
        v_type_str = str(vehicle_type).lower()
        if any(x in v_type_str for x in ["6", "หก"]):
            veh_offset = 1
        elif any(x in v_type_str for x in ["10", "สิบ"]):
            veh_offset = 2
        else: # Default 4 ล้อ
            veh_offset = 0
            
        target_col_index = col_group_start + veh_offset

        # 5. เตรียมข้อมูล (ตัดหัวตาราง 2 บรรทัดแรกทิ้ง)
        # บรรทัดแรกๆ คือ header น้ำมัน/ประเภทรถ เราไม่ใช้
        # เราจะเริ่มหาจากบรรทัดที่มีตัวเลขระยะทาง (เช่น 50, 100...)
        
        # แปลงคอลัมน์แรก (ระยะทาง) เป็นตัวเลข
        # หมายเหตุ: ใช้ iloc[:, 0] คือเอาคอลัมน์แรกสุดเสมอ
        df_clean = df.copy()
        df_clean.iloc[:, 0] = pd.to_numeric(df_clean.iloc[:, 0], errors='coerce')
        
        # กรองเอาเฉพาะแถวที่มีระยะทางเป็นตัวเลข (ตัดบรรทัด header ทิ้ง)
        data_rows = df_clean.dropna(subset=[df_clean.columns[0]])
        
        if data_rows.empty: return 0.0
        
        # 6. ค้นหาระยะทาง (Lookup)
        # หาแถวที่ระยะทางในตาราง >= ระยะทางงาน
        tier = data_rows[data_rows.iloc[:, 0] >= distance].sort_values(by=data_rows.columns[0]).head(1)
        
        # ถ้าวิ่งไกลกว่าตารางที่มี ให้เอาแถวสุดท้าย (Max Distance)
        if tier.empty:
            tier = data_rows.sort_values(by=data_rows.columns[0], ascending=False).head(1)
            
        if tier.empty: return 0.0

        # 7. ดึงราคา
        try:
            # ดึงราคาจากคอลัมน์ที่คำนวณไว้
            raw_cost = tier.iloc[0, target_col_index]
            final_cost = float(str(raw_cost).replace(',', '').replace('"', '').strip())
            return final_cost
        except IndexError:
            logger.error(f"Target column {target_col_index} out of bounds")
            return 0.0
        except ValueError:
            return 0.0
            
    except Exception as e:
        logger.error(f"Calc Error: {str(e)}")
        return 0.0

@lru_cache(maxsize=1)
def get_maintenance_status_all() -> pd.DataFrame:
    try:
        cache_key = "maintenance_status_all"
        cached_result = cache.get(cache_key)
        if cached_result is not None: return cached_result
        
        drivers = get_data("Master_Drivers").copy()
        maint_logs = get_data("Maintenance_Logs").copy()
        
        if drivers.empty: return pd.DataFrame()
        
        drivers['Vehicle_Plate'] = drivers['Vehicle_Plate'].astype(str)
        drivers['Current_Mileage'] = pd.to_numeric(drivers['Current_Mileage'], errors='coerce').fillna(0).astype(int)
        
        rules = {
            "ถ่ายน้ำมันเครื่อง": [get_config_value("maint_oil_km", 10000), get_config_value("maint_oil_days", 180)],
            "เปลี่ยนยาง/ช่วงล่าง": [get_config_value("maint_tire_km", 50000), get_config_value("maint_tire_days", 730)]
        }
        
        if not maint_logs.empty:
            maint_logs['Odometer'] = pd.to_numeric(maint_logs['Odometer'], errors='coerce').fillna(0).astype(int)
            maint_logs['Date_Service'] = pd.to_datetime(maint_logs['Date_Service'], errors='coerce')
        
        all_status = []
        current_time = datetime.now()
        
        for service_name, (limit_km, limit_days) in rules.items():
            service_logs = maint_logs[maint_logs['Service_Type'] == service_name].copy() if not maint_logs.empty else pd.DataFrame()
            
            for _, driver in drivers.iterrows():
                plate = str(driver['Vehicle_Plate'])
                last_odo = 0; last_date = pd.NaT
                
                if not service_logs.empty:
                    vehicle_logs = service_logs[service_logs['Vehicle_Plate'].astype(str) == plate]
                    if not vehicle_logs.empty:
                        last_service = vehicle_logs.nlargest(1, 'Date_Service').iloc[0]
                        last_odo = int(last_service['Odometer'])
                        last_date = last_service['Date_Service']
                
                current_odo = int(driver['Current_Mileage'])
                dist_run = max(0, current_odo - last_odo)
                days_run = (current_time - last_date).days if pd.notna(last_date) else 0
                
                status = "✅ ปกติ"; is_due = False; note = "-"
                if dist_run >= limit_km:
                    status = "⚠️ ครบระยะทาง"; is_due = True; note = f"เกิน {dist_run - limit_km:,.0f} กม."
                elif days_run >= limit_days:
                    status = "⚠️ ครบกำหนดเวลา"; is_due = True; note = f"เกิน {days_run - limit_days:,.0f} วัน"
                elif dist_run >= (limit_km * 0.9):
                    status = "🟡 ใกล้ครบระยะ"; note = f"เหลือ {limit_km - dist_run:,.0f} กม."
                
                all_status.append({
                    "Vehicle_Plate": plate, "Driver_Name": str(driver.get('Driver_Name', '-')),
                    "Service_Type": service_name, "Current_Mileage": current_odo,
                    "Last_Service_Odo": last_odo, "Distance_Run": dist_run, "Status": status,
                    "Note": note, "Is_Due": is_due, "Next_Due_KM": max(0, limit_km - dist_run)
                })
        
        result_df = pd.DataFrame(all_status)
        if not result_df.empty:
            result_df = result_df.sort_values(by=['Is_Due', 'Next_Due_KM'], ascending=[False, True])
            
        cache.set(cache_key, result_df, ttl=3600)
        return result_df
    except: return pd.DataFrame()

@lru_cache(maxsize=1000)
def get_last_fuel_odometer(plate: str) -> float:
    try:
        cache_key = f"last_odometer_{plate}"
        cached = cache.get(cache_key)
        if cached is not None: return float(cached)
        
        df = get_data("Fuel_Logs")
        if df.empty: return 0.0
        
        plate_str = str(plate).strip()
        df_plate = df[df['Vehicle_Plate'].astype(str).str.strip() == plate_str]
        
        if df_plate.empty: return 0.0
        
        df_plate['Odometer'] = pd.to_numeric(df_plate['Odometer'], errors='coerce')
        max_odo = df_plate['Odometer'].max()
        
        result = float(max_odo) if pd.notna(max_odo) else 0.0
        cache.set(cache_key, str(result), ttl=3600)
        return result
    except: return 0.0

@lru_cache(maxsize=500)
def calculate_actual_consumption(plate: str) -> Tuple[float, float, float]:
    try:
        cache_key = f"fuel_consumption_{plate}"
        cached = cache.get(cache_key)
        if cached is not None: return tuple(map(float, cached.split(',')))
        
        df = get_data("Fuel_Logs")
        if df.empty: return 0.0, 0.0, 0.0
        
        plate_str = str(plate).strip().lower()
        my_logs = df[df['Vehicle_Plate'].astype(str).str.strip().str.lower() == plate_str].dropna(subset=['Odometer', 'Liters']).sort_values('Odometer')
        
        if len(my_logs) < 2: return 0.0, 0.0, 0.0
        
        my_logs['Odometer'] = pd.to_numeric(my_logs['Odometer'], errors='coerce')
        my_logs['Liters'] = pd.to_numeric(my_logs['Liters'], errors='coerce')
        
        total_dist = my_logs['Odometer'].iloc[-1] - my_logs['Odometer'].iloc[0]
        total_liters = my_logs['Liters'].iloc[1:].sum()
        
        if total_liters <= 0: return 0.0, 0.0, 0.0
        kpl = total_dist / total_liters
        cache.set(cache_key, f"{kpl:.2f},{total_dist:.2f},{total_liters:.3f}", ttl=86400)
        return kpl, total_dist, total_liters
    except: return 0.0, 0.0, 0.0

def get_status_label_th(status_code: str) -> str:
    mapping = {"PLANNED": "วางแผนแล้ว", "ASSIGNED": "จ่ายงานแล้ว", "PICKED_UP": "รับสินค้าแล้ว", 
               "IN_TRANSIT": "กำลังขนส่ง", "DELIVERED": "ถึงปลายทางแล้ว", "Completed": "ปิดงานสมบูรณ์", "FAILED": "ส่งไม่สำเร็จ"}
    return mapping.get(str(status_code), str(status_code))

def get_fuel_prices():
    try:
        url = "https://gasprice.kapook.com/gasprice.php#ptt"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
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

# Wrappers for database ops
def create_new_job(job_data): 
    """สร้างใบงานใหม่พร้อมแมปชื่อ field ให้ตรงกับคอลัมน์จริงใน Google Sheet.

    ฝั่งโค้ดภายในระบบใช้ key แบบมีขีดล่าง เช่น Job_ID, Customer_ID
    แต่ใน Sheet จริงใช้ชื่อคอลัมน์แบบมีช่องว่าง เช่น "Job ID", "Customer ID" เป็นต้น
    ฟังก์ชันนี้จะทำการแมป key เหล่านี้ให้ตรงก่อนส่งเข้า append_to_sheet
    เพื่อไม่ให้คอลัมน์ใน Sheet เป็นช่องว่าง
    """

    # mapping: internal_key -> sheet_column_name (อิงตาม Jobs_Main ใน Google Sheet)
    key_map = {
        "Job_ID": "Job ID",
        "Job_Status": "Job Status",
        "Plan_Date": "Plan Date",
        "Customer_ID": "Customer ID",
        "Route_Name": "Route Name",
        "Origin_Location": "Origin Location",
        "Dest_Location": "Dest Location",
        "GoogleMap_Link": "GoogleMap Link",
        "Driver_ID": "Driver ID",
        "Vehicle_Plate": "Vehicle Plate",
        "Actual_Pickup_Time": "Actual Pickup Time",
        "Actual_Delivery_Time": "Actual Delivery Time",
        "Photo_Proof_Url": "Photo_Proof_Url",
        "Signature_Url": "Signature_Url",
        "Price_Customer": "Price_Customer",
        "Cost_Driver_Total": "Cost_Driver_Total",
        "Cost_Fuel": "Cost_Fuel",
        "Cost_Labor_Extra": "st_Labor_Extra",  # ตาม header ใน Sheet
        "Est_Distance_KM": "Est_Distance_KM",
        "Arrive_Dest_Time": "Arrive_Dest_Time",
    }

    # แปลง dict ตาม key_map ถ้ามี key ที่ไม่อยู่ใน map จะถูกส่งผ่านไปตามชื่อเดิม
    mapped_data = {}
    for k, v in job_data.items():
        sheet_key = key_map.get(k, k)
        mapped_data[sheet_key] = v

    return append_to_sheet("Jobs_Main", mapped_data)

def create_fuel_log(fuel_data):
    # ใช้ dict โดยตรงให้คอลัมน์ไม่สลับตำแหน่ง
    if append_to_sheet("Fuel_Logs", fuel_data):
        if 'Odometer' in fuel_data and 'Vehicle_Plate' in fuel_data:
            try:
                drv = get_data("Master_Drivers")
                idx = drv[drv['Vehicle_Plate'].astype(str) == str(fuel_data['Vehicle_Plate'])].index
                if not idx.empty:
                    drv.at[idx[0], 'Current_Mileage'] = float(fuel_data['Odometer'])
                    update_sheet("Master_Drivers", drv)
            except: pass
        return True
    return False

def log_maintenance_record(record): 
    # เขียนบันทึกบำรุงรักษาโดยอิงชื่อคอลัมน์ในชีต
    return append_to_sheet("Maintenance_Logs", record)

def create_repair_ticket(ticket_data): 
    # เขียนข้อมูลแจ้งซ่อมโดยไม่พึ่งลำดับ values ใน dict
    return append_to_sheet("Repair_Tickets", ticket_data)

def update_job_status(job_id, new_status, timestamp, distance_run=0, photo_data="-", signature_data="-"):
    try:
        df_jobs = get_data("Jobs_Main")
        idx = df_jobs[df_jobs['Job_ID'].astype(str) == str(job_id)].index
        
        if not idx.empty:
            i = idx[0]
            df_jobs.at[i, 'Job_Status'] = new_status
            if timestamp: df_jobs.at[i, 'Actual_Delivery_Time'] = timestamp
            if photo_data != "-": df_jobs.at[i, 'Photo_Proof_Url'] = photo_data
            if signature_data != "-": df_jobs.at[i, 'Signature_Url'] = signature_data
            
            driver_id = df_jobs.at[i, 'Driver_ID']
            update_sheet("Jobs_Main", df_jobs)
            
            if new_status == "Completed" and driver_id and distance_run > 0:
                df_drivers = get_data("Master_Drivers")
                d_idx = df_drivers[df_drivers['Driver_ID'].astype(str) == str(driver_id)].index
                if not d_idx.empty:
                    try:
                        cur = float(df_drivers.at[d_idx[0], 'Current_Mileage'])
                        df_drivers.at[d_idx[0], 'Current_Mileage'] = cur + float(distance_run)
                        df_drivers.at[d_idx[0], 'Last_Update'] = get_thai_time_str()
                        update_sheet("Master_Drivers", df_drivers)
                    except: pass
            return True
        return False
    except: return False

def simple_update_job_status(job_id, new_status, extra_updates=None):
    try:
        df_jobs = get_data("Jobs_Main")
        idx = df_jobs[df_jobs['Job_ID'].astype(str) == str(job_id)].index
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
        idx = df[df['Driver_ID'].astype(str) == str(driver_id)].index
        if not idx.empty:
            df.at[idx[0], 'Current_Lat'] = lat
            df.at[idx[0], 'Current_Lon'] = lon
            df.at[idx[0], 'Last_Update'] = get_thai_time_str()
            update_sheet("Master_Drivers", df)
            return True
        return False
    except: return False

def sync_to_legacy_sheet(start_date, end_date):
    # (Placeholder logic for brevity, you can restore full logic if needed)
    return False, "Function not enabled"

def deduct_stock_item(part_name, qty_used):
    try:
        df = get_data("Stock_Parts")
        idx = df[df['Part_Name'] == part_name].index
        if idx.empty: return False, "Item not found"
        
        curr = float(df.at[idx[0], 'Qty_On_Hand'])
        if curr < qty_used: return False, "Not enough stock"
        
        df.at[idx[0], 'Qty_On_Hand'] = curr - qty_used
        update_sheet("Stock_Parts", df)
        return True, "Success"
    except Exception as e: return False, str(e)

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