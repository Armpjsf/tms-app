import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
import urllib.parse
import plotly.express as px # type: ignore
import pytz  # type: ignore
import logging
import io 

from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job, create_fuel_log,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content, deduct_stock_item
)

# ✅ ประกาศ Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper: Safe Data Loader (สร้างตารางเปล่าถ้าไม่มีข้อมูล เพื่อป้องกัน Error) ---
def get_data_safe(sheet_name, default_cols):
    try:
        df = get_data(sheet_name)
        if df.empty or len(df.columns) == 0:
            return pd.DataFrame(columns=default_cols)
        return df
    except:
        return pd.DataFrame(columns=default_cols)

def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            st.session_state.data_store = load_all_data()
            if hasattr(st, "rerun"): st.rerun()
            else: st.experimental_rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            if hasattr(st, "rerun"): st.rerun()
            else: st.experimental_rerun()
            
        st.caption("v3.0 Full Structure")
            
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
        if hasattr(st, "rerun"): st.rerun()
        else: st.experimental_rerun()

    # ✅ ปรับ Tabs ให้ตรงกับ menu_structure.csv
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9 = st.tabs([
        "📝 จ่ายงาน", "📊 รายงาน/Dashboard", "🔧 ใบแจ้งซ่อม/ต่อสัญญา", "⛽ เติมน้ำมัน", 
        "🗂️ ยานพาหนะ/สต็อก", "🗺️ GPS/ตรวจสภาพ", "⛽ ราคาน้ำมัน", "⚙️ ตั้งค่า/ผู้ใช้", "📖 คู่มือ"
    ])

    # --- Tab 1: จ่ายงาน (Job Dispatch) ---
    with tab1:
        st.subheader("สร้างใบงานใหม่ (Job Order)")
        try:
            drivers_df = get_data("Master_Drivers")
            customers_df = get_data("Master_Customers")
            routes_df = get_data("Master_Routes")
            jobs_all = get_data("Jobs_Main")
            repairs_all = get_data("Repair_Tickets")
        except Exception as e:
            st.error("โหลดข้อมูลไม่สำเร็จ กรุณากดรีเฟรช")
            return

        # Check Status
        busy_drivers = []
        if not jobs_all.empty and 'Job_Status' in jobs_all.columns:
            active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED', 'Selected'])]
            if 'Driver_ID' in active_jobs.columns:
                busy_drivers = active_jobs['Driver_ID'].astype(str).unique().tolist()
        
        broken_drivers = []
        if not repairs_all.empty and 'Status' in repairs_all.columns:
            active_repairs = repairs_all[repairs_all['Status'] != 'Done']
            if 'Driver_ID' in active_repairs.columns:
                broken_drivers = active_repairs['Driver_ID'].astype(str).unique().tolist()

        driver_options, driver_map = [], {}
        if not drivers_df.empty:
             for _, row in drivers_df.iterrows():
                 d_id = str(row.get('Driver_ID', ''))
                 d_name = str(row.get('Driver_Name', ''))
                 if d_id:
                     status_icon = "🟢"
                     if d_id in broken_drivers: status_icon = "🔧"
                     elif d_id in busy_drivers: status_icon = "🔴"
                     
                     label = f"{status_icon} {d_id} : {d_name}"
                     driver_options.append(label)
                     driver_map[label] = row.get('Vehicle_Plate', '')
        
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
        
        dest_options = ["-- กำหนดเอง --"]
        if sel_route != "-- กำหนดเอง --":
            sub_df = routes_df[routes_df['Route_Name'] == sel_route]
            dest_options += sub_df['Destination'].unique().tolist()
        
        sel_dest = c_sel2.selectbox("2. เลือกปลายทาง", dest_options, key="selector_dest_point")

        if sel_dest and sel_dest != "-- กำหนดเอง --":
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
                st.info(f"Base Job ID: {auto_id}-XX")
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
            with c5: dest = st.text_input("ปลายทาง", key="form_dest")
            with c6: link_dest = st.text_input("ลิ้งค์ปลายทาง", key="form_link_dest")
            
            c_cargo1, c_cargo2 = st.columns(2)
            with c_cargo1: cargo_type = st.text_input("ประเภทสินค้า", "")
            with c_cargo2: cargo_qty = st.number_input("จำนวนสินค้า (Qty)", 0, help="จำนวนชิ้น/พาเลท/ตัน")

            est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
            
            st.divider()
            st.markdown("### 💰 ราคา & Option")
            def_p, def_f, def_h, def_w, def_n = get_config_value("price_profit", 1000), get_config_value("opt_floor", 100), get_config_value("opt_helper", 300), get_config_value("opt_wait", 300), get_config_value("opt_night", 1000)
            
            o1, o2, o3 = st.columns(3)
            with o1: fl = st.number_input(f"ยกชั้น ({def_f})", 0)
            with o2: hp = st.number_input(f"คนยก ({def_h})", 0)
            with o3: wt = st.number_input(f"รอ ({def_w})", 0)
            o4, o5 = st.columns(2)
            with o4: ret = st.checkbox("สินค้าคืน (คิด 50%)")
            with o5: nt = st.number_input(f"ค้างคืน ({def_n})", 0)

            st.markdown("##### ➕ งานพ่วง (Add-on)")
            has_trailer = st.checkbox("มีงานพ่วง/บวกเพิ่ม", help="ติ๊กหากมีงานพ่วง หรือจุดจอดเพิ่ม")
            if has_trailer:
                t1, t2 = st.columns(2)
                with t1: p_trailer = st.number_input("ราคาพ่วง (เก็บลูกค้า)", 0.0)
                with t2: c_trailer = st.number_input("ค่าเที่ยวพ่วง (จ่ายคนขับ)", 0.0)
            else:
                p_trailer, c_trailer = 0.0, 0.0

            st.divider()
            m1, m2 = st.columns(2)
            with m1: man_price = st.number_input("ราคาเหมาลูกค้า/คัน (รวมทั้งหมด)", 0.0, help="ใช้ราคานี้แทน Auto")
            with m2: man_cost = st.number_input("ต้นทุนเหมาคนขับ/คัน (รวมทั้งหมด)", 0.0, help="ใช้ราคานี้แทน Auto")

            submitted = st.form_submit_button("✅ ยืนยันจ่ายงาน", type="primary", use_container_width=True)
            
            if submitted:
                with st.status("⏳ กำลังบันทึกข้อมูล...", expanded=True) as status:
                    if not sel_drvs or not sel_cust:
                        status.update(label="❌ ข้อมูลไม่ครบ", state="error")
                        st.error("กรุณาเลือกคนขับและลูกค้า")
                    else:
                        cust_id = customer_map_id.get(sel_cust, None)
                        cust_name = customer_map_name.get(sel_cust, "")
                        
                        auto_cost = calculate_driver_cost(p_date, est_dist, v_type)
                        
                        if man_price > 0:
                            p_total = man_price; p_base = man_price; p_extra = 0; p_return = 0
                        else:
                            p_base = auto_cost + def_p if auto_cost > 0 else 0
                            p_extra = (fl*def_f) + (hp*def_h) + (wt*def_w) + (nt*def_n)
                            p_return = p_base * 0.5 if ret else 0
                            p_total = p_base + p_extra + p_return + p_trailer

                        if man_cost > 0:
                            c_total = man_cost; c_base = man_cost; c_extra = 0; c_return = 0
                        else:
                            c_base = auto_cost
                            c_extra = (fl*def_f) + (hp*def_h)
                            c_return = c_base * 0.5 if ret else 0
                            c_total = c_base + c_extra + c_return + c_trailer
                        
                        final_link = link_dest if link_dest else (link_org if link_org else "")
                        if not final_link and origin and dest:
                            org_enc = urllib.parse.quote(origin)
                            dest_enc = urllib.parse.quote(dest)
                            final_link = f"https://www.google.com/maps/dir/?api=1&origin={org_enc}&destination={dest_enc}"

                        success_count = 0
                        for i, drv_str in enumerate(sel_drvs):
                            d_id = drv_str.split(" ")[1] if len(drv_str.split(" ")) > 1 else ""
                            v_plate = driver_map.get(drv_str, "")
                            run_id = f"{auto_id}-{i+1:02d}"
                            plan_date_str = p_date.strftime("%Y-%m-%d")
                            final_cargo_str = f"{cargo_type} : {cargo_qty}" if cargo_type else str(cargo_qty)

                            new_job = {
                                "Job_ID": run_id, "Job_Status": "ASSIGNED", "Plan_Date": plan_date_str,
                                "Customer_ID": cust_id, "Customer_Name": cust_name, "Route_Name": r_name,
                                "Vehicle_Type": v_type, "Cargo_Qty": final_cargo_str, 
                                "Origin_Location": origin, "Dest_Location": dest, 
                                "Est_Distance_KM": est_dist, "GoogleMap_Link": final_link,
                                "Driver_ID": d_id, "Vehicle_Plate": v_plate,
                                "Actual_Pickup_Time": "", "Actual_Delivery_Time": "", "Arrive_Dest_Time": "",
                                "Photo_Proof_Url": "", "Signature_Url": "",
                                "Price_Cust_Base": p_base, "Price_Cust_Fuel": 0, "Price_Cust_Extra": p_extra,
                                "Price_Cust_Trailer": p_trailer, "Price_Cust_Return": p_return, "Price_Cust_Other": 0,
                                "Price_Cust_Total": p_total,
                                "Cost_Driver_Base": c_base, "Cost_Driver_Fuel": 0, "Cost_Driver_Extra": c_extra,
                                "Cost_Driver_Trailer": c_trailer, "Cost_Driver_Return": c_return, "Cost_Driver_Other": 0,
                                "Cost_Driver_Total": c_total,
                                "Payment_Status": "รอจ่าย",
                                # Fallback columns
                                "Price_Customer": p_total, "Cost_Driver_Total": c_total
                            }
                            if create_new_job(new_job): success_count += 1
                        
                        if success_count == len(sel_drvs):
                            st.session_state.need_reset = True
                            status.update(label=f"✅ บันทึกสำเร็จ {success_count} รายการ!", state="complete", expanded=False)
                            st.success("บันทึกข้อมูลเรียบร้อย")
                            time.sleep(1)
                            if hasattr(st, "rerun"): st.rerun()
                            else: st.experimental_rerun()
                        else:
                            status.update(label="❌ มีข้อผิดพลาดบางรายการ", state="error")

        st.write("---"); st.subheader("รายการงานล่าสุด")
        try:
            jobs_view = get_data("Jobs_Main")
            if not jobs_view.empty:
                cols_to_show = ["Job_ID", "Plan_Date", "Customer_Name", "Driver_Name", "Vehicle_Plate", "Route_Name", "Cargo_Qty", "Job_Status", "Payment_Status"]
                valid_cols = [c for c in cols_to_show if c in jobs_view.columns]
                st.dataframe(jobs_view[valid_cols].head(10), use_container_width=True)
        except Exception as e:
            logger.error(f"Table view error: {e}")
    
    # --- Tab 2: Reports (Dashboard) ---
    with tab2:
        st.subheader("📊 รายงานและสถิติ (Reports)")
        
        with st.spinner("Loading..."):
            df_jobs = get_data("Jobs_Main")
            df_fuel = get_data("Fuel_Logs")
            df_drivers = get_data("Master_Drivers")

        # Date Parsing Logic
        def parse_date(s):
            try:
                s = str(s).strip()
                if not s or s.lower() == 'nan': return pd.NaT
                if len(s) > 4 and s[-4:].isdigit() and int(s[-4:]) > 2400:
                    s = s[:-4] + str(int(s[-4:])-543)
                return pd.to_datetime(s, dayfirst=True, errors='coerce')
            except: return pd.NaT

        c1, c2 = st.columns(2)
        with c1: start_date = st.date_input("📅 เริ่ม", datetime.now().replace(day=1))
        with c2: end_date = st.date_input("📅 ถึง", datetime.now())

        if not df_jobs.empty and 'Plan_Date' in df_jobs.columns:
            df_jobs['PD'] = df_jobs['Plan_Date'].apply(parse_date)
            mask = (df_jobs['PD'].dt.date >= start_date) & (df_jobs['PD'].dt.date <= end_date)
            df_filter = df_jobs[mask].copy()
            
            if not df_filter.empty:
                p_col = 'Price_Cust_Total' if 'Price_Cust_Total' in df_filter.columns else 'Price_Customer'
                c_col = 'Cost_Driver_Total'
                
                # Check for columns exists
                if p_col not in df_filter.columns: df_filter[p_col] = 0
                if c_col not in df_filter.columns: df_filter[c_col] = 0

                for c in [p_col, c_col]:
                    if c in df_filter.columns:
                        df_filter[c] = pd.to_numeric(df_filter[c].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
                
                rev = df_filter[p_col].sum()
                cost = df_filter[c_col].sum()
                
                # Fuel
                fuel_cost = 0
                if not df_fuel.empty and 'Date_Time' in df_fuel.columns:
                    df_fuel['DT'] = df_fuel['Date_Time'].apply(parse_date)
                    df_fuel['Price_Total'] = pd.to_numeric(df_fuel['Price_Total'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
                    f_mask = (df_fuel['DT'].dt.date >= start_date) & (df_fuel['DT'].dt.date <= end_date)
                    fuel_cost = df_fuel[f_mask]['Price_Total'].sum()

                net = rev - cost - fuel_cost
                
                k1, k2, k3 = st.columns(3)
                k1.metric("รายรับ (Revenue)", f"{rev:,.0f}")
                k2.metric("ต้นทุนรวม (Cost+Fuel)", f"{cost+fuel_cost:,.0f}")
                k3.metric("กำไรสุทธิ (Net)", f"{net:,.0f}")
                
                st.divider()
                st.markdown("### 📥 Export Reports")
                csv = convert_df_to_csv(df_filter)
                st.download_button("Download Report CSV", csv, "profit_report.csv", "text/csv")
                
                if st.button("🚀 Sync Accounting"):
                    ok, msg = sync_to_legacy_sheet(start_date, end_date)
                    if ok: st.success(msg)
                    else: st.error(msg)
            else:
                st.warning("ไม่พบข้อมูลในช่วงเวลานี้")

    # --- Tab 3: MMS (ตาม menu_structure) ---
    with tab3:
        st.subheader("🔧 ใบแจ้งซ่อม / แจ้งต่อสัญญา")
        mms1, mms2, mms3 = st.tabs(["📝 ใบสั่งซ่อม (Repair Orders)", "📄 ต่อสัญญา/ประกัน (Contracts)", "✍️ บันทึก/แจ้งซ่อม"])
        
        with mms1:
            tk = get_data("Repair_Tickets")
            if not tk.empty:
                active = tk[tk['Status']!='เสร็จสิ้น']
                st.dataframe(active, use_container_width=True)
                
                with st.expander("🛠️ อัปเดตงานซ่อม"):
                    tid = st.selectbox("เลือกใบงาน", active['Ticket_ID'].unique())
                    c1,c2 = st.columns(2)
                    stt = c1.selectbox("สถานะ", ["กำลังดำเนินการ","รออะไหล่","เสร็จสิ้น"])
                    cost = c2.number_input("ค่าใช้จ่าย", 0.0)
                    if st.button("Update Ticket"):
                        tk.loc[tk['Ticket_ID']==tid, 'Status'] = stt
                        tk.loc[tk['Ticket_ID']==tid, 'Cost_Total'] = cost
                        update_sheet("Repair_Tickets", tk); st.success("Updated"); st.rerun()
            
            # ปุ่ม Export รายงานซ่อม (เพิ่มตาม CSV)
            st.markdown("---")
            if not tk.empty:
                csv_rep = convert_df_to_csv(tk)
                st.download_button("📥 ดาวน์โหลดรายงานซ่อมทั้งหมด", csv_rep, "repair_report.csv", "text/csv")

        # ✅ เพิ่มเมนูแจ้งต่อสัญญา (ตาม CSV)
        with mms2:
            st.markdown("### 📅 แจ้งเตือนการต่อสัญญา/ประกัน")
            drivers = get_data("Master_Drivers")
            if not drivers.empty and 'Insurance_Expiry' in drivers.columns:
                drivers['Insurance_Expiry'] = pd.to_datetime(drivers['Insurance_Expiry'], errors='coerce')
                drivers['Days_Left'] = (drivers['Insurance_Expiry'] - datetime.now()).dt.days
                # แจ้งเตือนถ้าเหลือ < 45 วัน
                expiring = drivers[(drivers['Days_Left'] < 45) & (drivers['Days_Left'] > -365)]
                if not expiring.empty:
                    st.warning(f"⚠️ มีรายการใกล้หมดอายุ {len(expiring)} รายการ")
                    st.dataframe(expiring[['Vehicle_Plate', 'Insurance_Expiry', 'Days_Left']])
                else:
                    st.success("✅ เอกสารรถทุกคันยังไม่หมดอายุ")
            else:
                st.info("ไม่พบข้อมูลวันหมดอายุประกัน (Insurance_Expiry)")

        with mms3:
            st.write("บันทึกข้อมูลแจ้งซ่อม / ตรวจสภาพ")
            with st.form("mn_log"):
                d = get_data("Master_Drivers"); pl = d['Vehicle_Plate'].unique() if not d.empty else []
                c1,c2 = st.columns(2)
                vp = c1.selectbox("ทะเบียน", pl)
                dt = c2.date_input("วันที่")
                sv = st.selectbox("รายการ", ["แจ้งซ่อม","ต่อสัญญา","ตรวจสภาพ","อื่นๆ"])
                od = st.number_input("เลขไมล์", 0)
                desc = st.text_area("รายละเอียดปัญหา/หมายเหตุ")
                if st.form_submit_button("บันทึก"):
                    log_entry = {
                        "Log_ID": f"MN-{int(time.time())}", 
                        "Date_Service": dt.strftime("%Y-%m-%d"),
                        "Vehicle_Plate": vp, 
                        "Service_Type": sv, 
                        "Odometer": od, 
                        "Description": desc
                    }
                    if log_maintenance_record(log_entry):
                        st.success("บันทึกเรียบร้อย"); st.rerun()

    # --- Tab 4: Fuel ---
    with tab4:
        st.subheader("⛽ ข้อมูลน้ำมัน")
        f1, f2, f3 = st.tabs(["ประวัติ", "บันทึก (Admin)", "รายงานสรุป"])
        
        with f1:
            fl = get_data("Fuel_Logs")
            if not fl.empty: st.dataframe(fl.sort_values('Date_Time', ascending=False), use_container_width=True)
        
        with f2:
            st.info("สำหรับ Admin บันทึกแทนคนขับ")
            with st.form("adm_fuel"):
                d = get_data("Master_Drivers"); pl = d['Vehicle_Plate'].unique() if not d.empty else []
                c1, c2 = st.columns(2); vp = c1.selectbox("รถ", pl); fst = c2.text_input("ปั๊ม", "ปตท.")
                c3, c4, c5 = st.columns(3); fodo = c3.number_input("ไมล์", 0); flit = c4.number_input("ลิตร", 0.0); fprc = c5.number_input("บาท", 0.0)
                if st.form_submit_button("บันทึก"):
                    fd = {"Log_ID": f"FA-{int(time.time())}", "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M"), "Vehicle_Plate": vp, "Odometer": fodo, "Liters": flit, "Price_Total": fprc, "Station_Name": fst, "Driver_ID": "ADMIN", "Photo_Url": "-"}
                    if create_fuel_log(fd): st.success("Saved"); st.rerun()

        with f3:
            st.write("📊 Export Report")
            fl = get_data("Fuel_Logs")
            if not fl.empty:
                csv = convert_df_to_csv(fl)
                st.download_button("📥 Download Fuel Report", csv, "fuel_logs.csv", "text/csv")

    # --- Tab 5: Master & Stock (เพิ่ม หาง และ ยาง) ---
    with tab5:
        st.subheader("🗂️ ยานพาหนะ และ สต็อก")
        # ✅ เพิ่มแท็บ หาง (Trailers) และ ยาง (Tires) ตาม CSV
        mt1, mt2, mt3, mt4, mt5 = st.tabs(["🚛 หัวลาก/รถ (Vehicles)", "🚛 หาง (Trailers)", "📦 อะไหล่ (Parts)", "⚫ ยาง (Tires)", "🛣️ เส้นทาง (Routes)"])
        
        with mt1:
            md = get_data("Master_Drivers")
            ed_md = st.data_editor(md, num_rows="dynamic", key="ed_md", use_container_width=True)
            if st.button("บันทึกข้อมูลรถ"): update_sheet("Master_Drivers", ed_md); st.success("Saved"); st.rerun()
        
        # ✅ ส่วนหาง (ใช้ตาราง Master_Trailers ถ้ามี หรือสร้างใหม่)
        with mt2:
            st.info("จัดการข้อมูลหางพ่วง")
            tr = get_data_safe("Master_Trailers", ["Trailer_ID", "Type", "License_Plate", "Status"])
            ed_tr = st.data_editor(tr, num_rows="dynamic", key="ed_tr", use_container_width=True)
            if st.button("บันทึกหาง"): update_sheet("Master_Trailers", ed_tr); st.success("Saved"); st.rerun()

        with mt3:
            sp = get_data("Stock_Parts")
            ed_sp = st.data_editor(sp, num_rows="dynamic", key="ed_sp", use_container_width=True)
            if st.button("บันทึกสต็อก"): update_sheet("Stock_Parts", ed_sp); st.success("Saved"); st.rerun()

        # ✅ ส่วนยาง (ใช้ตาราง Master_Tires)
        with mt4:
            st.info("จัดการข้อมูลยางรถ")
            ti = get_data_safe("Master_Tires", ["Tire_Serial", "Brand", "Size", "Status", "Install_Date", "Vehicle_Plate"])
            ed_ti = st.data_editor(ti, num_rows="dynamic", key="ed_ti", use_container_width=True)
            if st.button("บันทึกยาง"): update_sheet("Master_Tires", ed_ti); st.success("Saved"); st.rerun()

        with mt5:
            mr = get_data("Master_Routes")
            ed_mr = st.data_editor(mr, num_rows="dynamic", key="ed_mr", use_container_width=True)
            if st.button("บันทึกเส้นทาง"): update_sheet("Master_Routes", ed_mr); st.success("Saved"); st.rerun()

    # --- Tab 6: GPS & Inspection ---
    with tab6:
        st.subheader("📍 GPS & ตรวจสภาพ")
        g1, g2 = st.tabs(["📍 GPS Tracking", "📋 ผลตรวจสภาพ"])
        
        with g1:
            d = get_data("Master_Drivers")
            if not d.empty:
                d['lat'] = pd.to_numeric(d['Current_Lat'], errors='coerce')
                d['lon'] = pd.to_numeric(d['Current_Lon'], errors='coerce')
                act = d.dropna(subset=['lat','lon'])
                if not act.empty:
                    st.map(act[['lat','lon']])
                    st.dataframe(act[['Driver_Name','Vehicle_Plate','Last_Update']], use_container_width=True)
                else: st.warning("No GPS Data")
        
        # ✅ เพิ่มส่วนแสดงผลตรวจสภาพ (ตาม CSV)
        with g2:
            # ดึงข้อมูลจาก Maintenance Logs ที่เป็นประเภท "ตรวจสภาพ"
            ml = get_data("Maintenance_Logs")
            if not ml.empty:
                inspections = ml[ml['Service_Type'] == 'ตรวจสภาพ']
                if not inspections.empty:
                    st.dataframe(inspections, use_container_width=True)
                else: st.info("ไม่มีประวัติการตรวจสภาพ")

    # --- Tab 7: Calc ---
    with tab7:
        st.subheader("🧮 ราคาน้ำมัน & คำนวณ")
        c1,c2 = st.columns(2)
        dist = c1.number_input("Distance", 100)
        vt = c2.selectbox("Type", ["4 ล้อ","6 ล้อ","10 ล้อ"])
        if st.button("Calculate"):
            cost = calculate_driver_cost(datetime.now(), dist, vt)
            st.success(f"Cost: {cost:,.0f}")
        
        st.divider()
        if st.button("Update Fuel Price"):
            fp = get_fuel_prices()
            if fp: st.success("Updated"); st.write(fp.get('ราคาน้ำมัน ปตท. (ptt)', {}))

    # --- Tab 8: Config & Users ---
    with tab8:
        st.subheader("⚙️ ตั้งค่าระบบ / จัดการผู้ใช้")
        c1, c2, c3 = st.tabs(["ทั่วไป", "ผู้ใช้งาน/พนักงาน", "ขั้นสูง"])
        
        with c1:
            conf = get_data("System_Config")
            ed_cf = st.data_editor(conf, num_rows="dynamic", use_container_width=True)
            if st.button("Save Config"): update_sheet("System_Config", ed_cf); st.success("Saved")
            
        with c2:
            st.markdown("#### 👤 ผู้ติดต่อ/พนักงาน (Users)")
            users = get_data("Master_Drivers")
            cols_show = ["Driver_ID", "Driver_Name", "Role", "Password", "Mobile_No"]
            valid_cols = [c for c in cols_show if c in users.columns]
            
            ed_users = st.data_editor(users[valid_cols], key="user_editor", use_container_width=True)
            
            if st.button("Save Users"):
                curr_master = get_data("Master_Drivers")
                for i, row in ed_users.iterrows():
                    d_id = str(row.get('Driver_ID',''))
                    if not d_id: continue
                    idx = curr_master[curr_master['Driver_ID'].astype(str) == d_id].index
                    if not idx.empty:
                        for c in valid_cols: curr_master.at[idx[0], c] = row[c]
                    else:
                        new_r = {c: row.get(c,'') for c in curr_master.columns}
                        curr_master = pd.concat([curr_master, pd.DataFrame([new_r])], ignore_index=True)
                
                update_sheet("Master_Drivers", curr_master)
                st.success("Users Updated!"); st.rerun()

        with c3:
            st.write("⚠️ **Advanced Options**")
            if st.button("🗑️ Clear Cache"):
                st.cache_data.clear()
                st.success("Cache Cleared"); st.rerun()
            
            if st.button("💾 Backup Data (.xlsx)"):
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    for s in ["Jobs_Main","Fuel_Logs","Master_Drivers"]:
                        get_data(s).to_excel(writer, sheet_name=s[:30], index=False)
                st.download_button("Download Excel", output.getvalue(), "backup.xlsx", "application/vnd.ms-excel")

    # --- Tab 9: Manual ---
    with tab9:
        st.subheader("📘 คู่มือการใช้งานระบบ")
        
        # Add tab navigation for different manual sections
        manual_tab1, manual_tab2, manual_tab3 = st.tabs(["คู่มือใช้งาน", "วิดีโอสอน", "ติดต่อผู้พัฒนา"])
        
        with manual_tab1:
            st.markdown("### 📖 คู่มือการใช้งานระบบ")
            
            # Add table of contents
            st.markdown("""
            #### สารบัญ
            - [การใช้งานทั่วไป](#general-usage)
            - [การจัดการงาน](#job-management)
            - [การจัดการรถและคนขับ](#driver-management)
            - [การบำรุงรักษา](#maintenance)
            - [การจัดการน้ำมัน](#fuel-management)
            - [การจัดการสต็อก](#stock-management)
            - [การตั้งค่าระบบ](#system-settings)
            """)
            
            try:
                # Load manual content with caching
                manual_text = get_manual_content()
                
                # Add download button
                st.download_button(
                    label="📥 ดาวน์โหลดคู่มือฉบับเต็ม",
                    data=manual_text,
                    file_name=f"tms_manual_{datetime.now().strftime('%Y%m%d')}.txt",
                    mime="text/plain",
                    use_container_width=True
                )
                
                # Display manual content with proper formatting
                st.markdown("---")
                st.markdown(manual_text)
                
            except Exception as e:
                st.error(f"ไม่สามารถโหลดเนื้อหาคู่มือได้: {str(e)}")
                logger.exception("Error loading manual content")
                
                # Fallback to basic manual content
                st.markdown("""
                ### คู่มือการใช้งานเบื้องต้น
                
                #### การใช้งานทั่วไป
                - ใช้เมนูด้านซ้ายมือเพื่อเข้าถึงส่วนต่างๆ ของระบบ
                - กดปุ่ม "รีเฟรชข้อมูลล่าสุด" เพื่ออัปเดตข้อมูลใหม่
                
                #### การจัดการงาน
                - **แท็บ "จ่ายงาน"**: สร้างและจัดการงานขนส่ง
                - **แท็บ "Profit & Data"**: ดูรายงานและสถิติการทำงาน
                
                #### การจัดการรถและคนขับ
                - **แท็บ "MMS"**: จัดการการบำรุงรักษาและซ่อมแซม
                - **แท็บ "GPS"**: ติดตามตำแหน่งรถในเวลาจริง
                
                #### การจัดการน้ำมันและสต็อก
                - **แท็บ "น้ำมัน"**: บันทึกและตรวจสอบการเติมน้ำมัน
                - **แท็บ "สต็อก"**: จัดการอะไหล่และวัสดุสิ้นเปลือง
                
                #### การตั้งค่าระบบ
                - **แท็บ "ตั้งค่าระบบ"**: กำหนดค่าต่างๆ ของระบบ
                - **แท็บ "คู่มือ"**: ดูคู่มือการใช้งานและข้อมูลติดต่อ
                """)
        
        with manual_tab2:
            st.markdown("### 🎥 วิดีโอสอนการใช้งาน")
            
            # Add video tutorials section
            st.markdown("""
            ### วิดีโอสอนการใช้งานระบบ
            
            #### การใช้งานเบื้องต้น
            [![การใช้งานเบื้องต้น](https://img.youtube.com/vi/VIDEO_ID_1/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_1)
            
            #### การจัดการงานขนส่ง
            [![การจัดการงานขนส่ง](https://img.youtube.com/vi/VIDEO_ID_2/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_2)
            
            #### การติดตามรถและรายงาน
            [![การติดตามรถ](https://img.youtube.com/vi/VIDEO_ID_3/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_3)
            
            > หมายเหตุ: วีดีโอสอนเป็นเพียงตัวอย่าง กรุณาเปลี่ยนลิงก์ YouTube ตามจริง
            """)
            
            # Add video upload section for admin
            if st.session_state.get('user_role') == 'admin':
                with st.expander("📤 อัปโหลดวิดีโอสอนใหม่"):
                    st.file_uploader("เลือกไฟล์วิดีโอ", type=["mp4", "mov", "avi"])
                    st.text_input("ชื่อวิดีโอ")
                    st.text_area("คำอธิบาย")
                    st.button("อัปโหลดวิดีโอ", type="primary")
        
        with manual_tab3:
            st.markdown("### 📞 ติดต่อผู้พัฒนา")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("""
                #### ฝ่ายเทคนิค
                - **อีเมล**: support@example.com
                - **โทรศัพท์**: 02-XXX-XXXX
                - **ไลน์**: @tms_support
                
                #### ชั่วโมงทำงาน
                - จันทร์ - ศุกร์: 09:00 - 18:00 น.
                - เสาร์ - อาทิตย์: ปิดทำการ
                """)
            
            with col2:
                st.markdown("""
                #### ที่อยู่
                123/456 อาคารเทคโนพาร์ค
                ถนนรัชดาภิเษก
                แขวงห้วยขวาง
                เขตห้วยขวาง
                กรุงเทพมหานคร 10310
                """)
            
            # Add contact form
            st.markdown("---")
            st.markdown("### 📝 ส่งข้อความถึงเรา")
            
            with st.form("contact_form"):
                name = st.text_input("ชื่อ-นามสกุล")
                email = st.text_input("อีเมล")
                subject = st.selectbox("หัวข้อ", ["รายงานปัญหา", "สอบถามข้อมูล", "เสนอแนะ", "อื่นๆ"])
                message = st.text_area("ข้อความ")
                
                if st.form_submit_button("ส่งข้อความ"):
                    if name and email and message:
                        # Here you would typically send the message to your support system
                        st.success("ส่งข้อความเรียบร้อยแล้ว! เราจะติดต่อกลับโดยเร็วที่สุด")
                    else:
                        st.warning("กรุณากรอกข้อมูลให้ครบถ้วน")