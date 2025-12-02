import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import plotly.express as px # type: ignore
from datetime import datetime
import time
from streamlit_js_eval import get_geolocation # type: ignore

# ---------------------------------------------------------
# 1. ตั้งค่าหน้าเว็บ
# ---------------------------------------------------------
st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

# ---------------------------------------------------------
# 2. ฟังก์ชันจัดการ Google Sheet & Database
# ---------------------------------------------------------
SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ" # ⚠️ ตรวจสอบ ID ของคุณ
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

def get_connection():
    return st.connection("gsheets", type=GSheetsConnection)

def get_data(worksheet_name):
    conn = get_connection()
    try:
        return conn.read(spreadsheet=SHEET_URL, worksheet=worksheet_name, ttl=0)
    except:
        return pd.DataFrame()

def update_sheet(worksheet_name, df):
    conn = get_connection()
    conn.update(spreadsheet=SHEET_URL, worksheet=worksheet_name, data=df)

# --- คำนวณค่าจ้าง (Rate Card) ---
def calculate_driver_cost(plan_date, distance, vehicle_type):
    try:
        rates = get_data("Rate_Card")
        if rates.empty: return 0
        
        plan_date = pd.to_datetime(plan_date)
        rates['Start_Date'] = pd.to_datetime(rates['Start_Date'])
        rates['End_Date'] = pd.to_datetime(rates['End_Date'])
        rates['Max_KM'] = pd.to_numeric(rates['Max_KM'], errors='coerce')
        
        active_rate = rates[(rates['Start_Date'] <= plan_date) & (rates['End_Date'] >= plan_date)]
        if active_rate.empty:
            active_rate = rates[rates['Start_Date'] == rates['Start_Date'].max()]

        tier = active_rate[active_rate['Max_KM'] >= distance].sort_values(by='Max_KM').head(1)
        if tier.empty:
            tier = active_rate[active_rate['Max_KM'] == active_rate['Max_KM'].max()]

        price = 0
        v_type_str = str(vehicle_type)
        if "4" in v_type_str: price = tier.iloc[0]['Price_4W']
        elif "6" in v_type_str: price = tier.iloc[0]['Price_6W']
        elif "10" in v_type_str: price = tier.iloc[0]['Price_10W']
            
        return float(price)
    except:
        return 0

# --- บันทึกข้อมูล ---
def create_new_job(job_data):
    try:
        df = get_data("Jobs_Main")
        updated_df = pd.concat([df, pd.DataFrame([job_data])], ignore_index=True)
        update_sheet("Jobs_Main", updated_df)
        return True
    except: return False

def create_repair_ticket(ticket_data):
    try:
        df = get_data("Repair_Tickets")
        updated_df = pd.concat([df, pd.DataFrame([ticket_data])], ignore_index=True)
        update_sheet("Repair_Tickets", updated_df)
        return True
    except: return False

def create_fuel_log(fuel_data):
    try:
        df = get_data("Fuel_Logs")
        updated_df = pd.concat([df, pd.DataFrame([fuel_data])], ignore_index=True)
        update_sheet("Fuel_Logs", updated_df)
        
        # อัปเดตเลขไมล์ใน Master_Drivers ด้วย
        # (Logic: เลขไมล์ล่าสุดที่เติมน้ำมัน คือเลขไมล์ปัจจุบันของรถ)
        # ... (โค้ดเสริมสำหรับอัปเดต Master ถ้าต้องการ) ...
        return True
    except: return False

def update_job_status(job_id, new_status, timestamp, distance_run=0):
    try:
        conn = get_connection()
        df_jobs = conn.read(spreadsheet=SHEET_URL, worksheet="Jobs_Main", ttl=0)
        df_jobs['Job_ID'] = df_jobs['Job_ID'].astype(str)
        idx = df_jobs[df_jobs['Job_ID'] == str(job_id)].index
        
        driver_id = None
        if not idx.empty:
            df_jobs.at[idx[0], 'Job_Status'] = new_status
            df_jobs.at[idx[0], 'Actual_Delivery_Time'] = timestamp
            driver_id = df_jobs.at[idx[0], 'Driver_ID']
            conn.update(spreadsheet=SHEET_URL, worksheet="Jobs_Main", data=df_jobs)
        
        if new_status == "Completed" and driver_id and distance_run > 0:
            df_drivers = conn.read(spreadsheet=SHEET_URL, worksheet="Master_Drivers", ttl=0)
            df_drivers['Driver_ID'] = df_drivers['Driver_ID'].astype(str)
            d_idx = df_drivers[df_drivers['Driver_ID'] == str(driver_id)].index
            if not d_idx.empty:
                try:
                    current = pd.to_numeric(df_drivers.at[d_idx[0], 'Current_Mileage'], errors='coerce')
                    if pd.isna(current): current = 0
                    df_drivers.at[d_idx[0], 'Current_Mileage'] = current + distance_run
                    conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df_drivers)
                except: pass
        return True
    except: return False

def update_driver_location(driver_id, lat, lon):
    try:
        conn = get_connection()
        df = conn.read(spreadsheet=SHEET_URL, worksheet="Master_Drivers", ttl=0)
        df['Driver_ID'] = df['Driver_ID'].astype(str)
        idx = df[df['Driver_ID'] == str(driver_id)].index
        if not idx.empty:
            df.at[idx[0], 'Current_Lat'] = lat
            df.at[idx[0], 'Current_Lon'] = lon
            df.at[idx[0], 'Last_Update'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.update(spreadsheet=SHEET_URL, worksheet="Master_Drivers", data=df)
            return True
        return False
    except: return False

# ---------------------------------------------------------
# 3. Main Interface
# ---------------------------------------------------------
def main():
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False
        st.session_state.user_role = ""

    with st.sidebar:
        st.title("🚚 Logis-Pro 360")
        if st.session_state.logged_in:
            st.success(f"👤 {st.session_state.driver_name}\n({st.session_state.user_role})")
            if st.button("🚪 Logout", use_container_width=True):
                st.session_state.logged_in = False
                st.session_state.user_role = ""
                st.rerun()

    if not st.session_state.logged_in:
        login_page()
    else:
        if st.session_state.user_role == "Admin":
            admin_flow()
        else:
            driver_flow()

# ---------------------------------------------------------
# 4. Admin Flow
# ---------------------------------------------------------
def admin_flow():
    st.header("🖥️ Admin Control Tower")
    # เพิ่ม Tab น้ำมัน
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📝 จ่ายงาน", "🔧 งานซ่อม", "🔩 คลังอะไหล่", "⛽ น้ำมัน", "📊 แดชบอร์ด", "🗺️ GPS"
    ])

    with tab1: # จ่ายงาน
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        driver_options = []
        if not drivers_df.empty:
             drivers_only = drivers_df[drivers_df['Role'] == 'Driver']
             driver_options = drivers_only['Driver_ID'].astype(str) + " : " + drivers_only['Driver_Name']

        with st.form("create_job_form"):
            c1, c2 = st.columns(2)
            with c1:
                auto_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                st.text_input("Job ID", value=auto_id, disabled=True)
                plan_date = st.date_input("วันที่นัดหมาย", datetime.today())
                customer = st.text_input("ชื่อลูกค้า", placeholder="เช่น Tostem")
            with c2:
                selected_driver_raw = st.selectbox("เลือกคนขับ", driver_options)
                driver_id = selected_driver_raw.split(" : ")[0] if selected_driver_raw else ""
                vehicle_type = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                route_name = st.text_input("เส้นทาง", placeholder="กทม - ชลบุรี")
            
            st.divider()
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("รับสินค้า", value="คลังสินค้า A")
            with c4: dest = st.text_input("ส่งสินค้า")
            
            c5, c6 = st.columns(2)
            with c5: est_dist = st.number_input("ระยะทาง (กม.)", min_value=0, value=100)
            with c6: map_link = st.text_input("Google Map Link")

            if st.form_submit_button("✅ บันทึกและจ่ายงาน", type="primary", use_container_width=True):
                if driver_id and customer:
                    cost = calculate_driver_cost(plan_date, est_dist, vehicle_type)
                    new_job = {
                        "Job_ID": auto_id, "Job_Status": "Pending", "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer, "Route_Name": route_name, "Origin_Location": origin, 
                        "Dest_Location": dest, "GoogleMap_Link": map_link, "Driver_ID": driver_id, 
                        "Vehicle_Plate": vehicle_type, "Price_Customer": est_dist, 
                        "Cost_Driver_Total": cost, "Actual_Delivery_Time": "", "Photo_Proof_Url": ""
                    }
                    if create_new_job(new_job):
                        st.success(f"สำเร็จ! ค่าจ้าง: {cost:,.0f} บ.")
                        time.sleep(2)
                        st.rerun()
        st.write("---")
        st.dataframe(get_data("Jobs_Main"), use_container_width=True)

    with tab2: # งานซ่อม
        st.subheader("🔧 รายการแจ้งซ่อม")
        tickets = get_data("Repair_Tickets")
        if not tickets.empty:
            st.dataframe(tickets, use_container_width=True)
            with st.expander("จัดการงานซ่อม"):
                ticket_id = st.selectbox("Ticket ID", tickets['Ticket_ID'].unique())
                if ticket_id:
                    c1, c2 = st.columns(2)
                    with c1: new_status = st.selectbox("สถานะ", ["Approved", "Done"], index=0)
                    with c2: cost = st.number_input("ค่าซ่อม (บาท)", 0.0)
                    if st.button("อัปเดตซ่อม"):
                        idx = tickets[tickets['Ticket_ID'] == ticket_id].index[0]
                        tickets.at[idx, 'Status'] = new_status
                        tickets.at[idx, 'Cost_Total'] = cost
                        update_sheet("Repair_Tickets", tickets)
                        st.success("บันทึกแล้ว")
                        st.rerun()

    with tab3: # คลังอะไหล่
        col1, col2 = st.columns([2, 1])
        parts = get_data("Stock_Parts")
        with col1:
            st.subheader("สต็อกอะไหล่")
            st.dataframe(parts, use_container_width=True)
        with col2:
            st.subheader("เพิ่มอะไหล่")
            with st.form("add_part"):
                p_name = st.text_input("ชื่ออะไหล่")
                p_qty = st.number_input("จำนวน", 1)
                if st.form_submit_button("บันทึก"):
                    new_part = {"Part_ID": f"P-{len(parts)+1:03d}", "Part_Name": p_name, "Qty_On_Hand": p_qty, "Unit_Price": 0}
                    updated_parts = pd.concat([parts, pd.DataFrame([new_part])], ignore_index=True)
                    update_sheet("Stock_Parts", updated_parts)
                    st.rerun()

    with tab4: # ⛽ น้ำมัน (ของใหม่!)
        st.subheader("⛽ ประวัติการเติมน้ำมัน (Fuel Logs)")
        fuel_logs = get_data("Fuel_Logs")
        if not fuel_logs.empty:
            st.dataframe(fuel_logs, use_container_width=True)
            
            # สรุปยอด
            total_fuel_cost = pd.to_numeric(fuel_logs['Price_Total'], errors='coerce').sum()
            total_liters = pd.to_numeric(fuel_logs['Liters'], errors='coerce').sum()
            
            c1, c2 = st.columns(2)
            c1.metric("รวมค่าน้ำมัน (ทั้งหมด)", f"{total_fuel_cost:,.2f} ฿")
            c2.metric("รวมจำนวนลิตร", f"{total_liters:,.2f} ลิตร")
        else:
            st.info("ยังไม่มีรายการเติมน้ำมัน")

    with tab5: # แดชบอร์ด
        st.subheader("📊 Dashboard")
        df = get_data("Jobs_Main")
        if not df.empty:
            c1, c2, c3 = st.columns(3)
            c1.metric("งานทั้งหมด", len(df))
            c2.metric("ส่งสำเร็จ", len(df[df['Job_Status']=='Completed']))
            
            dist_sum = pd.to_numeric(df['Price_Customer'], errors='coerce').sum()
            cost_sum = pd.to_numeric(df['Cost_Driver_Total'], errors='coerce').sum()
            profit = (dist_sum * 35) - cost_sum 
            c3.metric("กำไรโดยประมาณ", f"{profit:,.0f} ฿")
            
            fig = px.pie(df, names='Job_Status', title="สถานะงาน")
            st.plotly_chart(fig, use_container_width=True)

    with tab6: # GPS
        st.subheader("📍 GPS Tracking")
        drivers = get_data("Master_Drivers")
        if not drivers.empty:
            drivers['Current_Lat'] = pd.to_numeric(drivers['Current_Lat'], errors='coerce')
            drivers['Current_Lon'] = pd.to_numeric(drivers['Current_Lon'], errors='coerce')
            active = drivers.dropna(subset=['Current_Lat', 'Current_Lon'])
            if not active.empty:
                st.map(active.rename(columns={'Current_Lat':'lat', 'Current_Lon':'lon'}), zoom=10)
                st.dataframe(active[['Driver_Name', 'Vehicle_Plate', 'Last_Update']])
            else:
                st.info("ไม่มีพิกัด")

# ---------------------------------------------------------
# 5. Driver Flow
# ---------------------------------------------------------
def driver_flow():
    if 'page' not in st.session_state: st.session_state.page = "list"
    
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("📱 Driver App")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📡 เช็คอิน"):
            update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
            st.toast("ส่งพิกัดแล้ว")

    # เพิ่มเมนูเติมน้ำมัน
    menu = st.radio("เมนู", ["📦 งานขนส่ง", "🔧 แจ้งซ่อม", "⛽ เติมน้ำมัน"], horizontal=True)
    st.divider()
    
    if menu == "📦 งานขนส่ง":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Job_Status'] = df['Job_Status'].fillna('Pending')
                my_jobs = df[(df['Driver_ID'] == st.session_state.driver_id) & (df['Job_Status'] != 'Completed')]
                if my_jobs.empty: st.info("ไม่มีงานค้าง")
                else:
                    for i, job in my_jobs.iterrows():
                        with st.container(border=True):
                            st.markdown(f"**{job['Route_Name']}**")
                            st.caption(f"ส่งที่: {job['Dest_Location']}")
                            if st.button("ทำงาน >", key=f"j_{job['Job_ID']}"):
                                st.session_state.current_job = job.to_dict()
                                st.session_state.page = "action"
                                st.rerun()
        elif st.session_state.page == "action":
            job = st.session_state.current_job
            if st.button("< กลับ"):
                st.session_state.page = "list"
                st.rerun()
            st.info(f"ส่งสินค้า: {job['Customer_ID']}")
            if job.get('GoogleMap_Link'): st.link_button("นำทาง", job['GoogleMap_Link'])
            img = st.camera_input("หลักฐาน")
            if st.button("ปิดงาน", type="primary", use_container_width=True):
                if img:
                    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    dist = float(job.get('Price_Customer', 0))
                    update_job_status(job['Job_ID'], "Completed", now, dist)
                    st.success("สำเร็จ!")
                    time.sleep(1)
                    st.session_state.page = "list"
                    st.rerun()

    elif menu == "🔧 แจ้งซ่อม":
        with st.form("fix"):
            issue = st.selectbox("ปัญหา", ["เครื่องยนต์", "ยาง", "ช่วงล่าง", "อื่นๆ"])
            desc = st.text_area("รายละเอียด")
            if st.form_submit_button("แจ้งซ่อม"):
                tid = f"TK-{datetime.now().strftime('%y%m%d%H%M')}"
                data = {"Ticket_ID": tid, "Date_Report": datetime.now().strftime("%Y-%m-%d"), 
                        "Driver_ID": st.session_state.driver_id, "Description": desc, "Status": "Pending", 
                        "Issue_Type": issue, "Vehicle_Plate": st.session_state.vehicle_plate}
                if create_repair_ticket(data): st.success("แจ้งแล้ว รออนุมัติ")

    elif menu == "⛽ เติมน้ำมัน":
        st.subheader("บันทึกการเติมน้ำมัน")
        with st.form("fuel_form"):
            f_station = st.text_input("ชื่อปั๊ม / สถานที่", placeholder="เช่น ปตท. บางนา")
            f_odo = st.number_input("เลขไมล์ปัจจุบัน (Odometer)", min_value=0)
            f_liters = st.number_input("จำนวนลิตร", min_value=0.0)
            f_price = st.number_input("ราคารวม (บาท)", min_value=0.0)
            f_img = st.camera_input("ถ่ายรูปสลิป/หน้าปัด")
            
            if st.form_submit_button("บันทึกการเติม"):
                if f_liters > 0 and f_price > 0:
                    fuel_data = {
                        "Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}",
                        "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "Driver_ID": st.session_state.driver_id,
                        "Vehicle_Plate": st.session_state.vehicle_plate,
                        "Odometer": f_odo,
                        "Liters": f_liters,
                        "Price_Total": f_price,
                        "Station_Name": f_station,
                        "Photo_Url": "Attached" if f_img else "-"
                    }
                    if create_fuel_log(fuel_data):
                        st.success("บันทึกข้อมูลน้ำมันเรียบร้อย!")
                else:
                    st.error("กรุณากรอกข้อมูลให้ครบ")

def login_page():
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        with st.form("login"):
            u = st.text_input("User ID")
            p = st.text_input("Password", type="password")
            if st.form_submit_button("Login", use_container_width=True):
                drivers = get_data("Master_Drivers")
                if not drivers.empty:
                    drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
                    user = drivers[drivers['Driver_ID'] == u]
                    if not user.empty and str(user.iloc[0]['Password']) == p:
                        st.session_state.logged_in = True
                        st.session_state.driver_id = u
                        st.session_state.driver_name = user.iloc[0]['Driver_Name']
                        st.session_state.vehicle_plate = user.iloc[0].get('Vehicle_Plate', '-')
                        st.session_state.user_role = user.iloc[0].get('Role', 'Driver')
                        st.rerun()
                    else: st.error("รหัสผิด")

if __name__ == "__main__":
    main()