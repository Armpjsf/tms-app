import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
import urllib.parse
import plotly.express as px # type: ignore
import pytz  # type: ignore

from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content
)

def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            st.session_state.data_store = load_all_data() # Force reload
            st.rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
    st.title("🖥️ Admin Dashboard")
    
    # Init Session Vars
    if 'form_route_name' not in st.session_state: st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state: st.session_state.form_origin = ""
    if 'form_dest' not in st.session_state: st.session_state.form_dest = ""
    if 'form_link_org' not in st.session_state: st.session_state.form_link_org = ""
    if 'form_link_dest' not in st.session_state: st.session_state.form_link_dest = ""
    if 'form_dist' not in st.session_state: st.session_state.form_dist = 100.0
    
    # Auto Reset
    if 'need_reset' not in st.session_state: st.session_state.need_reset = False
    if st.session_state.need_reset:
        st.session_state.form_route_name = ""
        st.session_state.form_origin = ""
        st.session_state.form_dest = ""
        st.session_state.form_link_org = ""
        st.session_state.form_link_dest = ""
        st.session_state.form_dist = 100.0
        st.session_state.need_reset = False

    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9 = st.tabs([
        "📝 จ่ายงาน", "📊 Profit & Data", "🔧 MMS", "⛽ น้ำมัน", 
        "🔩 สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน/คำนวณ", "⚙️ ตั้งค่าระบบ", "📖 คู่มือ"
    ])

    # --- Tab 1: จ่ายงาน (Update: แสดงสถานะคนขับ ว่าง/ติดงาน/ซ่อม) ---
    with tab1:
        st.subheader("สร้างใบงานใหม่")
        drivers_df = get_data("Master_Drivers")
        customers_df = get_data("Master_Customers")
        routes_df = get_data("Master_Routes")
        
        # โหลดข้อมูลเพื่อเช็คสถานะ (Jobs & Repairs)
        jobs_all = get_data("Jobs_Main")
        repairs_all = get_data("Repair_Tickets")
        
        # 1. หาคนขับที่ "ติดงาน" (Job ยังไม่ Completed)
        busy_drivers = []
        if not jobs_all.empty:
            # กรองงานที่สถานะไม่ใช่ Completed และไม่ใช่ Cancelled
            active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED', 'Selected'])]
            busy_drivers = active_jobs['Driver_ID'].astype(str).unique().tolist()

        # 2. หาคนขับที่ "รถเสีย" (Ticket ยังไม่ Done)
        broken_drivers = []
        if not repairs_all.empty:
            active_repairs = repairs_all[repairs_all['Status'] != 'Done']
            broken_drivers = active_repairs['Driver_ID'].astype(str).unique().tolist()
        
        driver_options = []
        driver_map = {}
        
        if not drivers_df.empty:
             target_drivers = drivers_df
             if 'Role' in drivers_df.columns:
                 roles = drivers_df['Role'].astype(str).str.lower().str.strip()
                 target_drivers = drivers_df[roles.isin(['driver', 'คนขับ'])]
                 if target_drivers.empty: target_drivers = drivers_df
             
             for _, row in target_drivers.iterrows():
                 d_id = str(row.get('Driver_ID', ''))
                 d_name = str(row.get('Driver_Name', ''))
                 d_plate = str(row.get('Vehicle_Plate', ''))
                 
                 if d_id and d_id.lower() not in ['nan', 'none', '', 'null']:
                     # --- Logic เช็คสถานะ ---
                     status_icon = "🟢"
                     status_text = "ว่าง"
                     
                     if d_id in broken_drivers:
                         status_icon = "🔧"
                         status_text = "แจ้งซ่อม"
                     elif d_id in busy_drivers:
                         status_icon = "🔴"
                         status_text = "ติดงาน"
                     # ----------------------

                     label = f"{status_icon} {d_id} : {d_name} ({status_text})"
                     driver_options.append(label)
                     driver_map[label] = d_plate # เก็บทะเบียนรถไว้ Map ตอนเลือก

        # จัดเรียง: เอาคน "ว่าง" ขึ้นก่อน
        driver_options.sort(key=lambda x: x.startswith("🟢"), reverse=True)

        customer_options, customer_map_id, customer_map_name = [], {}, {}
        if not customers_df.empty:
            for _, row in customers_df.iterrows():
                label = f"{row['Customer_ID']} : {row['Customer_Name']}"
                customer_options.append(label)
                customer_map_id[label] = row['Customer_ID']
                customer_map_name[label] = row['Customer_Name']

        st.markdown("##### 📍 เลือกเส้นทางมาตรฐาน")
        unique_routes = ["-- กำหนดเอง --"]
        if not routes_df.empty:
            raw = routes_df['Route_Name'].dropna().astype(str).unique()
            unique_routes += [r for r in raw if r.strip() != '']

        c_sel1, c_sel2 = st.columns(2)
        sel_route = c_sel1.selectbox("1. เลือกกลุ่มงาน", unique_routes)
        dest_options = ["-"]
        if sel_route != "-- กำหนดเอง --":
            sub_df = routes_df[routes_df['Route_Name'] == sel_route]
            dest_options = sub_df['Destination'].unique().tolist()
        
        sel_dest = c_sel2.selectbox("2. เลือกปลายทาง", dest_options, key="selector_dest_point")

        if sel_dest and sel_dest != "-":
             t_row = routes_df[(routes_df['Route_Name'] == sel_route) & (routes_df['Destination'] == sel_dest)]
             if not t_row.empty:
                 row = t_row.iloc[0]
                 if st.button("⬇️ ใช้ข้อมูลนี้", use_container_width=True):
                     st.session_state.form_route_name = sel_route
                     st.session_state.form_origin = row.get('Origin', '')
                     st.session_state.form_dest = row.get('Destination', '')
                     st.session_state.form_link_org = row.get('Map_Link Origin', row.get('Map_Link', ''))
                     st.session_state.form_link_dest = row.get('Map_Link Destination', '')
                     st.session_state.form_dist = float(pd.to_numeric(row.get('Distance_KM', 0), errors='coerce'))
                     st.success("ดึงข้อมูลแล้ว")

        st.divider()
        with st.form("create_job_form"):
            st.markdown("##### 📝 ข้อมูลงาน")
            c1, c2 = st.columns(2)
            with c1:
                auto_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                st.text_input("Job ID", value=auto_id, disabled=True)
                p_date = st.date_input("วันที่นัดหมาย", datetime.today())
                sel_cust = st.selectbox("ลูกค้า", customer_options) if customer_options else ""
            with c2:
                sel_drv = st.selectbox("เลือกคนขับ", driver_options)
                d_id = sel_drv.split(" : ")[0] if sel_drv else ""
                v_plate = driver_map.get(sel_drv, "")
                v_type = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
            
            r_name = st.text_input("ชื่อเส้นทาง", key="form_route_name")
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("ต้นทาง", key="form_origin")
            with c4: link_org = st.text_input("ลิ้งค์ต้นทาง", key="form_link_org")
            c5, c6 = st.columns(2)
            with c5: dest = st.text_input("ปลายทาง", key="form_dest")
            with c6: link_dest = st.text_input("ลิ้งค์ปลายทาง", key="form_link_dest")
            
            est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
            with st.container():
                st.write("")
                if origin and dest:
                    st.link_button("🗺️ เช็คระยะทาง", f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(origin)}&destination={urllib.parse.quote(dest)}")

            st.divider()
            def_p, def_f, def_h, def_w, def_n = get_config_value("price_profit", 1000), get_config_value("opt_floor", 100), get_config_value("opt_helper", 300), get_config_value("opt_wait", 300), get_config_value("opt_night", 1000)
            
            st.markdown("**Option**")
            o1, o2, o3 = st.columns(3)
            with o1: fl = st.number_input(f"ยกชั้น ({def_f})", 0)
            with o2: hp = st.number_input(f"คนยก ({def_h})", 0)
            with o3: wt = st.number_input(f"รอ ({def_w})", 0)
            o4, o5 = st.columns(2)
            with o4: ret = st.checkbox("สินค้าคืน")
            with o5: nt = st.number_input(f"ค้างคืน ({def_n})", 0)

            st.divider()
            st.markdown("### 💰 Override ราคา")
            m1, m2 = st.columns(2)
            with m1: man_price = st.number_input("ราคาขาย (0=Auto)", 0.0)
            with m2: man_cost = st.number_input("ต้นทุน (0=Auto)", 0.0)

            submitted = st.form_submit_button("✅ บันทึกและจ่ายงาน", type="primary", use_container_width=True)
            
            if submitted:
                with st.status("⏳ กำลังดำเนินการ...", expanded=True) as status:
                    if not d_id or not sel_cust:
                        status.update(label="❌ กรุณากรอกข้อมูลให้ครบ", state="error")
                        st.error("เลือกคนขับและลูกค้า")
                    else:
                        st.write("⚙️ คำนวณราคา...")
                        cust_id = customer_map_id.get(sel_cust, None)
                        cust_name = customer_map_name.get(sel_cust, "")
                        
                        cur_dsl = 30.00
                        try:
                            prices = get_fuel_prices()
                            if prices:
                                ptt = prices.get('ราคาน้ำมัน ปตท. (ptt)', {})
                                for k, v in ptt.items():
                                    if "ดีเซล" in k: cur_dsl = float(v.replace(',','')); break
                        except: pass

                        auto_cost = calculate_driver_cost(p_date, est_dist, v_type, cur_dsl)
                        base = auto_cost + def_p if auto_cost > 0 else 0
                        sur = (fl*def_f) + (hp*def_h) + (wt*def_w) + (nt*def_n)
                        auto_price = base + sur
                        if ret: auto_price *= 1.5
                        
                        final_price = man_price if man_price > 0 else auto_price
                        final_cost = man_cost if man_cost > 0 else auto_cost
                        
                        final_link = link_dest if link_dest else (link_org if link_org else "")
                        if not final_link and origin and dest:
                            final_link = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(origin)}&destination={urllib.parse.quote(dest)}"

                        st.write("💾 บันทึกข้อมูล (Append)...")
                        new_job = {
                            "Job_ID": auto_id, "Job_Status": "ASSIGNED", "Plan_Date": p_date.strftime("%Y-%m-%d"),
                            "Customer_ID": cust_id, "Customer_Name": cust_name, "Route_Name": r_name,
                            "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": final_link,
                            "Driver_ID": d_id, "Vehicle_Plate": v_plate, "Est_Distance_KM": est_dist,
                            "Price_Customer": final_price, "Cost_Driver_Total": final_cost, 
                            "Actual_Delivery_Time": "", "Photo_Proof_Url": "", "Signature_Url": ""
                        }
                        
                        if create_new_job(new_job):
                            st.session_state.need_reset = True # Set Flag
                            status.update(label="✅ สำเร็จ!", state="complete", expanded=False)
                            st.success(f"บันทึกแล้ว! (ID: {auto_id})")
                            time.sleep(0.5)
                            st.rerun()
                        else:
                            status.update(label="❌ ผิดพลาด", state="error")

        st.write("---"); st.subheader("รายการงานล่าสุด")
        jobs_view = get_data("Jobs_Main")
        if not jobs_view.empty:
            st.dataframe(jobs_view, use_container_width=True, column_config={"Photo_Proof_Url": st.column_config.ImageColumn("รูป"), "GoogleMap_Link": st.column_config.LinkColumn("Map")})

        if not jobs_view.empty and not drivers_df.empty:
            with st.expander("เปลี่ยนคนขับ"):
                editable = jobs_view[jobs_view['Job_Status'].isin(['PLANNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])]
                if not editable.empty:
                    jid = st.selectbox("Job ID", editable['Job_ID'].unique())
                    nd = st.selectbox("คนขับใหม่", driver_options)
                    if st.button("เปลี่ยน"):
                        nid = nd.split(" : ")[0]
                        np = driver_map.get(nd, "")
                        if simple_update_job_status(jid, "ASSIGNED", {"Driver_ID": nid, "Vehicle_Plate": np}):
                            st.success("Changed"); time.sleep(1); st.rerun()

    # --- Tab 2: Dashboard ---
    with tab2:
        st.subheader("📊 Profit Dashboard")
        df_jobs = get_data("Jobs_Main")
        df_fuel = get_data("Fuel_Logs")
        df_drivers = get_data("Master_Drivers")
        
        driver_map_name, driver_map_link = {}, {}
        if not df_drivers.empty:
            for _, r in df_drivers.iterrows():
                d_id = str(r['Driver_ID'])
                driver_map_name[d_id] = r.get('Driver_Name', '-')
                lat, lon = r.get('Current_Lat'), r.get('Current_Lon')
                driver_map_link[d_id] = f"https://www.google.com/maps?q={lat},{lon}" if pd.notna(lat) and pd.notna(lon) else "-"

        tz_th = pytz.timezone('Asia/Bangkok')
        now_th = datetime.now(tz_th)

        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1: start_date = st.date_input("📅 เริ่ม", now_th.replace(day=1))
            with c2: end_date = st.date_input("📅 ถึง", now_th)

        if not df_jobs.empty:
            # แปลงวันที่ก่อนกรอง
            df_jobs['Plan_Date'] = pd.to_datetime(df_jobs['Plan_Date'], errors='coerce')
            mask = (df_jobs['Plan_Date'].dt.date >= start_date) & (df_jobs['Plan_Date'].dt.date <= end_date)
            df_filtered = df_jobs[mask].copy()
            
            df_filtered['Driver_Name'] = df_filtered['Driver_ID'].astype(str).map(driver_map_name).fillna(df_filtered['Driver_ID'])
            df_filtered['Current_Location_Link'] = df_filtered['Driver_ID'].astype(str).map(driver_map_link).fillna('-')
            if 'Customer_Name' not in df_filtered.columns: df_filtered['Customer_Name'] = '-'
            
            total_rev = df_filtered['Price_Customer'].sum()
            total_cost = df_filtered['Cost_Driver_Total'].sum()
            fuel_cost = 0
            
            # Fuel Calculation (Fix Date)
            df_fuel_clean = pd.DataFrame()
            if not df_fuel.empty and 'Date_Time' in df_fuel.columns:
                df_fuel['Date_Time'] = pd.to_datetime(df_fuel['Date_Time'], errors='coerce')
                df_fuel_clean = df_fuel.dropna(subset=['Date_Time'])
                if not df_fuel_clean.empty:
                    f_mask = (df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)
                    fuel_cost = df_fuel_clean[f_mask]['Price_Total'].sum()
                
            net_profit = total_rev - total_cost - fuel_cost
            margin = (net_profit / total_rev * 100) if total_rev > 0 else 0
            
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับ", f"{total_rev:,.0f}")
            k2.metric("💸 ต้นทุน", f"{total_cost + fuel_cost:,.0f}")
            k3.metric("📈 กำไร", f"{net_profit:,.0f}", f"{margin:.1f}%")
            k4.metric("🚚 เที่ยววิ่ง", f"{len(df_filtered)}")
            
            st.divider()
            g1, g2 = st.columns(2)
            with g1:
                p_veh = df_filtered.groupby('Vehicle_Plate')[['Price_Customer', 'Cost_Driver_Total']].sum().reset_index()
                p_veh['Profit'] = p_veh['Price_Customer'] - p_veh['Cost_Driver_Total']
                fig1 = px.bar(p_veh, x='Vehicle_Plate', y='Profit', title="กำไรรายคัน (Gross)", color='Profit', color_continuous_scale='Greens')
                st.plotly_chart(fig1, use_container_width=True)
            with g2:
                cust_share = df_filtered.groupby('Customer_Name')['Price_Customer'].sum().reset_index()
                fig2 = px.pie(cust_share, values='Price_Customer', names='Customer_Name', title="สัดส่วนลูกค้า", hole=0.4)
                st.plotly_chart(fig2, use_container_width=True)

            if not df_fuel_clean.empty:
                st.divider()
                eff_data = []
                for plate in df_filtered['Vehicle_Plate'].unique():
                    fl = df_fuel_clean[df_fuel_clean['Vehicle_Plate']==str(plate)].sort_values('Odometer')
                    if len(fl) >= 2:
                        dist = fl.iloc[-1]['Odometer'] - fl.iloc[0]['Odometer']
                        lit = fl.iloc[1:]['Liters'].sum()
                        if lit > 0: eff_data.append({'Vehicle': plate, 'Km/L': dist/lit})
                if eff_data:
                    fig3 = px.bar(pd.DataFrame(eff_data), x='Vehicle', y='Km/L', title="อัตราสิ้นเปลืองจริง (Km/L)", color='Km/L', color_continuous_scale='RdYlGn')
                    fig3.add_hline(y=10, line_dash="dot")
                    st.plotly_chart(fig3, use_container_width=True)

            st.divider()
            st.markdown("### 🏆 Fleet Performance")
            summ = df_filtered.groupby('Vehicle_Plate').agg({'Job_ID': 'count', 'Est_Distance_KM': 'sum', 'Price_Customer': 'sum', 'Cost_Driver_Total': 'sum', 'Driver_Name': 'first', 'Current_Location_Link': 'first'}).reset_index()
            
            if not df_fuel_clean.empty:
                f_period = df_fuel_clean[(df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)]
                f_grp = f_period.groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                summ = summ.merge(f_grp, on='Vehicle_Plate', how='left').fillna(0)
            else: summ['Price_Total'] = 0
            
            summ['Net_Profit'] = summ['Price_Customer'] - summ['Cost_Driver_Total'] - summ['Price_Total']
            st.dataframe(summ, use_container_width=True, column_config={"Current_Location_Link": st.column_config.LinkColumn("Map"), "Price_Customer": st.column_config.NumberColumn(format="%d"), "Net_Profit": st.column_config.NumberColumn(format="%d")})
            
            st.divider()
            c_s1, c_s2 = st.columns([3, 1])
            with c_s1: st.info("ส่งข้อมูลให้บัญชี")
            with c_s2:
                if st.button("🚀 Sync Accounting"):
                    with st.spinner("Sending..."):
                        ok, msg = sync_to_legacy_sheet(start_date, end_date)
                        if ok: st.success(msg)
                        else: st.error(msg)
        else: st.warning("ไม่มีข้อมูล")

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔔 แจ้งเตือนเช็คระยะ")
        maint_df = get_maintenance_status_all()
        if not maint_df.empty:
            alerts = maint_df[maint_df['Is_Due'] == True]
            if not alerts.empty: st.error(f"⚠️ ถึงกำหนด {len(alerts)} รายการ"); st.dataframe(alerts)
            else: st.success("✅ รถปกติ")
        
        with st.expander("🛠️ บันทึกการเข้าศูนย์"):
            with st.form("maint_f"):
                d = get_data("Master_Drivers"); pl = d['Vehicle_Plate'].unique() if not d.empty else []
                mp = st.selectbox("ทะเบียน", pl); mt = st.selectbox("รายการ", ["ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง/ช่วงล่าง"])
                md = st.date_input("วันที่", datetime.today()); mo = st.number_input("เลขไมล์", 0)
                if st.form_submit_button("บันทึก"):
                    if log_maintenance_record({"Log_ID": f"MT-{int(time.time())}", "Date_Service": md.strftime("%Y-%m-%d"), "Vehicle_Plate": mp, "Service_Type": mt, "Odometer": mo}): st.success("Saved"); st.rerun()

        st.divider(); st.subheader("🔧 แจ้งซ่อม")
        tk = get_data("Repair_Tickets")
        if not tk.empty:
            st.dataframe(tk, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})
            with st.expander("อนุมัติ"):
                tid = st.selectbox("Ticket ID", tk['Ticket_ID'].unique())
                if tid:
                    ns = st.selectbox("Status", ["Approved", "Done"]); co = st.number_input("Cost", 0.0)
                    if st.button("Update"):
                        idx = tk[tk['Ticket_ID']==tid].index[0]
                        tk.at[idx, 'Status'] = ns; tk.at[idx, 'Cost_Total'] = co
                        if ns=="Done": tk.at[idx, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                        update_sheet("Repair_Tickets", tk); st.success("Updated"); st.rerun()

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ประวัติเติมน้ำมัน")
        st.dataframe(get_data("Fuel_Logs"), use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})

    # --- Tab 5: Stock ---
    with tab5:
        c1, c2 = st.columns([2,1])
        with c1: st.dataframe(get_data("Stock_Parts"), use_container_width=True)
        with c2: 
            with st.form("stk"): 
                pn = st.text_input("อะไหล่"); pq = st.number_input("จำนวน", 1)
                if st.form_submit_button("เพิ่ม"): update_sheet("Stock_Parts", pd.concat([get_data("Stock_Parts"), pd.DataFrame([{"Part_ID": f"P-{int(time.time())}", "Part_Name": pn, "Qty_On_Hand": pq}])], ignore_index=True)); st.rerun()

    # --- Tab 6: GPS ---
    with tab6:
        st.subheader("📍 ตำแหน่งรถปัจจุบัน")
        drivers = get_data("Master_Drivers")
        if not drivers.empty:
            drivers = drivers.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
            drivers['lat'] = pd.to_numeric(drivers['lat'], errors='coerce')
            drivers['lon'] = pd.to_numeric(drivers['lon'], errors='coerce')
            active_cars = drivers.dropna(subset=['lat', 'lon']).copy()
            
            if not active_cars.empty:
                st.map(active_cars[['lat', 'lon']])
                st.divider()
                st.markdown("### 📋 รายละเอียดรายคัน")
                active_cars['Google_Maps_Link'] = active_cars.apply(lambda row: f"https://www.google.com/maps?q={row['lat']},{row['lon']}", axis=1)
                display_cols = ['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Google_Maps_Link']
                display_cols = [c for c in display_cols if c in active_cars.columns]
                st.dataframe(active_cars[display_cols], use_container_width=True, column_config={"Google_Maps_Link": st.column_config.LinkColumn("📍 แผนที่", display_text="เปิด Google Maps 🗺️")})
            else: st.warning("⚠️ ไม่พบพิกัดรถ")
        else: st.warning("ไม่พบข้อมูลคนขับ")

    with tab7:
        st.subheader("🧮 คำนวณราคา")
        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1: cd = st.date_input("วันที่", datetime.today()); cv = st.selectbox("รถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"]); dst = st.number_input("ระยะ", 100)
            with c2: fl = st.number_input("ยกชั้น", 0); ret = st.checkbox("ตีกลับ")
            if st.button("คำนวณ"):
                cost = calculate_driver_cost(cd, dst, cv)
                st.success(f"ต้นทุน: {cost:,.0f} | ราคาขาย: {cost+1000+(fl*100):,.0f}")
        
        st.divider()
        st.subheader("⛽ ราคาน้ำมันล่าสุด")
        
        # ปุ่มกดอัปเดต
        if st.button("🔄 อัปเดตราคาล่าสุด", key="update_fuel_new"):
            with st.spinner("กำลังดึงข้อมูล..."):
                fuel_prices = get_fuel_prices()
                if fuel_prices: 
                    st.session_state.fuel_prices = fuel_prices
                    st.success("อัปเดตแล้ว!")
                    time.sleep(1)
                    st.rerun() # รีเฟรชหน้าเพื่อให้ตารางแสดงผล
                else: 
                    st.error("ดึงข้อมูลไม่สำเร็จ")
        
        # ส่วนแสดงผลตาราง (อยู่นอก if button เพื่อให้แสดงตลอดเวลาที่มีข้อมูล)
        if 'fuel_prices' in st.session_state and st.session_state.fuel_prices:
            fuel_data_source = st.session_state.fuel_prices
            
            # แสดงราคา PTT
            if 'ราคาน้ำมัน ปตท. (ptt)' in fuel_data_source:
                ptt = fuel_data_source['ราคาน้ำมัน ปตท. (ptt)']
                st.markdown("### ปตท. (PTT)")
                
                # แปลง Dict เป็น List เพื่อสร้าง DataFrame
                fuel_list = []
                for k, v in ptt.items():
                    fuel_list.append({"ประเภทน้ำมัน": k, "ราคา": v})
                
                st.table(pd.DataFrame(fuel_list))
            
            # แสดงปั๊มอื่นๆ (ซ่อนใน Expander)
            other_stations = [s for s in fuel_data_source.keys() if s != 'ราคาน้ำมัน ปตท. (ptt)']
            if other_stations:
                with st.expander("🔄 ดูราคาจากปั้มอื่นๆ"):
                    for station in other_stations:
                        st.markdown(f"#### {station}")
                        station_prices = fuel_data_source[station]
                        station_list = []
                        for k, v in station_prices.items():
                            station_list.append({"ประเภทน้ำมัน": k, "ราคา": v})
                        if station_list:
                            st.table(pd.DataFrame(station_list))
        else:
            st.info("กดปุ่ม 'อัปเดตราคาล่าสุด' เพื่อดูข้อมูล")

    # --- Tab 8: Config ---
    with tab8:
        st.subheader("⚙️ Config")
        conf = get_data("System_Config")
        if not conf.empty:
            ed = st.data_editor(conf, num_rows="dynamic")
            if st.button("Save Config"): update_sheet("System_Config", ed); st.success("Saved"); st.rerun()

    # --- Tab 9: Manual ---
    with tab9:
        st.subheader("📘 คู่มือการใช้งานระบบ")
        try:
            manual_text = get_manual_content()
            st.download_button("📥 ดาวน์โหลดคู่มือ", manual_text, "manual.txt")
            st.markdown(manual_text)
        except: st.error("ไม่พบเนื้อหาคู่มือ")