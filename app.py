import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
import plotly.express as px # type: ignore
from streamlit_js_eval import get_geolocation # type: ignore # <--- เพิ่มบรรทัดนี้

# ---------------------------------------------------------
# 1. ตั้งค่าหน้าเว็บ
# ---------------------------------------------------------
st.set_page_config(page_title="TMS System", page_icon="🚛", layout="centered")

# ---------------------------------------------------------
# 2. ฟังก์ชันจัดการ Google Sheet
# ---------------------------------------------------------
def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

def get_sheet_url():
    SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
    return f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_data(worksheet_name):
    conn = get_connection()
    try:
        df = conn.read(
            spreadsheet=get_sheet_url(),
            worksheet=worksheet_name,
            ttl=0
        )
        return df
    except Exception as e:
        st.error(f"❌ อ่านข้อมูลไม่ได้: {e}")
        return pd.DataFrame()

# ฟังก์ชันสร้างงานใหม่ (Admin Create Job)
def create_new_job(job_data):
    try:
        conn = get_connection()
        # 1. อ่านข้อมูลเดิม
        df = conn.read(spreadsheet=get_sheet_url(), worksheet="Jobs_Main", ttl=0)
        
        # 2. แปลงข้อมูลใหม่เป็น DataFrame
        new_row = pd.DataFrame([job_data])
        
        # 3. ต่อท้ายข้อมูลเดิม (Append)
        # ใช้ pd.concat เพื่อรวมตาราง
        updated_df = pd.concat([df, new_row], ignore_index=True)
        
        # 4. บันทึกกลับ
        conn.update(spreadsheet=get_sheet_url(), worksheet="Jobs_Main", data=updated_df)
        return True
    except Exception as e:
        st.error(f"บันทึกไม่สำเร็จ: {e}")
        return False

# ฟังก์ชันอัปเดตสถานะ (Driver Update)
def update_job_status(job_id, new_status, timestamp):
    try:
        conn = get_connection()
        df = conn.read(spreadsheet=get_sheet_url(), worksheet="Jobs_Main", ttl=0)
        
        df['Job_ID'] = df['Job_ID'].astype(str)
        idx = df[df['Job_ID'] == str(job_id)].index
        
        if not idx.empty:
            df.at[idx[0], 'Job_Status'] = new_status
            df.at[idx[0], 'Actual_Delivery_Time'] = timestamp
            conn.update(spreadsheet=get_sheet_url(), worksheet="Jobs_Main", data=df)
            return True
        return False
    except Exception as e:
        st.error(f"Error: {e}")
        return False
    
# ฟังก์ชันอัปเดตพิกัด GPS ลง Sheet Master_Drivers
def update_driver_location(driver_id, lat, lon):
    try:
        conn = get_connection()
        # อ่านข้อมูลคนขับ
        df = conn.read(spreadsheet=get_sheet_url(), worksheet="Master_Drivers", ttl=0)
        
        # แปลงเป็น string เพื่อเทียบ ID
        df['Driver_ID'] = df['Driver_ID'].astype(str)
        idx = df[df['Driver_ID'] == str(driver_id)].index
        
        if not idx.empty:
            # อัปเดตพิกัดและเวลา
            df.at[idx[0], 'Current_Lat'] = lat
            df.at[idx[0], 'Current_Lon'] = lon
            df.at[idx[0], 'Last_Update'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            conn.update(spreadsheet=get_sheet_url(), worksheet="Master_Drivers", data=df)
            return True
        return False
    except Exception as e:
        print(f"GPS Error: {e}") # ปริ้นท์ดูใน Terminal แทน
        return False    

# ---------------------------------------------------------
# 3. ส่วนแสดงผลหลัก (Main Application)
# ---------------------------------------------------------
def main():
    # Sidebar สำหรับเลือกโหมด
    st.sidebar.title("🔧 Menu")
    app_mode = st.sidebar.selectbox("เลือกการใช้งาน", ["📱 Driver App (คนขับ)", "🖥️ Admin Panel (จัดรถ)"])

    if app_mode == "📱 Driver App (คนขับ)":
        driver_flow()
    else:
        admin_flow()

# ---------------------------------------------------------
# 4. Admin Flow (ส่วนจัดการงาน + Dashboard)
# ---------------------------------------------------------
def admin_flow():
    st.title("🖥️ Admin Control Tower")
    
    # แบ่งเป็น 2 Tabs: จัดการงาน vs แดชบอร์ด
    tab1, tab2, tab3 = st.tabs(["📝 จ่ายงาน (Operation)", "📈 แดชบอร์ด (Management)", "🗺️ ติดตามรถ (GPS)"])

    # --- TAB 1: จ่ายงาน (เหมือนเดิม) ---
    with tab1:
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        driver_options = []
        if not drivers_df.empty:
             driver_options = drivers_df['Driver_ID'].astype(str) + " : " + drivers_df['Driver_Name']

        with st.form("create_job_form"):
            c1, c2 = st.columns(2)
            with c1:
                auto_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                st.text_input("Job ID (Auto)", value=auto_id, disabled=True)
                plan_date = st.date_input("วันที่นัดหมาย", datetime.today())
                customer = st.text_input("ชื่อลูกค้า", placeholder="เช่น Tostem")
            
            with c2:
                selected_driver_raw = st.selectbox("เลือกคนขับ/รถ", driver_options)
                driver_id = selected_driver_raw.split(" : ")[0] if selected_driver_raw else ""
                route_name = st.text_input("ชื่อเส้นทาง", placeholder="เช่น บางนา - ชลบุรี")
                
            st.divider()
            c3, c4 = st.columns(2)
            with c3:
                origin = st.text_input("จุดรับสินค้า (Origin)", value="คลังสินค้า A")
            with c4:
                dest = st.text_input("จุดส่งสินค้า (Destination)")
                map_link = st.text_input("Google Map Link (ถ้ามี)")

            submitted = st.form_submit_button("✅ บันทึกและจ่ายงาน", use_container_width=True, type="primary")

            if submitted:
                if not driver_id or not customer:
                    st.warning("กรุณาระบุคนขับและชื่อลูกค้า")
                else:
                    new_job_data = {
                        "Job_ID": auto_id,
                        "Job_Status": "Pending",
                        "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer,
                        "Route_Name": route_name,
                        "Origin_Location": origin,
                        "Dest_Location": dest,
                        "GoogleMap_Link": map_link,
                        "Driver_ID": driver_id,
                        "Vehicle_Plate": "",
                        "Actual_Pickup_Time": "",
                        "Actual_Delivery_Time": "",
                        "Photo_Proof_Url": "",
                        "Signature_Url": "",
                        "Price_Customer": 0,
                        "Cost_Driver_Total": 0
                    }
                    
                    with st.spinner("กำลังจ่ายงาน..."):
                        if create_new_job(new_job_data):
                            st.success(f"จ่ายงาน {auto_id} ให้ {driver_id} เรียบร้อย!")
                            time.sleep(1)
                            st.rerun()
        
        st.write("---")
        st.subheader("รายการงานล่าสุด")
        df_all = get_data("Jobs_Main")
        st.dataframe(df_all, use_container_width=True)

    # --- TAB 2: แดชบอร์ดผู้บริหาร (ของใหม่!) ---
    with tab2:
        st.header("📊 สรุปผลการดำเนินงาน (Performance)")
        
        df = get_data("Jobs_Main")
        
        if not df.empty:
            # 1. KPI Cards (สรุปยอดรวม) - เหมือนรูป TMS5
            total_jobs = len(df)
            completed_jobs = len(df[df['Job_Status'] == 'Completed'])
            pending_jobs = len(df[df['Job_Status'] == 'Pending'])
            success_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
            
            kpi1, kpi2, kpi3, kpi4 = st.columns(4)
            kpi1.metric("📦 งานทั้งหมด", f"{total_jobs} งาน")
            kpi2.metric("✅ ส่งสำเร็จ", f"{completed_jobs} งาน")
            kpi3.metric("⏳ รอจัดส่ง", f"{pending_jobs} งาน")
            kpi4.metric("⭐ อัตราสำเร็จ", f"{success_rate:.1f}%")
            
            st.divider()
            
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                # 2. Pie Chart: สัดส่วนสถานะงาน - เหมือนรูป TMS7
                st.subheader("สัดส่วนสถานะงาน")
                status_counts = df['Job_Status'].value_counts().reset_index()
                status_counts.columns = ['Status', 'Count']
                fig_pie = px.pie(status_counts, values='Count', names='Status', 
                                 color='Status',
                                 color_discrete_map={'Completed':'green', 'Pending':'orange', 'In-Transit':'blue'})
                st.plotly_chart(fig_pie, use_container_width=True)
                
            with col_chart2:
                # 3. Bar Chart: งานต่อคนขับ (Driver Performance)
                st.subheader("จำนวนงานแยกตามคนขับ")
                driver_counts = df['Driver_ID'].value_counts().reset_index()
                driver_counts.columns = ['Driver', 'Job Count']
                fig_bar = px.bar(driver_counts, x='Driver', y='Job Count', color='Driver')
                st.plotly_chart(fig_bar, use_container_width=True)
                
        else:
            st.info("ยังไม่มีข้อมูลงานในระบบ")
    
    # --- TAB 3: GPS Tracking Map (ฉบับอัปเกรด) ---
    with tab3:
        st.subheader("📍 ตำแหน่งรถปัจจุบัน (Real-time Check-in)")
        drivers = get_data("Master_Drivers")
        
        if not drivers.empty:
            # แปลงข้อมูลให้เป็นตัวเลข
            drivers['Current_Lat'] = pd.to_numeric(drivers['Current_Lat'], errors='coerce')
            drivers['Current_Lon'] = pd.to_numeric(drivers['Current_Lon'], errors='coerce')
            
            # ตัดคนที่ไม่มีพิกัดออก
            active_drivers = drivers.dropna(subset=['Current_Lat', 'Current_Lon'])
            
            if not active_drivers.empty:
                # 1. แสดงแผนที่ภาพรวม
                map_data = active_drivers.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
                st.map(map_data, zoom=10, use_container_width=True)
                
                st.caption("รายชื่อรถที่ออนไลน์ล่าสุด:")
                
                # 2. สร้างลิ้งค์ Google Maps สำหรับแต่ละคน
                # สูตรคือ: https://www.google.com/maps/search/?api=1&query=ละติจูด,ลองจิจูด
                active_drivers['Google_Maps_URL'] = active_drivers.apply(
                    lambda row: f"https://www.google.com/maps/search/?api=1&query={row['Current_Lat']},{row['Current_Lon']}", 
                    axis=1
                )

                # 3. แสดงตารางแบบมีปุ่มกดลิ้งค์
                st.dataframe(
                    active_drivers[['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Google_Maps_URL']],
                    hide_index=True,
                    column_config={
                        "Driver_Name": "ชื่อคนขับ",
                        "Vehicle_Plate": "ทะเบียนรถ",
                        "Last_Update": "อัปเดตเมื่อ",
                        "Google_Maps_URL": st.column_config.LinkColumn(
                            "ดูตำแหน่ง",
                            display_text="🗺️ เปิด Google Maps" # ข้อความที่จะโชว์บนปุ่ม
                        )
                    }
                )
            else:
                st.info("ยังไม่มีรถคันไหนกดเช็คอินพิกัดเข้ามาครับ")
        else:
            st.error("ไม่พบข้อมูลคนขับ")
# ---------------------------------------------------------
# 5. Driver Flow (ส่วนคนขับ - เหมือนเดิม)
# ---------------------------------------------------------
def driver_flow():
    # เช็ค Login
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False
    if 'page' not in st.session_state:
        st.session_state.page = "dashboard"

    if not st.session_state.logged_in:
        login_page()
    else:
        if st.session_state.page == "dashboard":
            driver_dashboard()
        elif st.session_state.page == "action":
            action_page()

def login_page():
    st.header("🚚 เข้าสู่ระบบคนขับ")
    with st.form("login_form"):
        username = st.text_input("รหัสพนักงาน", placeholder="DRV-001")
        password = st.text_input("รหัสผ่าน", type="password")
        if st.form_submit_button("เข้าสู่ระบบ", use_container_width=True):
            drivers = get_data("Master_Drivers")
            if not drivers.empty:
                drivers['Password'] = drivers['Password'].astype(str)
                user = drivers[drivers['Driver_ID'] == username]
                if not user.empty:
                    real_pass = str(user.iloc[0]['Password']).strip().replace(".0", "")
                    if real_pass == password:
                        st.session_state.logged_in = True
                        st.session_state.driver_id = username
                        st.session_state.driver_name = user.iloc[0]['Driver_Name']
                        st.session_state.vehicle_plate = user.iloc[0]['Vehicle_Plate']
                        st.rerun()
                    else:
                        st.error("รหัสผ่านผิด")
                else:
                    st.error("ไม่พบผู้ใช้")

def driver_dashboard():
    st.info(f"ผู้ใช้งาน: {st.session_state.driver_name} ({st.session_state.vehicle_plate})")
    if st.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()

    # === ส่วนเพิ่ม GPS Tracking ===
    st.write("---")
    st.caption("📍 ระบบติดตามตำแหน่ง")
    
    # เรียกใช้ GPS (Browser จะถามขออนุญาต)
    loc = get_geolocation()
    
    col_gps1, col_gps2 = st.columns([2, 1])
    with col_gps1:
        if loc:
            st.success(f"พิกัดของคุณ: {loc['coords']['latitude']:.4f}, {loc['coords']['longitude']:.4f}")
            # ถ้ามีพิกัด ให้ปุ่มกดได้
            if st.button("📡 อัปเดตตำแหน่งปัจจุบัน"):
                update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
                st.toast("อัปเดตพิกัดเรียบร้อย!", icon="✅")
        else:
            st.warning("กำลังหาพิกัด... (กรุณากด Allow Location)")    
    
    st.subheader("📋 งานวันนี้")
    df = get_data("Jobs_Main")
    if not df.empty:
        df['Job_Status'] = df['Job_Status'].astype(str).fillna('Pending')
        my_jobs = df[(df['Driver_ID'] == st.session_state.driver_id) & (df['Job_Status'] != 'Completed')]
        
        if my_jobs.empty:
            st.success("ไม่มีงานค้าง")
        else:
            for _, row in my_jobs.iterrows():
                with st.container(border=True):
                    st.markdown(f"**{row['Route_Name']}** ({row['Job_Status']})")
                    st.caption(f"Job: {row['Job_ID']} | ส่ง: {row['Dest_Location']}")
                    if st.button("เปิดงาน", key=f"b_{row['Job_ID']}", type="primary"):
                        st.session_state.current_job = row.to_dict()
                        st.session_state.page = "action"
                        st.rerun()

def action_page():
    if st.button("< กลับ"):
        st.session_state.page = "dashboard"
        st.rerun()
    
    job = st.session_state.current_job
    st.title(f"📦 {job['Customer_ID']}")
    st.write(f"ส่งที่: {job['Dest_Location']}")
    if str(job['GoogleMap_Link']) not in ['nan', '']:
        st.link_button("นำทาง", str(job['GoogleMap_Link']))
    
    img = st.camera_input("หลักฐานการส่ง")
    if st.button("ยืนยันปิดงาน", type="primary"):
        if not img:
            st.warning("ถ่ายรูปก่อนครับ")
        else:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if update_job_status(job['Job_ID'], "Completed", now):
                st.success("บันทึกแล้ว!")
                time.sleep(1)
                st.session_state.page = "dashboard"
                st.rerun()

if __name__ == "__main__":
    main()