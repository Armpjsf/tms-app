import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
import urllib.parse
import plotly.express as px # type: ignore
import pytz  # type: ignore
import logging

from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content
)

logger = logging.getLogger("tms.modules.ui_admin")
logger.setLevel(logging.INFO)


def _safe_df(df):
    if df is None:
        return pd.DataFrame()
    return df


def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.get('driver_name','(Unknown)')}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            try:
                st.session_state.data_store = load_all_data()  # Force reload
            except Exception:
                st.error("ไม่สามารถรีเฟรชข้อมูลได้")
                logger.exception("refresh failed")
            st.experimental_rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.experimental_rerun()
            
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

    # --- Tab 1: จ่ายงาน ---
    with tab1:
        st.subheader("สร้างใบงานใหม่ (Multi-Job)")
        drivers_df = _safe_df(get_data("Master_Drivers"))
        customers_df = _safe_df(get_data("Master_Customers"))
        routes_df = _safe_df(get_data("Master_Routes"))
        
        # Check Status
        jobs_all = _safe_df(get_data("Jobs_Main"))
        repairs_all = _safe_df(get_data("Repair_Tickets"))
        busy_drivers = []
        try:
            if not jobs_all.empty and 'Job_Status' in jobs_all.columns:
                active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED', 'Selected'])]
                if 'Driver_ID' in active_jobs.columns:
                    busy_drivers = active_jobs['Driver_ID'].astype(str).unique().tolist()
        except Exception:
            logger.exception("Error computing busy_drivers")
            busy_drivers = []

        broken_drivers = []
        try:
            if not repairs_all.empty and 'Status' in repairs_all.columns and 'Driver_ID' in repairs_all.columns:
                active_repairs = repairs_all[repairs_all['Status'] != 'Done']
                broken_drivers = active_repairs['Driver_ID'].astype(str).unique().tolist()
        except Exception:
            logger.exception("Error computing broken_drivers")
            broken_drivers = []

        driver_options, driver_map = [], {}
        if not drivers_df.empty:
             target_drivers = drivers_df.copy()
             try:
                 if 'Role' in drivers_df.columns:
                     roles = drivers_df['Role'].astype(str).str.lower().str.strip()
                     target_drivers = drivers_df[roles.isin(['driver', 'คนขับ'])]
                     if target_drivers.empty:
                         target_drivers = drivers_df
             except Exception:
                 logger.exception("Error filtering drivers by role")
                 target_drivers = drivers_df

             for _, row in target_drivers.iterrows():
                 d_id = str(row.get('Driver_ID', '')).strip()
                 d_name = str(row.get('Driver_Name', ''))
                 d_plate = str(row.get('Vehicle_Plate', ''))
                 if d_id and d_id.lower() not in ['nan', 'none', '', 'null']:
                     status_icon = "🟢"; status_text = "ว่าง"
                     if d_id in broken_drivers: status_icon = "🔧"; status_text = "แจ้งซ่อม"
                     elif d_id in busy_drivers: status_icon = "🔴"; status_text = "ติดงาน"
                     
                     label = f"{status_icon} {d_id} : {d_name} ({status_text})"
                     driver_options.append(label)
                     driver_map[label] = d_plate
        
        # ensure deterministic order but keep available ones first
        driver_options.sort(key=lambda x: x.startswith("🟢"), reverse=True)

        customer_options, customer_map_id, customer_map_name = [], {}, {}
        if not customers_df.empty:
            for _, row in customers_df.iterrows():
                cid = row.get('Customer_ID', None)
                cname = row.get('Customer_Name', None)
                if cid is None or cname is None:
                    continue
                label = f"{cid} : {cname}"
                customer_options.append(label)
                customer_map_id[label] = cid
                customer_map_name[label] = cname

        st.markdown("##### 📍 เลือกเส้นทางมาตรฐาน")
        unique_routes = ["-- กำหนดเอง --"]
        if not routes_df.empty and 'Route_Name' in routes_df.columns:
            raw = routes_df['Route_Name'].dropna().astype(str).unique()
            unique_routes += [r for r in raw if r.strip() != '']

        c_sel1, c_sel2 = st.columns(2)
        sel_route = c_sel1.selectbox("1. เลือกกลุ่มงาน", unique_routes)
        
        # --- allow custom destination ---
        dest_options = ["-- กำหนดเอง --"]
        if sel_route != "-- กำหนดเอง --" and not routes_df.empty:
            sub_df = routes_df[routes_df.get('Route_Name','') == sel_route]
            if not sub_df.empty and 'Destination' in sub_df.columns:
                dest_options += sub_df['Destination'].dropna().astype(str).unique().tolist()

        sel_dest = c_sel2.selectbox("2. เลือกปลายทาง (หรือเลือกกำหนดเองเพื่อพิมพ์ใหม่)", dest_options, key="sel_dest_admin")
        if sel_dest and sel_dest != "-- กำหนดเอง --":
             try:
                 t_row = routes_df[(routes_df.get('Route_Name','') == sel_route) & (routes_df.get('Destination','') == sel_dest)]
                 if not t_row.empty:
                     row = t_row.iloc[0]
                     if st.button("⬇️ ใช้ข้อมูลนี้", use_container_width=True):
                         st.session_state.form_route_name = sel_route
                         st.session_state.form_origin = row.get('Origin', '') or st.session_state.form_origin
                         st.session_state.form_dest = row.get('Destination', '') or st.session_state.form_dest
                         st.session_state.form_link_org = row.get('Map_Link Origin', row.get('Map_Link', st.session_state.form_link_org))
                         st.session_state.form_link_dest = row.get('Map_Link Destination', st.session_state.form_link_dest)
                         try:
                             st.session_state.form_dist = float(pd.to_numeric(row.get('Distance_KM', 0), errors='coerce') or 0)
                         except Exception:
                             st.session_state.form_dist = 0.0
                         st.success("ดึงข้อมูลแล้ว")
             except Exception:
                 logger.exception("Failed to apply route row")

        st.divider()
        with st.form("create_job_form"):
            st.markdown("##### 📝 ข้อมูลงาน")
            c1, c2 = st.columns(2)
            with c1:
                base_job_id = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                st.info(f"Base Job ID: {base_job_id}-XX")
                p_date = st.date_input("วันที่นัดหมาย", datetime.today())
                sel_cust = st.selectbox("ลูกค้า", customer_options) if customer_options else ""
            with c2:
                sel_drvs = st.multiselect("เลือกคนขับ (ได้หลายคน)", driver_options)
                v_type = st.selectbox("ประเภทรถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
            
            r_name = st.text_input("ชื่อเส้นทาง", key="form_route_name")
            c3, c4 = st.columns(2)
            with c3: origin = st.text_input("ต้นทาง", key="form_origin")
            with c4: link_org = st.text_input("ลิ้งค์ต้นทาง", key="form_link_org")
            c5, c6 = st.columns(2)
            with c5: dest = st.text_input("ปลายทาง", key="form_dest") # พิมพ์แก้ได้อิสระตรงนี้
            with c6: link_dest = st.text_input("ลิ้งค์ปลายทาง", key="form_link_dest")
            
            est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
            
            st.divider()
            st.markdown("### 💰 ราคา & Option (คิดต่อคัน)")
            # safe default retrieval
            def_p = get_config_value("price_profit", 1000) or 1000
            def_f = get_config_value("opt_floor", 100) or 100
            def_h = get_config_value("opt_helper", 300) or 300
            def_w = get_config_value("opt_wait", 300) or 300
            def_n = get_config_value("opt_night", 0) or 0
            o1, o2, o3 = st.columns(3)
            with o1: fl = st.number_input(f"ยกชั้น ({def_f})", 0)
            with o2: hp = st.number_input(f"คนยก ({def_h})", 0)
            with o3: wt = st.number_input(f"รอ ({def_w})", 0)
            o4, o5 = st.columns(2)
            with o4: ret = st.checkbox("สินค้าคืน")
            with o5: nt = st.number_input(f"ค้างคืน ({def_n})", 0)

            m1, m2 = st.columns(2)
            with m1: man_price = st.number_input("ราคาขาย/คัน (0=Auto)", 0.0)
            with m2: man_cost = st.number_input("ต้นทุน/คัน (0=Auto)", 0.0)

            submitted = st.form_submit_button("✅ ยืนยันจ่ายงาน (ทุกคัน)", type="primary", use_container_width=True)
            
            if submitted:
                with st.status("⏳ กำลังดำเนินการ...", expanded=True) as status:
                    if not sel_drvs:
                        status.update(label="❌ เลือกคนขับก่อน", state="error")
                        st.error("เลือกคนขับ")
                    elif not sel_cust:
                        status.update(label="❌ เลือกลูกค้าก่อน", state="error")
                        st.error("เลือกลูกค้า")
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
                                    if "ดีเซล" in k:
                                        cur_dsl = float(str(v).replace(',',''))
                                        break
                        except Exception:
                            logger.exception("Failed to get fuel prices")

                        try:
                            auto_cost = calculate_driver_cost(p_date, est_dist, v_type, cur_dsl)
                        except Exception:
                            logger.exception("calculate_driver_cost failed")
                            auto_cost = 0

                        base = auto_cost + def_p if auto_cost > 0 else 0
                        sur = (fl*def_f) + (hp*def_h) + (wt*def_w) + (nt*def_n)
                        auto_price = base + sur
                        if ret: auto_price *= 1.5

                        final_price = man_price if man_price > 0 else auto_price
                        final_cost = man_cost if man_cost > 0 else auto_cost

                        final_link = link_dest if link_dest else (link_org if link_org else "")
                        if not final_link and origin and dest:
                            final_link = f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(origin)}&destination={urllib.parse.quote(dest)}"

                        success_count = 0
                        total_count = len(sel_drvs)

                        for i, drv_str in enumerate(sel_drvs):
                            try:
                                parts = drv_str.split(" ")
                                d_id = parts[1] if len(parts) > 1 else parts[0]
                                v_plate = driver_map.get(drv_str, "")
                                run_id = f"{base_job_id}-{i+1:02d}"
                                st.write(f"💾 บันทึก {d_id}...")

                                # convert date to string (safe)
                                plan_date_str = p_date.strftime("%Y-%m-%d") if hasattr(p_date, "strftime") else str(p_date)

                                new_job = {
                                    "Job_ID": run_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date_str,
                                    "Customer_ID": cust_id, "Customer_Name": cust_name, "Route_Name": r_name,
                                    "Origin_Location": origin, "Dest_Location": dest, "GoogleMap_Link": final_link,
                                    "Driver_ID": d_id, "Vehicle_Plate": v_plate, "Est_Distance_KM": est_dist,
                                    "Price_Customer": final_price, "Cost_Driver_Total": final_cost, 
                                    "Actual_Delivery_Time": "", "Photo_Proof_Url": "", "Signature_Url": ""
                                }
                                ok = False
                                try:
                                    ok = create_new_job(new_job)
                                except Exception:
                                    logger.exception("create_new_job failed for %s", run_id)
                                if ok:
                                    success_count += 1
                            except Exception:
                                logger.exception("Failed to create job for driver %s", drv_str)

                        if success_count == total_count and total_count > 0:
                            st.session_state.need_reset = True
                            status.update(label=f"✅ สำเร็จ {success_count} คัน!", state="complete", expanded=False)
                            st.success("เรียบร้อย!"); time.sleep(1); st.experimental_rerun()
                        else:
                            status.update(label="❌ ผิดพลาดบางรายการ", state="error")
                            st.error(f"บันทึกได้ {success_count}/{total_count}")

        st.write("---"); st.subheader("รายการงานล่าสุด")
        jobs_view = _safe_df(get_data("Jobs_Main"))
        if not jobs_view.empty:
            try:
                st.dataframe(jobs_view, use_container_width=True, column_config={"Photo_Proof_Url": st.column_config.ImageColumn("รูป"), "GoogleMap_Link": st.column_config.LinkColumn("Map")})
            except Exception:
                # fallback without column_config if problematic
                try:
                    st.dataframe(jobs_view, use_container_width=True)
                except Exception:
                    logger.exception("Failed to render jobs_view")
        else:
            st.info("ไม่มีรายการงาน")

    # --- Tab 2: Dashboard (ฉบับแก้ปัญหาวันที่ & ปี พ.ศ.) ---
    with tab2:
        st.subheader("📊 Profit Dashboard")
        
        # 1. โหลดข้อมูล
        df_jobs = get_data("Jobs_Main")
        df_fuel = get_data("Fuel_Logs")
        df_drivers = get_data("Master_Drivers")
        
        # 2. Map ข้อมูลคนขับ
        driver_map_name, driver_map_link = {}, {}
        if not df_drivers.empty:
            for _, r in df_drivers.iterrows():
                d_id = str(r['Driver_ID'])
                driver_map_name[d_id] = r.get('Driver_Name', '-')
                lat, lon = r.get('Current_Lat'), r.get('Current_Lon')
                if pd.notna(lat) and pd.notna(lon):
                    driver_map_link[d_id] = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
                else:
                    driver_map_link[d_id] = "-"

        # 3. ตัวเลือกวันที่
        tz_th = pytz.timezone('Asia/Bangkok')
        now_th = datetime.now(tz_th)

        with st.container(border=True):
            c1, c2 = st.columns(2)
            with c1: start_date = st.date_input("📅 เริ่ม", now_th.replace(day=1))
            with c2: end_date = st.date_input("📅 ถึง", now_th)

        # 4. ฟังก์ชันแปลงวันที่ (รองรับ พ.ศ. 25xx)
        def smart_date_parse(date_series):
            # แปลงเป็น String ก่อน
            s = date_series.astype(str)
            # ถ้าเจอปี 25xx ให้ลบ 543 (แก้ปัญหา พ.ศ.)
            s = s.apply(lambda x: x.replace(str(int(x[-4:])), str(int(x[-4:])-543)) if len(x) >= 4 and x[-4:].isdigit() and int(x[-4:]) > 2400 else x)
            # แปลงเป็น datetime
            return pd.to_datetime(s, dayfirst=True, errors='coerce')

        # 5. เริ่มกรองข้อมูล
        df_filtered = pd.DataFrame()
        
        if not df_jobs.empty:
            if 'Plan_Date' in df_jobs.columns:
                # 🔥 ใช้ตัวแปลงวันที่แบบฉลาด (Smart Parse)
                df_jobs['Plan_Date_Converted'] = smart_date_parse(df_jobs['Plan_Date'])
                
                # กรองวันที่
                mask = (df_jobs['Plan_Date_Converted'].dt.date >= start_date) & (df_jobs['Plan_Date_Converted'].dt.date <= end_date)
                df_filtered = df_jobs[mask].copy()
            
                # แปลงตัวเลขการเงิน (ลบลูกน้ำ)
                cols_to_clean = ['Price_Customer', 'Cost_Driver_Total', 'Est_Distance_KM']
                for col in cols_to_clean:
                    if col in df_filtered.columns:
                        df_filtered[col] = pd.to_numeric(
                            df_filtered[col].astype(str).str.replace(',', ''), 
                            errors='coerce'
                        ).fillna(0)

                # Map ชื่อและข้อมูลอื่นๆ
                df_filtered['Driver_Name'] = df_filtered['Driver_ID'].astype(str).map(driver_map_name).fillna(df_filtered['Driver_ID'])
                df_filtered['Current_Location_Link'] = df_filtered['Driver_ID'].astype(str).map(driver_map_link).fillna('-')
                if 'Customer_Name' not in df_filtered.columns: df_filtered['Customer_Name'] = '-'
        
        # --- ตรวจสอบว่ามีข้อมูลหรือไม่ ---
        if not df_filtered.empty:
            # === ส่วนแสดงผลปกติ (Metrics & Graphs) ===
            total_rev = df_filtered['Price_Customer'].sum()
            total_cost = df_filtered['Cost_Driver_Total'].sum()
            
            # Fuel Logic
            fuel_cost = 0
            df_fuel_clean = pd.DataFrame()
            if not df_fuel.empty and 'Date_Time' in df_fuel.columns:
                df_fuel['Date_Time'] = smart_date_parse(df_fuel['Date_Time'])
                for col in ['Price_Total', 'Odometer', 'Liters']:
                    if col in df_fuel.columns:
                        df_fuel[col] = pd.to_numeric(df_fuel[col].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
                
                df_fuel_clean = df_fuel.dropna(subset=['Date_Time'])
                f_mask = (df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)
                fuel_cost = df_fuel_clean[f_mask]['Price_Total'].sum()

            net_profit = total_rev - total_cost - fuel_cost
            margin = (net_profit / total_rev * 100) if total_rev > 0 else 0
            
            # Metrics
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับ", f"{total_rev:,.0f}")
            k2.metric("💸 ต้นทุนรวม", f"{total_cost + fuel_cost:,.0f}")
            k3.metric("📈 กำไรสุทธิ", f"{net_profit:,.0f}", f"{margin:.1f}%")
            k4.metric("🚚 จำนวนเที่ยว", f"{len(df_filtered)}")
            
            st.divider()
            
            # Graphs
            g1, g2 = st.columns(2)
            with g1:
                p_veh = df_filtered.groupby('Vehicle_Plate')[['Price_Customer', 'Cost_Driver_Total']].sum().reset_index()
                p_veh['Profit'] = p_veh['Price_Customer'] - p_veh['Cost_Driver_Total']
                st.plotly_chart(px.bar(p_veh, x='Vehicle_Plate', y='Profit', title="กำไรรายคัน (Gross)", color='Profit', color_continuous_scale='Greens'), use_container_width=True)
            with g2:
                cust_share = df_filtered.groupby('Customer_Name')['Price_Customer'].sum().reset_index()
                st.plotly_chart(px.pie(cust_share, values='Price_Customer', names='Customer_Name', title="สัดส่วนลูกค้า", hole=0.4), use_container_width=True)
            
            # Fleet Table
            st.divider()
            st.markdown("### 🏆 Fleet Performance")
            summ = df_filtered.groupby('Vehicle_Plate').agg({
                'Job_ID': 'count', 'Est_Distance_KM': 'sum', 'Price_Customer': 'sum', 
                'Cost_Driver_Total': 'sum', 'Driver_Name': 'first', 'Current_Location_Link': 'first'
            }).reset_index()
            
            if not df_fuel_clean.empty:
                f_grp = df_fuel_clean[(df_fuel_clean['Date_Time'].dt.date >= start_date) & (df_fuel_clean['Date_Time'].dt.date <= end_date)].groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                summ = summ.merge(f_grp, on='Vehicle_Plate', how='left').fillna(0)
            else: summ['Price_Total'] = 0
            
            summ['Net_Profit'] = summ['Price_Customer'] - summ['Cost_Driver_Total'] - summ['Price_Total']
            st.dataframe(summ, use_container_width=True, column_config={"Current_Location_Link": st.column_config.LinkColumn("Map")})
            
            # Sync Button
            st.divider()
            if st.button("🚀 Sync Accounting", use_container_width=True):
                ok, msg = sync_to_legacy_sheet(start_date, end_date)
                if ok: st.success(msg)
                else: st.error(msg)
                
        else:
            # === ส่วนแสดงผลเมื่อไม่พบข้อมูล (Debug Mode) ===
            st.warning(f"⚠️ ไม่พบข้อมูลงานในช่วงวันที่: {start_date} ถึง {end_date}")
            
            with st.expander("🔍 กดเพื่อดูข้อมูลดิบ (Debug)", expanded=True):
                if df_jobs.empty:
                    st.error("❌ โหลดข้อมูลจาก Google Sheet ไม่ได้ (ตารางว่างเปล่า)")
                else:
                    st.write("### 1. ตัวอย่างข้อมูลใน Sheet (5 แถวแรก)")
                    st.dataframe(df_jobs[['Job_ID', 'Plan_Date']].head())
                    
                    st.write("### 2. ผลการแปลงวันที่ (เช็คว่ามี NaT หรือไม่)")
                    if 'Plan_Date_Converted' in df_jobs.columns:
                        debug_df = df_jobs[['Job_ID', 'Plan_Date', 'Plan_Date_Converted']].copy()
                        debug_df['Is_Valid'] = debug_df['Plan_Date_Converted'].notna()
                        st.dataframe(debug_df.head(10))
                        
                        invalid_count = debug_df['Is_Valid'].value_counts().get(False, 0)
                        if invalid_count > 0:
                            st.error(f"❌ มีวันที่ที่อ่านไม่ออก {invalid_count} รายการ (กลายเป็น NaT)")
                            st.write("👉 กรุณาเช็ค Format ใน Google Sheet ให้เป็น DD/MM/YYYY หรือ YYYY-MM-DD")
                        else:
                            st.success("✅ อ่านวันที่ได้ถูกต้องทุกแถว (แต่ช่วงวันที่ที่เลือกไม่มีงาน)")
                    else:
                        st.error("ยังไม่ได้แปลงวันที่")

    # --- Tab 3: MMS (Maintenance & Repair) ---
    with tab3:
        st.subheader("🔔 แจ้งเตือนเช็คระยะ (Maintenance Alert)")
        try:
            maint_df = get_maintenance_status_all()
        except Exception:
            logger.exception("get_maintenance_status_all failed")
            maint_df = pd.DataFrame()

        if not maint_df.empty:
            alerts = maint_df[maint_df.get('Is_Due', False) == True]
            if not alerts.empty:
                st.error(f"⚠️ ถึงกำหนด {len(alerts)} รายการ")
                st.dataframe(alerts)
            else:
                st.success("✅ รถปกติ")
        else:
            st.info("ไม่มีข้อมูลการเช็คระยะ")

        with st.expander("🛠️ บันทึกการเข้าศูนย์/เปลี่ยนถ่าย (Reset รอบ)"):
            with st.form("maint_f"):
                d = _safe_df(get_data("Master_Drivers"))
                pl = d['Vehicle_Plate'].unique().tolist() if not d.empty and 'Vehicle_Plate' in d.columns else []
                mp = st.selectbox("ทะเบียน", pl) if pl else st.text_input("ทะเบียน (กรอกเองถ้าไม่มีในระบบ)")
                mt = st.selectbox("รายการ", ["ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง/ชิ้นส่วน", "เช็คระบบเบรค", "อื่นๆ"])
                md = st.date_input("วันที่", datetime.today())
                mo = st.number_input("เลขไมล์", 0)
                if st.form_submit_button("บันทึก"):
                    try:
                        ok = log_maintenance_record({"Log_ID": f"MT-{int(time.time())}", "Date_Service": md.strftime("%Y-%m-%d"), "Vehicle_Plate": mp, "Service_Type": mt, "Odometer": mo})
                        if ok:
                            st.success("บันทึกเรียบร้อย")
                            st.experimental_rerun()
                        else:
                            st.error("ไม่สามารถบันทึกได้")
                    except Exception:
                        logger.exception("Failed to log maintenance record")
                        st.error("เกิดข้อผิดพลาดขณะบันทึก")

        st.divider(); st.subheader("🔧 รายการแจ้งซ่อม (Breakdown Tickets)")
        tk = _safe_df(get_data("Repair_Tickets"))

        # โหลดสต็อกมารอไว้
        stock_df = _safe_df(get_data("Stock_Parts"))
        stock_list = stock_df['Part_Name'].unique().tolist() if not stock_df.empty and 'Part_Name' in stock_df.columns else []

        if not tk.empty:
            try:
                st.dataframe(tk, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})
            except Exception:
                st.dataframe(tk, use_container_width=True)

            with st.expander("✍️ อนุมัติ / ปิดงานซ่อม"):
                try:
                    tid = st.selectbox("เลือก Ticket ID", tk['Ticket_ID'].unique())
                except Exception:
                    tid = None

                if tid:
                    selected_ticket = None
                    try:
                        selected_ticket = tk[tk['Ticket_ID'] == tid].iloc[0]
                    except Exception:
                        logger.exception("Failed to select ticket")
                        selected_ticket = None

                    if selected_ticket is not None:
                        st.info(f"อาการ: {selected_ticket.get('Description', '-')}")
                        c1, c2 = st.columns(2)
                        with c1:
                            ns = st.selectbox("สถานะใหม่", ["Approved (กำลังซ่อม)", "Done (ซ่อมเสร็จ)"], index=1)
                        with c2:
                            co = st.number_input("ค่าใช้จ่าย (ค่าแรง/ค่าของอู่นอก)", 0.0)
                        st.markdown("---")
                        st.write("📦 **เบิกอะไหล่บริษัท (ถ้ามี)**")
                        use_stock = st.checkbox("มีการใช้อะไหล่ในสต็อก")
                        p_name, p_qty = None, 0
                        if use_stock:
                            cs1, cs2 = st.columns([2, 1])
                            with cs1:
                                try:
                                    p_name = st.selectbox("เลือกอะไหล่", stock_list)
                                except Exception:
                                    p_name = st.text_input("ชื่ออะไหล่")
                            with cs2:
                                p_qty = st.number_input("จำนวนที่ใช้", 1, step=1)
                            st.caption("⚠️ เมื่อกดอัปเดต ระบบจะตัดยอดสต็อกทันที")
                        if st.button("💾 อัปเดตสถานะ & ตัดสต็อก", type="primary"):
                            stock_cut_success = True
                            if use_stock and p_name:
                                try:
                                    from modules.utils import deduct_stock_item
                                    ok, msg = deduct_stock_item(p_name, p_qty)
                                    if ok:
                                        st.toast(msg, icon="✂️")
                                    else:
                                        st.error(msg)
                                        stock_cut_success = False
                                except Exception:
                                    logger.exception("Failed to deduct stock")
                                    st.error("ตัดสต็อกไม่สำเร็จ")
                                    stock_cut_success = False
                            if stock_cut_success:
                                try:
                                    idx = tk[tk['Ticket_ID'] == tid].index[0]
                                    tk.at[idx, 'Status'] = ns
                                    tk.at[idx, 'Cost_Total'] = co
                                    if ns == "Done":
                                        tk.at[idx, 'Date_Finish'] = datetime.now().strftime("%Y-%m-%d")
                                    update_sheet("Repair_Tickets", tk)
                                    st.success("บันทึกข้อมูลเรียบร้อย!")
                                    time.sleep(1.5)
                                    st.experimental_rerun()
                                except Exception:
                                    logger.exception("Failed to update repair ticket")
                                    st.error("ไม่สามารถอัปเดตสถานะได้")
        else:
            st.info("ไม่มีรายการแจ้งซ่อม")

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ประวัติเติมน้ำมัน")
        try:
            df_fuel = _safe_df(get_data("Fuel_Logs"))
            if not df_fuel.empty:
                try:
                    st.dataframe(df_fuel, use_container_width=True, column_config={"Photo_Url": st.column_config.ImageColumn("รูป")})
                except Exception:
                    st.dataframe(df_fuel, use_container_width=True)
            else:
                st.info("ไม่มีบันทึกเติมน้ำมัน")
        except Exception:
            logger.exception("Failed to load fuel logs")
            st.error("เกิดข้อผิดพลาดขณะดึงข้อมูลเติมน้ำมัน")

    # --- Tab 5: Stock ---
    with tab5:
        c1, c2 = st.columns([2,1])
        with c1:
            try:
                st.dataframe(_safe_df(get_data("Stock_Parts")), use_container_width=True)
            except Exception:
                st.dataframe(_safe_df(get_data("Stock_Parts")), use_container_width=True)
        with c2:
            with st.form("stk"):
                pn = st.text_input("อะไหล่")
                pq = st.number_input("จำนวน", 1, step=1)
                if st.form_submit_button("เพิ่ม"):
                    try:
                        sp = _safe_df(get_data("Stock_Parts"))
                        new_row = pd.DataFrame([{"Part_ID": f"P-{int(time.time())}", "Part_Name": pn, "Qty": pq}])
                        updated = pd.concat([sp, new_row], ignore_index=True) if not sp.empty else new_row
                        update_sheet("Stock_Parts", updated)
                        st.success("เพิ่มอะไหล่เรียบร้อย")
                        st.experimental_rerun()
                    except Exception:
                        logger.exception("Failed to add stock part")
                        st.error("ไม่สามารถเพิ่มอะไหล่ได้")

    # --- Tab 6: GPS ---
    with tab6:
        st.subheader("📍 ตำแหน่งรถปัจจุบัน")
        drivers = _safe_df(get_data("Master_Drivers"))
        try:
            if not drivers.empty:
                drivers = drivers.rename(columns={'Current_Lat': 'lat', 'Current_Lon': 'lon'})
                drivers['lat'] = pd.to_numeric(drivers['lat'], errors='coerce')
                drivers['lon'] = pd.to_numeric(drivers['lon'], errors='coerce')
                active_cars = drivers.dropna(subset=['lat', 'lon']).copy()
                if not active_cars.empty:
                    try:
                        st.map(active_cars[['lat', 'lon']])
                    except Exception:
                        logger.exception("st.map failed")
                    st.divider()
                    st.markdown("### 📋 รายละเอียดรายคัน")
                    active_cars['Google_Maps_Link'] = active_cars.apply(lambda row: f"https://www.google.com/maps?q={row['lat']},{row['lon']}", axis=1)
                    display_cols = ['Driver_Name', 'Vehicle_Plate', 'Last_Update', 'Google_Maps_Link']
                    display_cols = [c for c in display_cols if c in active_cars.columns]
                    try:
                        st.dataframe(active_cars[display_cols], use_container_width=True, column_config={"Google_Maps_Link": st.column_config.LinkColumn("📍 แผนที่", display_text="เปิด")})
                    except Exception:
                        st.dataframe(active_cars[display_cols], use_container_width=True)
                else:
                    st.warning("⚠️ ไม่พบพิกัดรถ")
            else:
                st.warning("ไม่พบข้อมูลคนขับ")
        except Exception:
            logger.exception("Error in GPS tab")
            st.error("เกิดข้อผิดพลาดขณะแสดงพิกัด")

    # --- Tab 7: Calc / Fuel Price ---
    with tab7:
        st.subheader("🧮 คำนวณราคา")
        with st.container():
            try:
                c1, c2 = st.columns(2)
                with c1:
                    cd = st.date_input("วันที่", datetime.today())
                    cv = st.selectbox("รถ", ["4 ล้อ", "6 ล้อ", "10 ล้อ"])
                    dst = st.number_input("ระยะ", 0.0)
                with c2:
                    fl = st.number_input("ยกชั้น", 0)
                    ret = st.checkbox("ตีกลับ")
                if st.button("คำนวณ"):
                    cost = calculate_driver_cost(cd, dst, cv)
                    st.success(f"ต้นทุน: {cost:,.0f} | ราคาขาย: {cost+1000+(fl*100):,.0f}")
            except Exception:
                logger.exception("Calc tab failed")
                st.error("ไม่สามารถคำนวณได้")

        st.divider()
        st.subheader("⛽ ราคาน้ำมันล่าสุด")
        if st.button("🔄 อัปเดตราคาล่าสุด", key="update_fuel_new"):
            with st.spinner("กำลังดึงข้อมูล..."):
                try:
                    fuel_prices = get_fuel_prices()
                    if fuel_prices:
                        st.session_state.fuel_prices = fuel_prices
                        st.success("อัปเดตแล้ว!")
                    else:
                        st.error("ดึงข้อมูลไม่สำเร็จ")
                except Exception:
                    logger.exception("Failed to update fuel prices")
                    st.error("เกิดข้อผิดพลาดขณะดึงข้อมูล")

        if st.session_state.get('fuel_prices'):
            try:
                if 'ราคาน้ำมัน ปตท. (ptt)' in st.session_state.fuel_prices:
                    ptt = st.session_state.fuel_prices['ราคาน้ำมัน ปตท. (ptt)']
                    st.markdown("### ปตท. (PTT)")
                    fuel_data = []
                    for fuel, price in ptt.items():
                        unit = "บาท/กก." if "NGV" in fuel else "บาท/ลิตร"
                        fuel_data.append([fuel, f"{price} {unit}"])
                    st.table(pd.DataFrame(fuel_data, columns=["ประเภทน้ำมัน", "ราคา"]))
                other_stations = [s for s in st.session_state.fuel_prices.keys() if s != 'ราคาน้ำมัน ปตท. (ptt)']
                if other_stations:
                    with st.expander("🔄 ดูราคาจากปั้มอื่นๆ"):
                        for station in other_stations:
                            st.markdown(f"#### {station}")
                            station_prices = st.session_state.fuel_prices[station]
                            station_data = []
                            for fuel, price in station_prices.items():
                                unit = "บาท/กก." if "NGV" in fuel else "บาท/ลิตร"
                                station_data.append([fuel, f"{price} {unit}"])
                            if station_data:
                                st.table(pd.DataFrame(station_data, columns=["ประเภทน้ำมัน", "ราคา"]))
            except Exception:
                logger.exception("Failed to render fuel prices")

    # --- Tab 8: Config ---
    with tab8:
        st.subheader("⚙️ Config")
        conf = _safe_df(get_data("System_Config"))
        if not conf.empty:
            try:
                ed = st.data_editor(conf, num_rows="dynamic")
                if st.button("Save Config"):
                    try:
                        update_sheet("System_Config", ed)
                        st.success("Saved")
                        st.experimental_rerun()
                    except Exception:
                        logger.exception("Failed to save config")
                        st.error("ไม่สามารถบันทึกการตั้งค่าได้")
            except Exception:
                logger.exception("Config editor failed")
                st.error("ไม่สามารถเปิด editor ได้")
        else:
            st.info("ยังไม่มีการตั้งค่า")

    # --- Tab 9: Manual ---
    with tab9:
        st.subheader("📘 คู่มือการใช้งานระบบ")
        try:
            manual_text = get_manual_content()
            if manual_text:
                st.download_button("📥 ดาวน์โหลดคู่มือ", manual_text, "manual.txt")
                st.markdown(manual_text)
            else:
                st.info("ไม่มีเนื้อหาคู่มือ")
        except Exception:
            logger.exception("Failed to load manual")
            st.error("ไม่พบเนื้อหาคู่มือ")