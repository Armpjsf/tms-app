# modules/ui_driver.py

import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timedelta
import time
import logging
from streamlit_js_eval import get_geolocation # type: ignore
import urllib.parse
from typing import Dict, Any

# Import with error handling
try:
    from modules.database import get_data
    from modules.utils import (
        get_thai_time_str, get_consumption_rate_by_driver, get_last_fuel_odometer, 
        calculate_actual_consumption, compress_image, process_multiple_images,
        update_driver_location, simple_update_job_status, update_job_status,
        create_fuel_log, create_repair_ticket, get_maintenance_status_all, 
        get_status_label_th, parse_flexible_date
    )
except ImportError as e:
    st.error(f"System Error: {e}")
    st.stop()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def driver_flow():
    """หน้าจอหลักสำหรับคนขับ (Driver App v2.0)"""
    
    # 1. Check Login
    if not hasattr(st.session_state, 'driver_id') or not st.session_state.get('logged_in'):
        st.error("กรุณาล็อกอินใหม่")
        st.session_state.logged_in = False
        st.rerun()
        return
        
    try:
        # Load Driver Info
        driver_id = str(st.session_state.driver_id).strip()
        drivers_df = get_data("Master_Drivers")
        my_info = drivers_df[drivers_df['Driver_ID'] == driver_id].iloc[0] if not drivers_df.empty else {}
        
        # --- Sidebar & Profile ---
        with st.sidebar:
            st.title(f"👮‍♂️ {st.session_state.driver_name}")
            st.caption(f"🆔 {driver_id} | 🚛 {st.session_state.vehicle_plate}")
            
            # Feature: แจ้งเตือนเอกสารใกล้หมดอายุ
            check_expiry_alert(my_info)
            
            st.divider()
            
            # GPS Check-in
            loc = get_geolocation()
            if loc:
                lat, lon = loc['coords']['latitude'], loc['coords']['longitude']
                st.caption(f"พิกัด: {lat:.4f}, {lon:.4f}")
                if st.button("📍 เช็คอินจุดนี้"):
                    update_driver_location(driver_id, lat, lon)
                    st.toast("✅ อัปเดตตำแหน่งแล้ว")
            
            st.divider()
            if st.button("🚪 ออกจากระบบ", type="primary"):
                st.session_state.logged_in = False
                st.rerun()

        # --- Main Menu ---
        # เพิ่มเมนู "💰 รายได้"
        menu = st.radio("เมนูหลัก", ["📦 งานของฉัน", "💰 รายได้", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
        st.divider()
        
        # Routing
        if menu == "📦 งานของฉัน":
            render_my_jobs(driver_id)
        elif menu == "💰 รายได้":
            render_my_earnings(driver_id)
        elif menu == "⛽ เติมน้ำมัน":
            render_fuel_record(driver_id)
        elif menu == "🔧 แจ้งซ่อม":
            render_maintenance(driver_id)
            
    except Exception as e:
        st.error(f"เกิดข้อผิดพลาด: {e}")
        # st.exception(e) # Debug mode only

# ==========================================
# Sub-Functions (แยกส่วนทำงานให้เป็นระเบียบ)
# ==========================================

def check_expiry_alert(driver_row):
    """ตรวจสอบและแจ้งเตือนวันหมดอายุเอกสาร"""
    alerts = []
    cols_check = {
        'Insurance_Expiry': 'ประกันภัย',
        'Tax_Expiry': 'ภาษีรถ',
        'Act_Expiry': 'พ.ร.บ.'
    }
    
    for col, name in cols_check.items():
        val = str(driver_row.get(col, ''))
        if len(val) >= 10:
            try:
                exp_date = parse_flexible_date(val)
                days_left = (exp_date - datetime.now()).days
                if days_left < 0:
                    alerts.append(f"🔴 {name} หมดอายุแล้ว!")
                elif days_left < 30:
                    alerts.append(f"🟡 {name} เหลือ {days_left} วัน")
            except: pass
            
    if alerts:
        with st.expander("⚠️ แจ้งเตือนเอกสาร", expanded=True):
            for a in alerts: st.write(a)

def render_my_jobs(driver_id):
    """หน้ารายการงาน (Job List & Action)"""
    if "page" not in st.session_state: st.session_state.page = "list"
    
    # Page 1: List
    if st.session_state.page == "list":
        jobs = get_data("Jobs_Main")
        if not jobs.empty:
            jobs['Driver_ID'] = jobs['Driver_ID'].astype(str).str.strip()
            # กรองงานที่ยังไม่จบ หรือ จบวันนี้
            my_jobs = jobs[
                (jobs['Driver_ID'] == driver_id) & 
                (~jobs['Job_Status'].isin(['CANCELLED'])) &
                (
                    (jobs['Job_Status'] != 'Completed') | 
                    (pd.to_datetime(jobs['Plan_Date'], errors='coerce').dt.date == datetime.now().date())
                )
            ].copy()
            
            # Sort: งานที่ยังไม่เสร็จขึ้นก่อน
            my_jobs['Sort_Key'] = my_jobs['Job_Status'].apply(lambda x: 0 if x != 'Completed' else 1)
            my_jobs = my_jobs.sort_values('Sort_Key')

            if my_jobs.empty:
                st.info("🎉 ไม่มีงานค้างในขณะนี้")
                if st.button("ดูประวัติงานย้อนหลัง"): st.toast("ไปที่เมนู 'รายได้' เพื่อดูประวัติ")
            else:
                for _, job in my_jobs.iterrows():
                    with st.container(border=True):
                        c1, c2 = st.columns([3, 1])
                        c1.markdown(f"#### 🚚 {job.get('Route_Name', 'งานขนส่ง')}")
                        status = job.get('Job_Status', 'Pending')
                        
                        # Badge สีสถานะ
                        color = "orange" if status == "ASSIGNED" else "blue" if status == "IN_TRANSIT" else "green"
                        c2.markdown(f":{color}[{get_status_label_th(status)}]")
                        
                        c3, c4 = st.columns(2)
                        c3.caption(f"ต้นทาง: {job.get('Origin_Location', '-')}")
                        c4.caption(f"ปลายทาง: {job.get('Dest_Location', '-')}")
                        
                        if status != "Completed":
                            if st.button("คลิกเพื่อทำงาน >", key=f"btn_{job['Job_ID']}", type="primary", use_container_width=True):
                                st.session_state.current_job = job.to_dict()
                                st.session_state.page = "action"
                                # Reset items state
                                if 'job_items_job_id' in st.session_state and st.session_state.job_items_job_id != job['Job_ID']:
                                    if 'job_items' in st.session_state: del st.session_state.job_items
                                st.rerun()
                        else:
                            st.button("ดูรายละเอียด (จบแล้ว)", key=f"view_{job['Job_ID']}", disabled=True)

        else: st.info("ยังไม่มีข้อมูลในระบบ")

    # Page 2: Action (รายละเอียดงาน)
    elif st.session_state.page == "action":
        job = st.session_state.current_job
        
        c_back, c_title = st.columns([1, 4])
        if c_back.button("⬅️"):
            st.session_state.page = "list"
            st.rerun()
        c_title.markdown(f"### {job['Route_Name']}")
        
        # 1. รายละเอียด & แผนที่
        with st.expander("📍 รายละเอียดการเดินทาง", expanded=True):
            st.write(f"**ลูกค้า:** {job.get('Customer_Name', '-')}")
            st.write(f"**สินค้า:** {job.get('Cargo_Qty', '-')}")
            
            org = job.get('Origin_Location', '')
            dst = job.get('Dest_Location', '')
            
            # Map Link
            map_url = job.get('GoogleMap_Link')
            if not map_url or str(map_url) == 'nan':
                # Fallback gen link
                map_url = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(str(org))}&destination={urllib.parse.quote(str(dst))}&travelmode=driving"
            
            st.link_button("🗺️ เปิด Google Maps นำทาง", map_url, type="primary", use_container_width=True)

        # 2. ปุ่มสถานะ (Timestamp)
        st.markdown("#### ⏱️ อัปเดตสถานะ")
        col_s1, col_s2, col_s3 = st.columns(3)
        now_str = get_thai_time_str()
        
        # Logic ปุ่ม: กดแล้ว disable หรือเปลี่ยนสี
        curr_status = job.get('Job_Status')
        
        if col_s1.button("📦 1. รับของ", disabled=(curr_status!='ASSIGNED'), use_container_width=True):
            simple_update_job_status(job['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now_str})
            st.toast("บันทึกเวลา รับของ แล้ว"); time.sleep(1); st.rerun()
            
        if col_s2.button("🚚 2. เดินทาง", disabled=(curr_status!='PICKED_UP'), use_container_width=True):
            simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None)
            st.toast("บันทึกสถานะ กำลังเดินทาง"); time.sleep(1); st.rerun()
            
        if col_s3.button("🏁 3. ถึงแล้ว", disabled=(curr_status!='IN_TRANSIT'), use_container_width=True):
            simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now_str})
            st.toast("บันทึกเวลา ถึงปลายทาง แล้ว"); time.sleep(1); st.rerun()

        st.divider()

        # 3. รายการสินค้า (Checklist)
        st.markdown("#### ✅ ตรวจเช็คสินค้า")
        
        # Init Items List
        if 'job_items' not in st.session_state:
            items_mock = []
            # Try parsing barcodes
            barcodes = str(job.get('Barcodes', '')).strip()
            if barcodes and barcodes != 'nan':
                for i, code in enumerate(barcodes.split(',')):
                    if code.strip():
                        items_mock.append({"id": i+1, "name": f"สินค้า #{code.strip()}", "code": code.strip(), "status": "pending"})
            
            # Fallback
            if not items_mock:
                qty = str(job.get('Cargo_Qty', 'สินค้าทั่วไป'))
                items_mock = [{"id": 1, "name": f"รายการ: {qty}", "code": "", "status": "pending"}]
            
            st.session_state.job_items = items_mock
            st.session_state.job_items_job_id = job['Job_ID']

        # Render Items
        all_pass = True
        items = st.session_state.job_items
        
        for i, item in enumerate(items):
            c_name, c_act = st.columns([2, 1.5])
            c_name.write(f"**{item['name']}**")
            
            # Action
            status_opts = ["รอตรวจ", "✅ ครบ", "❌ ขาด/เสีย"]
            curr_idx = 1 if item['status'] == 'pass' else (2 if item['status'] == 'fail' else 0)
            
            # Barcode Scan Input
            if item['code']:
                scan = c_name.text_input(f"สแกน ({item['code']})", key=f"sc_{i}", placeholder="ยิงบาร์โค้ด")
                if scan == item['code']: 
                    item['status'] = 'pass'
                    curr_idx = 1
            
            sel = c_act.selectbox("", status_opts, index=curr_idx, key=f"sl_{i}", label_visibility="collapsed")
            
            if sel == "✅ ครบ": item['status'] = 'pass'
            elif sel == "❌ ขาด/เสีย": item['status'] = 'fail'
            else: item['status'] = 'pending'
            
            if item['status'] == 'pending': all_pass = False
            
            # ถ้ามีปัญหา ให้ถ่ายรูป
            if item['status'] == 'fail':
                item['reason'] = st.text_input(f"สาเหตุ #{i}", key=f"rs_{i}")
                item['photo'] = st.camera_input(f"รูปสินค้าเสียหาย #{i}", key=f"cm_{i}")

        st.divider()

        # 4. ปิดงาน (ePOD)
        st.markdown("#### 📸 หลักฐานการส่ง (ePOD)")
        
        # Camera
        if "epod_imgs" not in st.session_state: st.session_state.epod_imgs = []
        cam = st.camera_input("ถ่ายรูปสินค้าที่ส่งมอบ (รวม)")
        if cam: st.session_state.epod_imgs.append(cam)
        
        # Show taken photos
        if st.session_state.epod_imgs:
            st.write(f"ถ่ายแล้ว {len(st.session_state.epod_imgs)} รูป")
            st.image(st.session_state.epod_imgs, width=100)

        # Signature
        st.write("ลายเซ็นผู้รับสินค้า:")
        # (ใน Streamlit Cloud มือถือ การใช้ camera_input ถ่ายรูปลายเซ็นกระดาษจะเสถียรกว่า canvas)
        sig = st.camera_input("ถ่ายรูปลายเซ็น (บนกระดาษ/บิล)", key="sig_cam")

        # Satisfaction
        st.markdown("---")
        st.markdown("#### ⭐ ความพึงพอใจลูกค้า")
        rating = st.slider("ระดับคะแนน", 1, 5, 5)
        comment = st.text_area("ข้อเสนอแนะ")

        # Submit
        if st.button("🚀 ยืนยันปิดงาน", type="primary", use_container_width=True):
            if not all_pass:
                st.error("กรุณาตรวจสอบสินค้าให้ครบทุกรายการ")
            elif not st.session_state.epod_imgs:
                st.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")
            else:
                with st.spinner("กำลังอัปโหลดข้อมูล..."):
                    # Process Images
                    all_photos = st.session_state.epod_imgs
                    # Add reject photos
                    for it in items:
                        if it.get('photo'): all_photos.append(it['photo'])
                    
                    img_str = process_multiple_images(all_photos)
                    sig_str = compress_image(sig) if sig else "-"
                    
                    # Reason String
                    reasons = [f"{i['name']}:{i.get('reason','')}" for i in items if i['status']=='fail']
                    reason_str = "|".join(reasons) if reasons else ""
                    
                    # Update DB
                    update_job_status(
                        job['Job_ID'], "Completed", get_thai_time_str(),
                        distance_run=float(job.get('Est_Distance_KM', 0)),
                        photo_data=img_str, signature_data=sig_str,
                        rating=rating, comment=comment
                    )
                    
                    if reason_str:
                        simple_update_job_status(job['Job_ID'], "Completed", {"Failed_Reason": reason_str})
                    
                    st.balloons()
                    st.success("ปิดงานเรียบร้อย!")
                    
                    # Cleanup
                    if 'job_items' in st.session_state: del st.session_state.job_items
                    if 'epod_imgs' in st.session_state: del st.session_state.epod_imgs
                    time.sleep(2)
                    st.session_state.page = "list"
                    st.rerun()

def render_my_earnings(driver_id):
    """หน้าแสดงรายได้และประวัติ (New Feature)"""
    st.subheader("💰 รายได้ของฉัน")
    
    # Filter Date
    c1, c2 = st.columns(2)
    start_d = c1.date_input("ตั้งแต่", datetime.now().replace(day=1))
    end_d = c2.date_input("ถึง", datetime.now())
    
    jobs = get_data("Jobs_Main")
    if not jobs.empty:
        # Filter My Jobs
        jobs['Driver_ID'] = jobs['Driver_ID'].astype(str).str.strip()
        jobs['PD_Obj'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        
        mask = (jobs['Driver_ID'] == driver_id) & \
               (jobs['Job_Status'] == 'Completed') & \
               (jobs['PD_Obj'].dt.date >= start_d) & \
               (jobs['PD_Obj'].dt.date <= end_d)
        
        my_earnings = jobs[mask].copy()
        
        if not my_earnings.empty:
            # Calculate Totals
            my_earnings['Cost_Val'] = pd.to_numeric(my_earnings['Cost_Driver_Total'].astype(str).str.replace(',',''), errors='coerce').fillna(0)
            
            total_income = my_earnings['Cost_Val'].sum()
            paid_income = my_earnings[my_earnings['Payment_Status']=='Paid']['Cost_Val'].sum()
            pending_income = total_income - paid_income
            
            # Summary Cards
            c_tot, c_pd, c_pen = st.columns(3)
            c_tot.metric("ยอดรวม", f"{total_income:,.0f} บ.")
            c_pd.metric("รับเงินแล้ว", f"{paid_income:,.0f} บ.", delta="เข้าบัญชีแล้ว")
            c_pen.metric("รอจ่าย", f"{pending_income:,.0f} บ.", delta_color="inverse")
            
            st.divider()
            
            # Table
            st.markdown("##### 📜 รายการเที่ยววิ่ง")
            for i, row in my_earnings.iterrows():
                with st.expander(f"{row['Plan_Date']} | {row['Route_Name']} ({row['Cost_Val']:,.0f} บ.)"):
                    st.write(f"**เลขงาน:** {row['Job_ID']}")
                    st.write(f"**เส้นทาง:** {row['Origin_Location']} -> {row['Dest_Location']}")
                    
                    # Status & Slip
                    st.markdown("---")
                    if row['Payment_Status'] == 'Paid':
                        st.success(f"✅ โอนแล้วเมื่อ: {row.get('Payment_Date', '-')}")
                        slip_url = str(row.get('Payment_Slip_Url', ''))
                        if len(slip_url) > 10: # Check valid url
                            st.image(slip_url, caption="สลิปโอนเงิน", width=200)
                    else:
                        st.warning("⏳ รอรอบจ่ายเงิน")
        else:
            st.info("ไม่พบประวัติงานในช่วงวันที่เลือก")
    else:
        st.info("ไม่พบข้อมูล")

def render_fuel_record(driver_id):
    """หน้าบันทึกน้ำมัน"""
    st.subheader("⛽ บันทึกการเติมน้ำมัน")
    
    plate = st.session_state.vehicle_plate
    last_odo = get_last_fuel_odometer(plate)
    std_rate = get_consumption_rate_by_driver(driver_id)
    
    st.info(f"รถ: {plate} | เลขไมล์ล่าสุด: {last_odo:,.0f}")
    
    with st.form("driver_fuel"):
        c1, c2 = st.columns(2)
        f_odo = c1.number_input("เลขไมล์ปัจจุบัน", min_value=int(last_odo), step=1)
        f_liters = c2.number_input("จำนวนลิตร", min_value=0.0, step=0.1)
        
        c3, c4 = st.columns(2)
        f_price = c3.number_input("ยอดเงิน (บาท)", min_value=0.0, step=10.0)
        f_station = c4.text_input("ปั๊มน้ำมัน", "ปตท.")
        
        img = st.camera_input("ถ่ายรูปสลิป + หน้าปัดไมล์")
        
        if st.form_submit_button("บันทึกข้อมูล", type="primary"):
            if f_odo <= last_odo and last_odo > 0:
                st.warning("⚠️ เลขไมล์ต้องมากกว่าครั้งล่าสุด")
            elif f_liters <= 0:
                st.warning("⚠️ จำนวนลิตรต้องมากกว่า 0")
            else:
                img_str = compress_image(img) if img else "-"
                log_data = {
                    "Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}",
                    "Date_Time": get_thai_time_str(),
                    "Driver_ID": driver_id,
                    "Vehicle_Plate": plate,
                    "Odometer": f_odo,
                    "Liters": f_liters,
                    "Price_Total": f_price,
                    "Station_Name": f_station,
                    "Photo_Url": img_str
                }
                create_fuel_log(log_data)
                st.success("บันทึกสำเร็จ!")
                time.sleep(2)
                st.rerun()

def render_maintenance(driver_id):
    """หน้าแจ้งซ่อม"""
    st.subheader("🔧 แจ้งซ่อม / ปัญหาการใช้งาน")
    
    # Show Active Tickets
    tickets = get_data("Repair_Tickets")
    if not tickets.empty:
        my_tk = tickets[(tickets['Vehicle_Plate'] == st.session_state.vehicle_plate) & (tickets['Status'] != 'เสร็จสิ้น')]
        if not my_tk.empty:
            st.info(f"มีรายการแจ้งซ่อมค้างอยู่ {len(my_tk)} รายการ")
            for _, tk in my_tk.iterrows():
                st.caption(f"📅 {tk['Date_Report']} | อาการ: {tk['Issue_Type']} | สถานะ: {tk['Status']}")
            st.divider()

    with st.form("driver_repair"):
        issue = st.selectbox("หมวดหมู่ปัญหา", ["เครื่องยนต์ผิดปกติ", "ยาง/ช่วงล่าง", "ระบบไฟ/แอร์", "อุบัติเหตุ", "ถึงรอบถ่ายน้ำมันเครื่อง", "อื่นๆ"])
        urgency = st.radio("ความเร่งด่วน", ["ปกติ (ขับต่อได้)", "ด่วน (ต้องระวัง)", "ฉุกเฉิน (รถวิ่งไม่ได้)"])
        desc = st.text_area("รายละเอียดอาการ")
        img = st.camera_input("ถ่ายรูปจุดที่มีปัญหา")
        
        if st.form_submit_button("ส่งแจ้งซ่อม"):
            img_str = compress_image(img) if img else "-"
            ticket = {
                "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}",
                "Date_Report": get_thai_time_str(),
                "Driver_ID": driver_id,
                "Vehicle_Plate": st.session_state.vehicle_plate,
                "Issue_Type": issue,
                "Priority": urgency,
                "Description": desc,
                "Photo_Url": img_str,
                "Status": "รอดำเนินการ"
            }
            create_repair_ticket(ticket)
            st.success("ส่งเรื่องแจ้งซ่อมแล้ว! ช่างจะตรวจสอบและอนุมัติในระบบ")
            time.sleep(2)
            st.rerun()