# modules/ui_admin.py

import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime
import time
import urllib.parse
import io
import logging
# import plotly.express as px # (Optional)
import pytz  # type: ignore

# Import modules
from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job, create_fuel_log,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content, deduct_stock_item,
    parse_flexible_date, create_repair_ticket
)

# ✅ ประกาศ Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper: Safe Data Loader ---
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
            
        st.caption("v3.4 Stable")
            
    st.title("🖥️ Admin Dashboard")
    
    # Init Session Vars (Auto Reset Form)
    if 'form_route_name' not in st.session_state: st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state: st.session_state.form_origin = ""
    if 'form_dest' not in st.session_state: st.session_state.form_dest = ""
    if 'form_link_org' not in st.session_state: st.session_state.form_link_org = ""
    if 'form_link_dest' not in st.session_state: st.session_state.form_link_dest = ""
    if 'form_dist' not in st.session_state: st.session_state.form_dist = 100.0
    
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

    # Tabs Structure
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9 = st.tabs([
        "📝 จ่ายงาน (Flexible)", "📊 รายงาน/Dashboard", "🔧 ใบแจ้งซ่อม/ต่อสัญญา", "⛽ เติมน้ำมัน", 
        "🗂️ ยานพาหนะ/สต็อก", "🗺️ GPS/ตรวจสภาพ", "⛽ ราคาน้ำมัน", "⚙️ ตั้งค่า/ผู้ใช้", "📖 คู่มือ"
    ])

    # --- Tab 1: จ่ายงาน (Flexible Assignment) ---
    with tab1:
        st.subheader("สร้างใบงานใหม่ (Multi-Drop / Multi-Driver)")
        
        # Load Data
        try:
            drivers_df = get_data("Master_Drivers")
            customers_df = get_data("Master_Customers")
            routes_df = get_data("Master_Routes")
            jobs_all = get_data("Jobs_Main")
            repairs_all = get_data("Repair_Tickets")
        except Exception as e:
            st.error("โหลดข้อมูลไม่สำเร็จ กรุณากดรีเฟรช")
            return

        # 1. เช็คสถานะคนขับ
        busy_drivers = []
        if not jobs_all.empty and 'Job_Status' in jobs_all.columns:
            active_jobs = jobs_all[~jobs_all['Job_Status'].isin(['Completed', 'CANCELLED'])]
            if 'Driver_ID' in active_jobs.columns:
                busy_drivers = active_jobs['Driver_ID'].astype(str).unique().tolist()
        
        broken_drivers = []
        if not repairs_all.empty and 'Status' in repairs_all.columns:
            active_repairs = repairs_all[repairs_all['Status'] != 'Done']
            if 'Driver_ID' in active_repairs.columns:
                broken_drivers = active_repairs['Driver_ID'].astype(str).unique().tolist()

        # 2. เตรียมข้อมูล Dropdown คนขับ
        driver_options, driver_info_map = [], {}
        if not drivers_df.empty:
             for _, row in drivers_df.iterrows():
                 d_id = str(row.get('Driver_ID', '')).strip()
                 d_name = str(row.get('Driver_Name', '')).strip()
                 v_plate = str(row.get('Vehicle_Plate', '')).strip()
                 v_type_real = str(row.get('Vehicle_Type', '')).strip()
                 
                 if d_id:
                     status_icon = "🟢"
                     if d_id in broken_drivers: status_icon = "🔧"
                     elif d_id in busy_drivers: status_icon = "🔴"
                     
                     label = f"{status_icon} {d_id} : {d_name}"
                     driver_options.append(label)
                     
                     driver_info_map[label] = {
                         "id": d_id,
                         "name": d_name,
                         "plate": v_plate,
                         "type": v_type_real
                     }
        driver_options.sort(key=lambda x: x.startswith("🟢"), reverse=True)

        # 3. ลูกค้า
        customer_options, customer_map_id, customer_map_name = [], {}, {}
        if not customers_df.empty:
            for _, row in customers_df.iterrows():
                c_id = str(row.get('Customer_ID', '')).strip()
                c_name = str(row.get('Customer_Name', '')).strip()
                label = f"{c_id} : {c_name}"
                customer_options.append(label)
                customer_map_id[label] = c_id
                customer_map_name[label] = c_name

        # --- ส่วนเลือกเส้นทาง ---
        st.markdown("##### 📍 ข้อมูลงานหลัก (Main Job Info)")
        c_rt1, c_rt2 = st.columns(2)
        
        unique_routes = ["-- กำหนดเอง --"]
        if not routes_df.empty:
            raw = routes_df['Route_Name'].dropna().astype(str).unique()
            unique_routes += [r for r in raw if r.strip() != '']
            
        sel_route = c_rt1.selectbox("เลือกกลุ่มงาน (Route Group)", unique_routes)
        
        dest_options = ["-- กำหนดเอง --"]
        if sel_route != "-- กำหนดเอง --":
            sub_df = routes_df[routes_df['Route_Name'] == sel_route]
            dest_options += sub_df['Destination'].unique().tolist()
        
        sel_dest = c_rt2.selectbox("เลือกปลายทาง (Destination)", dest_options)

        if sel_dest and sel_dest != "-- กำหนดเอง --":
             t_row = routes_df[(routes_df['Route_Name'] == sel_route) & (routes_df['Destination'] == sel_dest)]
             if not t_row.empty:
                 row = t_row.iloc[0]
                 if st.button("⬇️ ดึงข้อมูลเส้นทาง", use_container_width=True):
                     st.session_state.form_route_name = sel_route
                     st.session_state.form_origin = row.get('Origin', '')
                     st.session_state.form_dest = row.get('Destination', '')
                     st.session_state.form_link_org = row.get('Map_Link Origin', row.get('Map_Link', ''))
                     st.session_state.form_link_dest = row.get('Map_Link Destination', '')
                     st.session_state.form_dist = float(pd.to_numeric(row.get('Distance_KM', 0), errors='coerce'))
                     st.toast("✅ ดึงข้อมูลแล้ว")

        # --- ฟอร์มหลัก ---
        c1, c2, c3 = st.columns(3)
        with c1: 
            p_date = st.date_input("วันที่นัดหมาย", datetime.today())
            sel_cust = st.selectbox("ลูกค้า", customer_options) if customer_options else ""
        with c2:
            r_name = st.text_input("ชื่อเส้นทาง", key="form_route_name")
            cargo_type = st.text_input("รายละเอียดสินค้า", "สินค้าทั่วไป")
        with c3:
            est_dist = st.number_input("ระยะทาง (กม.)", min_value=0.0, key="form_dist")
            cargo_qty = st.text_input("จำนวน (รวม)", "1 เที่ยว")

        with st.expander("📍 รายละเอียดต้นทาง/ปลายทาง (เพิ่มเติม)", expanded=False):
            ex1, ex2 = st.columns(2)
            with ex1:
                origin = st.text_input("ต้นทาง", key="form_origin")
                link_org = st.text_input("ลิ้งค์ต้นทาง", key="form_link_org")
            with ex2:
                dest = st.text_input("ปลายทาง", key="form_dest")
                link_dest = st.text_input("ลิ้งค์ปลายทาง", key="form_link_dest")

        # --- ส่วนจัดการคนขับและรถ ---
        st.divider()
        st.markdown("##### 🚛 จัดสรรรถและคนขับ (Assignment)")
        st.info("💡 เลือกคนขับที่ต้องการ แล้วแก้ไขทะเบียนรถ/ราคา ในตารางด้านล่างได้เลย")
        
        selected_drivers = st.multiselect("1. เลือกคนขับทั้งหมดสำหรับงานนี้:", driver_options)
        
        if selected_drivers:
            # คำนวณราคาเริ่มต้น (Auto)
            def_v_type = "6 ล้อ"
            auto_price_base = calculate_driver_cost(p_date, est_dist, def_v_type)
            auto_price_cust = auto_price_base + get_config_value("price_profit", 1000)
            
            table_data = []
            for drv_label in selected_drivers:
                info = driver_info_map.get(drv_label, {})
                table_data.append({
                    "Driver_ID": info.get("id"),
                    "Driver_Name": info.get("name"),
                    "Vehicle_Plate": info.get("plate", "-"),
                    "Vehicle_Type": info.get("type", "6 ล้อ"),
                    "Price_Customer": auto_price_cust,
                    "Cost_Driver": auto_price_base,
                    "Note": ""
                })
            
            edited_df = st.data_editor(
                pd.DataFrame(table_data),
                column_config={
                    "Driver_ID": st.column_config.TextColumn("รหัส", disabled=True),
                    "Driver_Name": st.column_config.TextColumn("ชื่อคนขับ", disabled=True),
                    "Vehicle_Plate": st.column_config.TextColumn("ทะเบียนรถ ✏️"),
                    "Vehicle_Type": st.column_config.SelectboxColumn(
                        "ประเภทรถ ✏️", options=["4 ล้อ", "6 ล้อ", "10 ล้อ", "รถพ่วง", "กระบะตู้ทึบ"], required=True
                    ),
                    "Price_Customer": st.column_config.NumberColumn("ราคาขาย (บาท) ✏️", format="%.0f"),
                    "Cost_Driver": st.column_config.NumberColumn("ต้นทุน (บาท) ✏️", format="%.0f"),
                    "Note": st.column_config.TextColumn("หมายเหตุ")
                },
                hide_index=True,
                num_rows="dynamic",
                use_container_width=True,
                key="assignment_editor"
            )
            
            total_price = edited_df["Price_Customer"].sum()
            total_cost = edited_df["Cost_Driver"].sum()
            st.caption(f"💰 ยอดรวม: รายรับ {total_price:,.0f} | ต้นทุน {total_cost:,.0f} | กำไร {total_price-total_cost:,.0f}")

            if st.button("✅ ยืนยันจ่ายงาน (Create Jobs)", type="primary", use_container_width=True):
                if not sel_cust:
                    st.error("กรุณาเลือกลูกค้าด้านบนก่อน")
                else:
                    with st.status("⏳ กำลังสร้างใบงาน...", expanded=True) as status:
                        cust_id = customer_map_id.get(sel_cust, "")
                        cust_name = customer_map_name.get(sel_cust, "")
                        
                        final_link = link_dest if link_dest else (link_org if link_org else "")
                        if not final_link and origin and dest:
                            try:
                                org_enc = urllib.parse.quote(origin)
                                dest_enc = urllib.parse.quote(dest)
                                final_link = f"https://www.google.com/maps/dir/?api=1&origin={org_enc}&destination={dest_enc}&travelmode=driving"
                            except: final_link = ""

                        auto_id_base = f"JOB-{datetime.now().strftime('%y%m%d-%H%M')}"
                        success_count = 0
                        
                        for i, row in edited_df.iterrows():
                            if not row.get("Driver_ID") and not row.get("Driver_Name"): continue
                            run_id = f"{auto_id_base}-{i+1:02d}"
                            
                            new_job = {
                                "Job_ID": run_id,
                                "Job_Status": "ASSIGNED",
                                "Plan_Date": p_date.strftime("%Y-%m-%d"),
                                "Customer_ID": cust_id,
                                "Customer_Name": cust_name,
                                "Route_Name": r_name,
                                "Vehicle_Type": row.get("Vehicle_Type"),
                                "Cargo_Qty": cargo_qty,
                                "Origin_Location": origin,
                                "Dest_Location": dest,
                                "Est_Distance_KM": est_dist,
                                "GoogleMap_Link": final_link,
                                "Driver_ID": row.get("Driver_ID"),
                                "Driver_Name": row.get("Driver_Name"),
                                "Vehicle_Plate": row.get("Vehicle_Plate"),
                                "Price_Cust_Base": row.get("Price_Customer", 0),
                                "Price_Cust_Total": row.get("Price_Customer", 0),
                                "Cost_Driver_Base": row.get("Cost_Driver", 0),
                                "Cost_Driver_Total": row.get("Cost_Driver", 0),
                                "Payment_Status": "รอจ่าย",
                                "PD": "",
                                "Actual_Pickup_Time": "", "Actual_Delivery_Time": "", 
                                "Photo_Proof_Url": "", "Signature_Url": "",
                                "Price_Cust_Fuel": 0, "Price_Cust_Extra": 0,
                                "Cost_Driver_Fuel": 0, "Cost_Driver_Extra": 0
                            }
                            
                            if create_new_job(new_job):
                                success_count += 1
                                st.write(f"✅ สร้างงาน {run_id}: {row['Driver_Name']} / {row['Vehicle_Plate']}")
                        
                        if success_count > 0:
                            st.session_state.need_reset = True
                            status.update(label=f"✅ สำเร็จ! สร้างงานแล้ว {success_count} ใบงาน", state="complete", expanded=False)
                            time.sleep(1.5)
                            st.rerun()
                        else:
                            status.update(label="⚠️ ไม่มีการสร้างงาน (ข้อมูลว่างเปล่า)", state="error")

        st.markdown("---")
        st.subheader("📋 รายการงานล่าสุด")
        try:
            jobs_view = get_data("Jobs_Main")
            if not jobs_view.empty:
                cols_to_show = ["Job_ID", "Plan_Date", "Customer_Name", "Driver_Name", "Vehicle_Plate", "Vehicle_Type", "Job_Status"]
                valid_cols = [c for c in cols_to_show if c in jobs_view.columns]
                st.dataframe(jobs_view[valid_cols].tail(10).iloc[::-1], use_container_width=True)
        except Exception as e:
            logger.error(f"Table view error: {e}")

    # --- Tab 2: Reports (Dashboard) ---
    with tab2:
        st.subheader("📊 รายงานและสถิติ (Reports)")
        
        with st.spinner("กำลังประมวลผลข้อมูล..."):
            df_jobs = get_data("Jobs_Main")
            df_fuel = get_data("Fuel_Logs")
        
        c1, c2 = st.columns(2)
        default_start = datetime.now().replace(day=1)
        with c1: start_date = st.date_input("📅 เริ่มต้น", default_start)
        with c2: end_date = st.date_input("📅 สิ้นสุด", datetime.now())

        if not df_jobs.empty and 'Plan_Date' in df_jobs.columns:
            df_jobs['PD'] = df_jobs['Plan_Date'].apply(parse_flexible_date)
            job_mask = (df_jobs['PD'].dt.date >= start_date) & \
                       (df_jobs['PD'].dt.date <= end_date) & \
                       (df_jobs['Job_Status'] != 'CANCELLED')
            df_jobs_filtered = df_jobs[job_mask].copy()
        else:
            df_jobs_filtered = pd.DataFrame()

        if not df_fuel.empty and 'Date_Time' in df_fuel.columns:
            df_fuel['DT'] = df_fuel['Date_Time'].apply(parse_flexible_date)
            fuel_mask = (df_fuel['DT'].dt.date >= start_date) & \
                        (df_fuel['DT'].dt.date <= end_date)
            df_fuel_filtered = df_fuel[fuel_mask].copy()
        else:
            df_fuel_filtered = pd.DataFrame()

        if not df_jobs_filtered.empty or not df_fuel_filtered.empty:
            p_col = 'Price_Cust_Total' if 'Price_Cust_Total' in df_jobs_filtered.columns else 'Price_Customer'
            c_col = 'Cost_Driver_Total' if 'Cost_Driver_Total' in df_jobs_filtered.columns else 'Cost_Driver_Total'

            for col in [p_col, c_col]:
                if col in df_jobs_filtered.columns:
                    df_jobs_filtered[col] = pd.to_numeric(
                        df_jobs_filtered[col].astype(str).str.replace(',', ''), errors='coerce'
                    ).fillna(0)
            
            if 'Price_Total' in df_fuel_filtered.columns:
                df_fuel_filtered['Price_Total'] = pd.to_numeric(
                    df_fuel_filtered['Price_Total'].astype(str).str.replace(',', ''), errors='coerce'
                ).fillna(0)

            total_rev = df_jobs_filtered[p_col].sum() if not df_jobs_filtered.empty else 0
            total_driver_cost = df_jobs_filtered[c_col].sum() if not df_jobs_filtered.empty else 0
            total_fuel_cost = df_fuel_filtered['Price_Total'].sum() if not df_fuel_filtered.empty else 0
            net_profit = total_rev - total_driver_cost - total_fuel_cost

            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับรวม", f"{total_rev:,.0f}")
            k2.metric("🚚 ค่าจ้างคนขับ", f"{total_driver_cost:,.0f}")
            k3.metric("⛽ ค่าน้ำมันรวม", f"{total_fuel_cost:,.0f}")
            k4.metric("📈 กำไรสุทธิ", f"{net_profit:,.0f}", delta_color="normal")

            st.divider()
            
            perf_jobs = pd.DataFrame()
            if not df_jobs_filtered.empty:
                perf_jobs = df_jobs_filtered.groupby('Vehicle_Plate').agg({
                    'Job_ID': 'count',
                    p_col: 'sum',
                    c_col: 'sum'
                }).reset_index()
                perf_jobs.rename(columns={
                    'Job_ID': 'Job_Count', 
                    p_col: 'Revenue', 
                    c_col: 'Driver_Cost'
                }, inplace=True)

            perf_fuel = pd.DataFrame()
            if not df_fuel_filtered.empty:
                perf_fuel = df_fuel_filtered.groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                perf_fuel.rename(columns={'Price_Total': 'Fuel_Cost'}, inplace=True)

            if not perf_jobs.empty or not perf_fuel.empty:
                if perf_jobs.empty: perf_jobs = pd.DataFrame(columns=['Vehicle_Plate', 'Job_Count', 'Revenue', 'Driver_Cost'])
                if perf_fuel.empty: perf_fuel = pd.DataFrame(columns=['Vehicle_Plate', 'Fuel_Cost'])

                df_perf = pd.merge(perf_jobs, perf_fuel, on='Vehicle_Plate', how='outer').fillna(0)
                df_perf['Net_Profit'] = df_perf['Revenue'] - df_perf['Driver_Cost'] - df_perf['Fuel_Cost']
                
                st.dataframe(
                    df_perf.style.format({
                        "Revenue": "{:,.0f}", 
                        "Driver_Cost": "{:,.0f}",
                        "Fuel_Cost": "{:,.0f}",
                        "Net_Profit": "{:,.0f}"
                    }), 
                    use_container_width=True
                )
            else:
                st.info("ไม่มีข้อมูลสรุปรายรถ")

            st.divider()
            csv = convert_df_to_csv(df_jobs_filtered)
            st.download_button("Download Jobs CSV", csv, "jobs_report.csv", "text/csv")

        else:
            st.warning(f"ไม่พบข้อมูลในช่วงวันที่ {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}")

    # --- Tab 3: MMS ---
    with tab3:
        st.subheader("🔧 ใบแจ้งซ่อม / แจ้งต่อสัญญา")
        mms1, mms2, mms3 = st.tabs(["📝 ใบสั่งซ่อม", "📄 ต่อสัญญา/ประกัน", "✍️ แจ้งซ่อม"])
        
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
                        update_sheet("Repair_Tickets", tk)
                        st.success("Updated")
                        st.rerun()

        with mms2:
            st.markdown("### 📅 แจ้งเตือนการต่อสัญญา/ประกัน")
            drivers = get_data("Master_Drivers")
            if not drivers.empty and 'Insurance_Expiry' in drivers.columns:
                drivers['Insurance_Expiry'] = pd.to_datetime(drivers['Insurance_Expiry'], errors='coerce')
                drivers['Days_Left'] = (drivers['Insurance_Expiry'] - datetime.now()).dt.days
                expiring = drivers[(drivers['Days_Left'] < 45) & (drivers['Days_Left'] > -365)]
                if not expiring.empty:
                    st.warning(f"⚠️ มีรายการใกล้หมดอายุ {len(expiring)} รายการ")
                    st.dataframe(expiring[['Vehicle_Plate', 'Insurance_Expiry', 'Days_Left']])
                else:
                    st.success("✅ เอกสารรถทุกคันยังไม่หมดอายุ")

        with mms3:
            st.write("บันทึกข้อมูลแจ้งซ่อม / ตรวจสภาพ")
            with st.form("mn_log"):
                d = get_data("Master_Drivers")
                pl = d['Vehicle_Plate'].unique() if not d.empty else []
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
        f1, f2 = st.tabs(["ประวัติ", "บันทึก (Admin)"])
        
        with f1:
            fl = get_data("Fuel_Logs")
            if not fl.empty: st.dataframe(fl.sort_values('Date_Time', ascending=False), use_container_width=True)
        
        with f2:
            st.info("สำหรับ Admin บันทึกแทนคนขับ")
            with st.form("adm_fuel"):
                d = get_data("Master_Drivers")
                pl = d['Vehicle_Plate'].unique() if not d.empty else []
                c1, c2 = st.columns(2)
                vp = c1.selectbox("รถ", pl)
                fst = c2.text_input("ปั๊ม", "ปตท.")
                c3, c4, c5 = st.columns(3)
                fodo = c3.number_input("ไมล์", 0)
                flit = c4.number_input("ลิตร", 0.0)
                fprc = c5.number_input("บาท", 0.0)
                if st.form_submit_button("บันทึก"):
                    fd = {"Log_ID": f"FA-{int(time.time())}", "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M"), "Vehicle_Plate": vp, "Odometer": fodo, "Liters": flit, "Price_Total": fprc, "Station_Name": fst, "Driver_ID": "ADMIN", "Photo_Url": "-"}
                    if create_fuel_log(fd): st.success("Saved"); st.rerun()

    # --- Tab 5: Master & Stock ---
    with tab5:
        st.subheader("🗂️ ยานพาหนะ และ สต็อก")
        mt1, mt2, mt3, mt4, mt5 = st.tabs(["🚛 รถ (Vehicles)", "🚛 หาง (Trailers)", "📦 อะไหล่ (Parts)", "⚫ ยาง (Tires)", "🛣️ เส้นทาง (Routes)"])
        
        with mt1:
            md = get_data("Master_Drivers")
            ed_md = st.data_editor(md, num_rows="dynamic", key="ed_md", use_container_width=True)
            if st.button("บันทึกข้อมูลรถ"): update_sheet("Master_Drivers", ed_md); st.success("Saved"); st.rerun()
        
        with mt2:
            tr = get_data_safe("Master_Trailers", ["Trailer_ID", "Type", "License_Plate", "Status"])
            ed_tr = st.data_editor(tr, num_rows="dynamic", key="ed_tr", use_container_width=True)
            if st.button("บันทึกหาง"): update_sheet("Master_Trailers", ed_tr); st.success("Saved"); st.rerun()

        with mt3:
            sp = get_data("Stock_Parts")
            ed_sp = st.data_editor(sp, num_rows="dynamic", key="ed_sp", use_container_width=True)
            if st.button("บันทึกสต็อก"): update_sheet("Stock_Parts", ed_sp); st.success("Saved"); st.rerun()

        with mt4:
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
        
        with g2:
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
        manual_tab1, manual_tab2, manual_tab3 = st.tabs(["คู่มือใช้งาน", "วิดีโอสอน", "ติดต่อผู้พัฒนา"])
        
        with manual_tab1:
            try:
                manual_text = get_manual_content()
                st.markdown(manual_text)
            except: st.info("กำลังปรับปรุงคู่มือ")
        
        with manual_tab2:
            st.info("กำลังอัปโหลดวิดีโอ")
        
        with manual_tab3:
            st.info("ติดต่อ: support@example.com")