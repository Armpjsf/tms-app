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
    from modules.database import get_data, cache
    from modules.utils import (
        get_thai_time_str, get_consumption_rate_by_driver, get_last_fuel_odometer, 
        calculate_actual_consumption, compress_image, process_multiple_images,
        update_driver_location, simple_update_job_status, update_job_status,
        create_fuel_log, create_repair_ticket, get_maintenance_status_all, 
        get_status_label_th
    )
except ImportError as e:
    logger.error(f"Error importing modules: {e}")
    raise

@st.cache_data(ttl=300, show_spinner="กำลังโหลดข้อมูล...")
def load_driver_data(driver_id: str) -> Dict[str, Any]:
    """โหลดข้อมูลที่จำเป็นสำหรับหน้าจอคนขับ"""
    try:
        # ข้อมูลงาน
        df_jobs = get_data("Jobs_Main")
        my_jobs = df_jobs[(df_jobs['Driver_ID'] == str(driver_id)) & 
                         (df_jobs['Job_Status'] != 'Completed')] if not df_jobs.empty else pd.DataFrame()
        
        # ข้อมูลการบำรุงรักษา
        maint_df = get_maintenance_status_all()
        my_alerts = maint_df[(maint_df['Vehicle_Plate'] == str(st.session_state.get('vehicle_plate', ''))) & 
                            (maint_df['Is_Due'] == True)] if not maint_df.empty else pd.DataFrame()
        
        # ข้อมูลน้ำมันล่าสุด
        last_odo = get_last_fuel_odometer(st.session_state.get('vehicle_plate', ''))
        
        return {
            'jobs': my_jobs,
            'alerts': my_alerts,
            'last_odometer': last_odo if not pd.isna(last_odo) else 0.0
        }
    except Exception as e:
        logger.error(f"Error loading driver data: {e}")
        return {'jobs': pd.DataFrame(), 'alerts': pd.DataFrame(), 'last_odometer': 0.0}

def show_loading_overlay(message: str = "กำลังโหลด..."):
    """แสดง overlay ขณะโหลดข้อมูล"""
    return st.spinner(message)

def show_error(message: str, error: Optional[Exception] = None):
    """แสดงข้อความผิดพลาด"""
    if error:
        logger.error(f"{message}: {str(error)}", exc_info=True)
    st.error(message)
    st.stop()

def driver_flow():
    """หน้าจอหลักสำหรับคนขับ"""
    # ตรวจสอบ session state
    try:
        # ตรวจสอบ session state
        if not hasattr(st.session_state, 'driver_id') or not st.session_state.get('logged_in'):
            st.error("กรุณาล็อกอินใหม่")
            st.session_state.logged_in = False
            st.rerun()
            return
        
        # Sidebar
        with st.sidebar:
            st.title("Driver App ")
            c1, c2 = st.columns([1, 1])
            with c1: 
                st.subheader("เมนูหลัก")
            with c2:
                loc = get_geolocation()
                if loc and st.button("📍 เช็คอิน"):
                    with st.spinner("Sending..."):
                        update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
                        st.toast("ส่งพิกัดเรียบร้อย")

        menu = st.radio("เลือกรายการ:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
        st.write("---")
        
    except Exception as e:
        logger.error(f"Error in driver_flow: {str(e)}")
        st.error("เกิดข้อผิดพลาดในการโหลดหน้าจอ")
        st.stop()
        
    # ตั้งค่า default ให้ session_state.page ถ้ายังไม่มี เพื่อกัน AttributeError
    if "page" not in st.session_state:
        st.session_state.page = "list"
    
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Job_Status'] = df['Job_Status'].fillna('Pending')
                # กรองงาน: ของคนนี้ AND ยังไม่เสร็จ
                my_jobs = df[(df['Driver_ID'] == str(st.session_state.driver_id)) & (df['Job_Status'] != 'Completed')]
                
                if my_jobs.empty:
                    st.info("🎉 ไม่มีงานค้างครับ")
                else:
                    for i, job in my_jobs.iterrows():
                        with st.container(border=True):
                            c_j1, c_j2 = st.columns([3, 1])
                            with c_j1:
                                st.markdown(f"**{job.get('Route_Name', 'งานทั่วไป')}**")
                                st.caption(f"📍 ส่ง: {job.get('Dest_Location', '-')}")
                            with c_j2:
                                if st.button("ทำ >", key=f"btn_{job['Job_ID']}"):
                                    st.session_state.current_job = job.to_dict()
                                    st.session_state.page = "action"
                                    # ✅ แก้ไขจุดที่ 2 (จุดที่ Error): เปลี่ยนเป็น st.rerun()
                                    st.rerun()
                            
                            # ปุ่มนำทาง (แก้ Link Format ให้แล้ว)
                            org = urllib.parse.quote(str(job.get('Origin_Location', '')))
                            dst = urllib.parse.quote(str(job.get('Dest_Location', '')))
                            url = f"https://www.google.com/maps/dir/?api=1&origin={org}&destination={dst}&travelmode=driving"  # type: ignore
                            
                            if job.get('GoogleMap_Link') and str(job['GoogleMap_Link']) != 'nan':
                                url = job['GoogleMap_Link']
                            st.link_button("🗺️ นำทาง", url, use_container_width=True)
            else:
                st.warning("ไม่พบข้อมูลงาน")

        elif st.session_state.page == "action":
            job = st.session_state.current_job
            
            # Header
            if st.button("⬅️ กลับหน้ารายการ"):
                st.session_state.page = "list"
                # ✅ แก้ไขจุดที่ 3: เปลี่ยนเป็น st.rerun()
                st.rerun()
            
            st.markdown(f"#### 📦 Job: {job['Job_ID']}")
            st.info(f"ลูกค้า: {job.get('Customer_Name', '-')}")
            st.write(f"📍 **ปลายทาง:** {job.get('Dest_Location', '-')}")
            
            # Status Update Buttons
            st.write("---")
            st.write("🛠 **อัปเดตสถานะ**")
            c_s1, c_s2, c_s3 = st.columns(3)
            now = get_thai_time_str()
            
            with c_s1: 
                if st.button("📦 รับของ", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now})
                    st.toast("สถานะ: รับของแล้ว")
            with c_s2:
                if st.button("🚚 ออกเดินทาง", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None)
                    st.toast("สถานะ: กำลังเดินทาง")
            with c_s3:
                if st.button("🏁 ถึงแล้ว", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now})
                    st.toast("สถานะ: ถึงปลายทาง")
            
            fail_reason = st.text_input("หมายเหตุ/เหตุผล (ถ้าส่งไม่ได้)")
            if st.button("❌ ส่งไม่สำเร็จ", type="secondary", use_container_width=True):
                if fail_reason:
                    simple_update_job_status(job['Job_ID'], "FAILED", {"Failed_Reason": fail_reason, "Failed_Time": now})
                    st.error("บันทึกสถานะส่งไม่สำเร็จ")
                else:
                    st.error("กรุณาระบุเหตุผล")

            # ePOD Section
            st.write("---")
            st.write("📸 **หลักฐานการส่ง (ePOD)**")
            
            u1 = st.file_uploader("📂 เลือกรูปสินค้า (ได้หลายรูป)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="epod_up")
            c1 = st.camera_input("📸 หรือถ่ายรูปเดี๋ยวนี้", key="epod_cam")
            
            all_imgs = []
            if u1: all_imgs.extend(u1)
            if c1: all_imgs.append(c1)
            
            if all_imgs: st.caption(f"✅ มีรูปแล้ว {len(all_imgs)} รูป")
            
            st.write("✍️ **ลายเซ็นผู้รับ**")
            sig = st.camera_input("ถ่ายลายเซ็น", key="sig_cam")

            if st.button("✅ ยืนยันปิดงาน", type="primary", use_container_width=True):
                if all_imgs:
                    with st.spinner("กำลังบันทึกข้อมูล..."):
                        img_str = process_multiple_images(all_imgs)
                        sig_str = compress_image(sig) if sig else "-"
                        dist = float(job.get('Est_Distance_KM', 0))
                        
                        update_job_status(job['Job_ID'], "Completed", get_thai_time_str(), dist, img_str, sig_str)
                        
                        st.success("🎉 ปิดงานสำเร็จ!")
                        time.sleep(2)
                        st.session_state.page = "list"
                        # ✅ แก้ไขจุดที่ 4: เปลี่ยนเป็น st.rerun()
                        st.rerun()
                else:
                    st.error("กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")

    # --- 2. เติมน้ำมัน ---
    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกการเติมน้ำมัน")
        
        plate = st.session_state.vehicle_plate
        last_odo = get_last_fuel_odometer(plate)
        
        if pd.isna(last_odo): last_odo = 0.0
        
        std_rate = get_consumption_rate_by_driver(st.session_state.driver_id)
        act_rate, _, _ = calculate_actual_consumption(plate)
        
        # Dashboard
        with st.container(border=True):
            c_d1, c_d2 = st.columns(2)
            with c_d1: st.metric("เกณฑ์มาตรฐาน", f"{std_rate:.1f} กม./ลิตร")
            with c_d2: 
                val = f"{act_rate:.2f}" if act_rate > 0 else "-"
                st.metric("ทำได้จริง", f"{val} กม./ลิตร")

        if last_odo > 0: st.info(f"🔢 เลขไมล์ล่าสุดในระบบ: {last_odo:,.0f}")
        else: st.warning("⚠️ ไม่พบประวัติไมล์ (เติมครั้งแรก)")

        f_station = st.text_input("ชื่อปั๊ม/สถานที่")
        
        f_odo = st.number_input("เลขไมล์ปัจจุบัน (ต้องมากกว่าครั้งก่อน)", min_value=0, value=int(last_odo))
        
        is_odo_error = False
        if last_odo > 0 and f_odo < last_odo:
            st.error(f"❌ เลขไมล์ผิดปกติ! (น้อยกว่าครั้งล่าสุด {last_odo:,.0f}) กรุณาตรวจสอบ")
            is_odo_error = True
        
        calc_rate = act_rate if act_rate > 0 else std_rate
        dist_run = f_odo - last_odo
        suggest_liters = dist_run / calc_rate if calc_rate > 0 else 0
        
        if dist_run > 0:
            st.success(f"💡 วิ่งมา: {dist_run} กม. | ⛽ ควรเติม: {suggest_liters:.1f} ลิตร")
        
        f_liters = st.number_input("จำนวนลิตรที่เติม", 0.0)
        f_price = st.number_input("ยอดเงิน (บาท)", 0.0)
    # --- 3. แจ้งซ่อม ---
    elif menu == "🔧 แจ้งซ่อม":
        show_maintenance_section()

def show_maintenance_section():
    """แสดงส่วนแจ้งซ่อมและบำรุงรักษา"""
    st.header("🔧 แจ้งซ่อมและบำรุงรักษา")
    
    # แสดงการแจ้งเตือนการบำรุงรักษา
    with st.container(border=True):
        st.subheader("📋 รายการบำรุงรักษาครั้งถัดไป")
        with st.spinner("กำลังโหลดข้อมูลการบำรุงรักษา..."):
            try:
                maint_df = get_maintenance_status_all()
                if not maint_df.empty:
                    my_alerts = maint_df[
                        (maint_df['Vehicle_Plate'] == str(st.session_state.vehicle_plate)) & 
                        (maint_df['Is_Due'] == True)
                    ]
                    
                    if not my_alerts.empty:
                        st.error("⚠️ **มีรายการบำรุงรักษาค้าง**")
                        for _, alert in my_alerts.iterrows():
                            with st.expander(f"🔴 {alert.get('Service_Type', 'บำรุงรักษา')}", expanded=True):
                                st.markdown(f"""
                                - 🚗 **รถ:** {alert.get('Vehicle_Plate', '')}
                                - 📅 ถึงกำหนด: {alert.get('Next_Service_Date', '')}
                                - 📏 ระยะทาง: {alert.get('Next_Service_Odometer', 0):,.0f} กม.
                                - 📝 {alert.get('Message', '')}
                                """)
                        st.divider()
                    else:
                        st.success("✅ ไม่มีการแจ้งเตือนการบำรุงรักษา")
                else:
                    st.info("ℹ️ ไม่พบข้อมูลการบำรุงรักษา")
            except Exception as e:
                show_error("ไม่สามารถโหลดข้อมูลการบำรุงรักษา", e)
    
    # แบบฟอร์มแจ้งซ่อม
    with st.form("repair_form"):
        st.subheader("📝 แจ้งซ่อม/อุบัติเหตุ")
        
        # ข้อมูลพื้นฐาน
        col1, col2 = st.columns(2)
        with col1:
            issue_type = st.selectbox(
                "ประเภทปัญหา",
                ["เครื่องยนต์", "ระบบไฟฟ้า", "ยางและล้อ", "ช่วงล่าง", 
                 "เบรก", "ระบบแอร์", "ตัวถัง", "อุบัติเหตุ", "อื่นๆ"]
            )
        with col2:
            priority = st.selectbox(
                "ความเร่งด่วน",
                ["ปกติ", "ด่วน", "ฉุกเฉิน"],
                help="เลือกความเร่งด่วนของงานซ่อม"
            )
        
        # รายละเอียดปัญหา
        desc = st.text_area(
            "รายละเอียดอาการ",
            placeholder="อธิบายอาการเสียให้ชัดเจน พร้อมรายละเอียดเพิ่มเติมที่เกี่ยวข้อง...",
            height=100
        )
        
        # อัปโหลดรูปภาพ
        st.markdown("**รูปภาพประกอบ**")
        st.caption("ถ่ายภาพอาการเสียให้ชัดเจน พร้อมแสดงความเสียหาย (สูงสุด 5 ภาพ)")
        
        uploaded_files = st.file_uploader(
            "อัปโหลดรูปภาพ",
            type=['png', 'jpg', 'jpeg'],
            accept_multiple_files=True,
            key="repair_upload"
        )
        
        camera_image = st.camera_input("หรือถ่ายภาพได้ที่นี่", key="repair_camera")
        
        # รวบรวมรูปภาพทั้งหมด
        all_images = list(uploaded_files)
        if camera_image:
            all_images.append(camera_image)
        
        # แสดงตัวอย่างรูปภาพ
        if all_images:
            st.markdown("**ตัวอย่างรูปภาพ**")
            cols = st.columns(min(3, len(all_images)))
            for idx, img in enumerate(all_images[:3]):  # แสดงสูงสุด 3 รูปตัวอย่าง
                with cols[idx % 3]:
                    st.image(img, use_column_width=True)
            if len(all_images) > 3:
                st.info(f"+ อีก {len(all_images) - 3} รูป")
        
        # ปุ่มส่งแบบฟอร์ม
        submitted = st.form_submit_button(
            "📤 ส่งรายการแจ้งซ่อม",
            type="primary",
            use_container_width=True,
            help="ตรวจสอบข้อมูลให้ถูกต้องก่อนกดส่ง"
        )
        
        if submitted:
            if not desc.strip():
                st.error("กรุณาระบุรายละเอียดอาการเสีย")
            elif not all_images:
                st.error("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป")
            else:
                with st.spinner("กำลังส่งข้อมูล..."):
                    try:
                        # ประมวลผลรูปภาพ
                        img_str = process_multiple_images(all_images)
                        
                        # สร้างข้อมูลรายการแจ้งซ่อม
                        ticket_data = {
                            "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M%S')}",
                            "Date_Report": get_thai_time_str(),
                            "Driver_ID": st.session_state.driver_id,
                            "Driver_Name": st.session_state.get('driver_name', ''),
                            "Description": desc,
                            "Status": "รอดำเนินการ",
                            "Priority": priority,
                            "Issue_Type": issue_type,
                            "Vehicle_Plate": st.session_state.vehicle_plate,
                            "Photo_Url": img_str,
                            "Location": "",  # สามารถเพิ่มพิกัดได้ในอนาคต
                            "Assigned_To": "",
                            "Resolution": ""
                        }
                        
                        # บันทึกลงฐานข้อมูล
                        if create_repair_ticket(ticket_data):
                            st.success("✅ ส่งรายการแจ้งซ่อมเรียบร้อยแล้ว!")
                            st.balloons()
                            
                            # รีเซ็ตฟอร์ม
                            st.session_state.repair_form = {
                                'issue_type': 'เครื่องยนต์',
                                'priority': 'ปกติ',
                                'description': '',
                                'images': []
                            }
                            
                            # รีโหลดหน้าเว็บหลังจาก 2 วินาที
                            time.sleep(2)
                            st.rerun()
                        else:
                            st.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง")
                            
                    except Exception as e:
                        show_error("เกิดข้อผิดพลาดในการส่งรายการ", e)
                        logger.exception("Error submitting repair ticket")