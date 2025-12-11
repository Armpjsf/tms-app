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
    st.stop()

@st.cache_data(ttl=300, show_spinner="กำลังโหลดข้อมูล...")
def load_driver_data(driver_id: str) -> Dict[str, Any]:
    """โหลดข้อมูลที่จำเป็นสำหรับหน้าจอคนขับ"""
    try:
        df_jobs = get_data("Jobs_Main")
        my_jobs = df_jobs[df_jobs['Driver_ID'] == str(driver_id)] if not df_jobs.empty else pd.DataFrame()
        
        maint_df = get_maintenance_status_all()
        plate = st.session_state.get('vehicle_plate', '')
        my_alerts = maint_df[(maint_df['Vehicle_Plate'] == str(plate)) & (maint_df['Is_Due'] == True)] if not maint_df.empty else pd.DataFrame()
        
        last_odo = get_last_fuel_odometer(plate)
        
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
                        with st.container():
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
                                    # Reset Job Items state when opening new job
                                    if 'job_items_job_id' in st.session_state and st.session_state.job_items_job_id != job['Job_ID']:
                                        del st.session_state.job_items
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
            
            # ข้อมูลงาน
            with st.expander("📋 รายละเอียดงาน", expanded=True):
                st.write(f"**ลูกค้า:** {job.get('Customer_Name', '-')}")
                st.write(f"**สินค้า:** {job.get('Cargo_Qty', '-')}")
                st.write(f"**ปลายทาง:** {job.get('Dest_Location', '-')}")
                
                org = urllib.parse.quote(str(job.get('Origin_Location', '')))
                dst = urllib.parse.quote(str(job.get('Dest_Location', '')))
                url = f"https://maps.app.goo.gl/up5bdPHqne3c2gFBA7{org}&destination={dst}&travelmode=driving"
                if job.get('GoogleMap_Link') and str(job['GoogleMap_Link']) != 'nan' and str(job['GoogleMap_Link']) != '':
                    url = job['GoogleMap_Link']
                
                st.link_button("🗺️ นำทาง (Google Maps)", url, type="primary", use_container_width=True)
            
            # Update Status
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
                if st.button("2. เดินทาง", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "IN_TRANSIT", None)
                    st.toast("กำลังเดินทาง")
            with c_s3:
                if st.button("3. ถึงแล้ว", use_container_width=True):
                    simple_update_job_status(job['Job_ID'], "DELIVERED", {"Arrive_Dest_Time": now})
                    st.toast(f"ถึงแล้ว: {now}")
                    time.sleep(1)
                    st.rerun()

            st.divider()

            # --- ITEM CHECKING & BARCODE VERIFICATION (FEATURE 4) ---
            st.markdown("#### ✅ ตรวจเช็คสินค้า (Item & Barcode)")
            
            # Logic สร้างรายการสินค้าจาก Barcodes (ถ้ามี) หรือ Mockup
            if 'job_items' not in st.session_state or st.session_state.get('job_items_job_id') != job['Job_ID']:
                items_mock = []
                
                # 1. ลองดึงจาก Barcodes ที่ Admin กรอก
                barcodes_str = str(job.get('Barcodes', '')).strip()
                if barcodes_str and barcodes_str != 'nan':
                    code_list = [c.strip() for c in barcodes_str.split(',') if c.strip()]
                    for i, code in enumerate(code_list):
                        items_mock.append({
                            "id": i+1, 
                            "name": f"สินค้า #{code}", 
                            "expected_barcode": code, # รหัสที่ต้องสแกนให้ตรง
                            "scanned_barcode": "",
                            "status": "pending", "reason": "", "photo": None
                        })
                
                # 2. ถ้าไม่มี Barcodes ให้ใช้ Mockup เดิม (ตามจำนวน Cargo_Qty)
                if not items_mock:
                    qty_text = str(job.get('Cargo_Qty', '1'))
                    items_mock = [{"id": 1, "name": f"สินค้าล็อตหลัก ({qty_text})", "expected_barcode": "", "scanned_barcode": "", "status": "pending", "reason": "", "photo": None}]
                    if "พาเลท" in qty_text or "กล่อง" in qty_text:
                         items_mock = [
                            {"id": 1, "name": "📦 สินค้าหลัก (Main Cargo)", "expected_barcode": "", "status": "pending"},
                            {"id": 2, "name": "📄 เอกสารกำกับ (Doc)", "expected_barcode": "", "status": "pending"}
                        ]

                st.session_state.job_items = items_mock
                st.session_state.job_items_job_id = job['Job_ID']

            # แสดงรายการ
            items_data = st.session_state.job_items
            all_items_checked = True
            
            for idx, item in enumerate(items_data):
                with st.container():
                    c_name, c_action = st.columns([2, 2])
                    
                    # แสดงชื่อและ Barcode ที่คาดหวัง
                    display_name = f"**{idx+1}. {item['name']}**"
                    if item.get('expected_barcode'):
                        display_name += f" (Code: `{item['expected_barcode']}`)"
                    c_name.markdown(display_name)
                    
                    # --- Barcode Input ---
                    if item.get('expected_barcode'):
                        # ช่องรับค่า (ใช้ปืนยิงบาร์โค้ด หรือพิมพ์)
                        scan_val = c_action.text_input(
                            f"สแกน/พิมพ์รหัส ({item['id']})", 
                            value=item.get('scanned_barcode', ''),
                            key=f"scan_{idx}",
                            placeholder="ยิงบาร์โค้ดที่นี่..."
                        )
                        item['scanned_barcode'] = scan_val
                        
                        # Auto Verify
                        if scan_val == item['expected_barcode']:
                            item['status'] = 'pass'
                            c_action.success("✅ ถูกต้อง")
                        elif scan_val:
                            c_action.error("❌ รหัสไม่ตรง")
                            item['status'] = 'pending'
                    # ---------------------

                    # Manual Status Select (กรณีไม่มีบาร์โค้ด หรือสแกนไม่ได้)
                    status_opts = ["รอตรวจสอบ", "✅ ครบถ้วน", "❌ มีปัญหา"]
                    curr_idx = 1 if item['status'] == 'pass' else (2 if item['status'] == 'fail' else 0)
                    
                    # ถ้าสแกนผ่านแล้ว ให้ล็อกสถานะเป็นครบถ้วน
                    disable_select = True if item.get('expected_barcode') and item.get('status') == 'pass' else False
                    
                    sel_stat = c_action.selectbox("สถานะ", status_opts, index=curr_idx, key=f"st_{idx}", label_visibility="collapsed", disabled=disable_select)
                    
                    if not disable_select:
                        if sel_stat == "✅ ครบถ้วน": item['status'] = 'pass'
                        elif sel_stat == "❌ มีปัญหา": 
                            item['status'] = 'fail'
                            item['reason'] = st.text_input(f"สาเหตุ #{idx}", key=f"rs_{idx}")
                            item['photo'] = st.camera_input(f"หลักฐาน #{idx}", key=f"cm_{idx}")
                        else: 
                            item['status'] = 'pending'
                    
                    if item['status'] == 'pending': all_items_checked = False
                    st.write("---")

            # --- EPOD Section ---
            st.markdown("#### 📸 ปิดงาน (ePOD)")

            u1 = st.file_uploader("รูปสินค้า (เพิ่มเติม)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key="epod_up")

            if "epod_cam_images" not in st.session_state: st.session_state.epod_cam_images = []
            c1 = st.camera_input("ถ่ายรูปหน้างาน (รวม)", key="epod_cam")
            if c1: st.session_state.epod_cam_images.append(c1)

            all_imgs = []
            if u1: all_imgs.extend(u1)
            if st.session_state.epod_cam_images: all_imgs.extend(st.session_state.epod_cam_images)
            
            # รวมรูปจากรายการที่มีปัญหาด้วย
            reject_photos = [item['photo'] for item in items_data if item['status'] == 'fail' and item['photo'] is not None]
            all_imgs.extend(reject_photos)

            if all_imgs: st.success(f"✅ มีรูปทั้งหมด {len(all_imgs)} รูป")
            
            sig = st.camera_input("ลายเซ็นลูกค้า", key="sig_cam")

            # --- ส่วนที่เพิ่มใหม่: Customer Satisfaction ---
            st.markdown("---")
            st.markdown("#### 😀 ประเมินความพึงพอใจ")
            
            # ใช้ feedback widget (ถ้า streamlit version รองรับ) หรือใช้ select_slider แทน
            try:
                satisfaction = st.feedback("stars") # ถ้า version ใหม่ใช้ตัวนี้ได้เลย
            except:
                # Fallback สำหรับ version เก่า
                sentiment_mapping = ["😡 แย่มาก", "☹️ แย่", "😐 พอใช้", "🙂 ดี", "😄 ดีมาก"]
                selected_sentiment = st.select_slider(
                    "ระดับความพึงพอใจ",
                    options=sentiment_mapping,
                    value="🙂 ดี"
                )
                # แปลงกลับเป็นคะแนน 1-5
                satisfaction = sentiment_mapping.index(selected_sentiment) + 1

            cust_comment = st.text_area("ข้อเสนอแนะเพิ่มเติมจากลูกค้า (ถ้ามี)", placeholder="เช่น พนักงานบริการดีมาก, ส่งช้ากว่ากำหนด")
            # ---------------------------------------------

            # Submit Button
            if st.button("✅ ยืนยันปิดงาน", type="primary", use_container_width=True):
                if not all_items_checked:
                    st.error("⚠️ กรุณาตรวจสอบรายการสินค้าให้ครบทุกรายการ")
                elif not all_imgs:
                    st.error("📷 กรุณาถ่ายรูปสินค้าอย่างน้อย 1 รูป")
                else:
                    with st.spinner("กำลังบันทึกข้อมูล..."):
                        img_str = process_multiple_images(all_imgs)
                        sig_str = compress_image(sig) if sig else "-"
                        dist = float(job.get('Est_Distance_KM', 0))
                        
                        # รวบรวมเหตุผลการตีกลับ (ถ้ามี)
                        failed_reasons = [f"{i['name']}: {i['reason']}" for i in items_data if i['status'] == 'fail']
                        reason_str = ", ".join(failed_reasons) if failed_reasons else ""
                        
                        # บันทึกสถานะ พร้อมคะแนน (Rating) และคอมเมนต์
                        # ค่า satisfaction จาก st.feedback จะเริ่มที่ 0 (ถ้ายังไม่เลือกจะเป็น None)
                        final_rating = (satisfaction + 1) if satisfaction is not None else 0
                        # กรณีใช้ slider ค่าจะเป็น 1-5 อยู่แล้ว
                        if isinstance(satisfaction, int) and satisfaction >= 1: final_rating = satisfaction

                        update_job_status(
                            job['Job_ID'], "Completed", get_thai_time_str(), 
                            distance_run=dist, photo_data=img_str, signature_data=sig_str,
                            rating=final_rating, comment=cust_comment
                        )
                        
                        # ถ้ามีเหตุผลการตีกลับ ให้บันทึกเพิ่ม
                        if reason_str:
                            simple_update_job_status(job['Job_ID'], "Completed", {"Failed_Reason": reason_str})
                        
                        st.success("🎉 ปิดงานสำเร็จ! ขอบคุณสำหรับการประเมิน")
                        load_driver_data.clear() # Clear Cache
                        
                        # Reset session items
                        if 'job_items' in st.session_state: del st.session_state.job_items
                        if 'epod_cam_images' in st.session_state: del st.session_state.epod_cam_images
                        
                        time.sleep(2)
                        st.session_state.page = "list"
                        st.rerun()

    # --- 2. ประวัติงาน ---
    elif menu == "🕒 ประวัติงาน":
        st.subheader("📅 ประวัติงานย้อนหลัง")
        c_date1, c_date2 = st.columns(2)
        with c_date1:
            start_d = st.date_input("ตั้งแต่วันที่", datetime.now() - timedelta(days=7))
        with c_date2:
            end_d = st.date_input("ถึงวันที่", datetime.now())

        df_all = get_data("Jobs_Main")
        if not df_all.empty and 'Driver_ID' in df_all.columns:
            current_driver = str(st.session_state.driver_id).strip()
            df_all['Driver_ID'] = df_all['Driver_ID'].astype(str).str.strip()
            my_hist = df_all[df_all['Driver_ID'] == current_driver].copy()
            
            if not my_hist.empty and 'Plan_Date' in my_hist.columns:
                try:
                    my_hist['PD_Obj'] = pd.to_datetime(my_hist['Plan_Date'], dayfirst=True, errors='coerce')
                    my_hist = my_hist.dropna(subset=['PD_Obj'])
                    
                    if isinstance(start_d, datetime): start_d = start_d.date()
                    if isinstance(end_d, datetime): end_d = end_d.date()
                    
                    mask = (my_hist['PD_Obj'].dt.date >= start_d) & (my_hist['PD_Obj'].dt.date <= end_d)
                    my_hist_filtered = my_hist[mask]

                    if not my_hist_filtered.empty:
                        cols_to_show = ['Job_ID', 'Route_Name', 'Job_Status', 'Plan_Date', 'Failed_Reason']
                        st.info(f"พบงานจำนวน: {len(my_hist_filtered)} รายการ")
                        st.dataframe(my_hist_filtered[cols_to_show], use_container_width=True)
                    else:
                        st.warning(f"ไม่พบงานในช่วงวันที่เลือก")
                except Exception as e:
                    st.error(f"Error filtering dates: {e}")
        else:
            st.info("ยังไม่มีประวัติงาน")
            
        if st.button("🔄 รีเฟรชประวัติงาน"):
            st.cache_data.clear()
            st.rerun()

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
            
            calc_rate = std_rate if std_rate > 0 else 10.0
            dist_run = f_odo - last_odo
            suggest_liters = dist_run / calc_rate if dist_run > 0 else 0
            
            if dist_run > 0:
                st.success(f"💡 วิ่งมา: {dist_run:,.0f} กม. | ⛽ ควรเติม: {suggest_liters:.1f} ลิตร")
            
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
                        "Log_ID": log_id, "Date_Time": get_thai_time_str(),
                        "Driver_ID": st.session_state.driver_id, "Vehicle_Plate": plate,
                        "Odometer": f_odo, "Liters": f_liters, "Price_Total": f_price,
                        "Station_Name": f_station, "Photo_Url": img_str
                    }
                    if create_fuel_log(data):
                        st.success("บันทึกสำเร็จ!")
                        load_driver_data.clear()
                        time.sleep(1.5)
                        st.rerun()

    # --- 4. แจ้งซ่อม ---
    elif menu == "🔧 แจ้งซ่อม":
        st.subheader("🔧 แจ้งซ่อม / บำรุงรักษา")
        
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            plate = str(st.session_state.vehicle_plate)
            my_alerts = maint_df[(maint_df['Vehicle_Plate'] == plate) & (maint_df['Is_Due'] == True)]
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
                        "Issue_Type": issue, "Priority": priority,
                        "Description": desc, "Photo_Url": img_str, "Status": "รอดำเนินการ"
                    }
                    if create_repair_ticket(ticket):
                        st.success("ส่งเรื่องแล้ว")
                        time.sleep(2)
                        st.rerun()