# modules/ui_admin.py

import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timedelta
import time
import urllib.parse
import io
import logging
import pytz # type: ignore

# Import modules
from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job, create_fuel_log,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content, deduct_stock_item,
    parse_flexible_date, create_repair_ticket, get_thai_time_str  # <--- เพิ่มตัวนี้เข้าไปครับ
)

# ประกาศ Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper: Safe Data Loader ---
def get_data_safe(sheet_name, default_cols):
    try:
        df = get_data(sheet_name)
        if df.empty or len(df.columns) == 0:
            return pd.DataFrame(columns=default_cols)
        return df
    except:
        return pd.DataFrame(columns=default_cols)

# ==========================================
# ส่วนที่ 1: ฟังก์ชันแยก (วางไว้นอก admin_flow)
# ==========================================

def render_tab1_flexible_assignment():
    st.subheader("📝 สร้างใบงานใหม่ (Planning & Assignment)")

    try:
        drivers_df = get_data("Master_Drivers")
        customers_df = get_data("Master_Customers")
        routes_df = get_data("Master_Routes")
        jobs_all = get_data("Jobs_Main")
        repairs_all = get_data("Repair_Tickets")
        if drivers_df.empty: st.warning("⚠️ ไม่พบข้อมูลคนขับ")
    except Exception as e:
        st.error(f"โหลดข้อมูลไม่สำเร็จ: {e}")
        return

    # --- 1. Logic Status & AI Recommendation ---
    busy_drivers = []
    if not jobs_all.empty and 'Job_Status' in jobs_all.columns:
        active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED'])]
        if 'Driver_ID' in active_jobs.columns:
            busy_drivers = active_jobs['Driver_ID'].astype(str).unique().tolist()
            
    broken_drivers = []
    if not repairs_all.empty and 'Status' in repairs_all.columns:
        active_repairs = repairs_all[repairs_all['Status'] != 'Done']
        if 'Driver_ID' in active_repairs.columns:
            broken_drivers = active_repairs['Driver_ID'].astype(str).unique().tolist()

    driver_list_sorted = [] 
    driver_info_map = {}
    
    # AI Score Calculation (Mockup: ให้คะแนนรถที่ว่างและพร้อมใช้งาน)
    if not drivers_df.empty:
        if 'Max_Weight_kg' not in drivers_df.columns: drivers_df['Max_Weight_kg'] = 2000
        if 'Max_Volume_cbm' not in drivers_df.columns: drivers_df['Max_Volume_cbm'] = 10
        
        for _, row in drivers_df.iterrows():
            d_id = str(row.get('Driver_ID', '')).strip()
            d_name = str(row.get('Driver_Name', '')).strip()
            v_plate = str(row.get('Vehicle_Plate', '')).strip()
            try: max_w = float(str(row.get('Max_Weight_kg', 0)).replace(',', ''))
            except: max_w = 0
            try: max_v = float(str(row.get('Max_Volume_cbm', 0)).replace(',', ''))
            except: max_v = 0

            if d_id:
                # Determine Status
                if d_id in broken_drivers: status_icon, status_code = "🔧", 2
                elif d_id in busy_drivers: status_icon, status_code = "🔴", 1
                else: status_icon, status_code = "🟢", 0
                
                # AI Scoring (0 = Best)
                ai_score = status_code 
                
                label = f"{status_icon} {d_name} ({v_plate}) [Max: {max_w:,.0f}kg]"
                
                # Add AI Badge
                is_recommended = False
                if status_code == 0: # ถ้าว่าง
                     # สมมติ Logic: เลือกรถที่ Max Weight มากกว่า 1000kg เป็นตัวแนะนำ (ตัวอย่าง)
                     if max_w >= 1000: 
                        label = "⭐ " + label + " (แนะนำ)"
                        is_recommended = True
                        ai_score = -1 # ให้คะแนนดีที่สุด

                info = {
                    "label": label, "id": d_id, "name": d_name, "plate": v_plate, 
                    "type": str(row.get('Vehicle_Type', '6 ล้อ')), 
                    "status_code": status_code, "max_weight": max_w, "max_volume": max_v,
                    "ai_score": ai_score
                }
                driver_list_sorted.append(info)
                driver_info_map[label] = info

    # Sort drivers: Recommended first, then Available, then Busy/Broken
    driver_list_sorted.sort(key=lambda x: x['ai_score'])
    driver_options = [d['label'] for d in driver_list_sorted]

    # --- 2. Input Form ---
    c1, c2, c3 = st.columns([1, 1.5, 1])
    with c1: p_date = st.date_input("1. วันที่นัดหมาย", datetime.today())
    with c2:
        cust_opts = [f"{row['Customer_Name']}" for i, row in customers_df.iterrows()] if not customers_df.empty else []
        sel_cust_label = st.selectbox("2. ลูกค้า", cust_opts, index=None, placeholder="ค้นหาลูกค้า...")
    with c3: job_mode = st.radio("ประเภทงาน", ["จุดเดียว (Single)", "หลายจุด (Multi-Drop)"], horizontal=True)

    st.markdown("---")
    with st.container():
        st.markdown("##### 📦 ข้อมูลสินค้า")
        cw1, cw2, cw3, cw4 = st.columns(4)
        cargo_qty = cw1.text_input("จำนวนสินค้า", "10 พาเลท")
        total_weight = cw2.number_input("น้ำหนักรวม (กก.)", min_value=0.0, step=100.0)
        total_volume = cw3.number_input("ปริมาตร (CBM)", min_value=0.0, step=0.1)
        cargo_type = cw4.text_input("ประเภทสินค้า", "สินค้าทั่วไป")
        
        st.caption("🧾 บาร์โค้ดสำหรับตรวจสอบ (คั่นด้วยเครื่องหมายจุลภาค , )")
        barcodes_input = st.text_input("ระบุบาร์โค้ด (Optional)", placeholder="เช่น 885123456, 885987654")

    st.markdown("##### 📍 กำหนดเส้นทาง")
    destinations = []
    
    # --- Single Drop Mode ---
    if job_mode == "จุดเดียว (Single)":
        c_rt1, c_rt2 = st.columns(2)
        unique_routes = ["-- กำหนดเอง --"] + sorted(routes_df['Route_Name'].dropna().astype(str).unique().tolist()) if not routes_df.empty else ["-- กำหนดเอง --"]
        sel_route = c_rt1.selectbox("กลุ่มงาน", unique_routes)
        dest_opts = []
        if sel_route != "-- กำหนดเอง --": dest_opts = routes_df[routes_df['Route_Name'] == sel_route]['Destination'].unique().tolist()
        sel_dest = c_rt2.selectbox("ปลายทาง", ["-- กำหนดเอง --"] + dest_opts)
        ci1, ci2, ci3 = st.columns(3)
        origin = ci1.text_input("ต้นทาง", value=st.session_state.get('form_origin', ''))
        dest = ci2.text_input("ปลายทาง", value=sel_dest if sel_dest != "-- กำหนดเอง --" else "")
        dist = ci3.number_input("ระยะทาง (กม.)", value=st.session_state.get('form_dist', 100.0))
        destinations.append({"Sequence": 1, "Dest_Location": dest, "Est_Distance_KM": dist, "Route_Name": sel_route})
    
    # --- Multi-Drop Mode (with AI Optimization) ---
    else:
        # Initialize Session State for Drops if not exists
        if 'multi_drop_data' not in st.session_state:
            st.session_state.multi_drop_data = pd.DataFrame([
                {"Sequence": 1, "Dest_Location": "", "Est_Distance_KM": 50.0}, 
                {"Sequence": 2, "Dest_Location": "", "Est_Distance_KM": 30.0}
            ])

        col_head, col_btn = st.columns([3, 1.5])
        col_head.info("💡 ระบุจุดส่งสินค้าตามลำดับ (หรือใช้ AI ช่วยเรียง)")
        
        # --- AI Optimize Button ---
        if col_btn.button("🧠 AI จัดเส้นทาง (Optimize)", type="primary", use_container_width=True):
            with st.spinner("AI กำลังคำนวณเส้นทางที่ดีที่สุด..."):
                time.sleep(0.8) # Simulate processing
                df_opt = st.session_state.multi_drop_data.copy()
                # Logic: เรียงตามระยะทางจากน้อยไปมาก (Simulated TSP)
                if not df_opt.empty and 'Est_Distance_KM' in df_opt.columns:
                    df_opt = df_opt.sort_values(by='Est_Distance_KM')
                    df_opt['Sequence'] = range(1, len(df_opt) + 1) # Re-index sequence
                    st.session_state.multi_drop_data = df_opt
                    st.toast("✅ AI จัดเรียงเส้นทางให้ประหยัดที่สุดแล้ว!", icon="🤖")
                    st.rerun()
        # --------------------------

        origin = st.text_input("ต้นทาง", "คลังสินค้าหลัก")
        
        # Use session state for data_editor
        edited_drops = st.data_editor(
            st.session_state.multi_drop_data, 
            num_rows="dynamic", 
            use_container_width=True,
            key="drop_editor"
        )
        
        # Sync changes back to session state
        st.session_state.multi_drop_data = edited_drops

        for i, row in edited_drops.iterrows():
            if row.get('Dest_Location'):
                destinations.append({
                    "Sequence": row.get('Sequence', i+1), 
                    "Dest_Location": row.get('Dest_Location'), 
                    "Est_Distance_KM": row.get('Est_Distance_KM', 0), 
                    "Route_Name": "Multi-Drop"
                })

    st.markdown("---")
    st.markdown("##### 🚛 เลือกคนขับ")
    selected_drivers = st.multiselect("เลือกคนขับ (เรียงตามคำแนะนำ):", driver_options)

    if selected_drivers and destinations:
        table_data = []
        for drv_label in selected_drivers:
            info = driver_info_map.get(drv_label, {})
            max_w, max_v = info.get('max_weight', 0), info.get('max_volume', 0)
            status_note, is_overweight = "", False
            
            if info.get('status_code') == 1: status_note += "⚠️ ติดงาน "
            if info.get('status_code') == 2: status_note += "⛔ รถซ่อม "
            if total_weight > 0 and max_w > 0 and total_weight > max_w: status_note += "❌ นน.เกิน "; is_overweight = True
            if total_volume > 0 and max_v > 0 and total_volume > max_v: status_note += "📦 เต็มคิว "; is_overweight = True
            
            # AI Comment
            if info.get('ai_score') == -1: status_note += "⭐ แนะนำ "

            total_trip_dist = sum([d['Est_Distance_KM'] for d in destinations])
            cost = calculate_driver_cost(p_date, total_trip_dist, info.get('type', '6 ล้อ'))
            table_data.append({"Driver_ID": info.get("id"), "Driver_Name": info.get("name"), "Vehicle_Plate": info.get("plate"), "Max_Weight": max_w, "Max_Volume": max_v, "Overweight": is_overweight, "Price": cost + 1000, "Cost": cost, "Note": status_note})

        st.data_editor(pd.DataFrame(table_data), hide_index=True, use_container_width=True)

        if st.button("✅ ยืนยันจ่ายงาน (Create Jobs)", type="primary", use_container_width=True):
            if any(d['Overweight'] for d in table_data): st.error("⚠️ มีรถที่น้ำหนักหรือปริมาตรเกินพิกัด")
            else:
                with st.spinner("กำลังสร้างใบงาน..."):
                    batch_id = datetime.now().strftime('%y%m%d%H%M')
                    count = 0
                    for row in table_data:
                        for drop in destinations:
                            job_id = f"JOB-{batch_id}-{count+1:03d}"
                            map_link = ""
                            if origin and drop['Dest_Location']:
                                try: map_link = f"http://googleusercontent.com/maps.google.com/?saddr={urllib.parse.quote(origin)}&daddr={urllib.parse.quote(drop['Dest_Location'])}&dirflg=d"
                                except: map_link = ""

                            new_job = {
                                "Job_ID": job_id, "Job_Status": "ASSIGNED", "Plan_Date": p_date.strftime("%Y-%m-%d"),
                                "Customer_Name": sel_cust_label, "Route_Name": drop['Route_Name'],
                                "Origin_Location": origin, "Dest_Location": drop['Dest_Location'],
                                "Est_Distance_KM": drop['Est_Distance_KM'], "GoogleMap_Link": map_link,
                                "Driver_ID": row['Driver_ID'], "Driver_Name": row['Driver_Name'],
                                "Vehicle_Plate": row['Vehicle_Plate'], "Cargo_Qty": f"{cargo_qty} (Drop {drop['Sequence']})",
                                "Price_Cust_Total": row['Price'] if drop['Sequence'] == 1 else 0,
                                "Cost_Driver_Total": row['Cost'] if drop['Sequence'] == 1 else 0,
                                "Payment_Status": "รอจ่าย",
                                "Barcodes": barcodes_input
                            }
                            create_new_job(new_job)
                            count += 1
                    
                    # Clear session state for drops after success
                    if 'multi_drop_data' in st.session_state:
                         del st.session_state['multi_drop_data']
                         
                    st.success(f"สร้างงานสำเร็จ {count} ใบงาน!"); time.sleep(1); st.rerun()
    
    st.markdown("---")
    st.subheader("📋 รายการงานล่าสุด (20 รายการ)")
    try:
        if not jobs_all.empty:
            jobs_all['Created_At'] = pd.to_datetime(jobs_all['Plan_Date'], errors='coerce')
            recent_jobs = jobs_all.sort_values(by='Job_ID', ascending=False).head(20)
            cols_show = ['Job_ID', 'Plan_Date', 'Driver_Name', 'Vehicle_Plate', 'Route_Name', 'Job_Status']
            st.dataframe(recent_jobs[cols_show], use_container_width=True, hide_index=True)
        else: st.info("ยังไม่มีข้อมูลงานในระบบ")
    except Exception as e: st.error(f"ไม่สามารถแสดงรายการล่าสุด: {e}")

# --- ฟังก์ชัน Tab 6: GPS & Inspection ---
def render_tab6_gps_inspection():
    st.subheader("📍 GPS & ตรวจสภาพ (Tracking & Inspection)")
    
    g1, g2 = st.tabs(["📍 GPS Tracking", "📋 ผลตรวจสภาพ"])
    
    # --- ส่วนที่ 1: GPS Tracking ---
    with g1:
        try:
            drivers = get_data("Master_Drivers")
        except:
            st.error("โหลดข้อมูล Master_Drivers ไม่สำเร็จ")
            return

        if not drivers.empty and 'Current_Lat' in drivers.columns and 'Current_Lon' in drivers.columns:
            # Clean Data
            drivers['lat'] = pd.to_numeric(drivers['Current_Lat'], errors='coerce')
            drivers['lon'] = pd.to_numeric(drivers['Current_Lon'], errors='coerce')
            
            def create_map_link(row):
                if pd.notna(row['lat']) and pd.notna(row['lon']):
                    return f"http://googleusercontent.com/maps.google.com/?q={row['lat']},{row['lon']}"
                return None
            
            drivers['GoogleMap_Link'] = drivers.apply(create_map_link, axis=1)
            
            active_gps = drivers.dropna(subset=['lat', 'lon']).copy()
            
            # KPI
            m1, m2, m3 = st.columns(3)
            m1.metric("🚛 รถทั้งหมด", len(drivers))
            m2.metric("🟢 Online", len(active_gps))
            m3.metric("⚪ Offline", len(drivers) - len(active_gps))
            
            st.divider()

            if not active_gps.empty:
                st.map(active_gps, latitude='lat', longitude='lon')
            else:
                st.info("ไม่พบพิกัด GPS ล่าสุด")

            st.markdown("### 📋 ตำแหน่งรถรายคัน")
            search_txt = st.text_input("🔍 ค้นหา (ชื่อ/ทะเบียน)", placeholder="พิมพ์เพื่อกรอง...")
            
            display_cols = ['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'GoogleMap_Link']
            df_display = active_gps[display_cols].copy()
            
            # --- แก้ไข Error: แปลงข้อมูล Last_Update เป็น String ให้หมดกัน Error ---
            if 'Last_Update' in df_display.columns:
                df_display['Last_Update'] = df_display['Last_Update'].astype(str).replace('nan', '-')
            # -----------------------------------------------------------------
            
            if search_txt:
                mask = df_display['Driver_Name'].astype(str).str.contains(search_txt, case=False) | \
                       df_display['Vehicle_Plate'].astype(str).str.contains(search_txt, case=False)
                df_display = df_display[mask]

            st.data_editor(
                df_display,
                column_config={
                    "GoogleMap_Link": st.column_config.LinkColumn(
                        "ตำแหน่งปัจจุบัน", display_text="🗺️ เปิดแผนที่"
                    ),
                    "Last_Update": st.column_config.TextColumn("อัปเดตล่าสุด"),
                    "Driver_Name": "ชื่อคนขับ",
                    "Vehicle_Plate": "ทะเบียนรถ"
                },
                hide_index=True,
                use_container_width=True,
                disabled=True
            )
        else:
            st.warning("ไม่พบข้อมูลคอลัมน์ GPS ใน Master_Drivers")

    # --- ส่วนที่ 2: Inspection ---
    with g2:
        try:
            maint = get_data("Maintenance_Logs")
        except:
            st.error("โหลดข้อมูล Maintenance_Logs ไม่สำเร็จ")
            return

        if not maint.empty and 'Service_Type' in maint.columns:
            inspections = maint[maint['Service_Type'] == 'ตรวจสภาพ'].copy()
            
            if not inspections.empty:
                st.markdown("##### 📅 ประวัติการตรวจสภาพ")
                c_date1, c_date2 = st.columns(2)
                today = datetime.now().date()
                
                start_d = c_date1.date_input("ตั้งแต่วันที่", today - timedelta(days=30), key="ins_start")
                end_d = c_date2.date_input("ถึงวันที่", today, key="ins_end")
                
                inspections['Date_Obj'] = pd.to_datetime(inspections['Date_Service'], errors='coerce')
                mask = (inspections['Date_Obj'].dt.date >= start_d) & (inspections['Date_Obj'].dt.date <= end_d)
                ins_filtered = inspections[mask].copy()
                
                st.info(f"พบประวัติจำนวน: {len(ins_filtered)} รายการ")
                
                st.dataframe(
                    ins_filtered[['Date_Service', 'Vehicle_Plate', 'Odometer', 'Notes']],
                    column_config={
                        "Date_Service": st.column_config.DateColumn("วันที่ตรวจ", format="DD/MM/YYYY"),
                        "Vehicle_Plate": "ทะเบียนรถ",
                        "Odometer": st.column_config.NumberColumn("เลขไมล์", format="%d"),
                        "Notes": st.column_config.TextColumn("ผลการตรวจ", width="large")
                    },
                    use_container_width=True,
                    hide_index=True
                )
            else:
                st.info("ยังไม่มีประวัติการตรวจสภาพ")
        else:
            st.info("ยังไม่มีข้อมูล Maintenance_Logs")

# --- ฟังก์ชัน Tab 10: Accounting (อัปเกรด: Bank File & Job Summary for Driver) ---
def render_tab10_accounting():
    st.subheader("💰 บัญชีและการเงิน (Driver Payment)")
    
    # 1. ตัวเลือกคนขับและช่วงเวลา
    with st.container(border=True):
        c1, c2, c3 = st.columns([1.5, 1, 1])
        
        # Load Data
        jobs = get_data("Jobs_Main")
        drivers = get_data("Master_Drivers")
        
        # Driver Selector
        drv_list = ["-- เลือกคนขับ --"] + sorted(drivers['Driver_Name'].unique().tolist()) if not drivers.empty else []
        sel_drv_name = c1.selectbox("เลือกพนักงานขับรถ", drv_list)
        
        # Date Range
        today = datetime.now()
        this_month_start = today.replace(year=2025, month=1, day=1) 
        start_d = c2.date_input("ตั้งแต่วันที่", this_month_start)
        end_d = c3.date_input("ถึงวันที่", today.replace(year=2025, month=12, day=31))

    if sel_drv_name != "-- เลือกคนขับ --":
        drv_info = drivers[drivers['Driver_Name'] == sel_drv_name].iloc[0]
        drv_id = str(drv_info['Driver_ID']).strip()
        
        # Filter Jobs
        if not jobs.empty:
            jobs['PD_Obj'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
            if 'Driver_ID' in jobs.columns: jobs['Driver_ID'] = jobs['Driver_ID'].astype(str).str.strip()
            else: jobs['Driver_ID'] = ""
            if 'Driver_Name' in jobs.columns: jobs['Driver_Name'] = jobs['Driver_Name'].astype(str).str.strip()
            
            driver_match = (jobs['Driver_ID'] == drv_id) | (jobs['Driver_Name'] == str(sel_drv_name).strip())
            
            mask = driver_match & \
                   (jobs['Job_Status'] == 'Completed') & \
                   (jobs['PD_Obj'].dt.date >= start_d) & \
                   (jobs['PD_Obj'].dt.date <= end_d)
            
            payment_filter = st.radio("สถานะการจ่าย", ["รอจ่าย (Pending)", "จ่ายแล้ว (Paid)", "ทั้งหมด"], horizontal=True)
            if payment_filter == "รอจ่าย (Pending)": mask &= (jobs['Payment_Status'] != 'Paid')
            elif payment_filter == "จ่ายแล้ว (Paid)": mask &= (jobs['Payment_Status'] == 'Paid')
                
            df_pay = jobs[mask].copy()
            
            if not df_pay.empty:
                st.markdown("---")
                
                # คำนวณยอดเงิน
                df_pay['Cost_Total'] = pd.to_numeric(df_pay['Cost_Driver_Total'], errors='coerce').fillna(0)
                total_cost = df_pay['Cost_Total'].sum()
                wht_tax = total_cost * 0.01
                net_pay = total_cost - wht_tax
                
                # --- ส่วนที่ 1: รายละเอียดและยอดเงิน ---
                col_info, col_action = st.columns([2, 1.5])
                
                with col_info:
                    st.markdown(f"##### 📋 รายการวิ่งงาน: {sel_drv_name}")
                    st.dataframe(
                        df_pay[['Plan_Date', 'Job_ID', 'Route_Name', 'Cost_Driver_Total']],
                        column_config={"Cost_Driver_Total": st.column_config.NumberColumn("ค่าเที่ยว", format="%.2f")},
                        use_container_width=True, hide_index=True
                    )
                
                with col_action:
                    st.markdown("##### 💵 ข้อมูลการโอน")
                    with st.container(border=True):
                        st.metric("ยอดโอนสุทธิ (Net Pay)", f"{net_pay:,.2f} บาท")
                        
                        # ข้อมูลธนาคาร
                        bank_name = drv_info.get('Bank_Name', '-')
                        acc_no = str(drv_info.get('Bank_Account_No', '-'))
                        if acc_no.endswith('.0'): acc_no = acc_no[:-2]
                        if acc_no.lower() == 'nan': acc_no = ''
                        acc_name = drv_info.get('Bank_Account_Name', sel_drv_name)
                        
                        st.write(f"🏦 **{bank_name}**")
                        st.code(acc_no, language="text")
                        st.caption(f"ชื่อ: {acc_name}")
                        
                        with st.expander("✏️ แก้ไขข้อมูลธนาคาร"):
                            b_name = st.text_input("ธนาคาร", value=bank_name)
                            b_acc = st.text_input("เลขบัญชี", value=acc_no)
                            b_user = st.text_input("ชื่อบัญชี", value=acc_name)
                            if st.button("บันทึกธนาคาร"):
                                try:
                                    d_idx = drivers[drivers['Driver_ID'] == drv_id].index[0]
                                    drivers.at[d_idx, 'Bank_Name'] = b_name
                                    drivers.at[d_idx, 'Bank_Account_No'] = b_acc
                                    drivers.at[d_idx, 'Bank_Account_Name'] = b_user
                                    update_sheet("Master_Drivers", drivers)
                                    st.success("บันทึกแล้ว"); time.sleep(1); st.rerun()
                                except Exception as e:
                                    st.error(f"Error: {e}")

                st.divider()

                # --- ส่วนที่ 2: เครื่องมือ (Tools) ---
                st.subheader("🚀 เครื่องมือและการจัดการ (Tools)")
                
                ct1, ct2 = st.columns(2)
                
                with ct1:
                    st.markdown("**1. ไฟล์ดาวน์โหลด (Downloads)**")
                    
                    # A. ไฟล์สำหรับคนขับ (Job Summary)
                    st.caption("📄 สำหรับส่งให้คนขับตรวจสอบ (Job Summary)")
                    driver_cols = ['Plan_Date', 'Job_ID', 'Route_Name', 'Dest_Location', 'Cost_Driver_Total']
                    df_driver_export = df_pay[driver_cols].copy()
                    df_driver_export.rename(columns={
                        'Plan_Date': 'วันที่', 
                        'Job_ID': 'เลขงาน', 
                        'Route_Name': 'เส้นทาง',
                        'Dest_Location': 'ปลายทาง',
                        'Cost_Driver_Total': 'ค่าเที่ยว'
                    }, inplace=True)
                    csv_driver = convert_df_to_csv(df_driver_export)
                    
                    st.download_button(
                        label="🚚 ไฟล์สรุปงานคนขับ (Job Summary .csv)",
                        data=csv_driver,
                        file_name=f"JobSummary_{sel_drv_name}_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )

                    st.markdown("---")

                    # B. ไฟล์สำหรับธนาคาร (Bank Transfer)
                    st.caption("🏦 สำหรับอัปโหลดธนาคาร (Bank Transfer)")
                    bank_data = [{
                        "Receiving_Bank": bank_name,
                        "Account_No": str(acc_no).replace('-', ''),
                        "Amount": f"{net_pay:.2f}",
                        "Receiver_Name": acc_name,
                        "Ref_No": f"PAY-{datetime.now().strftime('%y%m%d')}-{drv_id}"
                    }]
                    df_bank = pd.DataFrame(bank_data)
                    csv_bank = convert_df_to_csv(df_bank)
                    
                    st.download_button(
                        label="📥 ไฟล์โอนเงินธนาคาร (Bank Transfer .csv)",
                        data=csv_bank,
                        file_name=f"BankTransfer_{sel_drv_name}_{net_pay:.0f}.csv",
                        mime="text/csv",
                        type="primary"
                    )

                with ct2:
                    st.markdown("**2. ยืนยันในระบบ (System Action)**")
                    st.write(f"ยืนยันว่าจ่ายเงินให้ **{sel_drv_name}** แล้ว?")
                    
                    if payment_filter != "จ่ายแล้ว (Paid)":
                        if st.button("✅ ยืนยันการจ่ายเงิน (Mark as Paid)", use_container_width=True):
                            for i in df_pay.index:
                                jobs.at[i, 'Payment_Status'] = 'Paid'
                                jobs.at[i, 'Payment_Date'] = get_thai_time_str() # type: ignore
                            update_sheet("Jobs_Main", jobs)
                            st.balloons()
                            st.success("บันทึกการจ่ายเรียบร้อย!")
                            time.sleep(2); st.rerun()
                    else:
                        st.success("✅ รายการนี้จ่ายเงินเรียบร้อยแล้ว")

            else:
                st.info("ไม่พบรายการวิ่งงานที่ต้องจ่ายในช่วงเวลานี้")
        else:
            st.warning("ยังไม่มีข้อมูลงานในระบบ")          

# ==========================================
# ส่วนที่ 2: ฟังก์ชันหลัก Admin Flow
# ==========================================

def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            st.cache_data.clear()
            st.session_state.data_store = load_all_data()
            st.rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
        st.caption("v3.7 Final")
            
    st.title("🖥️ Admin Dashboard")
    
    # Init Session Vars
    if 'form_route_name' not in st.session_state: st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state: st.session_state.form_origin = ""
    if 'form_dest' not in st.session_state: st.session_state.form_dest = ""
    if 'form_link_org' not in st.session_state: st.session_state.form_link_org = ""
    if 'form_link_dest' not in st.session_state: st.session_state.form_link_dest = ""
    if 'form_dist' not in st.session_state: st.session_state.form_dist = 100.0

    # Tabs
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10 = st.tabs([
        "📝 จ่ายงาน", "📊 รายงาน", "🔧 แจ้งซ่อม", "⛽ น้ำมัน", 
        "🗂️ รถ/สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน", "⚙️ ตั้งค่า", "📖 คู่มือ", "💰 บัญชี"
    ])

    # --- Tab 1 ---
    with tab1:
        render_tab1_flexible_assignment()

    # --- Tab 2: Dashboard ---
    with tab2:
        st.subheader("📊 รายงานสรุป (Dashboard)")
        with st.spinner("กำลังประมวลผลข้อมูล..."):
            df_jobs = get_data("Jobs_Main")
            df_fuel = get_data("Fuel_Logs")
        
        today = datetime.now().date()
        # Default date range: Last 30 days - Future 30 days
        default_start = today - timedelta(days=30)
        default_end = today + timedelta(days=30)

        c1, c2 = st.columns(2)
        with c1: start_date = st.date_input("📅 เริ่มต้น", default_start)
        with c2: end_date = st.date_input("📅 สิ้นสุด", default_end)

        # (ปุ่มลัดถูกเอาออกตามที่ขอแล้ว)

        if not df_jobs.empty:
            df_jobs['PD'] = df_jobs['Plan_Date'].apply(parse_flexible_date)
            job_mask = (df_jobs['PD'].dt.date >= start_date) & \
                       (df_jobs['PD'].dt.date <= end_date) & \
                       (df_jobs['Job_Status'] != 'CANCELLED')
            df_jobs_filtered = df_jobs[job_mask].copy()
        else:
            df_jobs_filtered = pd.DataFrame()

        if not df_fuel.empty:
            df_fuel['DT'] = df_fuel['Date_Time'].apply(parse_flexible_date)
            fuel_mask = (df_fuel['DT'].dt.date >= start_date) & \
                        (df_fuel['DT'].dt.date <= end_date)
            df_fuel_filtered = df_fuel[fuel_mask].copy()
        else:
            df_fuel_filtered = pd.DataFrame()

        if not df_jobs_filtered.empty or not df_fuel_filtered.empty:
            p_col = 'Price_Cust_Total' if 'Price_Cust_Total' in df_jobs_filtered.columns else 'Price_Customer'
            c_col = 'Cost_Driver_Total' if 'Cost_Driver_Total' in df_jobs_filtered.columns else 'Cost_Driver_Total'

            for col in [p_col, c_col]:
                if col in df_jobs_filtered.columns:
                    df_jobs_filtered[col] = pd.to_numeric(df_jobs_filtered[col].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
            
            if 'Price_Total' in df_fuel_filtered.columns:
                df_fuel_filtered['Price_Total'] = pd.to_numeric(df_fuel_filtered['Price_Total'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)

            total_rev = df_jobs_filtered[p_col].sum() if not df_jobs_filtered.empty else 0
            total_driver_cost = df_jobs_filtered[c_col].sum() if not df_jobs_filtered.empty else 0
            total_fuel_cost = df_fuel_filtered['Price_Total'].sum() if not df_fuel_filtered.empty else 0
            net_profit = total_rev - total_driver_cost - total_fuel_cost
            
            # --- Feature: On-Time Performance ---
            if 'Actual_Delivery_Time' in df_jobs_filtered.columns:
                df_jobs_filtered['Actual_DT'] = pd.to_datetime(df_jobs_filtered['Actual_Delivery_Time'], errors='coerce')
                
                def check_ontime(row):
                    if pd.isna(row['PD']): return "N/A"
                    if pd.isna(row['Actual_DT']):
                        if row['Job_Status'] == 'Completed': return "No Time"
                        if row['PD'].date() < datetime.now().date(): return "Late (Pending)"
                        return "Pending"
                    if row['Actual_DT'].date() <= row['PD'].date(): return "On-Time"
                    return "Late"
                
                df_jobs_filtered['Delivery_Performance'] = df_jobs_filtered.apply(check_ontime, axis=1)
                
                completed = df_jobs_filtered[df_jobs_filtered['Job_Status'] == 'Completed']
                if not completed.empty:
                    ontime_pct = (len(completed[completed['Delivery_Performance'] == 'On-Time']) / len(completed)) * 100
                else: ontime_pct = 0
            else:
                ontime_pct = 0
                df_jobs_filtered['Delivery_Performance'] = "N/A"
            # ------------------------------------

            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับ", f"{total_rev:,.0f}")
            k2.metric("🚚 ค่าเที่ยว", f"{total_driver_cost:,.0f}")
            k3.metric("⛽ ค่าน้ำมัน", f"{total_fuel_cost:,.0f}")
            k4.metric("📈 กำไรสุทธิ", f"{net_profit:,.0f}")
            st.metric("⏱️ ส่งตรงเวลา (On-Time)", f"{ontime_pct:.1f}%")

            st.divider()
            
            st.markdown("### 🚚 สรุปรายรถ (Fleet)")
            perf_jobs = pd.DataFrame()
            if not df_jobs_filtered.empty:
                perf_jobs = df_jobs_filtered.groupby('Vehicle_Plate').agg({'Job_ID': 'count', p_col: 'sum', c_col: 'sum'}).reset_index()
                perf_jobs.rename(columns={'Job_ID': 'Job_Count', p_col: 'Revenue', c_col: 'Driver_Cost'}, inplace=True)

            perf_fuel = pd.DataFrame()
            if not df_fuel_filtered.empty:
                perf_fuel = df_fuel_filtered.groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                perf_fuel.rename(columns={'Price_Total': 'Fuel_Cost'}, inplace=True)

            if not perf_jobs.empty or not perf_fuel.empty:
                if perf_jobs.empty: perf_jobs = pd.DataFrame(columns=['Vehicle_Plate', 'Job_Count', 'Revenue', 'Driver_Cost'])
                if perf_fuel.empty: perf_fuel = pd.DataFrame(columns=['Vehicle_Plate', 'Fuel_Cost'])

                df_perf = pd.merge(perf_jobs, perf_fuel, on='Vehicle_Plate', how='outer').fillna(0)
                df_perf['Net_Profit'] = df_perf['Revenue'] - df_perf['Driver_Cost'] - df_perf['Fuel_Cost']
                df_perf = df_perf.sort_values('Net_Profit', ascending=False)
                
                try: st.bar_chart(df_perf.set_index('Vehicle_Plate')[['Revenue', 'Driver_Cost', 'Net_Profit']])
                except: pass

                try: st.dataframe(df_perf.style.format("{:,.0f}"), use_container_width=True)
                except: st.dataframe(df_perf, use_container_width=True)
            
            st.divider()
            st.markdown("### 👥 สรุปรายลูกค้า")
            if not df_jobs_filtered.empty and 'Customer_Name' in df_jobs_filtered.columns:
                perf_cust = df_jobs_filtered.groupby('Customer_Name').agg({'Job_ID': 'count', p_col: 'sum'}).reset_index()
                perf_cust.rename(columns={'Job_ID': 'Job_Count', p_col: 'Revenue'}, inplace=True)
                perf_cust = perf_cust.sort_values('Revenue', ascending=False)
                
                c_cust1, c_cust2 = st.columns([2, 1])
                with c_cust1:
                    try: st.bar_chart(perf_cust.set_index('Customer_Name')['Revenue'])
                    except: pass
                with c_cust2:
                    try: st.dataframe(perf_cust.style.format("{:,.0f}"), use_container_width=True)
                    except: st.dataframe(perf_cust, use_container_width=True)
        else:
            st.warning("ไม่พบข้อมูลในช่วงวันที่เลือก")

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔧 MMS: ระบบซ่อมบำรุง")
        mms1, mms2, mms3 = st.tabs(["📝 ใบสั่งซ่อม", "📄 ต่อสัญญา", "✍️ บันทึกซ่อม"])
        
        with mms1:
            tk = get_data("Repair_Tickets")
            if not tk.empty:
                c_flt1, c_flt2 = st.columns(2)
                pl_list = ["ทั้งหมด"] + sorted(tk['Vehicle_Plate'].astype(str).unique().tolist()) if 'Vehicle_Plate' in tk.columns else ["ทั้งหมด"]
                st_list = ["ทั้งหมด"] + sorted(tk['Status'].astype(str).unique().tolist()) if 'Status' in tk.columns else ["ทั้งหมด"]
                
                sel_pl = c_flt1.selectbox("ทะเบียน", pl_list, key="mms_pl")
                sel_st = c_flt2.selectbox("สถานะ", st_list, key="mms_st")
                
                view = tk.copy()
                if sel_pl != "ทั้งหมด": view = view[view['Vehicle_Plate'] == sel_pl]
                if sel_st != "ทั้งหมด": view = view[view['Status'] == sel_st]
                
                st.data_editor(
                    view,
                    column_config={
                        "Photo_Url": st.column_config.ImageColumn("รูป", width="medium"),
                        "Ticket_ID": st.column_config.TextColumn("Ticket", disabled=True)
                    },
                    use_container_width=True, hide_index=True
                )
                
                st.divider()
                active = tk[tk['Status'] != 'เสร็จสิ้น']['Ticket_ID'].unique().tolist()
                if active:
                    c1, c2, c3 = st.columns([1,1,1])
                    tid = c1.selectbox("อัปเดต Ticket", active)
                    new_st = c2.selectbox("สถานะใหม่", ["กำลังดำเนินการ", "รออะไหล่", "เสร็จสิ้น"])
                    if c3.button("บันทึกสถานะ"):
                        tk.loc[tk['Ticket_ID'] == tid, 'Status'] = new_st
                        if new_st == "เสร็จสิ้น": tk.loc[tk['Ticket_ID'] == tid, 'Date_Finish'] = get_thai_time_str() # type: ignore
                        update_sheet("Repair_Tickets", tk)
                        st.success("Updated"); st.rerun()
            else: st.info("ไม่มีใบสั่งซ่อม")

        with mms2:
            st.markdown("### 📅 สถานะต่อสัญญา")
            drivers = get_data("Master_Drivers")
            if not drivers.empty and 'Insurance_Expiry' in drivers.columns:
                drivers['Expire_Date'] = drivers['Insurance_Expiry'].apply(parse_flexible_date)
                valid = drivers.dropna(subset=['Expire_Date']).copy()
                if not valid.empty:
                    valid['Days_Left'] = (valid['Expire_Date'] - datetime.now()).dt.days
                    valid = valid.sort_values('Days_Left')
                    
                    st.dataframe(valid[['Vehicle_Plate', 'Insurance_Expiry', 'Days_Left']], use_container_width=True)
                    
                    exp = len(valid[valid['Days_Left'] < 0])
                    warn = len(valid[(valid['Days_Left'] >= 0) & (valid['Days_Left'] < 30)])
                    if exp > 0: st.error(f"🚨 หมดอายุ {exp} คัน")
                    if warn > 0: st.warning(f"⚠️ ใกล้หมด {warn} คัน")
                else: st.info("ไม่พบข้อมูลวันหมดอายุ")
            else: st.info("ไม่มีข้อมูล Insurance_Expiry")

        with mms3:
            with st.form("mn_form"):
                d = get_data("Master_Drivers")
                pl = sorted(d['Vehicle_Plate'].dropna().unique().tolist()) if not d.empty else []
                c1, c2 = st.columns(2)
                vp = c1.selectbox("ทะเบียน", pl)
                sv_date = c2.date_input("วันที่", datetime.today())
                sv_type = st.selectbox("รายการ", ["ตรวจสภาพ", "ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง", "ซ่อมเครื่องยนต์", "อื่นๆ"])
                odo = st.number_input("เลขไมล์", 0)
                desc = st.text_area("รายละเอียด")
                create_tk = st.checkbox("เปิดใบสั่งซ่อมด้วย")
                
                if st.form_submit_button("บันทึก"):
                    log = {"Log_ID": f"MN-{int(time.time())}", "Date_Service": sv_date.strftime("%Y-%m-%d"), "Vehicle_Plate": vp, "Service_Type": sv_type, "Odometer": odo, "Notes": desc}
                    log_maintenance_record(log)
                    
                    if create_tk:
                        tk_data = {"Ticket_ID": f"TK-{int(time.time())}", "Date_Report": get_thai_time_str(), "Vehicle_Plate": vp, "Issue_Type": sv_type, "Description": desc, "Status": "รอดำเนินการ", "Photo_Url": "-"} # type: ignore
                        create_repair_ticket(tk_data)
                    
                    st.success("บันทึกเรียบร้อย"); st.rerun()

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ข้อมูลน้ำมัน")
        f1, f2 = st.tabs(["ประวัติ", "บันทึก (Admin)"])
        
        with f1:
            fl = get_data("Fuel_Logs")
            if not fl.empty:
                if 'Date_Time' in fl.columns: fl['DT'] = fl['Date_Time'].apply(parse_flexible_date)
                else: fl['DT'] = pd.NaT
                st.dataframe(fl.sort_values('DT', ascending=False).drop(columns=['DT']), use_container_width=True)
            else: st.info("ไม่มีข้อมูล")
            
        with f2:
            with st.form("adm_fuel"):
                d = get_data("Master_Drivers")
                pl = d['Vehicle_Plate'].unique() if not d.empty else []
                c1, c2 = st.columns(2)
                vp = c1.selectbox("รถ", pl)
                stn = c2.text_input("ปั๊ม", "ปตท.")
                c3, c4, c5 = st.columns(3)
                odo = c3.number_input("ไมล์", 0)
                lit = c4.number_input("ลิตร", 0.0)
                prc = c5.number_input("บาท", 0.0)
                
                if st.form_submit_button("บันทึก"):
                    fd = {"Log_ID": f"FA-{int(time.time())}", "Date_Time": get_thai_time_str(), "Vehicle_Plate": vp, "Odometer": odo, "Liters": lit, "Price_Total": prc, "Station_Name": stn, "Driver_ID": "ADMIN", "Photo_Url": "-"} # type: ignore
                    create_fuel_log(fd)
                    st.success("Saved"); st.rerun()

    # --- Tab 5: Master ---
    with tab5:
        st.subheader("🗂️ ยานพาหนะ และ สต็อก")
        mt1, mt2, mt3, mt4, mt5 = st.tabs(["รถ", "หาง", "อะไหล่", "ยาง", "เส้นทาง"])
        
        with mt1:
            md = get_data("Master_Drivers")
            ed_md = st.data_editor(md, num_rows="dynamic", use_container_width=True)
            if st.button("Save Car"): update_sheet("Master_Drivers", ed_md); st.success("Saved"); st.rerun()
            
        with mt2:
            tr = get_data_safe("Master_Trailers", ["Trailer_ID", "License_Plate"])
            ed_tr = st.data_editor(tr, num_rows="dynamic", use_container_width=True)
            if st.button("Save Trailer"): update_sheet("Master_Trailers", ed_tr); st.success("Saved"); st.rerun()

        with mt3:
            sp = get_data("Stock_Parts")
            ed_sp = st.data_editor(sp, num_rows="dynamic", use_container_width=True)
            if st.button("Save Stock"): update_sheet("Stock_Parts", ed_sp); st.success("Saved"); st.rerun()
            
        with mt4:
            ti = get_data_safe("Master_Tires", ["Tire_Serial", "Brand", "Status"])
            ed_ti = st.data_editor(ti, num_rows="dynamic", use_container_width=True)
            if st.button("Save Tires"): update_sheet("Master_Tires", ed_ti); st.success("Saved"); st.rerun()
            
        with mt5:
            mr = get_data("Master_Routes")
            ed_mr = st.data_editor(mr, num_rows="dynamic", use_container_width=True)
            if st.button("Save Routes"): update_sheet("Master_Routes", ed_mr); st.success("Saved"); st.rerun()

    # --- Tab 6: GPS ---
    with tab6:
        render_tab6_gps_inspection()

    # --- Tab 7: Calc ---
    with tab7:
        st.subheader("🧮 Smart Calculator")
        with st.container(border=True):
            st.markdown("##### 📍 กำหนดระยะทาง")
            mr = get_data("Master_Routes")
            route_opts = ["-- กำหนดเอง --"] + sorted(mr['Route_Name'].unique().tolist()) if not mr.empty else ["-- กำหนดเอง --"]
            
            c_r1, c_r2 = st.columns([2, 1])
            sel_route = c_r1.selectbox("เลือกจากเส้นทางมาตรฐาน", route_opts)
            
            default_dist = 100.0
            if sel_route != "-- กำหนดเอง --":
                row = mr[mr['Route_Name'] == sel_route].iloc[0]
                try: default_dist = float(str(row['Distance_KM']).replace(',',''))
                except: pass

            dist = c_r2.number_input("ระยะทางไป-กลับ (กม.)", min_value=0.0, value=default_dist, step=10.0)

        c_cal1, c_cal2 = st.columns([1.5, 2])
        with c_cal1:
            st.markdown("##### 🚛 ข้อมูลรถและค่าใช้จ่าย")
            vt = st.selectbox("ประเภทรถหลัก", ["4 ล้อ", "6 ล้อ", "10 ล้อ", "รถพ่วง"], index=1)
            extra_cost = st.number_input("ค่าใช้จ่ายพิเศษ", min_value=0, value=0, step=100)
            target_margin = st.slider("กำไรที่ต้องการ (%)", 0, 100, 20)
            
            if st.button("🚀 คำนวณต้นทุนและราคา", type="primary", use_container_width=True):
                calc_date = datetime.now()
                base_cost = calculate_driver_cost(calc_date, dist, vt)
                total_cost = base_cost + extra_cost
                suggest_price = total_cost / (1 - (target_margin / 100)) if target_margin < 100 else 0
                profit = suggest_price - total_cost

                st.markdown("---")
                st.success(f"💰 ราคาขายแนะนำ: **{suggest_price:,.0f}** บาท")
                st.caption(f"(ต้นทุนรวม: {total_cost:,.0f} บ. | กำไร: {profit:,.0f} บ.)")

                st.session_state.calc_result = {"base_cost": base_cost, "extra_cost": extra_cost, "profit": profit}

        with c_cal2:
            st.markdown("##### 📊 เปรียบเทียบต้นทุนรายรถ")
            comp_data = []
            for v in ["4 ล้อ", "6 ล้อ", "10 ล้อ"]:
                c = calculate_driver_cost(datetime.now(), dist, v)
                comp_data.append({"ประเภท": v, "ต้นทุนขนส่ง": c})
            
            df_comp = pd.DataFrame(comp_data)
            try:
                st.dataframe(df_comp.style.highlight_min(axis=0, color='#ccffcc').format({"ต้นทุนขนส่ง": "{:,.0f}"}), use_container_width=True, hide_index=True)
            except:
                st.dataframe(df_comp, use_container_width=True)

            if 'calc_result' in st.session_state:
                res = st.session_state.calc_result
                st.markdown("##### 🍰 โครงสร้างราคา")
                chart_df = pd.DataFrame([
                    {"Category": "ต้นทุนรถ/น้ำมัน", "Value": res['base_cost']},
                    {"Category": "ค่าใช้จ่ายพิเศษ", "Value": res['extra_cost']},
                    {"Category": "กำไร", "Value": res['profit']},
                ])
                st.bar_chart(chart_df.set_index("Category"), color=["#FF9800"])

        st.divider()
        with st.expander("⛽ ดูราคาน้ำมันหน้าปั๊ม (Live)"):
            if st.button("🔄 อัปเดตราคาน้ำมัน"):
                st.session_state.fuel_price_data = get_fuel_prices()
            
            fp = st.session_state.get('fuel_price_data', {})
            if fp:
                ptt = fp.get('ราคาน้ำมัน ปตท. (ptt)', {})
                if ptt:
                    df_p = pd.DataFrame(list(ptt.items()), columns=['ชนิด', 'ราคา'])
                    st.dataframe(df_p.T, use_container_width=True)
                else: st.write(fp)
            else: st.info("กดปุ่มเพื่อดึงข้อมูล")

    # --- Tab 8: Config ---
    with tab8:
        st.subheader("⚙️ ตั้งค่า")
        c1, c2, c3 = st.tabs(["Config", "Users", "Tools"])
        
        with c1:
            conf = get_data("System_Config")
            ed_cf = st.data_editor(conf, num_rows="dynamic", use_container_width=True)
            if st.button("Save Config"): update_sheet("System_Config", ed_cf); st.success("Saved")
            
        with c2:
            us = get_data("Master_Drivers")
            ed_us = st.data_editor(us[['Driver_ID', 'Driver_Name', 'Role', 'Password']], use_container_width=True)
            if st.button("Update Users"):
                st.info("Function update user need full logic implementation")
        
        with c3:
            if st.button("Clear Cache"): st.cache_data.clear(); st.success("Cleared"); st.rerun()
    # --- Tab 9: Manual ---
    with tab9: # type: ignore
        st.subheader("📘 คู่มือการใช้งานระบบ")
        manual_tab1, manual_tab2, manual_tab3 = st.tabs(["คู่มือใช้งาน", "วิดีโอสอน", "ติดต่อผู้พัฒนา"])
        
        with manual_tab1:
            try:
                manual_text = get_manual_content()
                st.markdown(manual_text)
            except:
                st.info("กำลังปรับปรุงคู่มือ")
        
        with manual_tab2:
            st.info("กำลังอัปโหลดวิดีโอ")
        
        with manual_tab3:
            st.info("ติดต่อ: support@example.com")

    with tab10:
        render_tab10_accounting()        