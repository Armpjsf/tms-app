import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
from streamlit_js_eval import get_geolocation # type: ignore
import urllib.parse
from modules.database import get_data, update_sheet
from modules.utils import (
    get_thai_time_str, get_consumption_rate_by_driver, get_last_fuel_odometer, 
    calculate_actual_consumption, compress_image, process_multiple_images,
    update_driver_location, simple_update_job_status, update_job_status,
    create_fuel_log, create_repair_ticket, get_maintenance_status_all, get_status_label_th
)

def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱"); st.info(f"คุณ: {st.session_state.driver_name}")
        with st.expander("❓ วิธีใช้งาน"):
            st.markdown("""
            1. **เช็คอิน:** กดปุ่ม 📍 เมื่อถึงจุดสำคัญ
            2. **งาน:** กด 'ส่งของ >' เพื่อเริ่มงาน
            3. **ปิดงาน:** ต้องถ่ายรูปของ + ลายเซ็น
            4. **เติมน้ำมัน:** ใส่เลขไมล์ > ระบบจะบอกยอดที่ควรเติม
            """)
        if st.button("🚪 Logout", key="drv_out"): st.session_state.logged_in = False; st.rerun()

    if 'page' not in st.session_state: st.session_state.page = "list"
    
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("เมนูหลัก")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📍 เช็คอิน"):
            update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
            st.toast("ส่งพิกัดเรียบร้อย")

    menu = st.radio("เลือก:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True); st.write("---")
    
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Job_Status'] = df['Job_Status'].fillna('Pending')
                my = df[(df['Driver_ID'] == str(st.session_state.driver_id)) & (df['Job_Status'] != 'Completed')]
                if not my.empty:
                    for i, j in my.iterrows():
                        with st.container(border=True):
                            st.write(f"**{j['Route_Name']}**"); st.caption(f"ส่ง: {j['Dest_Location']}")
                            url = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(str(j['Origin_Location']))}&destination={urllib.parse.quote(str(j['Dest_Location']))}"
                            if j.get('GoogleMap_Link') and str(j['GoogleMap_Link']) != 'nan': url = j['GoogleMap_Link']
                            st.link_button("🗺️ นำทาง", url)
                            if st.button("ส่งของ >", key=f"j_{j['Job_ID']}"): st.session_state.current_job = j.to_dict(); st.session_state.page = "action"; st.rerun()
                else: st.success("ไม่มีงาน")
        elif st.session_state.page == "action":
            j = st.session_state.current_job
            st.info(f"ลูกค้า: {j['Customer_ID']}"); st.write(f"ส่ง: {j['Dest_Location']}")
            if st.button("< กลับ"): st.session_state.page = "list"; st.rerun()
            
            c1, c2 = st.columns(2)
            now = get_thai_time_str()
            with c1: 
                if st.button("รับของ"): simple_update_job_status(j['Job_ID'], "PICKED_UP", {"Actual_Pickup_Time": now}); st.toast("OK"); st.rerun()
            with c2:
                if st.button("ถึงแล้ว"): simple_update_job_status(j['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now}); st.toast("OK"); st.rerun()
            
            st.write("---"); st.write("📸 **หลักฐาน (ePOD)**")
            u1 = st.file_uploader("เลือกรูป", accept_multiple_files=True, key="ep1")
            c1 = st.camera_input("ถ่ายรูป", key="ep2")
            sig = st.camera_input("ลายเซ็น", key="sig")
            
            if st.button("✅ ปิดงาน", type="primary"):
                imgs = []
                if u1: imgs.extend(u1)
                if c1: imgs.append(c1)
                if imgs:
                    with st.spinner("Saving..."):
                        img_str = process_multiple_images(imgs)
                        sig_str = compress_image(sig) if sig else "-"
                        dist = float(j.get('Est_Distance_KM', 0))
                        update_job_status(j['Job_ID'], "Completed", get_thai_time_str(), dist, img_str, sig_str)
                        st.success("สำเร็จ"); time.sleep(1); st.session_state.page = "list"; st.rerun()
                else: st.error("ถ่ายรูปก่อน")

    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกน้ำมัน")
        pl = st.session_state.vehicle_plate
        last = get_last_fuel_odometer(pl)
        rate = get_consumption_rate_by_driver(st.session_state.driver_id)
        act, _, _ = calculate_actual_consumption(pl)
        
        st.info(f"ไมล์ล่าสุด: {last:,.0f} | เรต: {rate} กม./ลิตร")
        stt = st.text_input("ปั๊ม")
        odo = st.number_input("ไมล์ปัจจุบัน", int(last))
        
        run = odo - last
        rec_rate = act if act > 0 else rate
        if run > 0: st.success(f"วิ่ง: {run} กม. | ควรเติม: {run/rec_rate:.1f} ลิตร")
        
        lit = st.number_input("ลิตร", 0.0); money = st.number_input("บาท", 0.0)
        u2 = st.file_uploader("รูปสลิป", accept_multiple_files=True, key="fl1")
        c2 = st.camera_input("ถ่ายสลิป", key="fl2")
        
        if st.button("บันทึก"):
            imgs = []
            if u2: imgs.extend(u2)
            if c2: imgs.append(c2)
            if money > 0 and imgs:
                img_str = process_multiple_images(imgs)
                create_fuel_log({"Log_ID": f"F-{int(time.time())}", "Date_Time": get_thai_time_str(), "Driver_ID": st.session_state.driver_id, "Vehicle_Plate": pl, "Odometer": odo, "Liters": lit, "Price_Total": money, "Station_Name": stt, "Photo_Url": img_str})
                st.success("Saved"); st.rerun()

    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("แจ้งซ่อม")
        maint = get_maintenance_status_all()
        if not maint.empty:
            my = maint[(maint['Vehicle_Plate']==str(st.session_state.vehicle_plate)) & (maint['Is_Due']==True)]
            if not my.empty: st.error("⚠️ ถึงรอบเช็คระยะแล้ว!"); st.dataframe(my[['Service_Type', 'Status']])
        
        with st.form("rp"):
            issue = st.selectbox("หมวด", ["เครื่องยนต์", "ยาง", "ช่วงล่าง"])
            desc = st.text_area("รายละเอียด")
            u3 = st.file_uploader("รูป", accept_multiple_files=True)
            c3 = st.camera_input("ถ่าย")
            if st.form_submit_button("ส่ง"):
                imgs = []
                if u3: imgs.extend(u3)
                if c3: imgs.append(c3)
                if imgs:
                    img_str = process_multiple_images(imgs)
                    create_repair_ticket({"Ticket_ID": f"TK-{int(time.time())}", "Date_Report": get_thai_time_str(), "Driver_ID": st.session_state.driver_id, "Description": desc, "Status": "Pending", "Issue_Type": issue, "Vehicle_Plate": st.session_state.vehicle_plate, "Photo_Url": img_str})
                    st.success("Sent")