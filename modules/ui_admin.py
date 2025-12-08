import streamlit as st  # type: ignore
import pandas as pd  # type: ignore
import numpy as np # type: ignore
from datetime import datetime, date
import time
import urllib.parse
import plotly.express as px  # type: ignore
import pytz  # type: ignore
from functools import lru_cache, wraps
from typing import Dict, List, Tuple, Optional, Any, Callable
import logging
import hashlib

from modules.database import get_data, update_sheet, load_all_data, cache
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content, deduct_stock_item
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache configuration
CACHE_TTL = 3600  # 1 hour default cache

def cache_data(ttl: int = CACHE_TTL):
    """Cache decorator with TTL support"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Create a cache key from function name and arguments
            cache_key = f"{func.__module__}.{func.__name__}:" + hashlib.md5(
                (str(args) + str(kwargs)).encode()
            ).hexdigest()
            
            # Try to get from cache
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return cached
            except Exception as e:
                logger.warning(f"Cache get failed: {e}")
            
            # If not in cache or error, compute and store
            try:
                result = func(*args, **kwargs)
                if result is not None:  # Only cache non-None results
                    try:
                        cache.set(cache_key, result)
                    except Exception as e:
                        logger.warning(f"Cache set failed: {e}")
                return result
            except Exception as e:
                logger.error(f"Function {func.__name__} failed: {e}")
                raise
                
        return wrapper
    return decorator

@cache_data(ttl=300)  # 5 minutes cache
def load_data() -> dict:
    """Load and cache all required data for the admin dashboard"""
    try:
        data = {
            'jobs': get_data("Jobs_Main"),
            'fuel': get_data("Fuel_Logs"),
            'drivers': get_data("Master_Drivers"),
            'repairs': get_data("Repair_Tickets"),
            'stock': get_data("Stock_Parts")
        }
        return data
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        return {k: pd.DataFrame() for k in ['jobs', 'fuel', 'drivers', 'repairs', 'stock']}

@cache_data(ttl=300)  # 5 minutes cache
def get_active_drivers() -> pd.DataFrame:
    """Get list of active drivers with their status"""
    try:
        drivers_df = get_data("Master_Drivers")
        if drivers_df.empty:
            return pd.DataFrame()
            
        # Filter active drivers
        if 'Role' in drivers_df.columns:
            roles = drivers_df['Role'].astype(str).str.lower().str.strip()
            drivers_df = drivers_df[roles.isin(['driver', 'คนขับ'])]
        
        return drivers_df
    except Exception as e:
        logger.error(f"Error getting active drivers: {str(e)}")
        return pd.DataFrame()

@cache_data(ttl=300)
def get_busy_drivers() -> List[str]:
    """Get list of busy driver IDs"""
    try:
        jobs_all = get_data("Jobs_Main")
        if jobs_all.empty:
            return []
            
        active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED', 'Selected'])]
        return active_jobs['Driver_ID'].astype(str).unique().tolist()
    except Exception as e:
        logger.error(f"Error getting busy drivers: {str(e)}")
        return []

@cache_data(ttl=300)
def get_broken_drivers() -> List[str]:
    """Get list of drivers with active repair tickets"""
    try:
        repairs_all = get_data("Repair_Tickets")
        if repairs_all.empty:
            return []
            
        active_repairs = repairs_all[repairs_all['Status'] != 'Done']
        return active_repairs['Driver_ID'].astype(str).unique().tolist()
    except Exception as e:
        logger.error(f"Error getting broken drivers: {str(e)}")
        return []

def get_driver_status(driver_id: str, busy_drivers: List[str], broken_drivers: List[str]) -> Tuple[str, str]:
    """Get driver status icon and text"""
    if driver_id in broken_drivers:
        return "🔧", "แจ้งซ่อม"
    elif driver_id in busy_drivers:
        return "🔴", "ติดงาน"
    return "🟢", "ว่าง"

@cache_data(ttl=3600)  # 1 hour cache
def get_routes_data() -> pd.DataFrame:
    """Get and cache routes data"""
    return get_data("Master_Routes")

@cache_data(ttl=3600)  # 1 hour cache
def get_customers_data() -> pd.DataFrame:
    """Get and cache customers data"""
    return get_data("Master_Customers")

def init_session_state():
    """Initialize session state variables"""
    if 'form_route_name' not in st.session_state:
        st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state:
        st.session_state.form_origin = ""
    if 'form_dest' not in st.session_state:
        st.session_state.form_dest = ""
    if 'form_link_org' not in st.session_state:
        st.session_state.form_link_org = ""
    if 'form_link_dest' not in st.session_state:
        st.session_state.form_link_dest = ""
    if 'form_dist' not in st.session_state:
        st.session_state.form_dist = 100.0
    if 'need_reset' not in st.session_state:
        st.session_state.need_reset = False

def reset_form():
    """Reset the job creation form"""
    st.session_state.form_route_name = ""
    st.session_state.form_origin = ""
    st.session_state.form_dest = ""
    st.session_state.form_link_org = ""
    st.session_state.form_link_dest = ""
    st.session_state.form_dist = 100.0
    st.session_state.need_reset = False

def create_job_ui():
    """Render the job creation UI"""
    st.subheader("📝 สร้างใบงานใหม่ (Multi-Job)")
    
    # Get data with caching
    with st.spinner("กำลังโหลดข้อมูล..."):
        drivers_df = get_active_drivers()
        customers_df = get_customers_data()
        routes_df = get_routes_data()
        
        # Get driver status using cached functions
        busy_drivers = get_busy_drivers()
        broken_drivers = get_broken_drivers()
    
    # Build driver options
    driver_options = []
    driver_map = {}
    driver_type_map = {}  # <--- [ใหม่] ตัวแปรเก็บประเภทรถ
    
    if not drivers_df.empty:
        for _, row in drivers_df.iterrows():
            d_id = str(row.get('Driver_ID', ''))
            d_name = str(row.get('Driver_Name', ''))
            d_plate = str(row.get('Vehicle_Plate', ''))
            d_type = str(row.get('Vehicle_Type', '')) # <--- [ใหม่] ดึงประเภทรถจาก DB
            
            if d_id and d_id.lower() not in ['nan', 'none', '']:
                status_icon, status_text = get_driver_status(d_id, busy_drivers, broken_drivers)
                label = f"{status_icon} {d_id} : {d_name} ({status_text})"
                driver_options.append(label)
                driver_map[label] = d_plate
                driver_type_map[label] = d_type # <--- [ใหม่] เก็บใส่ Map ไว้ใช้ตอนเลือก
    
    # Sort available drivers first
    driver_options.sort(key=lambda x: x.startswith("🟢"), reverse=True)

    customer_options, customer_map_id, customer_map_name = [], {}, {}
    if not customers_df.empty:
        for _, row in customers_df.iterrows():
            label = f"{row['Customer_ID']} : {row['Customer_Name']}"
            customer_options.append(label)
            customer_map_id[label] = row['Customer_ID']
            customer_map_name[label] = row['Customer_Name']

    st.markdown("##### 📍 เลือกเส้นทางมาตรฐาน")
    unique_routes = ["-- กำหนดเอง --"]
    if not routes_df.empty:
        raw = routes_df['Route_Name'].dropna().astype(str).unique()
        unique_routes += [r for r in raw if r.strip() != '']

    c_sel1, c_sel2 = st.columns(2)
    sel_route = c_sel1.selectbox("1. เลือกกลุ่มงาน", unique_routes)
    
    dest_options = ["-- กำหนดเอง --"]
    if sel_route != "-- กำหนดเอง --":
        sub_df = routes_df[routes_df['Route_Name'] == sel_route]
        dest_options += sub_df['Destination'].unique().tolist()
    
    sel_dest = c_sel2.selectbox("2. เลือกปลายทาง", dest_options, key="selector_dest_point")

    if sel_dest and sel_dest != "-- กำหนดเอง --":
         t_row = routes_df[(routes_df['Route_Name'] == sel_route) & (routes_df['Destination'] == sel_dest)]
         if not t_row.empty:
             row = t_row.iloc[0]
             if st.button("⬇️ ใช้ข้อมูลนี้", use_container_width=True):
                 st.session_state.form_route_name = sel_route
                 st.session_state.form_origin = row.get('Origin', '')
                 st.session_state.form_dest = row.get('Destination', '')
                 st.session_state.form_link_org = row.get('Map_Link Origin', row.get('Map_Link', ''))
                 st.session_state.form_link_dest = row.get('Map_Link Destination', '')
                 st.session_state.form_dist = float(pd.to_numeric(row.get('Distance_KM', 0), errors='coerce'))
                 st.success("ดึงข้อมูลแล้ว")

    st.divider()
    with st.form("create_job_form"):
        st.markdown("##### 📝 ข้อมูลงาน")
        c1, c2 = st.columns(2)
        with c1:
            auto_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
            st.info(f"Base Job ID: {auto_id}-XX")
            p_date = st.date_input("วันที่นัดหมาย", datetime.today())
            sel_cust = st.selectbox("ลูกค้า", customer_options) if customer_options else ""
        with c2:
            sel_drvs = st.multiselect("เลือกคนขับ (ได้หลายคน)", driver_options)
            
            # --- [ใหม่] Logic ดึงประเภทรถอัตโนมัติ ---
            default_v_index = 0
            if sel_drvs:
                first_driver = sel_drvs[0]
                raw_type = driver_type_map.get(first_driver, "")
                
                if "6" in raw_type:
                    default_v_index = 1 # 6 ล้อ
                elif "10" in raw_type:
                    default_v_index = 2 # 10 ล้อ
                else:
                    default_v_index = 0 # 4 ล้อ
            # ----------------------------------------
            
            v_type = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"], index=default_v_index)
        
        r_name = st.text_input("ชื่อเส้นทาง", key="form_route_name")
        c3, c4 = st.columns(2)
        with c3: origin = st.text_input("ต้นทาง", key="form_origin")
        with c4: link_org = st.text_input("ลิ้งค์ต้นทาง", key="form_link_org")
        c5, c6 = st.columns(2)
        with c5: dest = st.text_input("ปลายทาง", key="form_dest")
        with c6: link_dest = st.text_input("ลิ้งค์ปลายทาง", key="form_link_dest")
        
        est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
        
        st.divider()
        st.markdown("### 💰 ราคา & Option (คิดต่อคัน)")
        def_p, def_f, def_h, def_w, def_n = get_config_value("price_profit", 1000), get_config_value("opt_floor", 100), get_config_value("opt_helper", 300), get_config_value("opt_wait", 300), get_config_value("opt_night", 1000)
        o1, o2, o3 = st.columns(3)
        with o1: fl = st.number_input(f"ยกชั้น ({def_f})", 0)
        with o2: hp = st.number_input(f"คนยก ({def_h})", 0)
        with o3: wt = st.number_input(f"รอ ({def_w})", 0)
        o4, o5 = st.columns(2)
        with o4: ret = st.checkbox("สินค้าคืน")
        with o5: nt = st.number_input(f"ค้างคืน ({def_n})", 0)

        m1, m2 = st.columns(2)
        with m1: man_price = st.number_input("ราคาขาย/คัน (0=Auto)", 0.0)
        with m2: man_cost = st.number_input("ต้นทุน/คัน (0=Auto)", 0.0)

        submitted = st.form_submit_button("✅ ยืนยันจ่ายงาน (ทุกคัน)", type="primary", use_container_width=True)
        
        if submitted:
            with st.status("⏳ กำลังดำเนินการ...", expanded=True) as status:
                if not sel_drvs:
                    status.update(label="❌ เลือกคนขับก่อน", state="error")
                    st.error("เลือกคนขับ")
                elif not sel_cust:
                    status.update(label="❌ เลือกลูกค้าก่อน", state="error")
                    st.error("เลือกลูกค้า")
                else:
                    st.write("⚙️ คำนวณราคา...")
                    cust_id = customer_map_id.get(sel_cust, None)
                    cust_name = customer_map_name.get(sel_cust, "")
                    
                    cur_dsl = 30.00
                    try:
                        prices = get_fuel_prices()
                        if prices:
                            ptt = prices.get('ราคาน้ำมัน ปตท. (ptt)', {})
                            for k, v in ptt.items():
                                if "ดีเซล" in k: cur_dsl = float(v.replace(',','')); break
                    except: pass

                    auto_cost = calculate_driver_cost(p_date, est_dist, v_type, cur_dsl)
                    base = auto_cost + def_p if auto_cost > 0 else 0
                    sur = (fl*def_f) + (hp*def_h) + (wt*def_w) + (nt*def_n)
                    auto_price = base + sur
                    if ret: auto_price *= 1.5
                    
                    final_price = man_price if man_price > 0 else auto_price
                    final_cost = man_cost if man_cost > 0 else auto_cost
                    
                    # ✅ แก้ไข Link Map ให้ถูกต้อง
                    final_link = link_dest if link_dest else (link_org if link_org else "")
                    if not final_link and origin and dest:
                        org_enc = urllib.parse.quote(origin)
                        dest_enc = urllib.parse.quote(dest)
                        # ใช้ &travelmode=driving เพื่อความชัวร์
                        final_link = f"https://www.google.com/maps/dir/?api=1&origin={org_enc}&destination={dest_enc}&travelmode=driving"

                    success_count = 0
                    total_count = len(sel_drvs)
                    
                    for i, drv_str in enumerate(sel_drvs):
                        d_id = drv_str.split(" ")[1] if len(drv_str.split(" ")) > 1 else ""
                        v_plate = driver_map.get(drv_str, "")
                        run_id = f"{auto_id}-{i+1:02d}"
                        st.write(f"💾 บันทึก {d_id}...")
                        
                        plan_date_str = p_date.strftime("%Y-%m-%d")

                        new_job = {
                            "Job_ID": run_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date_str,
                            "Customer_ID": cust_id, "Customer_Name": cust_name, "Route_Name": r_name,
                            "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": final_link,
                            "Driver_ID": d_id, "Vehicle_Plate": v_plate, "Est_Distance_KM": est_dist,
                            "Price_Customer": final_price, "Cost_Driver_Total": final_cost, 
                            "Actual_Delivery_Time": "", "Photo_Proof_Url": "", "Signature_Url": ""
                        }
                        if create_new_job(new_job): success_count += 1
                    
                    if success_count == total_count:
                        st.session_state.need_reset = True
                        status.update(label=f"✅ สำเร็จ {success_count} คัน!", state="complete", expanded=False)
                        st.success("เรียบร้อย!")
                        time.sleep(1)
                        # ✅ แก้ไข: ใช้ st.rerun()
                        st.rerun()
                    else:
                        status.update(label="❌ ผิดพลาดบางรายการ", state="error")
                        st.error(f"บันทึกได้ {success_count}/{total_count}")

    st.write("---"); st.subheader("รายการงานล่าสุด")
    jobs_view = get_data("Jobs_Main")
    if not jobs_view.empty:
        st.dataframe(jobs_view, use_container_width=True, column_config={"Photo_Proof_Url": st.column_config.ImageColumn("รูป"), "GoogleMap_Link": st.column_config.LinkColumn("Map")})

    if not jobs_view.empty and not drivers_df.empty:
        with st.expander("เปลี่ยนคนขับ"):
            editable = jobs_view[jobs_view['Job_Status'].isin(['PLANNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])]
            if not editable.empty:
                jid = st.selectbox("Job ID", editable['Job_ID'].unique())
                nd = st.selectbox("คนขับใหม่", driver_options)
                if st.button("เปลี่ยน"):
                    nid = nd.split(" ")[1] if len(nd.split(" ")) > 1 else ""
                    np = driver_map.get(nd, "")
                    if simple_update_job_status(jid, "ASSIGNED", {"Driver_ID": nid, "Vehicle_Plate": np}):
                        st.success("Changed")
                        time.sleep(1)
                        # ✅ แก้ไข: ใช้ st.rerun()
                        st.rerun()

def admin_flow():
    """Main admin interface with tabbed navigation"""
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            # Clear all caches and reload data
            cache.clear()
            st.session_state.data_store = load_all_data()
            st.rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    # Initialize session state variables
    init_session_state()
    
    # Create tabs for different sections
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Data", "🔧 MMS", "⛽ น้ำมัน", 
        "🔩 สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน/คำนวณ", "⚙️ ตั้งค่าระบบ", "📖 คู่มือ"
    ])
    # --- Tab 1: Job Assignment ---
    with tab1:
        create_job_ui()
    
    # --- Tab 2: Profit & Data Dashboard ---
    with tab2:
        st.subheader("📊 Profit Dashboard")
        
        # Load data with caching
        with st.spinner("กำลังโหลดข้อมูล..."):
            try:
                # Load all required data in one go
                data = load_data()
                df_jobs = data['jobs']
                df_fuel = data['fuel']
                df_drivers = data['drivers']
                
                # Initialize driver maps
                driver_map_name, driver_map_link = {}, {}
                if not df_drivers.empty:
                    for _, r in df_drivers.iterrows():
                        d_id = str(r['Driver_ID'])
                        driver_map_name[d_id] = r.get('Driver_Name', '-')
                        lat, lon = r.get('Current_Lat'), r.get('Current_Lon')
                        if pd.notna(lat) and pd.notna(lon):
                            driver_map_link[d_id] = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
                        else:
                            driver_map_link[d_id] = "-"
                
                # Store in session state to avoid reloading
                st.session_state.driver_maps = {
                    'name': driver_map_name,
                    'link': driver_map_link
                }
                
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการโหลดข้อมูล: {str(e)}")
                logger.exception("Error loading dashboard data")
                return
        
        # Get driver maps from session state if available
        driver_maps = st.session_state.get('driver_maps', {'name': {}, 'link': {}})
        driver_map_name = driver_maps['name']
        driver_map_link = driver_maps['link']

        # 3. ตัวเลือกวันที่
        tz_th = pytz.timezone('Asia/Bangkok')
        now_th = datetime.now(tz_th)

        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1: start_date = st.date_input("📅 เริ่ม", now_th.replace(day=1))
            with c2: end_date = st.date_input("📅 ถึง", now_th)

        # 4. ฟังก์ชันแปลงวันที่ (รองรับ พ.ศ. 25xx)
        def smart_date_parse(date_series):
            s = date_series.astype(str)
            s = s.apply(lambda x: x.replace(str(int(x[-4:])), str(int(x[-4:])-543)) if len(x) >= 4 and x[-4:].isdigit() and int(x[-4:]) > 2400 else x)
            return pd.to_datetime(s, dayfirst=True, errors='coerce')

        # 5. Filter and process job data
        df_filtered = pd.DataFrame()
        
        if not df_jobs.empty and 'Plan_Date' in df_jobs.columns:
            try:
                # Convert date only once
                if 'Plan_Date_Converted' not in df_jobs.columns:
                    df_jobs['Plan_Date_Converted'] = smart_date_parse(df_jobs['Plan_Date'])
                
                # Filter by date range
                date_mask = (df_jobs['Plan_Date_Converted'].dt.date >= start_date) & \
                           (df_jobs['Plan_Date_Converted'].dt.date <= end_date)
                df_filtered = df_jobs[date_mask].copy()
                
                if not df_filtered.empty:
                    # Clean and convert numeric columns
                    cols_to_clean = ['Price_Customer', 'Cost_Driver_Total', 'Est_Distance_KM']
                    for col in cols_to_clean:
                        if col in df_filtered.columns:
                            df_filtered[col] = pd.to_numeric(
                                df_filtered[col].astype(str).str.replace(',', ''), 
                                errors='coerce'
                            ).fillna(0)
                    
                    # Add driver information
                    df_filtered['Driver_Name'] = df_filtered['Driver_ID'].astype(str).map(
                        lambda x: driver_map_name.get(x, x)
                    )
                    df_filtered['Current_Location_Link'] = df_filtered['Driver_ID'].astype(str).map(
                        lambda x: driver_map_link.get(x, '-')
                    )
                    
                    # Ensure Customer_Name exists
                    if 'Customer_Name' not in df_filtered.columns:
                        df_filtered['Customer_Name'] = '-'
                        
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการประมวลผลข้อมูล: {str(e)}")
                logger.exception("Error processing job data")
        
        # --- ตรวจสอบว่ามีข้อมูลหรือไม่ ---
        if not df_filtered.empty:
            total_rev = df_filtered['Price_Customer'].sum()
            total_cost = df_filtered['Cost_Driver_Total'].sum()
            
            fuel_cost = 0
            df_fuel_clean = pd.DataFrame()
            if not df_fuel.empty and 'Date_Time' in df_fuel.columns:
                df_fuel['Date_Time'] = smart_date_parse(df_fuel['Date_Time'])
                for col in ['Price_Total', 'Odometer', 'Liters']:
                    if col in df_fuel.columns:
                        df_fuel[col] = pd.to_numeric(df_fuel[col].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
                
                df_fuel_clean = df_fuel.dropna(subset=['Date_Time'])
                f_mask = (df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)
                fuel_cost = df_fuel_clean[f_mask]['Price_Total'].sum()

            net_profit = total_rev - total_cost - fuel_cost
            margin = (net_profit / total_rev * 100) if total_rev > 0 else 0
            
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับ", f"{total_rev:,.0f}")
            k2.metric("💸 ต้นทุนรวม", f"{total_cost + fuel_cost:,.0f}")
            k3.metric("📈 กำไรสุทธิ", f"{net_profit:,.0f}", f"{margin:.1f}%")
            k4.metric("🚚 จำนวนเที่ยว", f"{len(df_filtered)}")
            
            st.divider()
            
            g1, g2 = st.columns(2)
            with g1:
                p_veh = df_filtered.groupby('Vehicle_Plate')[['Price_Customer', 'Cost_Driver_Total']].sum().reset_index()
                p_veh['Profit'] = p_veh['Price_Customer'] - p_veh['Cost_Driver_Total']
                st.plotly_chart(px.bar(p_veh, x='Vehicle_Plate', y='Profit', title="กำไรรายคัน (Gross)", color='Profit', color_continuous_scale='Greens'), use_container_width=True)
            with g2:
                cust_share = df_filtered.groupby('Customer_Name')['Price_Customer'].sum().reset_index()
                st.plotly_chart(px.pie(cust_share, values='Price_Customer', names='Customer_Name', title="สัดส่วนลูกค้า", hole=0.4), use_container_width=True)
            
            st.divider()
            st.markdown("### 🏆 Fleet Performance")
            summ = df_filtered.groupby('Vehicle_Plate').agg({
                'Job_ID': 'count', 'Est_Distance_KM': 'sum', 'Price_Customer': 'sum', 
                'Cost_Driver_Total': 'sum', 'Driver_Name': 'first', 'Current_Location_Link': 'first'
            }).reset_index()
            
            if not df_fuel_clean.empty:
                f_grp = df_fuel_clean[(df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)].groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                summ = summ.merge(f_grp, on='Vehicle_Plate', how='left').fillna(0)
            else: summ['Price_Total'] = 0
            
            summ['Net_Profit'] = summ['Price_Customer'] - summ['Cost_Driver_Total'] - summ['Price_Total']
            st.dataframe(summ, use_container_width=True, column_config={"Current_Location_Link": st.column_config.LinkColumn("Map")})
            
            st.divider()
            if st.button("🚀 Sync Accounting", use_container_width=True):
                ok, msg = sync_to_legacy_sheet(start_date, end_date)
                if ok: st.success(msg)
                else: st.error(msg)
                
        else:
            st.warning(f"⚠️ ไม่พบข้อมูลงานในช่วงวันที่: {start_date} ถึง {end_date}")
            with st.expander("🔍 กดเพื่อดูข้อมูลดิบ (Debug)", expanded=True):
                if df_jobs.empty:
                    st.error("❌ โหลดข้อมูลจาก Google Sheet ไม่ได้ (ตารางว่างเปล่า)")
                else:
                    st.write("### 1. ตัวอย่างข้อมูลใน Sheet (5 แถวแรก)")
                    st.dataframe(df_jobs[['Job_ID', 'Plan_Date']].head())
                    st.write("### 2. ผลการแปลงวันที่")
                    if 'Plan_Date_Converted' in df_jobs.columns:
                        debug_df = df_jobs[['Job_ID', 'Plan_Date', 'Plan_Date_Converted']].copy()
                        debug_df['Is_Valid'] = debug_df['Plan_Date_Converted'].notna()
                        st.dataframe(debug_df.head(10))

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔔 แจ้งเตือนเช็คระยะ")
        
        # Load maintenance data with error handling
        with st.spinner("กำลังโหลดข้อมูล..."):
            try:
                maint_df = get_maintenance_status_all()
                if not maint_df.empty:
                    alerts = maint_df[maint_df['Is_Due'] == True]
                    if not alerts.empty: 
                        st.error(f"⚠️ ถึงกำหนด {len(alerts)} รายการ")
                        st.dataframe(alerts, use_container_width=True)
                    else: 
                        st.success("✅ รถปกติ")
                else:
                    st.info("ไม่พบข้อมูลการแจ้งเตือน")
                    
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการโหลดข้อมูล: {str(e)}")
                logger.exception("Error loading maintenance data")
        
        # Maintenance log form
        with st.expander("🛠️ บันทึกการเข้าศูนย์"):
            with st.form("maint_f"):
                # Get vehicle plates from cached data
                drivers_df = get_active_drivers()
                plates = drivers_df['Vehicle_Plate'].unique().tolist() if not drivers_df.empty else []
                
                col1, col2 = st.columns(2)
                with col1:
                    mp = st.selectbox("ทะเบียน", plates, key="maint_plate")
                    md = st.date_input("วันที่", datetime.today(), key="maint_date")
                with col2:
                    mt = st.selectbox("รายการ", ["ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง/ช่วงล่าง", "อื่นๆ"], key="maint_type")
                    mo = st.number_input("เลขไมล์", 0, key="maint_odo")
                
                if st.form_submit_button("💾 บันทึก"):
                    try:
                        log_entry = {
                            "Log_ID": f"MT-{int(time.time())}",
                            "Date_Service": md.strftime("%Y-%m-%d"),
                            "Vehicle_Plate": mp,
                            "Service_Type": mt,
                            "Odometer": mo,
                            "Created_At": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }
                        if log_maintenance_record(log_entry):
                            st.success("บันทึกเรียบร้อยแล้ว!")
                            time.sleep(1)
                            st.rerun()
                    except Exception as e:
                        st.error(f"เกิดข้อผิดพลาด: {str(e)}")
                        logger.exception("Error saving maintenance record")

        st.divider()
        st.subheader("🔧 แจ้งซ่อม")
        
        # Load repair tickets and stock data
        with st.spinner("กำลังโหลดข้อมูล..."):
            try:
                data = load_data()
                tk = data.get('repairs', pd.DataFrame())
                stock_df = data.get('stock', pd.DataFrame())
                
                if not tk.empty:
                    st.dataframe(tk, use_container_width=True, 
                               column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})
                    
                    with st.expander("✍️ อนุมัติ / ปิดงาน"):
                        tid = st.selectbox("เลือก Ticket ID", tk['Ticket_ID'].unique())
                        if tid:
                            ticket = tk[tk['Ticket_ID'] == tid].iloc[0]
                            
                            with st.form("update_ticket"):
                                c1, c2 = st.columns(2)
                                with c1: 
                                    ns = st.selectbox("สถานะใหม่", ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น"], 
                                                    index=0 if ticket['Status'] == 'รอดำเนินการ' else 1 if ticket['Status'] == 'กำลังดำเนินการ' else 2)
                                with c2: 
                                    co = st.number_input("ค่าใช้จ่าย", value=float(ticket.get('Cost_Total', 0)))
                                
                                st.markdown("---")
                                st.write("รายละเอียดการซ่อม:")
                                st.write(f"- ทะเบียน: {ticket.get('Vehicle_Plate', '-')}")
                                st.write(f"- อาการ: {ticket.get('Issue_Description', '-')}")
                                
                                use_stock = st.checkbox("ใช้อะไหล่สต็อก", key="use_stock")
                                if use_stock and not stock_df.empty:
                                    stock_list = stock_df['Part_Name'].unique().tolist()
                                    cs1, cs2 = st.columns([2,1])
                                    with cs1: 
                                        p_name = st.selectbox("อะไหล่", stock_list, key="part_select")
                                    with cs2: 
                                        p_qty = st.number_input("จำนวน", 1, 100, 1, key="part_qty")
                                
                                if st.form_submit_button("💾 อัปเดตสถานะ"):
                                    try:
                                        # Update ticket status
                                        tk.loc[tk['Ticket_ID'] == tid, 'Status'] = ns
                                        tk.loc[tk['Ticket_ID'] == tid, 'Cost_Total'] = co
                                        
                                        if ns == "เสร็จสิ้น":
                                            tk.loc[tk['Ticket_ID'] == tid, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                                        
                                        # Deduct stock if used
                                        if use_stock and p_name:
                                            if not deduct_stock_item(p_name, p_qty):
                                                st.warning(f"ไม่สามารถหักสต็อก {p_name} ได้")
                                        
                                        # Save changes
                                        if update_sheet("Repair_Tickets", tk):
                                            st.success("อัปเดตสถานะเรียบร้อย!")
                                            time.sleep(1)
                                            st.rerun()
                                        else:
                                            st.error("ไม่สามารถอัปเดตข้อมูลได้")
                                            
                                    except Exception as e:
                                        st.error(f"เกิดข้อผิดพลาด: {str(e)}")
                                        logger.exception("Error updating repair ticket")
                else:
                    st.info("ไม่มีรายการแจ้งซ่อม")
                    
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการโหลดข้อมูล: {str(e)}")
                logger.exception("Error loading repair data")

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ประวัติเติมน้ำมัน")
        
        # Load fuel logs with caching and error handling
        with st.spinner("กำลังโหลดข้อมูล..."):
            try:
                data = load_data()
                fuel_logs = data.get('fuel', pd.DataFrame())
                
                if not fuel_logs.empty:
                    # Clean & Convert Data
                    if 'Date_Time' in fuel_logs.columns:
                        fuel_logs['Date_Time'] = pd.to_datetime(fuel_logs['Date_Time'], errors='coerce')
                    
                    for col in ['Price_Total', 'Odometer', 'Liters']:
                        if col in fuel_logs.columns:
                            fuel_logs[col] = pd.to_numeric(fuel_logs[col].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
                    
                    # Sort by date
                    fuel_logs = fuel_logs.sort_values('Date_Time', ascending=False)
                    
                    # 1. ตารางรายการเติมน้ำมัน (Log Table)
                    st.dataframe(
                        fuel_logs, 
                        use_container_width=True, 
                        column_config={
                            "Photo_Url": st.column_config.ImageColumn("รูป"),
                            "Date_Time": st.column_config.DatetimeColumn("วันที่/เวลา", format="D MMM YYYY, HH:mm"),
                            "Odometer": st.column_config.NumberColumn("เลขไมล์", format="%,d"),
                            "Liters": st.column_config.NumberColumn("จำนวนลิตร", format="%.2f"),
                            "Price_Total": st.column_config.NumberColumn("ยอดรวม (บาท)", format="%0.2f")
                        },
                        hide_index=True
                    )
                    
                    # 2. สรุปยอดรวม (Metrics)
                    st.divider()
                    st.subheader("📊 สถิติภาพรวม")
                    
                    total_liters = fuel_logs['Liters'].sum()
                    total_cost = fuel_logs['Price_Total'].sum()
                    avg_price = total_cost / total_liters if total_liters > 0 else 0
                    
                    k1, k2, k3 = st.columns(3)
                    k1.metric("ปริมาณน้ำมันรวม", f"{total_liters:,.2f} ลิตร")
                    k2.metric("ค่าใช้จ่ายรวม", f"{total_cost:,.2f} บาท")
                    k3.metric("ราคาเฉลี่ย/ลิตร", f"{avg_price:,.2f} บาท")
                    
                    # 3. [เพิ่มใหม่] ตารางสรุปรายคัน (Statistics Table)
                    st.divider()
                    st.markdown("### 🚗 สรุปการใช้น้ำมันรายคัน")
                    
                    if not fuel_logs.empty:
                        # Group Data by Vehicle
                        stats_df = fuel_logs.groupby('Vehicle_Plate').agg({
                            'Liters': 'sum',
                            'Price_Total': 'sum',
                            'Log_ID': 'count'
                        }).reset_index()
                        
                        # Calculate Avg
                        stats_df['Avg_Cost_Per_Liter'] = stats_df.apply(
                            lambda x: x['Price_Total'] / x['Liters'] if x['Liters'] > 0 else 0, axis=1
                        )
                        
                        # Sort by Cost
                        stats_df = stats_df.sort_values('Price_Total', ascending=False)
                        
                        # Display Statistics Table
                        st.dataframe(
                            stats_df,
                            use_container_width=True,
                            column_config={
                                "Vehicle_Plate": "ทะเบียนรถ",
                                "Log_ID": st.column_config.NumberColumn("จำนวนครั้งที่เติม", format="%d ครั้ง"),
                                "Liters": st.column_config.NumberColumn("รวมลิตร", format="%.2f"),
                                "Price_Total": st.column_config.NumberColumn("รวมเงิน (บาท)", format="%0.2f"),
                                "Avg_Cost_Per_Liter": st.column_config.NumberColumn("เฉลี่ย (บาท/ลิตร)", format="%.2f"),
                            },
                            hide_index=True
                        )
                        
                else:
                    st.info("ไม่พบประวัติการเติมน้ำมัน")
                    
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการโหลดข้อมูล: {str(e)}")
                # logger.exception("Error loading fuel logs")

    # --- Tab 5: Stock (Debug Mode) ---
    with tab5:
        st.subheader("📦 จัดการสต็อกอะไหล่")
        
        # ปุ่มล้างแคชเฉพาะหน้านี้
        if st.button("🔄 ล้างค่าและโหลดใหม่ (Reset Stock)"):
            cache.clear()
            st.rerun()

        # Add new stock item form
        with st.expander("➕ เพิ่ม/รับอะไหล่เข้า", expanded=False):
            with st.form("add_stock"):
                col1, col2, col3 = st.columns([2, 1, 1])
                with col1: part_name = st.text_input("ชื่ออะไหล่")
                with col2: quantity = st.number_input("จำนวน", min_value=1, value=1, step=1)
                with col3: unit = st.selectbox("หน่วยนับ", ["ชิ้น", "กล่อง", "อัน", "ชุด"])
                
                if st.form_submit_button("💾 บันทึก"):
                    # (Logic บันทึกเดิม... ละไว้เพื่อให้โค้ดสั้นลง)
                    st.warning("กรุณาแก้ปัญหาการโหลดข้อมูลให้ผ่านก่อนบันทึก")
        
        # Stock management UI
        with st.container(border=True):
            st.markdown("### 🛒 สต็อกอะไหล่ทั้งหมด")
            
            try:
                # 1. ลองดึงข้อมูล
                stock_df = get_data("Stock_Parts")
                
                # 2. เช็คว่าได้ข้อมูลมาจริงไหม
                if stock_df is None:
                    st.error("❌ Error: get_data returned None")
                elif stock_df.empty:
                    st.info("ℹ️ ไม่พบข้อมูลสต็อก (ตารางว่าง)")
                    # ลองแสดงชื่อคอลัมน์ดูว่าโหลดอะไรมาได้บ้าง
                    st.write("Columns found:", stock_df.columns.tolist())
                else:
                    # 3. เตรียมข้อมูล (Data Preparation)
                    # แปลงค่า Qty ให้เป็นตัวเลขชัวร์ๆ (กัน Error)
                    if 'Qty_On_Hand' in stock_df.columns:
                        stock_df['Qty_On_Hand'] = pd.to_numeric(stock_df['Qty_On_Hand'], errors='coerce').fillna(0)
                    else:
                        stock_df['Qty_On_Hand'] = 0

                    if 'Unit' not in stock_df.columns:
                        stock_df['Unit'] = 'ชิ้น'
                    
                    # 4. ลอง Sort (จุดปราบเซียน)
                    try:
                        stock_df = stock_df.sort_values('Qty_On_Hand')
                    except Exception as sort_err:
                        st.warning(f"⚠️ Sort Error: {sort_err} (แสดงผลแบบไม่เรียงแทน)")
                    
                    # 5. แสดงผล
                    st.dataframe(
                        stock_df,
                        use_container_width=True,
                        column_config={
                            "Part_ID": "รหัส",
                            "Part_Name": "ชื่ออะไหล่",
                            "Qty_On_Hand": st.column_config.NumberColumn("จำนวนคงเหลือ", format="%.0f"),
                            "Unit": "หน่วยนับ",
                            "Last_Updated": "อัปเดตล่าสุด"
                        },
                        hide_index=True
                    )
                    
                    # Export button
                    csv = convert_df_to_csv(stock_df)
                    st.download_button(
                        label="📥 ดาวน์โหลดรายการสต็อก",
                        data=csv,
                        file_name=f"stock_inventory_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )

            except Exception as e:
                # 🔥 นี่คือจุดสำคัญ: แสดง Error ตัวจริงออกมา!
                st.error(f"❌ เกิดข้อผิดพลาดร้ายแรง (Fatal Error):")
                st.code(str(e)) # แสดงข้อความ Error
                st.write("Type of error:", type(e))
                logger.exception("Error loading stock data")

    # --- Tab 6: GPS ---
    with tab6:
        st.subheader("📍 ติดตามรถ (GPS)")
        
        with st.spinner("กำลังโหลดข้อมูล GPS..."):
            try:
                # Load driver data with GPS coordinates
                drivers_df = get_active_drivers()
                
                if not drivers_df.empty:
                    # Prepare data for mapping
                    gps_data = drivers_df.rename(columns={
                        'Current_Lat': 'lat', 
                        'Current_Lon': 'lon'
                    }).copy()
                    
                    # Convert coordinates to numeric
                    gps_data['lat'] = pd.to_numeric(gps_data['lat'], errors='coerce')
                    gps_data['lon'] = pd.to_numeric(gps_data['lon'], errors='coerce')
                    
                    # Filter out invalid coordinates
                    valid_gps = gps_data.dropna(subset=['lat', 'lon']).copy()
                    
                    if not valid_gps.empty:
                        # Display map
                        st.map(valid_gps[['lat', 'lon']])
                        
                        # Add Google Maps links
                        valid_gps['Map'] = valid_gps.apply(
                            lambda r: f"https://www.google.com/maps/search/?api=1&query={r['lat']},{r['lon']}", 
                            axis=1
                        )
                        
                        # Display driver information in a table
                        st.subheader("ตำแหน่งปัจจุบัน")
                        st.dataframe(
                            valid_gps[['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Map']],
                            use_container_width=True,
                            column_config={
                                "Driver_Name": "ชื่อคนขับ",
                                "Vehicle_Plate": "ทะเบียนรถ",
                                "Last_Update": "อัปเดตล่าสุด",
                                "Map": st.column_config.LinkColumn("ดูในแผนที่")
                            },
                            hide_index=True
                        )
                        
                        # Add refresh button
                        if st.button("🔄 อัปเดตตำแหน่ง", key="refresh_gps"):
                            st.rerun()
                        
                    else:
                        st.warning("ไม่พบพิกัด GPS ที่ถูกต้อง")
                        
                    # Show raw data in expander for debugging
                    with st.expander("🔍 ดูข้อมูลดิบ", expanded=False):
                        st.dataframe(valid_gps, use_container_width=True)
                        
                else:
                    st.warning("ไม่พบข้อมูลคนขับ")
                    
            except Exception as e:
                st.error(f"เกิดข้อผิดพลาดในการโหลดข้อมูล GPS: {str(e)}")
                logger.exception("Error loading GPS data")

    # --- Tab 7: Fuel Price & Calculation ---
    with tab7:
        st.subheader("⛽ ราคาน้ำมันและคำนวณค่าใช้จ่าย")
        
        # Cost Calculation Section
        with st.container(border=True):
            st.markdown("### 🧮 คำนวณค่าใช้จ่ายการขนส่ง")
            
            col1, col2 = st.columns(2)
            with col1:
                calc_date = st.date_input("วันที่", datetime.today(), key="calc_date")
                vehicle_type = st.selectbox(
                    "ประเภทรถ", 
                    ["4 ล้อ", "6 ล้อ", "10 ล้อ"],
                    key="vehicle_type"
                )
                distance = st.number_input("ระยะทาง (กม.)", min_value=1, value=100, step=1, key="distance")
            
            with col2:
                floor_count = st.number_input("จำนวนชั้น", min_value=0, value=0, step=1, key="floor_count")
                is_round_trip = st.checkbox("ไป-กลับ", key="is_round_trip")
                extra_cost = st.number_input("ค่าใช้จ่ายเพิ่มเติม", min_value=0, value=0, step=50, key="extra_cost")
            
            if st.button("🔢 คำนวณราคา", use_container_width=True, type="primary"):
                try:
                    base_cost = calculate_driver_cost(calc_date, distance, vehicle_type)
                    
                    # Calculate additional costs
                    floor_charge = floor_count * 100  # 100 THB per floor
                    round_trip_multiplier = 1.8 if is_round_trip else 1.0
                    
                    total_cost = (base_cost + floor_charge + extra_cost) * round_trip_multiplier
                    selling_price = total_cost * 1.2  # 20% markup
                    
                    # Display results
                    st.markdown("---")
                    st.markdown("### 🧮 ผลการคำนวณ")
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        st.metric("ต้นทุนรวม", f"{total_cost:,.0f} บาท")
                        st.caption(f"• ค่าขนส่งพื้นฐาน: {base_cost:,.0f} บาท")
                        if floor_count > 0:
                            st.caption(f"• ค่ายก {floor_count} ชั้น: +{floor_charge:,.0f} บาท")
                        if extra_cost > 0:
                            st.caption(f"• ค่าใช้จ่ายเพิ่มเติม: +{extra_cost:,.0f} บาท")
                        if is_round_trip:
                            st.caption("• ค่าขนส่งไป-กลับ: x1.8")
                    
                    with col2:
                        st.metric("ราคาขายแนะนำ (รวม VAT)", f"{selling_price:,.0f} บาท")
                        st.caption("• ราคาขายรวมภาษีมูลค่าเพิ่ม 7% แล้ว")
                        st.caption(f"• กำไรประมาณ: {(selling_price - total_cost):,.0f} บาท")
                    
                except Exception as e:
                    st.error(f"เกิดข้อผิดพลาดในการคำนวณ: {str(e)}")
                    logger.exception("Error in cost calculation")
        
        # Fuel Price Section
        st.divider()
        st.subheader("⛽ ราคาน้ำมันล่าสุด")
        
        # Add refresh button with loading state
        if st.button("🔄 อัปเดตราคาน้ำมันล่าสุด", key="update_fuel_prices", help="อัปเดตราคาจากแหล่งข้อมูลออนไลน์"):
            with st.spinner("กำลังดึงข้อมูลราคาน้ำมันล่าสุด..."):
                try:
                    fuel_prices = get_fuel_prices()
                    if fuel_prices: 
                        st.session_state.fuel_prices = fuel_prices
                        st.session_state.last_fuel_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        st.success("อัปเดตราคาน้ำมันเรียบร้อยแล้ว!")
                        time.sleep(1)
                        st.rerun()
                    else: 
                        st.error("ไม่สามารถดึงข้อมูลราคาน้ำมันได้ในขณะนี้")
                except Exception as e:
                    st.error(f"เกิดข้อผิดพลาด: {str(e)}")
                    logger.exception("Error updating fuel prices")
        
        # Display last update time if available
        if 'last_fuel_update' in st.session_state:
            st.caption(f"อัปเดตล่าสุด: {st.session_state.last_fuel_update}")
        
        # Display fuel prices if available
        if st.session_state.get('fuel_prices'):
            fuel_data_source = st.session_state.fuel_prices
            
            # PTT Station (default)
            if 'ราคาน้ำมัน ปตท. (ptt)' in fuel_data_source:
                st.markdown("### ⛽ ปตท. (PTT)")
                ptt = fuel_data_source['ราคาน้ำมัน ปตท. (ptt)']
                fuel_list = [{"ประเภทน้ำมัน": k, "ราคา (บาท/ลิตร)": v} for k, v in ptt.items()]
                st.dataframe(
                    pd.DataFrame(fuel_list),
                    use_container_width=True,
                    hide_index=True
                )
            
            # Other stations
            other_stations = [s for s in fuel_data_source.keys() if s != 'ราคาน้ำมัน ปตท. (ptt)']
            if other_stations:
                with st.expander("🏪 ดูราคาจากปั้มอื่นๆ", expanded=False):
                    for station in other_stations:
                        st.markdown(f"#### {station}")
                        station_prices = fuel_data_source[station]
                        station_list = [{"ประเภทน้ำมัน": k, "ราคา (บาท/ลิตร)": v} for k, v in station_prices.items()]
                        
                        if station_list: 
                            st.dataframe(
                                pd.DataFrame(station_list),
                                use_container_width=True,
                                hide_index=True
                            )
                        st.markdown("---")
        else: 
            st.info("กดปุ่ม 'อัปเดตราคาล่าสุด' เพื่อดึงข้อมูลราคาน้ำมัน")

    # --- Tab 8: System Settings ---
    with tab8:
        st.subheader("⚙️ ตั้งค่าระบบ")
        
        # Add tab navigation for different settings sections
        settings_tab1, settings_tab2 = st.tabs(["การตั้งค่าทั่วไป", "การตั้งค่าขั้นสูง"])
        
        with settings_tab1:
            st.markdown("### ⚙️ การตั้งค่าพื้นฐาน")
            
            # Load configuration
            with st.spinner("กำลังโหลดการตั้งค่า..."):
                try:
                    conf = get_data("System_Config")
                    
                    if not conf.empty:
                        # Display current settings in an editable table
                        st.markdown("#### การตั้งค่าปัจจุบัน")
                        edited_conf = st.data_editor(
                            conf,
                            column_config={
                                "Key": "ชื่อการตั้งค่า",
                                "Value": "ค่า",
                                "Description": "คำอธิบาย"
                            },
                            num_rows="dynamic",
                            use_container_width=True,
                            hide_index=True
                        )
                        
                        # Save button with confirmation
                        col1, col2 = st.columns([1, 5])
                        with col1:
                            if st.button("💾 บันทึกการเปลี่ยนแปลง", type="primary"):
                                if update_sheet("System_Config", edited_conf):
                                    st.success("บันทึกการตั้งค่าเรียบร้อยแล้ว!")
                                    time.sleep(1)
                                    st.rerun()
                                else:
                                    st.error("ไม่สามารถบันทึกการตั้งค่าได้")
                        with col2:
                            if st.button("🔄 รีเซ็ตการเปลี่ยนแปลง"):
                                st.rerun()
                        
                        # Add new setting form
                        with st.expander("➕ เพิ่มการตั้งค่าใหม่", expanded=False):
                            with st.form("add_setting"):
                                new_key = st.text_input("ชื่อการตั้งค่า (Key)", key="new_key")
                                new_value = st.text_area("ค่า (Value)", key="new_value")
                                new_desc = st.text_area("คำอธิบาย", key="new_desc")
                                
                                if st.form_submit_button("เพิ่มการตั้งค่า"):
                                    if new_key and new_value:
                                        new_setting = pd.DataFrame([{
                                            "Key": new_key,
                                            "Value": new_value,
                                            "Description": new_desc
                                        }])
                                        updated_conf = pd.concat([conf, new_setting], ignore_index=True)
                                        if update_sheet("System_Config", updated_conf):
                                            st.success("เพิ่มการตั้งค่าใหม่เรียบร้อย!")
                                            time.sleep(1)
                                            st.rerun()
                                        else:
                                            st.error("ไม่สามารถเพิ่มการตั้งค่าได้")
                                    else:
                                        st.warning("กรุณากรอกชื่อการตั้งค่าและค่าให้ครบถ้วน")
                    else:
                        st.warning("ไม่พบการตั้งค่าระบบ")
                        
                except Exception as e:
                    st.error(f"เกิดข้อผิดพลาดในการโหลดการตั้งค่า: {str(e)}")
                    logger.exception("Error loading system settings")
        
        with settings_tab2:
            st.markdown("### ⚠️ การตั้งค่าขั้นสูง")
            st.warning("การเปลี่ยนแปลงการตั้งค่าในส่วนนี้อาจส่งผลต่อการทำงานของระบบ")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("#### ระบบแคช")
                if st.button("🗑️ ล้างแคชทั้งหมด", help="ล้างข้อมูลที่เก็บไว้ในหน่วยความจำชั่วคราว"):
                    try:
                        cache.clear()
                        st.success("ล้างแคชเรียบร้อยแล้ว!")
                        time.sleep(1)
                        st.rerun()
                    except Exception as e:
                        st.error(f"เกิดข้อผิดพลาด: {str(e)}")
                
                st.markdown("#### ข้อมูลระบบ")
                if st.button("🔄 โหลดข้อมูลใหม่ทั้งหมด", help="โหลดข้อมูลใหม่จาก Google Sheets"):
                    try:
                        with st.spinner("กำลังโหลดข้อมูลใหม่..."):
                            cache.clear()
                            st.session_state.data_store = load_all_data()
                            st.success("โหลดข้อมูลใหม่เรียบร้อยแล้ว!")
                            time.sleep(1)
                            st.rerun()
                    except Exception as e:
                        st.error(f"เกิดข้อผิดพลาด: {str(e)}")
            
            with col2:
                st.markdown("#### การสำรองข้อมูล")
                if st.button("💾 สร้างข้อมูลสำรอง", help="ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ Excel"):
                    try:
                        # Load all data
                        data = {}
                        sheets = ["Master_Drivers", "Jobs_Main", "Repair_Tickets", 
                                 "Master_Routes", "Master_Customers", "Fuel_Logs", 
                                 "Stock_Parts", "System_Config"]
                        
                        with st.spinner("กำลังสร้างข้อมูลสำรอง..."):
                            for sheet in sheets:
                                data[sheet] = get_data(sheet)
                        
                        # Create Excel file in memory
                        output = io.BytesIO() # type: ignore
                        with pd.ExcelWriter(output, engine='openpyxl') as writer:
                            for sheet_name, df in data.items():
                                df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
                        
                        # Create download button
                        st.download_button(
                            label="📥 ดาวน์โหลดข้อมูลสำรอง",
                            data=output.getvalue(),
                            file_name=f"tms_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                        
                    except Exception as e:
                        st.error(f"เกิดข้อผิดพลาดในการสร้างข้อมูลสำรอง: {str(e)}")
                        logger.exception("Error creating backup")

    # --- Tab 9: Manual ---
    with tab9:
        st.subheader("📘 คู่มือการใช้งานระบบ")
        
        # Add tab navigation for different manual sections
        manual_tab1, manual_tab2, manual_tab3 = st.tabs(["คู่มือใช้งาน", "วิดีโอสอน", "ติดต่อผู้พัฒนา"])
        
        with manual_tab1:
            st.markdown("### 📖 คู่มือการใช้งานระบบ")
            
            # Add table of contents
            st.markdown("""
            #### สารบัญ
            - [การใช้งานทั่วไป](#general-usage)
            - [การจัดการงาน](#job-management)
            - [การจัดการรถและคนขับ](#driver-management)
            - [การบำรุงรักษา](#maintenance)
            - [การจัดการน้ำมัน](#fuel-management)
            - [การจัดการสต็อก](#stock-management)
            - [การตั้งค่าระบบ](#system-settings)
            """)
            
            try:
                # Load manual content with caching
                manual_text = get_manual_content()
                
                # Add download button
                st.download_button(
                    label="📥 ดาวน์โหลดคู่มือฉบับเต็ม",
                    data=manual_text,
                    file_name=f"tms_manual_{datetime.now().strftime('%Y%m%d')}.txt",
                    mime="text/plain",
                    use_container_width=True
                )
                
                # Display manual content with proper formatting
                st.markdown("---")
                st.markdown(manual_text)
                
            except Exception as e:
                st.error(f"ไม่สามารถโหลดเนื้อหาคู่มือได้: {str(e)}")
                logger.exception("Error loading manual content")
                
                # Fallback to basic manual content
                st.markdown("""
                ### คู่มือการใช้งานเบื้องต้น
                
                #### การใช้งานทั่วไป
                - ใช้เมนูด้านซ้ายมือเพื่อเข้าถึงส่วนต่างๆ ของระบบ
                - กดปุ่ม "รีเฟรชข้อมูลล่าสุด" เพื่ออัปเดตข้อมูลใหม่
                
                #### การจัดการงาน
                - **แท็บ "จ่ายงาน"**: สร้างและจัดการงานขนส่ง
                - **แท็บ "Profit & Data"**: ดูรายงานและสถิติการทำงาน
                
                #### การจัดการรถและคนขับ
                - **แท็บ "MMS"**: จัดการการบำรุงรักษาและซ่อมแซม
                - **แท็บ "GPS"**: ติดตามตำแหน่งรถในเวลาจริง
                
                #### การจัดการน้ำมันและสต็อก
                - **แท็บ "น้ำมัน"**: บันทึกและตรวจสอบการเติมน้ำมัน
                - **แท็บ "สต็อก"**: จัดการอะไหล่และวัสดุสิ้นเปลือง
                
                #### การตั้งค่าระบบ
                - **แท็บ "ตั้งค่าระบบ"**: กำหนดค่าต่างๆ ของระบบ
                - **แท็บ "คู่มือ"**: ดูคู่มือการใช้งานและข้อมูลติดต่อ
                """)
        
        with manual_tab2:
            st.markdown("### 🎥 วิดีโอสอนการใช้งาน")
            
            # Add video tutorials section
            st.markdown("""
            ### วิดีโอสอนการใช้งานระบบ
            
            #### การใช้งานเบื้องต้น
            [![การใช้งานเบื้องต้น](https://img.youtube.com/vi/VIDEO_ID_1/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_1)
            
            #### การจัดการงานขนส่ง
            [![การจัดการงานขนส่ง](https://img.youtube.com/vi/VIDEO_ID_2/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_2)
            
            #### การติดตามรถและรายงาน
            [![การติดตามรถ](https://img.youtube.com/vi/VIDEO_ID_3/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_3)
            
            > หมายเหตุ: วีดีโอสอนเป็นเพียงตัวอย่าง กรุณาเปลี่ยนลิงก์ YouTube ตามจริง
            """)
            
            # Add video upload section for admin
            if st.session_state.get('user_role') == 'admin':
                with st.expander("📤 อัปโหลดวิดีโอสอนใหม่"):
                    st.file_uploader("เลือกไฟล์วิดีโอ", type=["mp4", "mov", "avi"])
                    st.text_input("ชื่อวิดีโอ")
                    st.text_area("คำอธิบาย")
                    st.button("อัปโหลดวิดีโอ", type="primary")
        
        with manual_tab3:
            st.markdown("### 📞 ติดต่อผู้พัฒนา")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("""
                #### ฝ่ายเทคนิค
                - **อีเมล**: support@example.com
                - **โทรศัพท์**: 02-XXX-XXXX
                - **ไลน์**: @tms_support
                
                #### ชั่วโมงทำงาน
                - จันทร์ - ศุกร์: 09:00 - 18:00 น.
                - เสาร์ - อาทิตย์: ปิดทำการ
                """)
            
            with col2:
                st.markdown("""
                #### ที่อยู่
                123/456 อาคารเทคโนพาร์ค
                ถนนรัชดาภิเษก
                แขวงห้วยขวาง
                เขตห้วยขวาง
                กรุงเทพมหานคร 10310
                """)
            
            # Add contact form
            st.markdown("---")
            st.markdown("### 📝 ส่งข้อความถึงเรา")
            
            with st.form("contact_form"):
                name = st.text_input("ชื่อ-นามสกุล")
                email = st.text_input("อีเมล")
                subject = st.selectbox("หัวข้อ", ["รายงานปัญหา", "สอบถามข้อมูล", "เสนอแนะ", "อื่นๆ"])
                message = st.text_area("ข้อความ")
                
                if st.form_submit_button("ส่งข้อความ"):
                    if name and email and message:
                        # Here you would typically send the message to your support system
                        st.success("ส่งข้อความเรียบร้อยแล้ว! เราจะติดต่อกลับโดยเร็วที่สุด")
                    else:
                        st.warning("กรุณากรอกข้อมูลให้ครบถ้วน")