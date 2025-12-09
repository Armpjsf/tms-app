# modules/ui_driver.py

import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timedelta
import time
import logging
from streamlit_js_eval import get_geolocation # type: ignore
import urllib.parse
from typing import Dict, Any, Optional, List, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    logger.error(f"Error importing modules: {e}")
    st.error(f"System Error: {e}")
    # Stop execution if utils cannot be imported
    st.stop()

@st.cache_data(ttl=300, show_spinner="กำลังโหลดข้อมูล...")
def load_driver_data(driver_id: str) -> Dict[str, Any]:
    """โหลดข้อมูลที่จำเป็นสำหรับหน้าจอคนขับ"""
    try:
        df_jobs = get_data("Jobs_Main")
        my_jobs = df_jobs[df_jobs['Driver_ID'] == str(driver_id)] if not df_jobs.empty else pd.DataFrame()
        
        maint_df = get_maintenance_status_all()
        my_alerts = maint_df[(maint_df['Vehicle_Plate'] == str(st.session_state.get('vehicle_plate', ''))) & 
                            (maint_df['Is_Due'] == True)] if not maint_df.empty else pd.DataFrame()
        
        last_odo = get_last_fuel_odometer(st.session_state.get('vehicle_plate', ''))
        
        return {
            'jobs': my_jobs,
            'alerts': my_alerts,
            'last_odometer': last_odo if not pd.isna(last_odo) else 0.0
        }
    except Exception as e:
        logger.error(f"Error loading driver data: {e}")
        return {'jobs': pd.DataFrame(), 'alerts': pd.DataFrame(), 'last_odometer': 0.0}

def driver_flow():
    """หน้าจอหลักสำหรับคนขับ"""
    try:
        if not hasattr(st.session_state, 'driver_id') or not st.session_state.get('logged_in'):
            st.error("กรุณาล็อกอินใหม่")
            st.session_state.logged_in = False
            if hasattr(st, "rerun"): st.rerun()
            else: st.experimental_rerun()
            return
        
        # Sidebar
        with st.sidebar:
            st.title(f"สวัสดี, {st.session_state.driver_name}")
            st.caption(f"รถทะเบียน: {st.session_state.vehicle_plate}")
            
            c1, c2 = st.columns([1, 1])
            with c1: st.write("📍")
            with c2:
                loc = get_geolocation()
                if loc and st.button("เช็คอิน"):
                    with st.spinner(".."):
                        update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
                        st.toast("ส่งพิกัดแล้ว")
            
            st.divider()
            if st.button("ออกจากระบบ", type="secondary"):
                st.session_state.logged_in = False
                if hasattr(st, "rerun"): st.rerun()
                else: st.experimental_rerun()

        menu = st.radio("เลือกรายการ:", ["📦 งานของฉัน", "🕒 ประวัติงาน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
        st.write("---")
        
    except Exception as e:
        st.error("เกิดข้อผิดพลาดในการโหลดหน้าจอ")
        st.stop()
        
    if "page" not in st.session_state: st.session_state.page = "list"
    
    # --- 1. งานของฉัน ---
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Driver_ID'] = df['Driver_ID'].astype(str).str.strip()
                df['Job_Status'] = df['Job_Status'].fillna('Pending').astype(str).str.strip()
                current_driver = str(st.session_state.driver_id).strip()

                my_jobs = df[(df['Driver_ID'] == current_driver) & (~df['Job_Status'].isin(['Completed', 'CANCELLED', 'DELIVERED']))]

                if my_jobs.empty:
                    st.info("🎉 ไม่มีงานค้างในขณะนี้")
                else:
                    st.markdown(f"**งานค้าง ({len(my_jobs)})**")
                    for i, job in my_jobs.iterrows():
                        with st.container(): # border=True removed for compatibility if older streamlit
                            st.markdown(f"### 🚚 {job.get('Route_Name', 'งานขนส่ง')}")
                            
                            c1, c2 = st.columns(2)
                            with c1:
                                st.caption("ต้นทาง")
                                st.write(f"🏠 {job.get('Origin_Location', '-')}")
                            with c2:
                                st.caption("ปลายทาง")
                                st.write(f"🏁 {job.get('Dest_Location', '-')}")
                                
                            c3, c4 = st.columns(2)
                            with c3:
                                st.caption("สินค้า")
                                st.info(f"{job.get('Cargo_Qty', '-')}")
                            with c4:
                                st.caption("กำหนดส่ง")
                                st.write(f"📅 {job.get('Plan_Date', '-')}")

                            c_btn1, c_btn2 = st.columns([3, 1])
                            with c_btn1:
                                status_th = get_status_label_th(job.get('Job_Status', ''))
                                st.markdown(f"สถานะ: **{status_th}**")
                            with c_btn2:
                                if st.button("เริ่ม >", key=f"btn_{job['Job_ID']}", type="primary"):
                                    st.session_state.current_job = job.to_dict()
                                    st.session_state.page = "action"
                                    st.rerun()
                            st.divider()
            else:
                st.info("ยังไม่มีข้อมูลในระบบ")

        elif st.session_state.page == "action":
            job = st.session_state.current_job
            
            if st.button("⬅️ กลับ"):
                st.session_state.page = "list"
                st.rerun()
            
            st.markdown(f"## 📦 งาน: {job['Job_ID']}")
            
            st.markdown("#### 📋 ข้อมูลงาน")
            st.write(f"**ลูกค้า:** {job.get('Customer_Name', '-')}")
            st.write(f"**สินค้า:** {job.get('Cargo_Qty', '-')}")
            
            dist = job.get('Est_Distance_KM', 0)
            try: dist_val = float(dist)
            except: dist_val = 0
            st.write(f"**ระยะทาง:** {dist_val:,.0f} กม.")
            
            driver_cost = job.get('Cost_Driver_Total', 0)
            try: cost_val = float(driver_cost)
            except: cost_val = 0
            if cost_val > 0:
                st.success(f"💰 **ค่าเที่ยว:** {cost_val:,.0f} บาท")

            org = urllib.parse.quote(str(job.get('Origin_Location', '')))
            dst = urllib.parse.quote(str(job.get('Dest_Location', '')))
            url = f"https://www.google.com/maps/dir/?api=1&origin={org}&destination={dst}&travelmode=driving"
            if job.get('GoogleMap_Link') and str(job['GoogleMap_Link']) != 'nan':
                url = job['GoogleMap_Link']
            
            st.link_button("🗺️ นำทาง (Google Maps)", url, type="primary", use_container_width=True)
            
            st.markdown("---")
            st.markdown("#### 🔄 อัปเดตสถานะ")
            
            c_s1, c_s2, c_s3 = st.columns(3)
            now = get_thai_time_str()
            
            with c_s1: 
                if st.button("1. รับของ", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now})
                    st.toast(f"รับของ: {now}")
                    time.sleep(1)
                    st.rerun()
            with c_s2:
                if st.button("2. ออกเดินทาง", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None)
                    st.toast("กำลังเดินทาง")
            with c_s3:
                if st.button("3. ถึงแล้ว", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now})
                    st.toast(f"ถึงแล้ว: {now}")
                    time.sleep(1)
                    st.rerun()

            st.markdown("---")
            st.markdown("#### 📸 ปิดงาน (ePOD)")

            u1 = st.file_uploader("รูปสินค้า", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="epod_up")

            if "epod_cam_images" not in st.session_state: st.session_state.epod_cam_images = []
            c1 = st.camera_input("ถ่ายรูป", key="epod_cam")
            if c1: st.session_state.epod_cam_images.append(c1)

            all_imgs = []
            if u1: all_imgs.extend(u1)
            if st.session_state.epod_cam_images: all_imgs.extend(st.session_state.epod_cam_images)

            if all_imgs: st.success(f"✅ มีรูปแล้ว {len(all_imgs)} รูป")
            
            sig = st.camera_input("ลายเซ็น", key="sig_cam")

            if st.button("✅ ยืนยันปิดงาน", type="primary", use_container_width=True):
                if all_imgs:
                    with st.spinner("กำลังบันทึกข้อมูล..."):
                        img_str = process_multiple_images(all_images) # type: ignore
                        sig_str = compress_image(sig) if sig else "-"
                        dist = float(job.get('Est_Distance_KM', 0))
                        
                        # อัปเดตสถานะ
                        update_job_status(job['Job_ID'], "Completed", get_thai_time_str(), dist, img_str, sig_str)
                        
                        st.success("🎉 ปิดงานสำเร็จ!")
                        
                        # --- แก้ไขตรงนี้: ล้าง Cache ---
                        load_driver_data.clear() 
                        # ---------------------------
                        
                        time.sleep(2)
                        st.session_state.page = "list"
                        st.rerun()
                else:
                    st.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")

    # --- 2. ประวัติงาน ---
    elif menu == "🕒 ประวัติงาน":
        st.subheader("📜 ประวัติการวิ่งงาน")
        
        c1, c2 = st.columns(2)
        start_d = st.date_input("ตั้งแต่", datetime.now().replace(day=1))
        end_d = st.date_input("ถึง", datetime.now())
        
        df = get_data("Jobs_Main")
        if not df.empty:
            df['Driver_ID'] = df['Driver_ID'].astype(str).str.strip()
            my_hist = df[
                (df['Driver_ID'] == str(st.session_state.driver_id)) & 
                (df['Job_Status'].isin(['Completed', 'DELIVERED']))
            ].copy()
            
            if 'Plan_Date' in my_hist.columns:
                my_hist['PD_Obj'] = my_hist['Plan_Date'].apply(parse_flexible_date)
                my_hist = my_hist[
                    (my_hist['PD_Obj'].dt.date >= start_d) & 
                    (my_hist['PD_Obj'].dt.date <= end_d)
                ]
            
            # --- เริ่มต้นส่วนแสดงประวัติงาน (ฉบับแก้ไขสมบูรณ์) ---
        st.subheader("📅 ประวัติงานย้อนหลัง")

        # 1. สร้างตัวเลือกวันที่ (ตั้งค่าเริ่มต้นย้อนหลัง 7 วัน เพื่อให้เห็นงานเก่าด้วย)
        c_date1, c_date2 = st.columns(2)
        with c_date1:
            # ใช้ timedelta เพื่อย้อนหลัง 7 วัน
            start_d = st.date_input("ตั้งแต่วันที่", datetime.now() - timedelta(days=7))
        with c_date2:
            end_d = st.date_input("ถึงวันที่", datetime.now())

        # 2. ดึงข้อมูลและกรองเฉพาะคนขับปัจจุบัน
        df_all = get_data("Jobs_Main")
        
        # ตรวจสอบว่ามีข้อมูลและมีคอลัมน์ Driver_ID หรือไม่
        if not df_all.empty and 'Driver_ID' in df_all.columns:
            # กรองเอาเฉพาะงานของคนขับที่ล็อกอินอยู่
            current_driver = str(st.session_state.driver_id).strip()
            # แปลง Driver_ID ในตารางเป็น string เพื่อความชัวร์ในการเปรียบเทียบ
            df_all['Driver_ID'] = df_all['Driver_ID'].astype(str).str.strip()
            my_hist = df_all[df_all['Driver_ID'] == current_driver].copy()
        else:
            my_hist = pd.DataFrame()

        # 3. ประมวลผลวันที่และแสดงผล
        if not my_hist.empty and 'Plan_Date' in my_hist.columns:
            try:
                # แปลงคอลัมน์ Plan_Date ให้เป็นวันที่ (datetime)
                my_hist['PD_Obj'] = pd.to_datetime(my_hist['Plan_Date'], dayfirst=True, errors='coerce')
                
                # ลบรายการที่วันที่ไม่สมบูรณ์
                my_hist = my_hist.dropna(subset=['PD_Obj'])
                
                # กรองข้อมูลตามช่วงวันที่ที่เลือก
                mask = (my_hist['PD_Obj'].dt.date >= start_d) & \
                       (my_hist['PD_Obj'].dt.date <= end_d)
                
                my_hist_filtered = my_hist[mask]

                if not my_hist_filtered.empty:
                    # เลือกแสดงเฉพาะคอลัมน์ที่จำเป็น
                    cols_to_show = ['Job_ID', 'Route_Name', 'Job_Status', 'Plan_Date']
                    # ตรวจสอบว่าคอลัมน์มีอยู่จริงก่อนเลือกมาแสดง
                    cols_exists = [c for c in cols_to_show if c in my_hist_filtered.columns]
                    
                    st.info(f"พบงานจำนวน: {len(my_hist_filtered)} รายการ")
                    st.dataframe(my_hist_filtered[cols_exists], use_container_width=True)
                else:
                    st.warning(f"ไม่พบงานในช่วงวันที่ {start_d} ถึง {end_d}")

            except Exception as e:
                st.error(f"เกิดข้อผิดพลาด: {e}")
        else:
            st.info("ยังไม่มีประวัติงานในระบบ")
            
        # ปุ่มรีเฟรชข้อมูล (เผื่อข้อมูลยังไม่มา)
        if st.button("🔄 รีเฟรชประวัติงาน"):
            st.cache_data.clear()
            st.rerun()
        # --- จบโค้ดส่วนแก้ไข ---

    # --- 3. เติมน้ำมัน ---
    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("⛽ บันทึกการเติมน้ำมัน")
        
        plate = st.session_state.vehicle_plate
        last_odo = get_last_fuel_odometer(plate)
        if pd.isna(last_odo): last_odo = 0.0
        
        std_rate = get_consumption_rate_by_driver(st.session_state.driver_id)
        act_rate, _, _ = calculate_actual_consumption(plate)
        
        c1, c2 = st.columns(2)
        c1.metric("เกณฑ์มาตรฐาน", f"{std_rate:.1f} กม./ลิตร")
        c2.metric("ทำได้จริง (เฉลี่ย)", f"{act_rate:.2f} กม./ลิตร")

        with st.form("fuel_form"):
            st.info(f"🔢 เลขไมล์ล่าสุดในระบบ: {last_odo:,.0f}")
            f_station = st.text_input("ชื่อปั๊มน้ำมัน", "ปตท.")
            f_odo = st.number_input("เลขไมล์ปัจจุบัน", min_value=int(last_odo))
            
            # --- แก้ไข Logic การคำนวณตรงนี้ ---
            # ใช้ Standard Rate ในการแนะนำ เพื่อป้องกันข้อมูลประวัติที่ผิดพลาด (เช่น 900 ลิตร) ทำให้ตัวเลขเพี้ยน
            calc_rate = std_rate if std_rate > 0 else 10.0
            
            dist_run = f_odo - last_odo
            suggest_liters = dist_run / calc_rate if dist_run > 0 else 0
            
            if dist_run > 0:
                st.success(f"💡 วิ่งมา: {dist_run:,.0f} กม. | ⛽ ควรเติม: {suggest_liters:.1f} ลิตร (โดยประมาณ)")
            
            f_liters = st.number_input("จำนวนลิตร", 0.0)
            f_price = st.number_input("จำนวนเงิน (บาท)", 0.0)
            uploaded = st.file_uploader("รูปสลิป/หน้าปัด", accept_multiple_files=True)
            
            if st.form_submit_button("บันทึกข้อมูล"):
                if f_odo <= last_odo and last_odo > 0:
                    st.error("เลขไมล์ต้องมากกว่าครั้งก่อน")
                elif f_liters <= 0 or f_price <= 0:
                    st.error("กรุณากรอกข้อมูลให้ครบ")
                else:
                    img_str = process_multiple_images(uploaded) if uploaded else "-"
                    log_id = f"FUEL-{datetime.now().strftime('%y%m%d%H%M%S')}"
                    data = {
                        "Log_ID": log_id,
                        "Date_Time": get_thai_time_str(),
                        "Driver_ID": st.session_state.driver_id,
                        "Vehicle_Plate": plate,
                        "Odometer": f_odo,
                        "Liters": f_liters,
                        "Price_Total": f_price,
                        "Station_Name": f_station,
                        "Photo_Url": img_str
                    }
                    if create_fuel_log(data):
                        st.success("บันทึกสำเร็จ!")
                        load_driver_data.clear()
                        time.sleep(1.5)
                        st.session_state.page = "list" # กลับหน้าแรก
                        st.rerun()

    # --- 4. แจ้งซ่อม ---
    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("🔧 แจ้งซ่อม / บำรุงรักษา")
        
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            my_alerts = maint_df[
                (maint_df['Vehicle_Plate'] == str(st.session_state.vehicle_plate)) & 
                (maint_df['Is_Due'] == True)
            ]
            if not my_alerts.empty:
                st.error(f"⚠️ มีรายการต้องบำรุงรักษา {len(my_alerts)} รายการ")
                for _, row in my_alerts.iterrows():
                    st.write(f"- {row['Service_Type']} ({row['Note']})")
                st.divider()

        with st.form("repair_form"):
            issue = st.selectbox("หมวดหมู่", ["เครื่องยนต์", "ยาง/ล้อ", "ช่วงล่าง", "ระบบไฟ", "อุบัติเหตุ", "อื่นๆ"])
            priority = st.selectbox("ความเร่งด่วน", ["ปกติ", "ด่วน", "ฉุกเฉิน (รถวิ่งไม่ได้)"])
            desc = st.text_area("รายละเอียดปัญหา")
            imgs = st.file_uploader("รูปภาพประกอบ", accept_multiple_files=True)
            
            if st.form_submit_button("ส่งแจ้งซ่อม"):
                if not desc:
                    st.error("กรุณาระบุรายละเอียด")
                else:
                    img_str = process_multiple_images(imgs) if imgs else "-"
                    ticket = {
                        "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M%S')}",
                        "Date_Report": get_thai_time_str(),
                        "Driver_ID": st.session_state.driver_id,
                        "Vehicle_Plate": st.session_state.vehicle_plate,
                        "Issue_Type": issue,
                        "Priority": priority,
                        "Description": desc,
                        "Photo_Url": img_str,
                        "Status": "รอดำเนินการ"
                    }
                    if create_repair_ticket(ticket):
                        st.success("ส่งเรื่องแล้ว")
                        time.sleep(2)
                        st.rerun()