import streamlit as st # type: ignore
from streamlit_gsheets import GSheetsConnection # type: ignore
import pandas as pd # type: ignore
import plotly.express as px # type: ignore
from datetime import datetime
import time
from streamlit_js_eval import get_geolocation # type: ignore
import urllib.parse # ใช้สำหรับแปลงภาษาไทยเป็นลิ้งค์

# ---------------------------------------------------------
# 1. ตั้งค่าหน้าเว็บ & Database Config
# ---------------------------------------------------------
st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

SHEET_ID = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"

# --- Helper Functions ---
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

@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8')

# --- Business Logic Functions ---
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
    except: return 0

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
# 3. Main Application Logic
# ---------------------------------------------------------
def main():
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False
        st.session_state.user_role = ""
        st.session_state.driver_id = ""

    if not st.session_state.logged_in:
        login_page()
    else:
        if st.session_state.user_role == "Admin":
            admin_flow()
        else:
            driver_flow()

# ---------------------------------------------------------
# 4. Admin Panel
# ---------------------------------------------------------
def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Dashboard", "🔧 งานซ่อม", "⛽ น้ำมัน", "🔩 สต็อก", "🗺️ GPS"
    ])

    # --- Tab 1: จ่ายงาน ---
    with tab1:
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        
        # สร้าง Dict สำหรับดึงทะเบียนรถจากคนขับ
        driver_map = {}
        driver_options = []
        if not drivers_df.empty:
             drivers_only = drivers_df[drivers_df['Role'] == 'Driver']
             for _, row in drivers_only.iterrows():
                 label = f"{row['Driver_ID']} : {row['Driver_Name']} ({row['Vehicle_Plate']})"
                 driver_options.append(label)
                 driver_map[label] = row['Vehicle_Plate'] # เก็บทะเบียนไว้

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
                # ดึงทะเบียนรถจากคนขับที่เลือก
                auto_plate = driver_map.get(selected_driver_raw, "")
                
                vehicle_type = st.selectbox("ประเภทรถ (สำหรับคิดเงิน)", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                route_name = st.text_input("ชื่อเส้นทาง", placeholder="กทม - ชลบุรี")
            
            st.divider()
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("จุดรับสินค้า", value="คลังสินค้า A")
            with c4: dest = st.text_input("จุดส่งสินค้า")
            
            c5, c6 = st.columns(2)
            with c5: est_dist = st.number_input("ระยะทาง (กม.)", min_value=0, value=100)
            with c6: map_link = st.text_input("Google Map Link (ถ้ามี)")

            if st.form_submit_button("✅ บันทึกและจ่ายงาน", type="primary", use_container_width=True):
                if driver_id and customer:
                    calc_cost = calculate_driver_cost(plan_date, est_dist, vehicle_type)
                    new_job = {
                        "Job_ID": auto_id, "Job_Status": "Pending", "Plan_Date": plan_date.strftime("%Y-%m-%d"),
                        "Customer_ID": customer, "Route_Name": route_name, 
                        "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": map_link,
                        "Driver_ID": driver_id, 
                        "Vehicle_Plate": auto_plate, # บันทึกทะเบียนจริง
                        "Price_Customer": est_dist, # เก็บระยะทางชั่วคราว
                        "Cost_Driver_Total": calc_cost,
                        "Actual_Delivery_Time": "", "Photo_Proof_Url": ""
                    }
                    if create_new_job(new_job):
                        st.success(f"สำเร็จ! ต้นทุน: {calc_cost:,.0f} บาท")
                        time.sleep(2)
                        st.rerun()
        st.write("---")
        st.dataframe(get_data("Jobs_Main"), use_container_width=True)

    # --- Tab 2: Dashboard (Profitability) ---
    with tab2:
        st.header("💰 วิเคราะห์กำไรรายคัน (Vehicle Profitability)")
        
        # โหลดข้อมูล
        df_jobs = get_data("Jobs_Main")
        df_fuel = get_data("Fuel_Logs")
        df_repair = get_data("Repair_Tickets")
        
        if not df_jobs.empty:
            # 1. เตรียมข้อมูลรายรับ (Revenue)
            # สมมติคิดราคาลูกค้า กิโลละ 35 บาท (จาก Price_Customer ที่เก็บระยะทางไว้)
            # ในระบบจริงอาจจะมีคอลัมน์ Billing_Amount แยกต่างหาก
            df_jobs['Revenue'] = pd.to_numeric(df_jobs['Price_Customer'], errors='coerce').fillna(0) * 35
            df_jobs['Expense_Driver'] = pd.to_numeric(df_jobs['Cost_Driver_Total'], errors='coerce').fillna(0)
            
            # Group by Vehicle
            rev_by_car = df_jobs.groupby('Vehicle_Plate')[['Revenue', 'Expense_Driver']].sum().reset_index()
            
            # 2. เตรียมข้อมูลค่าน้ำมัน (Fuel)
            fuel_by_car = pd.DataFrame()
            if not df_fuel.empty:
                df_fuel['Price_Total'] = pd.to_numeric(df_fuel['Price_Total'], errors='coerce').fillna(0)
                fuel_by_car = df_fuel.groupby('Vehicle_Plate')['Price_Total'].sum().reset_index().rename(columns={'Price_Total': 'Fuel_Cost'})
            
            # 3. เตรียมข้อมูลค่าซ่อม (Repair)
            repair_by_car = pd.DataFrame()
            if not df_repair.empty:
                df_repair['Cost_Total'] = pd.to_numeric(df_repair['Cost_Total'], errors='coerce').fillna(0)
                repair_by_car = df_repair.groupby('Vehicle_Plate')['Cost_Total'].sum().reset_index().rename(columns={'Cost_Total': 'Repair_Cost'})
            
            # 4. รวมตาราง (Merge)
            profit_df = rev_by_car
            if not fuel_by_car.empty:
                profit_df = profit_df.merge(fuel_by_car, on='Vehicle_Plate', how='left')
            if not repair_by_car.empty:
                profit_df = profit_df.merge(repair_by_car, on='Vehicle_Plate', how='left')
                
            profit_df = profit_df.fillna(0)
            profit_df['Total_Expense'] = profit_df['Expense_Driver'] + profit_df['Fuel_Cost'] + profit_df['Repair_Cost']
            profit_df['Net_Profit'] = profit_df['Revenue'] - profit_df['Total_Expense']
            
            # แสดงผล
            col1, col2 = st.columns([2, 1])
            with col1:
                st.subheader("กำไรสุทธิแยกตามรถ (Net Profit)")
                fig_profit = px.bar(profit_df, x='Vehicle_Plate', y='Net_Profit', 
                                    color='Net_Profit', color_continuous_scale='RdYlGn',
                                    text_auto='.2s')
                st.plotly_chart(fig_profit, use_container_width=True)
            
            with col2:
                st.subheader("ตารางสรุปงบ")
                st.dataframe(profit_df[['Vehicle_Plate', 'Revenue', 'Total_Expense', 'Net_Profit']], hide_index=True)

            # ปุ่ม Export CSV
            st.write("---")
            st.write("### 📥 Export Data")
            c_dl1, c_dl2, c_dl3 = st.columns(3)
            c_dl1.download_button("📄 โหลดงาน (Jobs)", convert_df_to_csv(df_jobs), "jobs.csv", "text/csv")
            if not df_fuel.empty:
                c_dl2.download_button("⛽ โหลดน้ำมัน (Fuel)", convert_df_to_csv(df_fuel), "fuel.csv", "text/csv")
            if not df_repair.empty:
                c_dl3.download_button("🔧 โหลดซ่อม (Repair)", convert_df_to_csv(df_repair), "repair.csv", "text/csv")

        else:
            st.info("ยังไม่มีข้อมูลงานในระบบ")

    # --- Tab 3-6: Other Modules (เหมือนเดิม) ---
    with tab3:
        st.subheader("🔧 แจ้งซ่อม")
        tickets = get_data("Repair_Tickets")
        if not tickets.empty:
            st.dataframe(tickets)
            with st.expander("จัดการงานซ่อม"):
                tid = st.selectbox("เลือก Ticket", tickets['Ticket_ID'].unique())
                if tid:
                    c1, c2 = st.columns(2)
                    with c1: stat = st.selectbox("สถานะ", ["Approved", "Done"])
                    with c2: cst = st.number_input("ค่าใช้จ่าย", 0.0)
                    if st.button("บันทึก"):
                        idx = tickets[tickets['Ticket_ID']==tid].index[0]
                        tickets.at[idx, 'Status'] = stat
                        tickets.at[idx, 'Cost_Total'] = cst
                        update_sheet("Repair_Tickets", tickets)
                        st.success("Saved")
                        st.rerun()
    
    with tab4:
        st.subheader("⛽ น้ำมัน")
        fl = get_data("Fuel_Logs")
        if not fl.empty: st.dataframe(fl)
    
    with tab5:
        st.subheader("🔩 สต็อก")
        st.dataframe(get_data("Stock_Parts"))
        
    with tab6:
        st.subheader("🗺️ GPS")
        drv = get_data("Master_Drivers")
        if not drv.empty:
            act = drv.dropna(subset=['Current_Lat','Current_Lon'])
            act['lat'] = pd.to_numeric(act['Current_Lat'])
            act['lon'] = pd.to_numeric(act['Current_Lon'])
            if not act.empty: st.map(act, zoom=10)

# ---------------------------------------------------------
# 5. Driver App (With Smart Nav)
# ---------------------------------------------------------
def driver_flow():
    with st.sidebar:
        st.title("Driver App 📱")
        st.info(f"คุณ: {st.session_state.driver_name}")
        if st.button("🚪 Logout"):
            st.session_state.logged_in = False
            st.rerun()

    if 'page' not in st.session_state: st.session_state.page = "list"
    
    c1, c2 = st.columns([3,1])
    with c1: st.subheader("เมนูหลัก")
    with c2:
        loc = get_geolocation()
        if loc and st.button("📍 เช็คอิน"):
            update_driver_location(st.session_state.driver_id, loc['coords']['latitude'], loc['coords']['longitude'])
            st.toast("ส่งพิกัดแล้ว")

    menu = st.radio("ทำรายการ:", ["📦 งานของฉัน", "⛽ เติมน้ำมัน", "🔧 แจ้งซ่อม"], horizontal=True)
    st.write("---")
    
    if menu == "📦 งานของฉัน":
        if st.session_state.page == "list":
            df = get_data("Jobs_Main")
            if not df.empty:
                df['Job_Status'] = df['Job_Status'].fillna('Pending')
                my_jobs = df[(df['Driver_ID'] == st.session_state.driver_id) & (df['Job_Status'] != 'Completed')]
                if my_jobs.empty: st.success("ไม่มีงานค้าง")
                else:
                    for i, job in my_jobs.iterrows():
                        with st.container(border=True):
                            st.markdown(f"**{job['Route_Name']}**")
                            # --- SMART NAVIGATION BUTTON ---
                            # สร้างลิ้งค์ Google Maps แบบระบุต้นทาง-ปลายทาง
                            origin_enc = urllib.parse.quote(str(job['Origin_Location']))
                            dest_enc = urllib.parse.quote(str(job['Dest_Location']))
                            nav_url = f"https://www.google.com/maps/dir/?api=1&origin={origin_enc}&destination={dest_enc}&travelmode=driving"
                            
                            c_btn1, c_btn2 = st.columns(2)
                            c_btn1.link_button("🗺️ นำทาง (Go)", nav_url, use_container_width=True)
                            if c_btn2.button("ส่งของ >", key=f"j_{job['Job_ID']}", use_container_width=True):
                                st.session_state.current_job = job.to_dict()
                                st.session_state.page = "action"
                                st.rerun()
            else: st.error("ไม่พบข้อมูล")

        elif st.session_state.page == "action":
            job = st.session_state.current_job
            if st.button("< กลับ"):
                st.session_state.page = "list"
                st.rerun()
            st.info(f"ลูกค้า: {job['Customer_ID']}")
            st.write(f"รับ: {job['Origin_Location']} -> ส่ง: {job['Dest_Location']}")
            
            img = st.camera_input("ถ่ายรูปส่งสินค้า")
            if st.button("ยืนยันปิดงาน", type="primary", use_container_width=True):
                if img:
                    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    dist = float(job.get('Price_Customer', 0))
                    update_job_status(job['Job_ID'], "Completed", now, dist)
                    st.success("สำเร็จ!")
                    time.sleep(1)
                    st.session_state.page = "list"
                    st.rerun()

    elif menu == "⛽ เติมน้ำมัน":
        with st.form("fuel"):
            st.write("บันทึกการเติมน้ำมัน")
            f_station = st.text_input("ปั๊ม")
            f_odo = st.number_input("เลขไมล์", min_value=0)
            f_liters = st.number_input("ลิตร", 0.0)
            f_price = st.number_input("บาท", 0.0)
            if st.form_submit_button("บันทึก"):
                if f_price > 0:
                    fuel_data = {
                        "Log_ID": f"FUEL-{datetime.now().strftime('%y%m%d%H%M')}",
                        "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "Driver_ID": st.session_state.driver_id,
                        "Vehicle_Plate": st.session_state.vehicle_plate,
                        "Odometer": f_odo, "Liters": f_liters, "Price_Total": f_price,
                        "Station_Name": f_station, "Photo_Url": "-"
                    }
                    create_fuel_log(fuel_data)
                    st.success("บันทึกแล้ว")

    elif menu == "🔧 แจ้งซ่อม":
        with st.form("rep"):
            st.write("แจ้งอาการเสีย")
            issue = st.selectbox("หมวดหมู่", ["เครื่องยนต์", "ยาง", "ช่วงล่าง", "อื่นๆ"])
            desc = st.text_area("รายละเอียด")
            if st.form_submit_button("ส่งเรื่อง"):
                data = {
                    "Ticket_ID": f"TK-{datetime.now().strftime('%y%m%d%H%M')}",
                    "Date_Report": datetime.now().strftime("%Y-%m-%d"), 
                    "Driver_ID": st.session_state.driver_id, "Description": desc, 
                    "Status": "Pending", "Issue_Type": issue, "Vehicle_Plate": st.session_state.vehicle_plate
                }
                create_repair_ticket(data)
                st.success("ส่งแล้ว")

# ---------------------------------------------------------
# 6. Login Page
# ---------------------------------------------------------
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
                else: st.error("ไม่พบฐานข้อมูล")

if __name__ == "__main__":
    main()