
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import base64
import time
import io

from data.repository import repo
from services.pricing_service import PricingService
from services.job_service import JobService
from services.report_service import ReportService
from services.planner_service import AutoPlanner  # Added
from utils.helpers import safe_float, render_metric_card
from config.constants import JobStatus
from data.models import SCHEMAS, get_template_df

# Language Labels
LABELS = {
    "th": {
        "title": "📝 ศูนย์วางแผนงาน",
        "tab_create": "➕ สร้างงานใหม่",
        "tab_template": "📋 เทมเพลตงาน",
        "tab_impex": "📤 นำเข้า/ส่งออก",
        "sec_basic": "1. ข้อมูลพื้นฐาน",
        "plan_date": "วันที่วางแผน",
        "customer": "ลูกค้า",
        "branch": "สาขา",
        "vehicle_type": "ประเภทรถ",
        "cargo": "สินค้า",
        "weight": "น้ำหนัก (กก.)",
        "ref_po": "เลข PO/อ้างอิง",
        "sec_route": "2. วางแผนเส้นทาง",
        "sel_preset": "เลือกเส้นทางมาตรฐาน",
        "distance": "ระยะทาง (กม.)",
        "total_drops": "จุดส่งทั้งหมด",
        "sec_driver": "3. คนขับและกำไร",
        "no_drivers": "ไม่พบคนขับที่ว่าง",
        "assign_driver": "เลือกคนขับ",
        "price": "ราคาขาย",
        "cost": "ต้นทุนโดยประมาณ",
        "profit": "กำไร",
        "margin": "อัตรากำไร",
        "extra_charges": "ค่าใช้จ่ายเพิ่มเติม",
        "labor": "ค่าแรง",
        "wait_time": "ค่ารอ",
        "toll": "ค่าทางด่วน",
        "other": "อื่นๆ",
        "btn_create": "ยืนยันสร้างงาน",
        "btn_duplicate": "คัดลอกงานล่าสุด",
        "success_create": "สร้างงานเรียบร้อยแล้ว",
        "fail_create": "เกิดข้อผิดพลาดในการสร้างงาน",
        "download_pdf": "ดาวน์โหลดใบงาน (PDF)",
        "template_title": "📋 เทมเพลตเส้นทาง",
        "template_desc": "บันทึกเส้นทางที่ใช้บ่อยเพื่อสร้างงานได้เร็วขึ้น",
        "no_routes": "ไม่พบข้อมูลเส้นทาง กรุณาเพิ่มในเมนูข้อมูลหลัก",
        "avail_templates": "เทมเพลตที่มี",
        "use_template": "เลือกใช้เทมเพลต",
        "template_loaded": "โหลดเทมเพลตแล้ว ไปที่หน้าสร้างงานได้เลย",
        "import_title": "📥 นำเข้าข้อมูลงาน (CSV)",
        "upload_csv": "อัพโหลดไฟล์ CSV",
        "download_template": "ดาวน์โหลดฟอร์ม (Template)",
        "export_title": "📤 ส่งออกข้อมูล",
        "export_desc": "ส่งออกข้อมูลงานเพื่อนำไปใช้วิเคราะห์ต่อ",
        "btn_export": "ส่งออกเป็น CSV",
        "origin": "ต้นทาง",
        "dest": "ปลายทาง",
        "import_success": "นำเข้าข้อมูลงานสำเร็จ",
        "import_help": "💡 ใช้ฟอร์มนี้กรอกข้อมูล: หากมี Job_ID ซ้ำจะเป็นการแก้ไข, หาก Job_ID ใหม่จะเป็นการเพิ่ม"
    },
    "en": {
        "title": "📝 Smart Planning Center",
        "tab_create": "➕ Create Job",
        "tab_template": "📋 Job Templates",
        "tab_impex": "📤 Import/Export",
        "sec_basic": "1. Basic Information",
        "plan_date": "Plan Date",
        "customer": "Customer",
        "branch": "Branch",
        "vehicle_type": "Vehicle Type",
        "cargo": "Cargo",
        "weight": "Weight (kg)",
        "ref_po": "Ref/PO",
        "sec_route": "2. Route Planning",
        "sel_preset": "Select Route Preset",
        "distance": "Distance (KM)",
        "total_drops": "Total Drops",
        "sec_driver": "3. Driver & Profitability",
        "no_drivers": "No drivers available",
        "assign_driver": "Assign Driver",
        "price": "Price",
        "cost": "Est. Cost",
        "profit": "Profit",
        "margin": "Margin",
        "extra_charges": "Extra Charges",
        "labor": "Labor",
        "wait_time": "Wait Time",
        "toll": "Toll",
        "other": "Other",
        "btn_create": "Confirm Create Job",
        "btn_duplicate": "Duplicate Last Job",
        "success_create": "Job created successfully!",
        "fail_create": "Failed to create job",
        "download_pdf": "Download Job Order PDF",
        "template_title": "📋 Route Templates",
        "template_desc": "Save frequent routes for faster job creation.",
        "no_routes": "No route templates found. Add in Master Data.",
        "avail_templates": "Available Templates",
        "use_template": "Use Template",
        "template_loaded": "Template loaded! Go to Create Job tab.",
        "import_title": "📥 Import Jobs (CSV)",
        "upload_csv": "Upload CSV File",
        "download_template": "Download Template CSV",
        "export_title": "📤 Export Data",
        "export_desc": "Export job data for external analysis.",
        "btn_export": "Export as CSV",
        "origin": "Origin",
        "dest": "Destination",
        "import_success": "Jobs imported successfully",
        "import_help": "💡 Use this template: Existing IDs update, New IDs insert."
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

# ============================================================
# 🆕 Helper Functions for Enhanced Planning Features
# ============================================================

# Carbon emission factors (kg CO2 per km) by vehicle type
EMISSION_FACTORS = {
    "4W": 0.21,   # 4 wheels
    "6W": 0.35,   # 6 wheels  
    "10W": 0.55,  # 10 wheels
    "Trailer": 0.85,  # Trailer/18 wheels
}

# Vehicle capacity (kg) by type
VEHICLE_CAPACITY = {
    "4W": 1500,
    "6W": 5000,
    "10W": 15000,
    "Trailer": 25000,
}

def calculate_carbon_footprint(distance_km: float, vehicle_type: str) -> float:
    """Calculate CO2 emissions in kg."""
    factor = EMISSION_FACTORS.get(vehicle_type, 0.3)
    return distance_km * factor

def get_driver_jobs_on_date(driver_name: str, date) -> pd.DataFrame:
    """Get all jobs for a driver on specific date."""
    jobs = repo.get_data("Jobs_Main", days_back=30)
    if jobs.empty:
        return pd.DataFrame()
    
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    target_date = pd.to_datetime(date).date()
    
    return jobs[(jobs['Driver_Name'] == driver_name) & (jobs['Plan_Date'].dt.date == target_date)]

def check_driver_availability(driver_name: str, date) -> tuple:
    """Check if driver is available on date. Returns (is_available, existing_jobs)."""
    existing_jobs = get_driver_jobs_on_date(driver_name, date)
    return len(existing_jobs) == 0, existing_jobs

def get_available_drivers(date, drivers_df) -> pd.DataFrame:
    """Filter drivers who don't have jobs on the given date."""
    if drivers_df.empty:
        return drivers_df
    
    jobs = repo.get_data("Jobs_Main", days_back=30)
    if jobs.empty:
        return drivers_df
    
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    target_date = pd.to_datetime(date).date()
    
    busy_drivers = jobs[jobs['Plan_Date'].dt.date == target_date]['Driver_Name'].unique()
    available = drivers_df[~drivers_df['Driver_Name'].isin(busy_drivers)]
    
    return available

# Vehicle Volume (CBM) by type (Approximate)
VEHICLE_VOLUME = {
    "4W": 10,     # Small truck/Pickup
    "6W": 30,     # 6-Wheel
    "10W": 50,    # 10-Wheel
    "Trailer": 80 # Trailer
}

def check_vehicle_capacity(weight: float, cbm: float, vehicle_type: str) -> dict:
    """Check if weight and CBM exceed vehicle capacity."""
    max_weight = VEHICLE_CAPACITY.get(vehicle_type, 10000)
    max_cbm = VEHICLE_VOLUME.get(vehicle_type, 50)
    
    weight_ok = weight <= max_weight
    cbm_ok = cbm <= max_cbm
    
    weight_pct = (weight / max_weight * 100) if max_weight > 0 else 0
    cbm_pct = (cbm / max_cbm * 100) if max_cbm > 0 else 0
    
    return {
        "weight_ok": weight_ok,
        "cbm_ok": cbm_ok,
        "max_weight": max_weight,
        "max_cbm": max_cbm,
        "weight_pct": weight_pct,
        "cbm_pct": cbm_pct
    }

def get_price_suggestion(customer: str, origin: str, dest: str) -> float:
    """Suggest price based on historical data."""
    jobs = repo.get_data("Jobs_Main", days_back=180)
    if jobs.empty:
        return 0
    
    # Filter by customer and similar route
    similar = jobs[
        (jobs['Customer_Name'] == customer) & 
        ((jobs['Origin_Location'] == origin) | (jobs['Dest_Location'] == dest))
    ]
    
    if similar.empty:
        return 0
    
    return similar['Price_Cust_Total'].apply(safe_float).mean()

def get_driver_workload(date, days_range=7) -> pd.DataFrame:
    """Get job count per driver for the week."""
    jobs = repo.get_data("Jobs_Main", days_back=30)
    if jobs.empty:
        return pd.DataFrame(columns=['Driver_Name', 'Job_Count'])
    
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    target_date = pd.to_datetime(date).date()
    start_week = target_date - timedelta(days=target_date.weekday())
    end_week = start_week + timedelta(days=6)
    
    week_jobs = jobs[(jobs['Plan_Date'].dt.date >= start_week) & (jobs['Plan_Date'].dt.date <= end_week)]
    
    if week_jobs.empty:
        return pd.DataFrame(columns=['Driver_Name', 'Job_Count'])
    
    workload = week_jobs.groupby('Driver_Name').size().reset_index(name='Job_Count')
    return workload.sort_values('Job_Count', ascending=False)

def get_recent_jobs_for_copy(limit=10) -> pd.DataFrame:
    """Get recent jobs for duplication."""
    jobs = repo.get_data("Jobs_Main", days_back=30)
    if jobs.empty:
        return pd.DataFrame()
    
    jobs['Created_At'] = pd.to_datetime(jobs['Created_At'], errors='coerce')
    return jobs.sort_values('Created_At', ascending=False).head(limit)





def _render_auto_assign():
    """Auto-assign jobs to drivers."""
    st.markdown("#### ✨ Smart Auto-Planning")
    st.info("ระบบช่วยจัดตารางงานอัตโนมัติ โดยคำนึงถึง: ความพร้อม, ประเภทรถ, และการกระจายรายได้")
    
    # 1. Fetch Unassigned Jobs
    all_jobs = repo.get_data("Jobs_Main")
    if all_jobs.empty:
        st.warning("ไม่พบข้อมูลงาน")
        return
        
    # Filter: Status = Pending OR Driver is empty
    unassigned = all_jobs[
        ((all_jobs['Job_Status'] == 'Pending') | (all_jobs['Driver_ID'].isna()) | (all_jobs['Driver_ID'] == ''))
        & (all_jobs['Job_Status'] != 'Cancelled') & (all_jobs['Job_Status'] != 'Completed')
    ].copy()
    
    if unassigned.empty:
        st.success("✅ ไม่มีงานค้างรอจัดตาราง (All jobs assigned!)")
        return
        
    st.write(f"🛑 งานรอจัดตาราง: {len(unassigned)} งาน")
    st.dataframe(unassigned[['Job_ID', 'Plan_Date', 'Customer_Name', 'Dest_Location']], height=200)
    
    # 2. Controls
    if st.button("✨ เริ่มคำนวณแผนงาน (Run Auto Plan)", type="primary"):
        with st.spinner("⏳ กำลังวิเคราะห์ข้อมูลและวางแผน..."):
            result = AutoPlanner.plan_jobs(unassigned)
            st.session_state.plan_results = result
            st.toast("วางแผนเสร็จสิ้น!", icon="✅")
            
    # 3. Show Results
    if 'plan_results' in st.session_state:
        res = st.session_state.plan_results
        assignments = res.get('assignments', [])
        logs = res.get('logs', [])
        
        st.markdown("---")
        c1, c2 = st.columns([2, 1])
        
        with c1:
            st.markdown("##### 📋 ผลการจัดตาราง (Preview)")
            if not assignments:
                st.warning("⚠️ ไม่สามารถจัดงานได้ (คนขับไม่พอ หรือ เต็ม)")
            else:
                df_assign = pd.DataFrame(assignments)
                
                # CRITICAL FIX: Handle stale session state from previous error
                if 'Plan_Date' not in df_assign.columns:
                    st.warning("⚠️ ข้อมูลใน Cache เก่าเกินไป กรุณากดปุ่ม 'เริ่มคำนวณแผนงาน' ใหม่อีกครั้ง")
                    del st.session_state.plan_results
                    st.rerun()
                    return

                st.dataframe(df_assign[['Job_ID', 'Driver_Name', 'Plan_Date', 'Vehicle_Plate']])
                
                if st.button("💾 ยืนยันแผนงานนี้ (Confirm Apply)", type="primary"):
                    if AutoPlanner.apply_plan(assignments):
                        st.success("✅ บันทึกแผนงานเรียบร้อย!")
                        del st.session_state['plan_results']
                        time.sleep(1)
                        st.rerun()
                    else:
                        st.error("❌ บันทึกไม่สำเร็จ")
        
        with c2:
            st.markdown("##### 📝 บันทึกการทำงาน (Logs)")
            log_text = "\n".join(logs)
            st.text_area("Logs", log_text, height=400)


def render_planning_view():
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    
    # Consolidated Tabs (Optimized)
    t1, t2, t3, t4 = st.tabs([
        get_label('tab_create'),
        "🗺️ วางแผนเส้นทาง Multi-Drop",
        get_label('tab_impex'),
        "✨ Auto Assign"
    ])
    
    with t1:
        _render_create_job()
    with t2:
        _render_route_optimizer()
    with t3:
        _render_import_export()
    with t4:
        _render_auto_assign()


def _render_create_job():
    """Main job creation form."""
    
    
    # Top Toolbar - Outside Form
    col_tools1, col_tools2 = st.columns([3, 2])
    
    # Duplicate from recent jobs
    with col_tools1:
        with st.expander("📋 คัดลอกจากงานเก่า", expanded=False):
            recent_jobs = get_recent_jobs_for_copy(10)
            if not recent_jobs.empty:
                for idx, (_, job) in enumerate(recent_jobs.iterrows()):
                    job_info = f"{job.get('Job_ID', '')} | {job.get('Customer_Name', '')[:15]} | {job.get('Plan_Date', '')}"
                    if st.button(f"📄 {job_info}", key=f"copy_job_{idx}"):
                        # Store job data to session for pre-filling
                        st.session_state.prefill_job = job.to_dict()
                        st.success(f"โหลดข้อมูลงาน {job.get('Job_ID', '')} แล้ว!")
                        st.rerun()
            else:
                st.info("ไม่พบงานล่าสุด")
    
    # Driver Workload Panel
    with col_tools2:
        with st.expander("👷 ภาระงานคนขับสัปดาห์นี้", expanded=False):
            workload = get_driver_workload(datetime.now())
            if not workload.empty:
                for _, row in workload.head(5).iterrows():
                    jobs_count = row['Job_Count']
                    bar_color = "🟢" if jobs_count < 5 else "🟡" if jobs_count < 10 else "🔴"
                    st.write(f"{bar_color} {row['Driver_Name']}: {jobs_count} งาน")
            else:
                st.info("ไม่พบข้อมูลภาระงาน")


    # Section 1: Basic Info
    st.markdown(f"##### {get_label('sec_basic')}")
    c1, c2, c3, c4 = st.columns(4)
    
    # Load Choices from database
    customers = repo.get_data("Master_Customers")
    cust_opts = customers['Customer_Name'].dropna().unique().tolist() if not customers.empty and 'Customer_Name' in customers.columns else []
    if not cust_opts:
        cust_opts = ["- ไม่มีข้อมูลลูกค้า -"]
    
    # Load branch list from Master_Users (unique Branch_ID values)
    users = repo.get_data("Master_Users")
    branch_opts = users['Branch_ID'].dropna().unique().tolist() if not users.empty and 'Branch_ID' in users.columns else ["HEAD"]
    if not branch_opts:
        branch_opts = ["HEAD"]
    
    # Logic for syncing Helper -> Text
    def update_customer():
        if st.session_state.sel_cust_helper:
            st.session_state.txt_customer = st.session_state.sel_cust_helper

    with c1:
        plan_date = st.date_input(get_label('plan_date'), datetime.now())
    with c2:
        # Customer Hybrid Input
        # 1. Text Input (Primary)
        customer = st.text_input(
            get_label('customer'), 
            key="txt_customer",
            placeholder="ชื่อลูกค้า (พิมพ์เองหรือเลือก)"
        )
        # 2. Helper Select (Optional)
        st.selectbox(
            "เลือกลูกค้าเก่า", 
            [""] + cust_opts, 
            index=0, 
            key="sel_cust_helper", 
            label_visibility="collapsed",
            on_change=update_customer,
            placeholder="เลือกลูกค้า..."
        )
    with c3:
        branch = st.selectbox(get_label('branch'), branch_opts, index=0)
    with c4:
        st.empty() # spacer
        
    c5, c6, c7, c8 = st.columns(4)
    with c5:
        veh_type = st.selectbox(get_label('vehicle_type'), ["4W", "6W", "10W", "Trailer"])
    with c6:
        cargo = st.text_input(get_label('cargo'), "General Cargo")
    with c7:
        c7_1, c7_2 = st.columns(2)
        with c7_1:
            weight = st.number_input(get_label('weight'), min_value=0.0, step=100.0)
        with c7_2:
            cbm = st.number_input("CBM", min_value=0.0, format="%.2f", step=0.1)
    with c8:
        ref_po = st.text_input(get_label('ref_po'))
        
    st.markdown("---")
    
    # Section 2: Route
    st.markdown(f"##### {get_label('sec_route')}")
    
    # Gather pre-defined locations
    routes = repo.get_data("Master_Routes")
    customers = repo.get_data("Master_Customers")
    
    # --- Route Preset Selection ---
    preset_options = ["- Custom / Manual -"]
    route_map = {}
    
    if not routes.empty:
        # Map Route_Name to Row Data
        # Handle potential variation in column names based on user request (Routes_Name vs Route_Name)
        r_name_col = 'Routes_Name' if 'Routes_Name' in routes.columns else 'Route_Name'
        
        if r_name_col in routes.columns:
            preset_options += routes[r_name_col].dropna().unique().tolist()
            for _, r in routes.iterrows():
                route_map[r[r_name_col]] = r
    
    sel_preset = st.selectbox(f"🛣️ {get_label('sel_preset')}", preset_options, key="route_preset_sel")
    
    # Defaults
    def_origin = ""
    def_dest = ""
    def_dist = 0.0
    def_link = ""
    
    if sel_preset != "- Custom / Manual -" and sel_preset in route_map:
        r_data = route_map[sel_preset]
        def_origin = r_data.get('Origin', '')
        def_dest = r_data.get('Destination', '')
        def_dist = safe_float(r_data.get('Distance_KM', 0))
        def_link = r_data.get('Map_Link_Destination') or r_data.get('Map_Link_Origin') or ""

        # FORCE UPDATE Text Inputs if Preset Changed
        if 'last_preset' not in st.session_state:
             st.session_state.last_preset = None
        
        if st.session_state.last_preset != sel_preset:
             st.session_state.txt_origin = def_origin
             st.session_state.txt_dest = def_dest
             st.session_state.last_preset = sel_preset

    # Check if template loaded (Session override)
    if 'drop_data' in st.session_state and not st.session_state.drop_data.empty:
        drops = st.session_state.drop_data
        origins = drops[drops['Type'] == 'Origin']
        dests = drops[drops['Type'] == 'Destination']
        if not origins.empty: def_origin = origins.iloc[0]['Location']
        if not dests.empty: def_dest = dests.iloc[0]['Location']

    # Consolidated Location List
    loc_options = set()
    if not routes.empty:
        loc_options.update(routes['Origin'].dropna().unique())
        loc_options.update(routes['Destination'].dropna().unique())
    if not customers.empty:
        loc_options.update(customers['Address'].dropna().unique())
    loc_list = sorted(list(loc_options))
    loc_list.insert(0, "") # Blank option
    
    # Helper function to sync selectbox -> text_input
    def update_origin():
        if st.session_state.sel_origin_helper:
            st.session_state.txt_origin = st.session_state.sel_origin_helper
    
    def update_dest():
        if st.session_state.sel_dest_helper:
            st.session_state.txt_dest = st.session_state.sel_dest_helper

    col_r1, col_r2, col_r3 = st.columns([2, 2, 1])
    with col_r1:
        # Origin
        st.markdown(f"📍 {get_label('origin')}")
        # Actual Input (Primary)
        origin = st.text_input(
            "Origin Input", 
            key="txt_origin", 
            label_visibility="collapsed",
            placeholder="พิมพ์ชื่อสถานที่..."
        )
        # Helper Select
        st.selectbox(
            "หรือเลือกจากประวัติ", 
            loc_list, 
            index=0, 
            key="sel_origin_helper", 
            on_change=update_origin,
            help="เลือกจากรายการที่มีอยู่"
        )
        
    with col_r2:
        # Dest
        st.markdown(f"🏁 {get_label('dest')}")
        # Actual Input (Primary)
        dest = st.text_input(
            "Dest Input", 
            key="txt_dest", 
            label_visibility="collapsed",
            placeholder="พิมพ์ชื่อสถานที่..."
        )
        # Helper Select
        st.selectbox(
            "หรือเลือกจากประวัติ", 
            loc_list, 
            index=0, 
            key="sel_dest_helper", 
            on_change=update_dest,
            help="เลือกจากรายการที่มีอยู่"
        )

    with col_r3:
        st.markdown(get_label('distance'))
        dist = st.number_input(get_label('distance'), value=def_dist, label_visibility="collapsed")
        
    # Hidden Link Field (displayed as info)
    if def_link:
        st.caption(f"🔗 Map Link: [View Map]({def_link})")
    
    st.markdown("---")
    
    # Section 3: Driver & Cost
    st.markdown(f"##### {get_label('sec_driver')}")
    
    d1, d2, d3, d4 = st.columns(4)
    
    # Filtering drivers
    drivers = repo.get_data("Master_Drivers")
    avail_drivers = ["- No Driver -"]
    
    if not drivers.empty:
        # Filter Logic: Show matching vehicle type first, but allow all
        # Create friendly labels
        drivers['Display_Name'] = drivers['Driver_Name'] + " (" + drivers['Vehicle_Type'].fillna('?') + ")"
        
        # Simple list
        all_driver_opts = drivers['Display_Name'].tolist()
        avail_drivers = ["- No Driver -"] + all_driver_opts
        
    with d1:
        sel_driver_display = st.selectbox(get_label('assign_driver'), avail_drivers)
        
        # Map back to real name
        sel_driver = ""
        if sel_driver_display != "- No Driver -":
                sel_driver = sel_driver_display.split(" (")[0].strip()
    
    with d2:
        price_cust = st.number_input(get_label('price'), value=1000.0)
    with d3:
        cost_driver = st.number_input(get_label('cost'), value=800.0)
    with d4:
        profit = price_cust - cost_driver
        margin = (profit / price_cust * 100) if price_cust > 0 else 0
        # Use Lovable Card
        from utils.helpers import render_metric_card
        st.markdown(render_metric_card(get_label('profit'), f"฿{profit:,.0f}", icon="💰", trend=f"{margin:.1f}%", accent_color="accent-green"), unsafe_allow_html=True)
        
    # Extra charges
    with st.expander(get_label('extra_charges')):
        e1, e2, e3, e4 = st.columns(4)
        e1.number_input(get_label('labor'), value=0.0)
        e2.number_input(get_label('wait_time'), value=0.0)
        e3.number_input(get_label('toll'), value=0.0)
        e4.number_input(get_label('other'), value=0.0)

    # ============================================================
    # 🆕 Smart Info Panels
    # ============================================================
    st.markdown("---")
    st.markdown("##### 📊 ข้อมูลอัจฉริยะ (Smart Insights)")
    
    info_col1, info_col2, info_col3, info_col4 = st.columns(4)
    
    # 1. Vehicle Capacity Check (Enhanced)
    with info_col1:
        res = check_vehicle_capacity(weight, cbm, veh_type)
        
        # Weight Status
        if weight > 0:
            if res['weight_ok']:
                 st.success(f"⚖️ Weight: {weight:,.0f}/{res['max_weight']:,.0f} kg ({res['weight_pct']:.0f}%)")
            else:
                 st.error(f"⚠️ Weight Over: {weight:,.0f}/{res['max_weight']:,.0f} kg")
        else:
            st.info(f"⚖️ Max W: {res['max_weight']:,} kg")
            
        # CBM Status
        if cbm > 0:
            if res['cbm_ok']:
                 st.success(f"📦 Volume: {cbm:.1f}/{res['max_cbm']:.1f} CBM ({res['cbm_pct']:.0f}%)")
            else:
                 st.error(f"⚠️ Volume Over: {cbm:.1f}/{res['max_cbm']:.1f} CBM")
        else:
             st.caption(f"📦 Max Vol: {res['max_cbm']} CBM")
    
    # 2. Carbon Footprint
    with info_col2:
        co2 = calculate_carbon_footprint(dist, veh_type)
        trees_equiv = co2 / 21
        st.markdown(render_metric_card("🌱 Carbon Footprint", f"{co2:.1f} kg", sub=f"≈ {trees_equiv:.1f} trees", icon="🍃", accent_color="accent-green"), unsafe_allow_html=True)
    
    # 3. Price Suggestion (based on history)
    with info_col3:
        suggested = get_price_suggestion(customer, origin, dest)
        if suggested > 0:
            diff = price_cust - suggested
            trend = f"{'+' if diff >= 0 else ''}{diff:,.0f}"
            st.markdown(render_metric_card("💡 ราคาแนะนำ", f"฿{suggested:,.0f}", icon="💡", trend=trend), unsafe_allow_html=True)
        else:
            st.info("💡 ไม่พบประวัติราคา")
    
    # 4. Driver Conflict Warning
    with info_col4:
        if sel_driver and sel_driver != "- No Driver -":
            is_avail, existing = check_driver_availability(sel_driver, plan_date)
            if is_avail:
                st.success(f"✅ {sel_driver}\nว่างในวันนี้")
            else:
                st.warning(f"⚠️ {sel_driver}\nมีงานแล้ว {len(existing)} งาน")
        else:
            st.info("👤 ยังไม่ได้เลือกคนขับ")

    # Submit
    st.markdown("---")
    col_btn1, col_btn2 = st.columns([1, 4])
    
    with col_btn1:
        submitted = st.button(f"🚀 {get_label('btn_create')}", type="primary", key="btn_create_job")
        
        if submitted:
                # Logic to create job
                # Determine Status
                initial_status = JobStatus.NEW
                if sel_driver and sel_driver != "- No Driver -":
                    initial_status = JobStatus.ASSIGNED

                new_job = {
                    "Job_ID": JobService.generate_job_id(),
                    "Plan_Date": str(plan_date),
                    "Customer_Name": customer,
                    "Route_Name": f"{origin} -> {dest}",
                    "Driver_Name": sel_driver if sel_driver != "- No Driver -" else "",
                    "Vehicle_Type": veh_type,
                    "Price_Cust_Total": price_cust,
                    "Cost_Driver_Total": cost_driver,
                    "Job_Status": initial_status, 
                    "Branch_ID": branch,
                    "Origin_Location": origin,
                    "Dest_Location": dest,
                    "Est_Distance_KM": dist,
                    "GoogleMap_Link": def_link if 'def_link' in locals() else "",
                    "Total_CBM": cbm,
                    "Created_At": str(datetime.now())
                }
                
                # Check Driver ID
                if sel_driver and sel_driver != "- No Driver -" and not drivers.empty:
                    d_row = drivers[drivers['Driver_Name'] == sel_driver]
                    if not d_row.empty:
                        new_job["Driver_ID"] = d_row.iloc[0]['Driver_ID']
                        new_job["Vehicle_Plate"] = d_row.iloc[0].get('Vehicle_Plate', '')
                
                # Direct insert with error display
                try:
                    from supabase import create_client
                    from config.settings import settings
                    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                    sb.table("Jobs_Main").insert(new_job).execute()
                    if JobService.create_new_job(new_job):
                        # NOTIFICATION (Single)
                        if new_job.get('Driver_Name'):
                             try:
                                from services.notification_service import NotificationService
                                NotificationService.send_push_to_driver(
                                    new_job['Driver_Name'], 
                                    "🔔 งานใหม่มาแล้ว!", 
                                    f"คุณได้รับงานใหม่: {new_job['Customer_Name']}"
                                )
                             except: pass

                        st.toast(get_label('job_success'), icon="✅")
                    st.cache_data.clear()
                    time.sleep(1)
                    st.session_state.drop_data = pd.DataFrame([{"Sequence": 1, "Location": "Warehouse", "Type": "Origin"}])
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ เกิดข้อผิดพลาด: {e}")
        



def _render_import_export():
    """Import/Export jobs."""
    st.markdown(f"#### {get_label('tab_impex')}")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"##### {get_label('import_title')}")
        
        # Template Download
        template_df = get_template_df("Jobs_Main")
        
        if not template_df.empty:
            csv = template_df.to_csv(index=False)
            b64 = base64.b64encode(csv.encode()).decode()
            href = f'<a href="data:file/csv;base64,{b64}" download="jobs_template.csv" style="text-decoration:none; color:#1976d2; font-weight:bold;">📄 {get_label("download_template")}</a>'
            st.markdown(href, unsafe_allow_html=True)
            st.caption(get_label('import_help'))

        uploaded = st.file_uploader(get_label('upload_csv'), type=["csv"])
        if uploaded:
            try:
                import_df = pd.read_csv(uploaded)
                st.write(f"Preview: {len(import_df)} records")
                st.dataframe(import_df.head(), height=150)
                
                if st.button(f"📥 {get_label('import_title')}", key="confirm_import_jobs"):
                    if repo.update_data("Jobs_Main", import_df):
                        st.success(get_label('import_success'))
                        st.cache_data.clear()
                        time.sleep(1)
                        st.rerun()
                    else:
                        st.error("Import failed")
            except Exception as e:
                st.error(f"Error: {e}")
            
    with col2:
        st.markdown(f"##### {get_label('export_title')}")
        st.caption(get_label('export_desc'))
        
        jobs = repo.get_data("Jobs_Main")
        if not jobs.empty:
            csv = jobs.to_csv(index=False)
            b64 = base64.b64encode(csv.encode()).decode()
            href = f'<a href="data:file/csv;base64,{b64}" download="jobs_export.csv" class="css-button">{get_label("btn_export")}</a>'
            st.markdown(href, unsafe_allow_html=True)
        else:
            st.info("No data to export")


# ============================================================
# 🆕 Route Optimization Feature
# ============================================================

import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates in km."""
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def calculate_route_distance(route, locations):
    """Calculate total distance for a route."""
    total = 0
    for i in range(len(route) - 1):
        loc1 = locations[route[i]]
        loc2 = locations[route[i+1]]
        total += haversine_distance(loc1['lat'], loc1['lon'], loc2['lat'], loc2['lon'])
    return total

def optimize_route_nearest_neighbor(origin_idx, destination_indices, locations):
    """Nearest Neighbor algorithm for route optimization."""
    if not destination_indices:
        return [origin_idx], 0
    
    route = [origin_idx]
    remaining = list(destination_indices)
    
    while remaining:
        current = route[-1]
        current_loc = locations[current]
        
        # Find nearest unvisited
        nearest = min(remaining, key=lambda x: haversine_distance(
            current_loc['lat'], current_loc['lon'],
            locations[x]['lat'], locations[x]['lon']
        ))
        
        route.append(nearest)
        remaining.remove(nearest)
    
    # Return to origin (optional for round trip)
    # route.append(origin_idx)
    
    return route, calculate_route_distance(route, locations)

def _render_route_optimizer():
    """Multi-drop route optimization UI."""
    st.markdown("#### 🗺️ Route Optimization (เส้นทางอัจฉริยะ)")
    st.info("💡 ใส่จุดส่งหลายจุด ระบบจะคำนวณลำดับการวิ่งที่ประหยัดที่สุด")
    
    # Initialize session state for stops
    if 'origins' not in st.session_state:
        st.session_state.origins = [
            {"name": "Warehouse", "lat": 13.7563, "lon": 100.5018}
        ]
    
    # Load saved locations from database
    routes = repo.get_data("Master_Routes")
    
    saved_locations = {}
    if not routes.empty:
        for _, r in routes.iterrows():
            if r.get('Origin'):
                saved_locations[r['Origin']] = {"lat": 13.75, "lon": 100.50}  # Default coords
            if r.get('Destination'):
                saved_locations[r['Destination']] = {"lat": 13.80, "lon": 100.55}
    
    # Origin input loop
    st.markdown("##### 📍 ต้นทาง (Origins)")
    
    for i in range(len(st.session_state.origins)):
        col_o1, col_o2, col_o3, col_o4 = st.columns([3, 1.5, 1.5, 0.5])
        
        orig = st.session_state.origins[i]
        
        with col_o1:
            o_name = st.text_input(f"ต้นทางที่ {i+1}", value=orig['name'], key=f"orig_name_{i}")
        with col_o2:
            o_lat = st.number_input(f"Lat {i+1}", value=orig['lat'], format="%.4f", key=f"orig_lat_{i}", label_visibility="collapsed")
        with col_o3:
            o_lon = st.number_input(f"Lon {i+1}", value=orig['lon'], format="%.4f", key=f"orig_lon_{i}", label_visibility="collapsed")
        
        # Update state
        st.session_state.origins[i] = {"name": o_name, "lat": o_lat, "lon": o_lon}

    # Add Origin Button
    col_add_o, _ = st.columns(2)
    with col_add_o:
        if st.button("➕ เพิ่มต้นทาง", key="add_origin_btn"):
            st.session_state.origins.append({"name": "", "lat": 13.75, "lon": 100.50})
            st.rerun()
    
    st.markdown("---")
    st.markdown("##### 📦 จุดส่ง (Destinations)")
    
    # Dynamic destination inputs
    if 'destinations' not in st.session_state:
        st.session_state.destinations = []
    
    destinations = []
    
    for i in range(len(st.session_state.destinations) + 1):
        col_d1, col_d2, col_d3, col_d4 = st.columns([3, 1.5, 1.5, 0.5])
        
        default_name = st.session_state.destinations[i]["name"] if i < len(st.session_state.destinations) else ""
        default_lat = st.session_state.destinations[i].get("lat", 13.75 + i*0.05) if i < len(st.session_state.destinations) else 13.75 + i*0.05
        default_lon = st.session_state.destinations[i].get("lon", 100.50 + i*0.03) if i < len(st.session_state.destinations) else 100.50 + i*0.03
        
        with col_d1:
            name = st.text_input(f"จุดที่ {i+1}", value=default_name, key=f"dest_name_{i}")
        with col_d2:
            lat = st.number_input(f"Lat {i+1}", value=default_lat, format="%.4f", key=f"dest_lat_{i}", label_visibility="collapsed")
        with col_d3:
            lon = st.number_input(f"Lon {i+1}", value=default_lon, format="%.4f", key=f"dest_lon_{i}", label_visibility="collapsed")
        
        if name:
            destinations.append({"name": name, "lat": lat, "lon": lon})
    
    # Add destination button
    col_add, col_clear = st.columns(2)
    with col_add:
        if st.button("➕ เพิ่มจุดส่ง", key="add_dest_btn"):
            st.session_state.destinations.append({"name": "", "lat": 13.75, "lon": 100.50})
            st.rerun()
    with col_clear:
        if st.button("🗑️ ล้างทั้งหมด", key="clear_dest_btn"):
            st.session_state.destinations = []
            st.rerun()
    
    st.markdown("---")
    
    # Calculate button
    if st.button("🔄 คำนวณเส้นทางที่ดีที่สุด", type="primary"):
        origins = st.session_state.origins
        final_dests = [d for d in destinations if d['name']] # Use local list which is cleaner
        
        if not origins or not final_dests:
             st.warning("ต้องมีต้นทางและปลายทางอย่างน้อย 1 จุด")
        else:
             # Build Map
             all_locations = {}
             # 1. Add Origins (0 to M-1)
             for i, o in enumerate(origins):
                 all_locations[i] = o
             
             last_origin_idx = len(origins) - 1
             
             # 2. Add Destinations (M to M+N-1)
             dest_start_idx = len(origins)
             dest_indices = []
             for i, d in enumerate(final_dests):
                 idx = dest_start_idx + i
                 all_locations[idx] = d
                 dest_indices.append(idx)
             
             # 3. Optimize (Start from LAST origin)
             # Optimize destinations part
             opt_dest_route, opt_dest_dist = optimize_route_nearest_neighbor(last_origin_idx, dest_indices, all_locations)
             
             # Combine: Fixed Origins + Optimized Dests
             # opt_dest_route starts with [last_origin_idx, ...]
             final_route = list(range(last_origin_idx)) + opt_dest_route
             
             optimized_distance = calculate_route_distance(final_route, all_locations)
             optimized_route = final_route

             # Original (Sequential) Distance for comparison
             original_seq = list(range(len(all_locations)))
             original_distance = calculate_route_distance(original_seq, all_locations)

             # Savings
             savings = ((original_distance - optimized_distance) / original_distance * 100) if original_distance > 0 else 0
            
             # Display results
             st.markdown("---")
             st.markdown("### 📊 ผลลัพธ์การคำนวณ")
            
             res_col1, res_col2, res_col3 = st.columns(3)
            
             with res_col1:
                 st.markdown(render_metric_card("📏 ระยะทางเดิม", f"{original_distance:.1f} km", icon="📏"), unsafe_allow_html=True)
             with res_col2:
                 st.markdown(render_metric_card("✅ ระยะทางแนะนำ", f"{optimized_distance:.1f} km", icon="✅", trend=f"-{savings:.1f}%", accent_color="accent-green"), unsafe_allow_html=True)
             with res_col3:
                 # Carbon footprint savings
                 co2_saved = (original_distance - optimized_distance) * 0.35  # 6W average
                 st.markdown(render_metric_card("🌱 CO₂ ประหยัด", f"{co2_saved:.1f} kg", icon="🍃"), unsafe_allow_html=True)
            
             # Show optimized sequence
             st.markdown("#### 🛣️ ลำดับเส้นทางแนะนำ")
             route_display = []
             for i, idx in enumerate(optimized_route):
                 loc_name = all_locations[idx]['name']
                 if idx <= last_origin_idx:
                      route_display.append(f"🏠 **{loc_name}** (Pick-up)")
                 else:
                      route_display.append(f"📍 **{loc_name}** (Drop)")
            
             st.write(" → ".join([all_locations[idx]['name'] for idx in optimized_route]))
            
             for item in route_display:
                 st.write(item)
            
             # Time estimate (assume 40 km/h average)
             est_hours = optimized_distance / 40
             st.info(f"⏱️ เวลาโดยประมาณ: {est_hours:.1f} ชั่วโมง (เฉลี่ย 40 km/h)")
            
             # Store optimized route for job creation
             st.session_state.optimized_route = {
                 "route": optimized_route,
                 "locations": all_locations,
                 "distance": optimized_distance
             }
             
             st.markdown("---")
             st.markdown("#### 🚀 สร้างงาน (Batch Creation)")
             
             # Batch Job Settings
             c_b1, c_b2, c_b3 = st.columns(3)
             with c_b1:
                 batch_date = st.date_input("วันที่วางแผน", datetime.now(), key="batch_plan_date")
             with c_b2:
                 batch_veh = st.selectbox("ประเภทรถ", ["4W", "6W", "10W", "Trailer"], key="batch_veh_type")
             with c_b3:
                  # Driver select (simplified)
                  drivers = repo.get_data("Master_Drivers")
                  d_opts = ["- No Driver -"]
                  if not drivers.empty:
                      d_opts += drivers['Driver_Name'].tolist()
                  batch_driver = st.selectbox("คนขับ (Optional)", d_opts, key="batch_driver")

             if st.button("🚀 สร้างและบันทึกงานตามลำดับนี้", type="primary"):
                 success_count = 0
                 
                 # Import for insertion
                 from services.job_service import JobService
                 try:
                     from supabase import create_client
                     from config.settings import settings
                     sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                     
                     for i in range(len(optimized_route) - 1):
                         start_idx = optimized_route[i]
                         end_idx = optimized_route[i+1]
                         
                         start_node = all_locations[start_idx]
                         end_node = all_locations[end_idx]
                         
                         dist = haversine_distance(start_node['lat'], start_node['lon'], end_node['lat'], end_node['lon'])
                         
                         new_job = {
                             "Job_ID": JobService.generate_job_id(),
                             "Plan_Date": str(batch_date),
                             "Customer_Name": end_node['name'], 
                             "Route_Name": f"{start_node['name']} -> {end_node['name']}",
                             "Origin_Location": start_node['name'],
                             "Dest_Location": end_node['name'],
                             "Est_Distance_KM": dist,
                             "Vehicle_Type": batch_veh,
                             "Driver_Name": batch_driver if batch_driver != "- No Driver -" else "",
                             "Job_Status": "Assigned" if batch_driver != "- No Driver -" else "New",
                             "Created_At": str(datetime.now())
                         }
                         
                         # Check Driver ID
                         if batch_driver != "- No Driver -" and not drivers.empty:
                             d_row = drivers[drivers['Driver_Name'] == batch_driver]
                             if not d_row.empty:
                                new_job["Driver_ID"] = d_row.iloc[0]['Driver_ID']
                                new_job["Vehicle_Plate"] = d_row.iloc[0].get('Vehicle_Plate', '')

                         sb.table("Jobs_Main").insert(new_job).execute()
                         success_count += 1
                         
                         # NOTIFICATION (Batch)
                         if new_job.get('Driver_Name'):
                             try:
                                from services.notification_service import NotificationService
                                NotificationService.send_push_to_driver(
                                    new_job['Driver_Name'], 
                                    "🔔 งานใหม่มาแล้ว!", 
                                    f"งาน: {new_job['Customer_Name']} ({new_job['Plan_Date']})"
                                )
                             except: pass
                             
                         time.sleep(0.1) 
                    
                     st.success(f"✅ สร้างงานสำเร็จทั้งหมด {success_count} งาน!")
                     st.cache_data.clear()
                     time.sleep(1)
                     st.rerun()

                 except Exception as e:
                     st.error(f"❌ เกิดข้อผิดพลาด: {e}")

