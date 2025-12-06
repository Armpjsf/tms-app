import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
from streamlit_js_eval import get_geolocation # type: ignore
import urllib.parse

from modules.database import get_data
from modules.utils import (
    get_thai_time_str, get_consumption_rate_by_driver, get_last_fuel_odometer, 
    calculate_actual_consumption, compress_image, process_multiple_images,
    update_driver_location, simple_update_job_status, update_job_status,
    create_fuel_log, create_repair_ticket, get_maintenance_status_all, get_status_label_th
)

def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱")
        st.info(f"คุณ: {st.session_state.driver_name}")
        
        with st.expander("❓ วิธีใช้งาน"):
            st.markdown("""
            1. **เช็คอิน:** กดปุ่ม 📍 เมื่อถึงจุดสำคัญ
            2. **งาน:** กด 'ส่งของ >' เพื่อเริ่มงาน
            3. **ปิดงาน:** ต้องถ่ายรูปของ + ลายเซ็น
            4. **เติมน้ำมัน:** ใส่เลขไมล์ > ระบบจะบอกยอดที่ควรเติม
            """)
            
        if st.button("🚪 Logout", key="drv_out"):
            st.session_state.logged_in = False
            # ✅ แก้ไข 1: ใช้ st.rerun()
            st.rerun()

    if 'page' not in st.session_state: st.session_state.page = "list"
    
    # --- GPS Check-in ---
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("เมนูหลัก")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📍 เช็คอิน"):
            with st.spinner("Sending..."):
                update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
                st.toast("ส่งพิกัดเรียบร้อย")

    menu = st.radio("เลือกรายการ:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
    st.write("---")
    
    # --- 1. งานของฉัน ---
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
                                    # ✅ แก้ไข 2: ใช้ st.rerun() (จุดที่ Error)
                                    st.rerun()
                            
                            # ปุ่มนำทาง (แก้ Link Format ให้แล้ว)
                            org = urllib.parse.quote(str(job.get('Origin_Location', '')))
                            dst = urllib.parse.quote(str(job.get('Dest_Location', '')))
                            url = f"https://www.google.com/maps/dir/?api=1&origin={org}&destination={dst}"
                            
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
                # ✅ แก้ไข 3: ใช้ st.rerun()
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
                        # ✅ แก้ไข 4: ใช้ st.rerun()
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
        
        fraud_warning = False
        if dist_run > 0 and f_liters > 0:
            current_km_l = dist_run / f_liters
            if current_km_l < (std_rate * 0.5) or current_km_l > (std_rate * 1.5):
                fraud_warning = True
                st.warning(f"⚠️ แจ้งเตือนความผิดปกติ: อัตรากินน้ำมันรอบนี้คือ {current_km_l:.1f} กม./ลิตร (ปกติ {std_rate}) กรุณาถ่ายรูปให้ชัดเจน")
        
        st.markdown("**หลักฐาน**")
        u2 = st.file_uploader("📂 รูปสลิป/ไมล์", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="fuel_up")
        c2 = st.camera_input("📸 ถ่ายรูปสลิป", key="fuel_cam")
        
        fuel_imgs = []
        if u2: fuel_imgs.extend(u2)
        if c2: fuel_imgs.append(c2)

        if st.button("บันทึกข้อมูล", type="primary", use_container_width=True, disabled=is_odo_error):
            if f_price > 0 and f_liters > 0:
                if not fuel_imgs:
                    st.error("กรุณาถ่ายรูปสลิป")
                else:
                    with st.spinner("บันทึก..."):
                        img_str = process_multiple_images(fuel_imgs)
                        fuel_data = {
                            "Log_ID": f"F-{datetime.now().strftime('%y%m%d%H%M')}",
                            "Date_Time": get_thai_time_str(),
                            "Driver_ID": st.session_state.driver_id,
                            "Vehicle_Plate": plate,
                            "Odometer": f_odo,
                            "Liters": f_liters,
                            "Price_Total": f_price,
                            "Station_Name": f_station,
                            "Photo_Url": img_str
                        }
                        if create_fuel_log(fuel_data):
                            st.success("บันทึกสำเร็จ!")
                            time.sleep(1)
                            # ✅ แก้ไข 5: ใช้ st.rerun()
                            st.rerun()
            else:
                st.error("กรุณากรอกข้อมูลให้ครบ")

    # --- 3. แจ้งซ่อม ---
    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("แจ้งซ่อม/อุบัติเหตุ")
        
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            my_alerts = maint_df[(maint_df['Vehicle_Plate'] == str(st.session_state.vehicle_plate)) & (maint_df['Is_Due'] == True)]
            if not my_alerts.empty:
                st.error("⚠️ รถถึงรอบเช็คระยะแล้ว (แจ้งหัวหน้าด่วน)")
                for _, r in my_alerts.iterrows():
                    st.write(f"- {r['Service_Type']}")
        
        with st.form("repair_form"):
            issue = st.selectbox("หมวดหมู่", ["เครื่องยนต์", "ยาง", "ช่วงล่าง", "อุบัติเหตุ", "อื่นๆ"])
            desc = st.text_area("รายละเอียดอาการ")
            
            u3 = st.file_uploader("รูปอาการเสีย", accept_multiple_files=True, key="rep_up")
            c3 = st.camera_input("ถ่ายรูป", key="rep_cam")
            
            if st.form_submit_button("ส่งเรื่องแจ้งซ่อม", type="primary", use_container_width=True):
                rep_imgs = []
                if u3: rep_imgs.extend(u3)
                if c3: rep_imgs.append(c3)
                
                if not rep_imgs:
                    st.error("กรุณาถ่ายรูปอาการเสีย")
                else:
                    img_str = process_multiple_images(rep_imgs)
                    ticket_data = {
                        "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}",
                        "Date_Report": get_thai_time_str(),
                        "Driver_ID": st.session_state.driver_id,
                        "Description": desc,
                        "Status": "Pending",
                        "Issue_Type": issue,
                        "Vehicle_Plate": st.session_state.vehicle_plate,
                        "Photo_Url": img_str
                    }
                    if create_repair_ticket(ticket_data):
                        st.success("ส่งเรื่องแล้ว! รออนุมัติ")