# modules/ui_admin.py

import streamlit as st # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timedelta
from fpdf import FPDF # type: ignore # 📌 ต้อง install ก่อนนะ
import time
import urllib.parse
import io
import logging
import pytz # type: ignore
import base64  # <--- เพิ่ม import นี้เพื่อแปลงรูปภาพ
import textwrap # เพิ่ม library นี้เพื่อแก้ปัญหาโค้ดหลุด
import os      # <--- เพิ่ม import นี้เพื่อเช็คไฟล์

# ... (Import modules อื่นๆ ของเดิมคงไว้) ...
from modules.database import get_data, update_sheet, load_all_data
from modules.utils import (
    get_config_value, get_fuel_prices, calculate_driver_cost, create_new_job, create_fuel_log,
    simple_update_job_status, get_maintenance_status_all, log_maintenance_record,
    sync_to_legacy_sheet, convert_df_to_csv, get_manual_content, deduct_stock_item,
    parse_flexible_date, create_repair_ticket, get_thai_time_str
)

# ประกาศ Logger
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

# ==========================================
# ส่วนที่ 1: ฟังก์ชันแยก (Tabs ย่อย)
# ==========================================

# --- Tab 1: Planning v5.0 (Unified + AI) ---
def render_tab1_flexible_assignment():
    st.subheader("📝 สร้างใบงานใหม่ (Unified AI Planning) v5.0")

    try:
        drivers_df = get_data("Master_Drivers")
        customers_df = get_data("Master_Customers")
        routes_df = get_data("Master_Routes")
        jobs_all = get_data("Jobs_Main")
        repairs_all = get_data("Repair_Tickets")
        if drivers_df.empty: st.warning("⚠️ ไม่พบข้อมูลคนขับ")
    except Exception as e:
        st.error(f"โหลดข้อมูลไม่สำเร็จ: {e}")
        return

    # --- 1. Logic Status & AI Recommendation ---
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

    driver_list_sorted = [] 
    driver_info_map = {}
    
    if not drivers_df.empty:
        if 'Max_Weight_kg' not in drivers_df.columns: drivers_df['Max_Weight_kg'] = 2000
        if 'Max_Volume_cbm' not in drivers_df.columns: drivers_df['Max_Volume_cbm'] = 10
        
        for _, row in drivers_df.iterrows():
            d_id = str(row.get('Driver_ID', '')).strip()
            d_name = str(row.get('Driver_Name', '')).strip()
            v_plate = str(row.get('Vehicle_Plate', '')).strip()
            v_type = str(row.get('Vehicle_Type', '4 ล้อ')) 
            try: max_w = float(str(row.get('Max_Weight_kg', 0)).replace(',', ''))
            except: max_w = 0
            try: max_v = float(str(row.get('Max_Volume_cbm', 0)).replace(',', ''))
            except: max_v = 0

            if d_id:
                if d_id in broken_drivers: status_icon, status_code = "🔧", 2
                elif d_id in busy_drivers: status_icon, status_code = "🔴", 1
                else: status_icon, status_code = "🟢", 0
                
                ai_score = status_code 
                label = f"{status_icon} {d_name} ({v_plate}) [Max: {max_w:,.0f}kg]"
                
                is_recommended = False
                if status_code == 0: 
                     if max_w >= 1000: 
                        label = "⭐ " + label + " (แนะนำ)"
                        is_recommended = True
                        ai_score = -1 

                info = {
                    "label": label, "id": d_id, "name": d_name, "plate": v_plate, 
                    "type": v_type,
                    "status_code": status_code, "max_weight": max_w, "max_volume": max_v,
                    "ai_score": ai_score
                }
                driver_list_sorted.append(info)
                driver_info_map[label] = info

    driver_list_sorted.sort(key=lambda x: x['ai_score'])
    driver_options = [d['label'] for d in driver_list_sorted]

    # --- 2. Input Form ---
    c1, c2 = st.columns([1, 2])
    with c1: p_date = st.date_input("1. วันที่นัดหมาย", datetime.today())
    with c2:
        cust_opts = [f"{row['Customer_Name']}" for i, row in customers_df.iterrows()] if not customers_df.empty else []
        sel_cust_label = st.selectbox("2. ลูกค้า", cust_opts, index=None, placeholder="ค้นหาลูกค้า...")

    with st.expander("📦 ข้อมูลสินค้า (Cargo Details)", expanded=False):
        cw1, cw2, cw3, cw4 = st.columns(4)
        cargo_qty = cw1.text_input("จำนวนสินค้า", "10 พาเลท")
        total_weight = cw2.number_input("น้ำหนักรวม (กก.)", min_value=0.0, step=100.0)
        total_volume = cw3.number_input("ปริมาตร (CBM)", min_value=0.0, step=0.1)
        cargo_type = cw4.text_input("ประเภทสินค้า", "สินค้าทั่วไป")
        barcodes_input = st.text_input("ระบุบาร์โค้ด", placeholder="เช่น 885123456")

    st.divider()

    # --- 3. Unified Route Planning ---
    st.markdown("##### 📍 กำหนดเส้นทาง (Unified Routing)")
    
    if 'unified_drops' not in st.session_state:
        st.session_state.unified_drops = pd.DataFrame([
            {"Sequence": 1, "Origin_Location": "คลังสินค้าหลัก", "Dest_Location": "", "Est_Distance_KM": 0.0, "Route_Name": ""}
        ])
    
    if 'last_selected_preset' not in st.session_state:
        st.session_state.last_selected_preset = "-- เลือกเพื่อเพิ่มจุดส่ง --"

    # A. Smart Preset
    with st.container(border=True):
        c_sel1, c_sel2 = st.columns([1, 1.5])
        unique_groups = ["-- กำหนดเอง --"] + sorted(routes_df['Route_Name'].dropna().astype(str).unique().tolist()) if not routes_df.empty else []
        
        sel_route_group = c_sel1.selectbox("เลือกกลุ่มงาน", unique_groups, key="sel_route_group")
        
        dest_options = []
        if sel_route_group != "-- กำหนดเอง --":
            dest_options = routes_df[routes_df['Route_Name'] == sel_route_group]['Destination'].unique().tolist()
        
        sel_dest_preset = c_sel2.selectbox("เลือกเส้นทางมาตรฐาน", ["-- เลือกเพื่อเพิ่มจุดส่ง --"] + dest_options, key="sel_dest_preset")

        # Auto-Add Logic
        if sel_route_group != "-- กำหนดเอง --" and \
           sel_dest_preset != "-- เลือกเพื่อเพิ่มจุดส่ง --" and \
           sel_dest_preset != st.session_state.last_selected_preset:
            
            st.session_state.last_selected_preset = sel_dest_preset
            match_row = routes_df[
                (routes_df['Route_Name'] == sel_route_group) & 
                (routes_df['Destination'] == sel_dest_preset)
            ].iloc[0]
            
            new_origin = str(match_row.get('Origin', 'คลังสินค้าหลัก'))
            new_dest = sel_dest_preset
            new_dist = float(str(match_row.get('Distance_KM', 0)).replace(',', ''))
            
            df_current = st.session_state.unified_drops
            last_idx = len(df_current) - 1
            
            if last_idx >= 0 and not df_current.iloc[last_idx]['Dest_Location']:
                df_current.at[last_idx, 'Origin_Location'] = new_origin
                df_current.at[last_idx, 'Dest_Location'] = new_dest
                df_current.at[last_idx, 'Est_Distance_KM'] = new_dist
                df_current.at[last_idx, 'Route_Name'] = sel_route_group
                msg = "✅ อัปเดตข้อมูล"
            else:
                new_row = pd.DataFrame([{
                    "Sequence": len(df_current) + 1,
                    "Origin_Location": new_origin,
                    "Dest_Location": new_dest,
                    "Est_Distance_KM": new_dist,
                    "Route_Name": sel_route_group
                }])
                df_current = pd.concat([df_current, new_row], ignore_index=True)
                msg = "✅ เพิ่มจุดส่งใหม่"
            
            st.session_state.unified_drops = df_current
            st.toast(f"{msg}: {new_dest} ({new_dist} กม.)", icon="✨")
            time.sleep(0.5)
            st.rerun()

    # B. Data Editor & AI Optimize
    col_tools, col_space = st.columns([1.2, 3])
    with col_tools:
        if st.button("🧠 AI จัดเรียงเส้นทาง", help="เรียงจากใกล้ไปไกล"):
             if not st.session_state.unified_drops.empty:
                df_opt = st.session_state.unified_drops.sort_values(by='Est_Distance_KM')
                df_opt['Sequence'] = range(1, len(df_opt) + 1)
                st.session_state.unified_drops = df_opt
                st.toast("จัดเรียงเส้นทางแล้ว!", icon="🤖")
                st.rerun()

    edited_drops = st.data_editor(
        st.session_state.unified_drops,
        num_rows="dynamic",
        use_container_width=True,
        column_config={
            "Sequence": st.column_config.NumberColumn("#", disabled=True, width="small"),
            "Origin_Location": st.column_config.TextColumn("🏠 ต้นทาง", width="medium", required=True),
            "Dest_Location": st.column_config.TextColumn("📍 ปลายทาง", width="medium", required=True),
            "Est_Distance_KM": st.column_config.NumberColumn("ระยะทาง (กม.)", min_value=0.0, format="%.1f"),
            "Route_Name": st.column_config.TextColumn("กลุ่มงาน", width="small")
        },
        key="drop_editor_unified"
    )
    st.session_state.unified_drops = edited_drops

    # --- 4. Driver & Cost ---
    st.markdown("---")
    st.markdown("##### 🚛 เลือกคนขับ & สรุปราคา")
    selected_drivers = st.multiselect("เลือกคนขับ (เรียงตามคำแนะนำ):", driver_options)

    if selected_drivers and not edited_drops.empty:
        valid_drops = edited_drops[edited_drops['Dest_Location'].astype(str).str.strip() != ""]
        
        if not valid_drops.empty:
            table_data = []
            total_trip_dist = valid_drops['Est_Distance_KM'].sum()

            for drv_label in selected_drivers:
                info = driver_info_map.get(drv_label, {})
                status_note, is_overweight = "", False
                
                if total_weight > info.get('max_weight', 0) and info.get('max_weight', 0) > 0:
                     status_note += "❌ นน.เกิน "
                     is_overweight = True
                
                if info.get('ai_score') == -1: status_note += "⭐ แนะนำ"

                cost = calculate_driver_cost(p_date, total_trip_dist, info.get('type', '4 ล้อ'))
                price = cost + 1000

                table_data.append({
                    "Driver_ID": info.get("id"), 
                    "Driver_Name": info.get("name"), 
                    "Vehicle_Plate": info.get("plate"),
                    "Max_Weight": info.get("max_weight"),
                    "Overweight": is_overweight,
                    "Price": price,
                    "Cost": cost,
                    "Note": status_note
                })

            edited_job_table = st.data_editor(
                pd.DataFrame(table_data), 
                hide_index=True, 
                use_container_width=True,
                column_config={
                    "Price": st.column_config.NumberColumn("ราคาขาย", required=True),
                    "Cost": st.column_config.NumberColumn("ต้นทุน", required=True),
                    "Note": st.column_config.TextColumn("สถานะ", disabled=True),
                    "Overweight": st.column_config.CheckboxColumn("เกินพิกัด?")
                }
            )

            if st.button("✅ ยืนยันจ่ายงาน (Create Jobs)", type="primary", use_container_width=True):
                with st.spinner("กำลังสร้างใบงาน..."):
                    batch_id = datetime.now().strftime('%y%m%d%H%M')
                    count = 0
                    
                    for i, drv_row in edited_job_table.iterrows():
                        for idx, drop_row in valid_drops.iterrows():
                            job_id = f"JOB-{batch_id}-{count+1:03d}"
                            
                            org = drop_row['Origin_Location']
                            dst = drop_row['Dest_Location']
                            map_link = ""
                            if org and dst:
                                try: map_link = f"http://googleusercontent.com/maps.google.com/?saddr={urllib.parse.quote(org)}&daddr={urllib.parse.quote(dst)}&dirflg=d"
                                except: map_link = ""

                            is_first_drop = (count % len(valid_drops)) == 0 
                            job_price = drv_row['Price'] if is_first_drop else 0
                            job_cost = drv_row['Cost'] if is_first_drop else 0

                            new_job = {
                                "Job_ID": job_id, "Job_Status": "ASSIGNED", 
                                "Plan_Date": p_date.strftime("%Y-%m-%d"),
                                "Customer_Name": sel_cust_label, 
                                "Route_Name": drop_row.get('Route_Name', 'General'),
                                "Origin_Location": org,
                                "Dest_Location": dst,
                                "Est_Distance_KM": drop_row.get('Est_Distance_KM', 0), 
                                "GoogleMap_Link": map_link,
                                "Driver_ID": drv_row['Driver_ID'], 
                                "Driver_Name": drv_row['Driver_Name'],
                                "Vehicle_Plate": drv_row['Vehicle_Plate'], 
                                "Cargo_Qty": f"{cargo_qty} (Drop {drop_row.get('Sequence')})",
                                "Price_Cust_Total": job_price,
                                "Cost_Driver_Total": job_cost,
                                "Payment_Status": "รอจ่าย",
                                "Barcodes": barcodes_input
                            }
                            create_new_job(new_job)
                            count += 1
                    
                    st.session_state.unified_drops = pd.DataFrame([{"Sequence": 1, "Origin_Location": "คลังสินค้าหลัก", "Dest_Location": "", "Est_Distance_KM": 0.0, "Route_Name": ""}])
                    st.session_state.last_selected_preset = "-- เลือกเพื่อเพิ่มจุดส่ง --"
                    st.success(f"สร้างงานสำเร็จ {count} ใบงาน!"); time.sleep(1); st.rerun()
    
    st.markdown("---")
    st.subheader("📋 รายการงานล่าสุด")
    try:
        if not jobs_all.empty:
            jobs_all['Created_At'] = pd.to_datetime(jobs_all['Plan_Date'], errors='coerce')
            recent_jobs = jobs_all.sort_values(by='Job_ID', ascending=False).head(10)
            st.dataframe(recent_jobs[['Job_ID', 'Plan_Date', 'Driver_Name', 'Origin_Location', 'Dest_Location', 'Job_Status']], use_container_width=True, hide_index=True)
    except: pass

# --- ฟังก์ชัน Tab 6: GPS Tracking (Clean Version) ---
def render_tab6_gps(): 
    st.subheader("📍 ระบบติดตามยานพาหนะ (GPS Tracking)")
    
    try:
        drivers = get_data("Master_Drivers")
    except:
        st.error("โหลดข้อมูล Master_Drivers ไม่สำเร็จ")
        return

    if not drivers.empty and 'Current_Lat' in drivers.columns and 'Current_Lon' in drivers.columns:
        drivers['lat'] = pd.to_numeric(drivers['Current_Lat'], errors='coerce')
        drivers['lon'] = pd.to_numeric(drivers['Current_Lon'], errors='coerce')
        
        def create_map_link(row):
            if pd.notna(row['lat']) and pd.notna(row['lon']):
                return f"http://googleusercontent.com/maps.google.com/?q={row['lat']},{row['lon']}"
            return None
        
        drivers['GoogleMap_Link'] = drivers.apply(create_map_link, axis=1)
        active_gps = drivers.dropna(subset=['lat', 'lon']).copy()
        
        with st.container(border=True):
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("🚛 รถทั้งหมด", f"{len(drivers)} คัน")
            m2.metric("🟢 สัญญาณปกติ", f"{len(active_gps)} คัน")
            m3.metric("🔴 ขาดการติดต่อ", f"{len(drivers) - len(active_gps)} คัน", delta_color="inverse")
            m4.button("🔄 รีเฟรชแผนที่", use_container_width=True)

        if not active_gps.empty:
            st.map(active_gps, latitude='lat', longitude='lon', size=20, color='#0044ff')
        else:
            st.warning("⚠️ ไม่พบสัญญาณ GPS จากรถคันใดเลยในขณะนี้")

        st.divider()

        st.markdown("### 📋 ตำแหน่งรถรายคัน")
        c_search, c_filter = st.columns([2, 1])
        search_txt = c_search.text_input("🔍 ค้นหา (ทะเบียน/คนขับ)", placeholder="พิมพ์เพื่อค้นหา...")
        
        display_cols = ['Vehicle_Plate', 'Driver_Name', 'Last_Update', 'GoogleMap_Link']
        df_display = active_gps[display_cols].copy()
        
        if 'Last_Update' in df_display.columns:
            df_display['Last_Update'] = df_display['Last_Update'].astype(str).replace('nan', '-')
        
        if search_txt:
            mask = df_display['Driver_Name'].astype(str).str.contains(search_txt, case=False) | \
                   df_display['Vehicle_Plate'].astype(str).str.contains(search_txt, case=False)
            df_display = df_display[mask]

        st.data_editor(
            df_display,
            column_config={
                "GoogleMap_Link": st.column_config.LinkColumn("พิกัด", display_text="📍 เปิดแผนที่"),
                "Last_Update": st.column_config.TextColumn("อัปเดตล่าสุด"),
                "Driver_Name": "พนักงานขับรถ",
                "Vehicle_Plate": "ทะเบียน"
            },
            hide_index=True,
            use_container_width=True,
            disabled=True
        )
    else:
        st.warning("ไม่พบข้อมูลคอลัมน์ GPS (Current_Lat, Current_Lon) ในฐานข้อมูล")

# --- ฟังก์ชัน Tab 10: Accounting (All-in-One Upgrade v6.0) ---
def render_tab10_accounting():
    st.subheader("💰 บัญชีและการเงิน (Payroll & Payment Center) v6.0")
    
    # 1. โหลดข้อมูล
    try:
        jobs = get_data("Jobs_Main")
        drivers = get_data("Master_Drivers")
    except:
        st.error("โหลดข้อมูลไม่สำเร็จ")
        return

    # 2. กรองเฉพาะงานที่รอจ่าย (Pending)
    if not jobs.empty:
        # แปลงวันที่
        jobs['PD_Obj'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        
        # กรองงานที่จบแล้ว + ยังไม่จ่าย + ไม่ยกเลิก
        mask_pending = (jobs['Job_Status'] == 'Completed') & \
                       (jobs['Payment_Status'] != 'Paid') & \
                       (jobs['Job_Status'] != 'CANCELLED')
        
        df_pending = jobs[mask_pending].copy()
        
        if df_pending.empty:
            st.info("✅ ไม่มียอดค้างจ่าย (จ่ายครบหมดแล้ว)")
            return

        # คำนวณตัวเลขการเงิน
        # แปลงค่าเป็นตัวเลข
        df_pending['Cost_Driver_Total'] = pd.to_numeric(df_pending['Cost_Driver_Total'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
        
        # Group by Driver (รวมยอดรายคน)
        # ใช้ Driver_ID เป็น Key หลัก
        if 'Driver_ID' not in df_pending.columns: df_pending['Driver_ID'] = 'Unknown'
        
        # สร้างตารางสรุป
        summary = df_pending.groupby(['Driver_ID', 'Driver_Name']).agg({
            'Job_ID': 'count',              # จำนวนเที่ยว
            'Cost_Driver_Total': 'sum'      # ยอดรวมค่าเที่ยว
        }).reset_index()
        
        summary.rename(columns={'Job_ID': 'Job_Count', 'Cost_Driver_Total': 'Total_Fare'}, inplace=True)
        
        # คำนวณเบื้องต้น
        summary['WHT_1%'] = summary['Total_Fare'] * 0.01
        
        # เพิ่มคอลัมน์สำหรับกรอกข้อมูล (Editable Columns)
        # ใส่ค่า Default ไว้ก่อน
        summary['Extra_Add'] = 0.0      # เงินบวกเพิ่ม
        summary['Deduct'] = 0.0         # หักเงิน
        summary['Slip_Url'] = ""        # ลิงก์สลิป
        summary['Pay_Check'] = False    # Checkbox เลือกจ่าย

        # คำนวณ Net Pay (สูตรเบื้องต้นสำหรับแสดงผล จะถูกคำนวณใหม่แบบ Realtime ใน Data Editor ไม่ได้ ต้องคำนวณหลังบ้าน)
        # ดังนั้นใน Data Editor เราจะแสดง Net Pay เป็น Column คำนวณไม่ได้ แต่เราจะแสดง Base ไว้
        
        # ดึงข้อมูลธนาคารมาแปะ
        if not drivers.empty:
            bank_info = drivers[['Driver_ID', 'Bank_Name', 'Bank_Account_No']].astype(str)
            summary = pd.merge(summary, bank_info, on='Driver_ID', how='left')
        else:
            summary['Bank_Name'] = "-"
            summary['Bank_Account_No'] = "-"

        # --- ส่วนแสดงผล Dashboard ---
        total_pending = summary['Total_Fare'].sum()
        count_drivers = len(summary)
        
        with st.container(border=True):
            k1, k2, k3 = st.columns(3)
            k1.metric("👨‍✈️ คนขับที่มียอดค้าง", f"{count_drivers} คน")
            k2.metric("💵 ยอดค้างจ่ายรวม", f"{total_pending:,.2f} บาท")
            k3.button("🔄 รีเฟรชข้อมูล", on_click=st.rerun)

        st.markdown("### 📋 ตารางจัดการจ่ายเงิน (Payroll Table)")
        st.caption("💡 ติ๊กเลือกคนที่จะจ่าย | แก้ไขยอดบวก/หักได้ในตาราง | ใส่ลิงก์รูปสลิปได้เลย")

        # --- Editable Data Table ---
        edited_df = st.data_editor(
            summary,
            column_config={
                "Pay_Check": st.column_config.CheckboxColumn("เลือกจ่าย", default=False),
                "Driver_ID": st.column_config.TextColumn("รหัส", disabled=True),
                "Driver_Name": st.column_config.TextColumn("ชื่อ-สกุล", disabled=True),
                "Job_Count": st.column_config.NumberColumn("จำนวนงาน", disabled=True),
                "Total_Fare": st.column_config.NumberColumn("ค่าเที่ยวรวม", format="%.2f", disabled=True),
                "WHT_1%": st.column_config.NumberColumn("หัก ณ ที่จ่าย (1%)", format="%.2f", disabled=True),
                "Extra_Add": st.column_config.NumberColumn("➕ เงินเพิ่ม", format="%.2f", help="เบี้ยขยัน, โบนัส"),
                "Deduct": st.column_config.NumberColumn("➖ หักเงิน", format="%.2f", help="หักเบิก, ค่าปรับ"),
                "Slip_Url": st.column_config.TextColumn("📎 ลิงก์สลิป/หมายเหตุ", width="medium"),
                "Bank_Name": st.column_config.TextColumn("ธนาคาร", disabled=True),
                "Bank_Account_No": st.column_config.TextColumn("เลขบัญชี", disabled=True),
            },
            hide_index=True,
            use_container_width=True,
            key="payroll_editor"
        )
        
        # --- คำนวณยอดที่เลือก (Real-time Summary) ---
        selected_rows = edited_df[edited_df['Pay_Check'] == True].copy()
        
        if not selected_rows.empty:
            # Recalculate Net Pay for Selected
            selected_rows['Net_Pay'] = selected_rows['Total_Fare'] - selected_rows['WHT_1%'] + selected_rows['Extra_Add'] - selected_rows['Deduct']
            
            grand_total_pay = selected_rows['Net_Pay'].sum()
            count_selected = len(selected_rows)
            
            st.divider()
            b1, b2 = st.columns([2, 1])
            
            with b1:
                st.info(f"✅ เลือกจ่ายทั้งหมด: **{count_selected} คน** | รวมเป็นเงินสุทธิ: **{grand_total_pay:,.2f} บาท**")
                
                # --- Actions Button ---
                c_act1, c_act2, c_act3 = st.columns(3)
                
                # Action 1: Download CSV
                with c_act1:
                    csv_data = convert_df_to_csv(selected_rows)
                    st.download_button(
                        "📥 โหลดไฟล์ธนาคาร (CSV)",
                        data=csv_data,
                        file_name=f"Payroll_Export_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv",
                        use_container_width=True
                    )
                
                # Action 2: Confirm Payment
                with c_act2:
                    if st.button("💸 ยืนยันการจ่ายเงิน (Mark as Paid)", type="primary", use_container_width=True):
                        with st.spinner("กำลังบันทึกข้อมูล..."):
                            try:
                                timestamp = get_thai_time_str()
                                cnt_success = 0
                                
                                for _, row in selected_rows.iterrows():
                                    d_id = row['Driver_ID']
                                    extra = row['Extra_Add']
                                    deduct = row['Deduct']
                                    slip = row['Slip_Url']
                                    
                                    # หา Job ของ Driver คนนี้ที่เป็น Pending
                                    my_jobs = df_pending[df_pending['Driver_ID'] == d_id]
                                    
                                    if not my_jobs.empty:
                                        # Update Payment Status
                                        jobs.loc[my_jobs.index, 'Payment_Status'] = 'Paid'
                                        jobs.loc[my_jobs.index, 'Payment_Date'] = timestamp
                                        jobs.loc[my_jobs.index, 'Payment_Slip_Url'] = slip
                                        
                                        # Handle Extra/Deduct: ใส่ยอดปรับปรุงลงใน Job ล่าสุดของ Batch นี้
                                        # เพื่อให้ยอดรวมบัญชีตรงกัน
                                        if extra != 0 or deduct != 0:
                                            last_idx = my_jobs.index[-1]
                                            # ดึงค่าเดิมมาบวกเพิ่ม
                                            try: current_other = float(jobs.loc[last_idx, 'Cost_Driver_Other'])
                                            except: current_other = 0.0
                                            
                                            # Cost_Driver_Other = ค่าเดิม + เพิ่ม - หัก
                                            jobs.loc[last_idx, 'Cost_Driver_Other'] = current_other + extra - deduct
                                            
                                        cnt_success += 1
                                
                                # Save to DB
                                update_sheet("Jobs_Main", jobs)
                                st.success(f"🎉 จ่ายเงินสำเร็จ {cnt_success} คน!")
                                time.sleep(1.5); st.rerun()
                                
                            except Exception as e:
                                st.error(f"เกิดข้อผิดพลาด: {e}")

                # Action 3: Print Payslip (HTML)
                with c_act3:
                    if st.button("📄 พิมพ์ใบสลิป (Payslip View)", use_container_width=True):
                        st.session_state.show_payslip = True

            # --- Payslip View Section ---
            if st.session_state.get('show_payslip', False):
                with st.expander("📄 ตัวอย่างใบจ่ายเงิน (Payslip)", expanded=True):
                    st.markdown("""
                    <style>
                    .payslip { border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; border-radius: 5px; background: white; color: black; }
                    .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 10px; }
                    .row-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total { font-weight: bold; border-top: 1px solid #333; margin-top: 10px; padding-top: 5px; }
                    </style>
                    """, unsafe_allow_html=True)
                    
                    for _, row in selected_rows.iterrows():
                        # สร้าง HTML สำหรับสลิปแต่ละคน
                        html = f"""
                        <div class="payslip">
                            <div class="header">
                                <h3>ใบสำคัญจ่าย / PAYMENT VOUCHER</h3>
                                <p>วันที่: {datetime.now().strftime('%d/%m/%Y')}</p>
                            </div>
                            <div class="row-item"><strong>ชื่อผู้รับเงิน:</strong> <span>{row['Driver_Name']} ({row['Driver_ID']})</span></div>
                            <div class="row-item"><strong>เลขบัญชี:</strong> <span>{row['Bank_Name']} - {row['Bank_Account_No']}</span></div>
                            <hr>
                            <div class="row-item"><span>ค่าเที่ยว ({row['Job_Count']} งาน)</span> <span>{row['Total_Fare']:,.2f}</span></div>
                            <div class="row-item"><span>บวก: เงินเพิ่มพิเศษ</span> <span>{row['Extra_Add']:,.2f}</span></div>
                            <div class="row-item" style="color: red;"><span>หัก: ภาษี ณ ที่จ่าย (1%)</span> <span>-{row['WHT_1%']:,.2f}</span></div>
                            <div class="row-item" style="color: red;"><span>หัก: อื่นๆ</span> <span>-{row['Deduct']:,.2f}</span></div>
                            <div class="total row-item"><span>ยอดสุทธิ (Net Pay)</span> <span>{row['Net_Pay']:,.2f} บาท</span></div>
                        </div>
                        """
                        st.markdown(html, unsafe_allow_html=True)
                    
                    if st.button("❌ ปิดมุมมองสลิป"):
                        st.session_state.show_payslip = False
                        st.rerun()

        else:
            st.info("👈 กรุณาติ๊กเลือกรายการในช่อง 'เลือกจ่าย' (Pay_Check) เพื่อดำเนินการต่อ")
            
    else:
        st.warning("ไม่มีข้อมูลงานในระบบ")

def baht_text(number):
    number = float(number)
    if number == 0: return "ศูนย์บาทถ้วน"
    
    values = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
    places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"]
    
    def process_chunk(num):
        s = ""
        for i, d in enumerate(str(int(num))[::-1]):
            if d != '0':
                if i == 0 and d == '1' and num > 1: s = "เอ็ด" + s
                elif i == 1 and d == '1': s = "สิบ" + s
                elif i == 1 and d == '2': s = "ยี่สิบ" + s
                else: s = values[int(d)] + places[i] + s
        return s

    # แยกบาท/สตางค์
    parts = str(f"{number:.2f}").split('.')
    baht = int(parts[0])
    satang = int(parts[1])
    
    text = process_chunk(baht) + "บาท"
    if satang == 0:
        text += "ถ้วน"
    else:
        text += process_chunk(satang) + "สตางค์"
        
    return text        

import textwrap # <--- ต้องมีบรรทัดนี้ หรือวางไว้บนสุดของไฟล์ก็ได้

# ... (Imports เดิม)
# เพิ่ม import นี้ถ้ายังไม่มี (หรือจะใส่ไว้ในฟังก์ชันก็ได้)
import base64

# --- ฟังก์ชัน Tab 11: Billing (V31 - Workflow Separation) ---
def render_tab11_billing():
    # แยก 2 แท็บชัดเจน: "ทำงาน" vs "ดูประวัติ"
    tab_work, tab_history = st.tabs(["📝 ทำรายการวางบิล (Pending)", "🗂️ ประวัติการวางบิล (History)"])
    
    # --- 🛠️ Config ---
    MY_COMPANY_NAME = "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด" 
    MY_ADDRESS = "เลขที่ 99/2 หมู่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000"
    MY_TAX_ID = "0745559001353 (สำนักงานใหญ่)"
    LOGO_FILENAME = "company_logo.png" 
    FONT_FILENAME = "THSarabunNew.ttf" 
    # -----------------

    # 1. Helper: PDF Generator
    def create_invoice_pdf(selected_data, customer_name, cust_addr, cust_tax, invoice_no, inv_date_str):
        class InvoicePDF(FPDF):
            def header(self):
                if os.path.exists(LOGO_FILENAME):
                    self.image(LOGO_FILENAME, 10, 8, 25)
                try:
                    self.add_font('THSarabun', '', FONT_FILENAME)
                    self.add_font('THSarabun', 'B', FONT_FILENAME)
                except: pass
                
                self.set_font('THSarabun', 'B', 22) 
                self.set_xy(40, 10); self.cell(0, 8, MY_COMPANY_NAME, ln=True)
                self.set_font('THSarabun', '', 14)
                self.set_x(40); self.cell(0, 6, MY_ADDRESS, ln=True)
                self.set_x(40); self.cell(0, 6, f"เลขประจำตัวผู้เสียภาษี: {MY_TAX_ID}", ln=True)
                
                self.set_font('THSarabun', 'B', 30)
                self.set_xy(140, 10); self.cell(60, 10, "ใบวางบิล", align='R', ln=True)
                self.set_font('THSarabun', 'B', 16)
                self.set_xy(140, 20); self.cell(60, 6, "BILLING NOTE", align='R', ln=True)
                self.ln(10)

        def baht_text(number):
            number = float(number)
            if number == 0: return "ศูนย์บาทถ้วน"
            values = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
            places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"]
            def process_chunk(num):
                s = ""
                s_num = str(int(num))
                len_num = len(s_num)
                for i, d in enumerate(s_num):
                    digit = int(d)
                    place_idx = len_num - i - 1
                    if digit != 0:
                        if place_idx == 0 and digit == 1 and len_num > 1: s += "เอ็ด"
                        elif place_idx == 1 and digit == 2: s += "ยี่"
                        elif place_idx == 1 and digit == 1: s += ""
                        else: s += values[digit]
                        if place_idx == 1: s += "สิบ"
                        else: s += places[place_idx % 6]
                return s
            parts = str(f"{number:.2f}").split('.')
            baht = int(parts[0])
            satang = int(parts[1])
            text = ""
            if baht > 0: text += process_chunk(baht) + "บาท"
            if satang == 0: text += "ถ้วน"
            else: text += process_chunk(satang) + "สตางค์"
            return text

        pdf = InvoicePDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Info Box
        pdf.set_font('THSarabun', 'B', 14) 
        pdf.set_fill_color(245, 245, 245)
        pdf.rect(10, 45, 190, 25, 'FD')
        
        pdf.set_xy(12, 47)
        pdf.cell(100, 7, f"ลูกค้า: {customer_name}", ln=True)
        pdf.set_x(12)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(100, 6, f"ที่อยู่: {cust_addr[:90]}", ln=True) 
        pdf.set_x(12)
        pdf.cell(100, 6, f"เลขผู้เสียภาษี: {cust_tax}", ln=True)

        pdf.set_xy(130, 47)
        pdf.set_font('THSarabun', 'B', 14)
        pdf.cell(65, 7, f"เลขที่เอกสาร: {invoice_no}", align='R', ln=True)
        pdf.set_xy(130, 54)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(65, 6, f"วันที่: {inv_date_str}", align='R', ln=True)

        pdf.ln(15)

        # Header
        pdf.set_font('THSarabun', 'B', 11) 
        pdf.set_fill_color(220, 220, 220)
        cols_width = [8, 16, 15, 10, 23, 23, 14, 14, 14, 14, 19]
        cols_name = ["ลำดับ", "วันที่", "รถ", "จุดลง", "ต้นทาง", "ปลายทาง", "เพิ่มจุด", "แรงงาน", "รอลง", "อื่นๆ", "รวม"]
        for w, title in zip(cols_width, cols_name):
            pdf.cell(w, 8, title, border=1, align='C', fill=True)
        pdf.ln()

        # Content
        pdf.set_font('THSarabun', '', 11)
        total_wages = 0
        for i, (_, row) in enumerate(selected_data.iterrows()):
            try: p_date = pd.to_datetime(row['Plan_Date']).strftime('%d/%m')
            except: p_date = str(row['Plan_Date'])[:5]
            
            def get_str(k, limit): return str(row.get(k, '-'))[:limit]
            def get_float(k): 
                try: return float(str(row.get(k, 0)).replace(',',''))
                except: return 0.0
            def fmt(v): return f"{v:,.0f}" if v > 0 else "-"

            c_total = get_float('Price_Cust_Total')
            total_wages += c_total

            pdf.cell(cols_width[0], 7, str(i+1), 1, align='C')
            pdf.cell(cols_width[1], 7, p_date, 1, align='C')
            pdf.cell(cols_width[2], 7, get_str('Car_Type', 8), 1, align='C')
            pdf.cell(cols_width[3], 7, get_str('Total_Drop', 5), 1, align='C')
            pdf.cell(cols_width[4], 7, get_str('Origin_Location', 15), 1, align='L')
            pdf.cell(cols_width[5], 7, get_str('Dest_Location', 15), 1, align='L')
            pdf.cell(cols_width[6], 7, fmt(get_float('Charge_Point')), 1, align='R')
            pdf.cell(cols_width[7], 7, fmt(get_float('Charge_Labor')), 1, align='R')
            pdf.cell(cols_width[8], 7, fmt(get_float('Charge_Wait')), 1, align='R')
            pdf.cell(cols_width[9], 7, fmt(get_float('Charge_Other')), 1, align='R')
            pdf.cell(cols_width[10], 7, f"{c_total:,.2f}", 1, align='R')
            pdf.ln()

        # Summary
        pdf.ln(2)
        pdf.set_font('THSarabun', 'B', 12)
        label_width = sum(cols_width[:-1])
        value_width = cols_width[-1]
        
        pdf.cell(label_width, 7, "ยอดรวมค่าจ้างทั้งหมด", border=1, align='R')
        pdf.cell(value_width, 7, f"{total_wages:,.2f}", border=1, align='R', ln=True)
        
        vat = total_wages * 0.07
        pdf.cell(label_width, 7, "vat 7%", border=1, align='R')
        pdf.cell(value_width, 7, f"{vat:,.2f}", border=1, align='R', ln=True)
        
        grand_total = total_wages + vat
        pdf.set_fill_color(240, 240, 240)
        text_width = label_width - 40
        pdf.cell(text_width, 8, f"({baht_text(grand_total)})", border=1, align='C', fill=True)
        pdf.cell(40, 8, "ยอดรวม", border=1, align='R', fill=True)
        pdf.cell(value_width, 8, f"{grand_total:,.2f}", border=1, align='R', fill=True, ln=True)

        pdf.set_y(-45)
        pdf.set_font('THSarabun', '', 11)
        y_sig = pdf.get_y()
        pdf.line(20, y_sig+10, 60, y_sig+10); pdf.text(30, y_sig+15, "ผู้รับวางบิล")
        pdf.line(90, y_sig+10, 130, y_sig+10); pdf.text(100, y_sig+15, "ผู้ตรวจสอบ")
        pdf.line(160, y_sig+10, 200, y_sig+10); pdf.text(170, y_sig+15, "ผู้วางบิล")

        return bytes(pdf.output())

    # --- 2. Data Loading ---
    try:
        jobs = get_data("Jobs_Main")
        customers = get_data("Master_Customers")
    except:
        st.error("โหลดข้อมูลไม่สำเร็จ")
        return

    # --- 3. Filter Section (ใช้ร่วมกันทั้ง 2 แท็บเพื่อความสะดวก) ---
    with st.container(border=True):
        st.write("🔍 **ตัวกรองข้อมูล (Filter)**")
        c1, c2, c3 = st.columns([1.5, 1, 1])
        cust_list = ["-- เลือกลูกค้า --"] + sorted(customers['Customer_Name'].unique().tolist()) if not customers.empty else []
        sel_cust = c1.selectbox("ลูกค้าที่จะวางบิล", cust_list)
        today = datetime.now()
        start_d = c2.date_input("รอบบิล ตั้งแต่", today.replace(day=1))
        end_d = c3.date_input("ถึงวันที่", today)

    # เช็คว่าเลือกลูกค้าหรือยัง
    if sel_cust == "-- เลือกลูกค้า --":
        st.info("👈 กรุณาเลือกลูกค้าก่อนเริ่มทำงาน")
        return

    # เตรียมข้อมูลเบื้องต้น
    if jobs.empty: st.warning("ไม่พบข้อมูล"); return

    jobs['PD_Obj'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    cols_map = {
        'Car_Type': '-', 'Total_Drop': '1', 
        'Charge_Point': 0.0, 'Charge_Labor': 0.0, 'Charge_Wait': 0.0, 'Charge_Other': 0.0,
        'Price_Cust_Base': 0.0, 'Price_Cust_Total': 0.0, 'Invoice_No': '-'
    }
    for col, default_val in cols_map.items():
        if col not in jobs.columns: jobs[col] = default_val

    # กรองข้อมูลตามลูกค้าและวันที่
    base_mask = (jobs['Customer_Name'] == sel_cust) & \
                (jobs['Job_Status'] == 'Completed') & \
                (jobs['PD_Obj'].dt.date >= start_d) & \
                (jobs['PD_Obj'].dt.date <= end_d)

    # =========================================================
    # TAB 1: 📝 ทำรายการวางบิล (Pending)
    # =========================================================
    with tab_work:
        # กรองเฉพาะที่ยังไม่วางบิล
        mask_pending = base_mask & (jobs['Billing_Status'] != 'Billed')
        df_pending = jobs[mask_pending].copy()

        if df_pending.empty:
            st.success("✅ ไม่มีรายการค้างวางบิลในช่วงเวลานี้ (เคลียร์หมดแล้ว!)")
        else:
            df_pending['Select'] = False
            st.markdown(f"##### รายการรอดำเนินการ: {len(df_pending)} รายการ")
            
            edited_pending = st.data_editor(
                df_pending[['Select', 'Job_ID', 'Plan_Date', 'Car_Type', 'Origin_Location', 'Dest_Location', 'Price_Cust_Total']],
                key="editor_pending", hide_index=True, use_container_width=True,
                column_config={"Price_Cust_Total": st.column_config.NumberColumn("รวมเงิน")}
            )
            
            selected_ids = edited_pending[edited_pending['Select'] == True]['Job_ID'].tolist()

            if selected_ids:
                st.divider()
                st.info("📝 **กำหนดเลขที่เอกสาร และ บันทึก**")
                
                c_form1, c_form2 = st.columns([2, 1])
                next_inv = f"INV-{datetime.now().strftime('%y%m')}-{int(time.time())%10000:04d}"
                new_inv_no = c_form1.text_input("ระบุเลขที่เอกสาร (Invoice No.)", value=next_inv)
                
                # ปุ่มบันทึกและสร้างไฟล์ทันที
                if c_form2.button("💾 บันทึกและสร้างไฟล์ PDF", type="primary", use_container_width=True):
                    if not os.path.exists(FONT_FILENAME):
                        st.error("❌ ไม่พบไฟล์ฟอนต์! กรุณาตรวจสอบ")
                    else:
                        # 1. Update Data (Backend)
                        jobs.loc[jobs['Job_ID'].isin(selected_ids), 'Billing_Status'] = 'Billed'
                        jobs.loc[jobs['Job_ID'].isin(selected_ids), 'Invoice_No'] = new_inv_no
                        jobs.loc[jobs['Job_ID'].isin(selected_ids), 'Billing_Date'] = str(datetime.now().date())
                        update_sheet("Jobs_Main", jobs)
                        
                        # 2. Generate PDF (On the fly)
                        cust_info = customers[customers['Customer_Name'] == sel_cust].iloc[0]
                        selected_data = jobs[jobs['Job_ID'].isin(selected_ids)].copy() # ดึงข้อมูลล่าสุดที่เพิ่งแก้
                        
                        pdf_bytes = create_invoice_pdf(
                            selected_data, 
                            sel_cust, 
                            str(cust_info.get('Address', '-')), 
                            str(cust_info.get('Tax_ID', '-')), 
                            new_inv_no, 
                            datetime.now().strftime('%d/%m/%Y')
                        )
                        
                        # 3. Show Result & Download
                        st.success(f"บันทึก {new_inv_no} สำเร็จ!")
                        st.download_button(
                            label=f"📥 ดาวน์โหลดเอกสาร ({new_inv_no})",
                            data=pdf_bytes,
                            file_name=f"Invoice_{new_inv_no}.pdf",
                            mime="application/pdf",
                            type="secondary"
                        )
                        st.caption("หมายเหตุ: รายการนี้ถูกย้ายไปที่แท็บ 'ประวัติ' แล้ว")

    # =========================================================
    # TAB 2: 🗂️ ประวัติการวางบิล (History)
    # =========================================================
    with tab_history:
        # กรองเฉพาะที่วางบิลแล้ว
        mask_billed = base_mask & (jobs['Billing_Status'] == 'Billed')
        df_billed = jobs[mask_billed].copy()

        if df_billed.empty:
            st.info("📭 ยังไม่มีประวัติการวางบิลในช่วงเวลานี้")
        else:
            # Group by Invoice No เพื่อให้เลือกง่ายๆ
            unique_invoices = df_billed['Invoice_No'].unique().tolist()
            unique_invoices = [x for x in unique_invoices if str(x).lower() != 'nan' and str(x) != '-']
            
            st.write(f"พบเอกสารจำนวน: {len(unique_invoices)} ใบ")
            
            c_hist1, c_hist2 = st.columns([2, 1])
            selected_inv = c_hist1.selectbox("เลือกเลขที่เอกสาร (Invoice No.) เพื่อดูรายละเอียด", unique_invoices)
            
            if selected_inv:
                # Filter data for this invoice
                view_data = df_billed[df_billed['Invoice_No'] == selected_inv].copy()
                
                # Show Preview
                st.dataframe(
                    view_data[['Job_ID', 'Plan_Date', 'Car_Type', 'Origin_Location', 'Dest_Location', 'Price_Cust_Total']],
                    hide_index=True, use_container_width=True
                )
                
                # Download Button for History
                if c_hist2.button(f"📄 ดาวน์โหลด PDF ({selected_inv})", use_container_width=True):
                     if not os.path.exists(FONT_FILENAME):
                        st.error("❌ ไม่พบไฟล์ฟอนต์!")
                     else:
                        cust_info = customers[customers['Customer_Name'] == sel_cust].iloc[0]
                        # ลองหาวันที่บิลจากข้อมูล ถ้าไม่มีใช้วันปัจจุบัน
                        try: bill_date = pd.to_datetime(view_data.iloc[0]['Billing_Date']).strftime('%d/%m/%Y')
                        except: bill_date = datetime.now().strftime('%d/%m/%Y')

                        pdf_bytes = create_invoice_pdf(
                            view_data, 
                            sel_cust, 
                            str(cust_info.get('Address', '-')), 
                            str(cust_info.get('Tax_ID', '-')), 
                            selected_inv, 
                            bill_date
                        )
                        st.download_button(
                            label="📥 คลิกเพื่อดาวน์โหลดไฟล์",
                            data=pdf_bytes,
                            file_name=f"Invoice_{selected_inv}.pdf",
                            mime="application/pdf",
                            key=f"dl_hist_{selected_inv}"
                        )

# ==========================================
# ส่วนที่ 2: ฟังก์ชันหลัก Admin Flow
# ==========================================

def admin_flow():
    with st.sidebar:
        st.title("Control Tower")
        st.success(f"Admin: {st.session_state.driver_name}")
        
        if st.button("🔄 รีเฟรชข้อมูลล่าสุด"):
            st.cache_data.clear()
            st.session_state.data_store = load_all_data()
            st.rerun()
            
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.rerun()
            
        st.caption("v5.2.1 Stable")
            
    st.title("🖥️ Admin Dashboard")
    
    # Init Session Vars
    if 'form_route_name' not in st.session_state: st.session_state.form_route_name = ""
    if 'form_origin' not in st.session_state: st.session_state.form_origin = ""
    if 'form_dist' not in st.session_state: st.session_state.form_dist = 100.0

    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10, tab11 = st.tabs([
        "📝 จ่ายงาน", "📊 รายงาน", "🔧 แจ้งซ่อม", "⛽ น้ำมัน", 
        "🗂️ รถ/สต็อก", "🗺️ GPS", "⛽ ราคาน้ำมัน", "⚙️ ตั้งค่า", "📖 คู่มือ", "💰 บัญชีคนขับ", "📑 วางบิลลูกค้า"
    ])

    # --- Tab 1: Assignment (Unified) ---
    with tab1:
        render_tab1_flexible_assignment()

    # --- Tab 2: Dashboard ---
    with tab2:
        st.subheader("📊 รายงานสรุป (Dashboard)")
        with st.spinner("กำลังประมวลผลข้อมูล..."):
            df_jobs = get_data("Jobs_Main")
            df_fuel = get_data("Fuel_Logs")
        
        today = datetime.now().date()
        default_start = today - timedelta(days=30)
        default_end = today + timedelta(days=30)

        c1, c2 = st.columns(2)
        with c1: start_date = st.date_input("📅 เริ่มต้น", default_start)
        with c2: end_date = st.date_input("📅 สิ้นสุด", default_end)

        if not df_jobs.empty:
            df_jobs['PD'] = df_jobs['Plan_Date'].apply(parse_flexible_date)
            job_mask = (df_jobs['PD'].dt.date >= start_date) & \
                       (df_jobs['PD'].dt.date <= end_date) & \
                       (df_jobs['Job_Status'] != 'CANCELLED')
            df_jobs_filtered = df_jobs[job_mask].copy()
        else:
            df_jobs_filtered = pd.DataFrame()

        if not df_fuel.empty:
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
                    df_jobs_filtered[col] = pd.to_numeric(df_jobs_filtered[col].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
            
            if 'Price_Total' in df_fuel_filtered.columns:
                df_fuel_filtered['Price_Total'] = pd.to_numeric(df_fuel_filtered['Price_Total'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)

            total_rev = df_jobs_filtered[p_col].sum() if not df_jobs_filtered.empty else 0
            total_driver_cost = df_jobs_filtered[c_col].sum() if not df_jobs_filtered.empty else 0
            total_fuel_cost = df_fuel_filtered['Price_Total'].sum() if not df_fuel_filtered.empty else 0
            net_profit = total_rev - total_driver_cost - total_fuel_cost
            
            # Feature: On-Time Performance
            if 'Actual_Delivery_Time' in df_jobs_filtered.columns:
                df_jobs_filtered['Actual_DT'] = pd.to_datetime(df_jobs_filtered['Actual_Delivery_Time'], errors='coerce')
                
                def check_ontime(row):
                    if pd.isna(row['PD']): return "N/A"
                    if pd.isna(row['Actual_DT']):
                        if row['Job_Status'] == 'Completed': return "No Time"
                        if row['PD'].date() < datetime.now().date(): return "Late (Pending)"
                        return "Pending"
                    if row['Actual_DT'].date() <= row['PD'].date(): return "On-Time"
                    return "Late"
                
                df_jobs_filtered['Delivery_Performance'] = df_jobs_filtered.apply(check_ontime, axis=1)
                
                completed = df_jobs_filtered[df_jobs_filtered['Job_Status'] == 'Completed']
                if not completed.empty:
                    ontime_pct = (len(completed[completed['Delivery_Performance'] == 'On-Time']) / len(completed)) * 100
                else: ontime_pct = 0
            else:
                ontime_pct = 0
                df_jobs_filtered['Delivery_Performance'] = "N/A"

            k1, k2, k3, k4 = st.columns(4)
            k1.metric("💰 รายรับ", f"{total_rev:,.0f}")
            k2.metric("🚚 ค่าเที่ยว", f"{total_driver_cost:,.0f}")
            k3.metric("⛽ ค่าน้ำมัน", f"{total_fuel_cost:,.0f}")
            k4.metric("📈 กำไรสุทธิ", f"{net_profit:,.0f}")
            st.metric("⏱️ ส่งตรงเวลา (On-Time)", f"{ontime_pct:.1f}%")

            st.divider()
            
            st.markdown("### 🚚 สรุปรายรถ (Fleet)")
            perf_jobs = pd.DataFrame()
            if not df_jobs_filtered.empty:
                perf_jobs = df_jobs_filtered.groupby('Vehicle_Plate').agg({'Job_ID': 'count', p_col: 'sum', c_col: 'sum'}).reset_index()
                perf_jobs.rename(columns={'Job_ID': 'Job_Count', p_col: 'Revenue', c_col: 'Driver_Cost'}, inplace=True)

            perf_fuel = pd.DataFrame()
            if not df_fuel_filtered.empty:
                perf_fuel = df_fuel_filtered.groupby('Vehicle_Plate')['Price_Total'].sum().reset_index()
                perf_fuel.rename(columns={'Price_Total': 'Fuel_Cost'}, inplace=True)

            if not perf_jobs.empty or not perf_fuel.empty:
                if perf_jobs.empty: perf_jobs = pd.DataFrame(columns=['Vehicle_Plate', 'Job_Count', 'Revenue', 'Driver_Cost'])
                if perf_fuel.empty: perf_fuel = pd.DataFrame(columns=['Vehicle_Plate', 'Fuel_Cost'])

                df_perf = pd.merge(perf_jobs, perf_fuel, on='Vehicle_Plate', how='outer').fillna(0)
                df_perf['Net_Profit'] = df_perf['Revenue'] - df_perf['Driver_Cost'] - df_perf['Fuel_Cost']
                df_perf = df_perf.sort_values('Net_Profit', ascending=False)
                
                try: st.bar_chart(df_perf.set_index('Vehicle_Plate')[['Revenue', 'Driver_Cost', 'Net_Profit']])
                except: pass

                try: st.dataframe(df_perf.style.format("{:,.0f}"), use_container_width=True)
                except: st.dataframe(df_perf, use_container_width=True)
            
            st.divider()
            st.markdown("### 👥 สรุปรายลูกค้า")
            if not df_jobs_filtered.empty and 'Customer_Name' in df_jobs_filtered.columns:
                perf_cust = df_jobs_filtered.groupby('Customer_Name').agg({'Job_ID': 'count', p_col: 'sum'}).reset_index()
                perf_cust.rename(columns={'Job_ID': 'Job_Count', p_col: 'Revenue'}, inplace=True)
                perf_cust = perf_cust.sort_values('Revenue', ascending=False)
                
                c_cust1, c_cust2 = st.columns([2, 1])
                with c_cust1:
                    try: st.bar_chart(perf_cust.set_index('Customer_Name')['Revenue'])
                    except: pass
                with c_cust2:
                    try: st.dataframe(perf_cust.style.format("{:,.0f}"), use_container_width=True)
                    except: st.dataframe(perf_cust, use_container_width=True)
        else:
            st.warning("ไม่พบข้อมูลในช่วงวันที่เลือก")

    # --- Tab 3: MMS (Updated) ---
    with tab3:
        st.subheader("🔧 MMS: ระบบซ่อมบำรุง & ต่อทะเบียน")
        mms1, mms2, mms3, mms4 = st.tabs(["📝 ใบสั่งซ่อม (Ticket)", "📄 ต่อสัญญา (Renew)", "📜 ประวัติซ่อมบำรุง (History)", "✍️ บันทึกใหม่ (Log)"])
        
        # 1. ใบสั่งซ่อม
        with mms1:
            tk = get_data("Repair_Tickets")
            if not tk.empty:
                c_flt1, c_flt2 = st.columns(2)
                pl_list = ["ทั้งหมด"] + sorted(tk['Vehicle_Plate'].astype(str).unique().tolist()) if 'Vehicle_Plate' in tk.columns else ["ทั้งหมด"]
                st_list = ["ทั้งหมด"] + sorted(tk['Status'].astype(str).unique().tolist()) if 'Status' in tk.columns else ["ทั้งหมด"]
                sel_pl = c_flt1.selectbox("กรองทะเบียน", pl_list, key="mms_pl")
                sel_st = c_flt2.selectbox("กรองสถานะ", st_list, key="mms_st")
                
                view = tk.copy()
                if sel_pl != "ทั้งหมด": view = view[view['Vehicle_Plate'] == sel_pl]
                if sel_st != "ทั้งหมด": view = view[view['Status'] == sel_st]
                
                st.data_editor(
                    view,
                    column_config={
                        "Photo_Url": st.column_config.ImageColumn("รูป", width="medium"),
                        "Ticket_ID": st.column_config.TextColumn("Ticket", disabled=True),
                        "Approver": st.column_config.TextColumn("ผู้อนุมัติ", disabled=True),
                        "Status": st.column_config.TextColumn("สถานะ", disabled=True)
                    },
                    use_container_width=True, hide_index=True
                )
                
                st.divider()
                st.markdown("##### 🛠 อัปเดตสถานะงานซ่อม")
                all_tickets = tk['Ticket_ID'].unique().tolist()
                pending_tickets = tk[tk['Status'] != 'เสร็จสิ้น']['Ticket_ID'].unique().tolist()
                default_ix = all_tickets.index(pending_tickets[0]) if pending_tickets else 0
                
                c1, c2, c3 = st.columns([1.5, 1.5, 1])
                tid = c1.selectbox("เลือก Ticket ID", all_tickets, index=default_ix)
                new_st = c2.selectbox("เปลี่ยนสถานะเป็น", ["รอดำเนินการ", "กำลังดำเนินการ", "รออะไหล่", "เสร็จสิ้น"])
                
                if c3.button("💾 บันทึกสถานะ", type="primary", use_container_width=True):
                    tk.loc[tk['Ticket_ID'] == tid, 'Status'] = new_st
                    current_admin = st.session_state.get('driver_name', 'Admin')
                    tk.loc[tk['Ticket_ID'] == tid, 'Approver'] = current_admin
                    if new_st == "เสร็จสิ้น": 
                        tk.loc[tk['Ticket_ID'] == tid, 'Date_Finish'] = get_thai_time_str() # type: ignore
                    update_sheet("Repair_Tickets", tk)
                    st.success(f"✅ อัปเดตเรียบร้อย"); time.sleep(1); st.rerun()
            else: st.info("ไม่มีใบสั่งซ่อม")

        # 2. ต่อสัญญา
        with mms2:
            st.markdown("### 📅 แจ้งเตือนต่ออายุเอกสาร")
            drivers = get_data("Master_Drivers")
            if not drivers.empty:
                cols_check = {'Insurance_Expiry': '1. ประกันภัย 🛡️', 'Tax_Expiry': '2. ภาษีรถยนต์ 📄', 'Act_Expiry': '3. พ.ร.บ. 🏥'}
                status_data = []
                for i, row in drivers.iterrows():
                    plate = str(row['Vehicle_Plate'])
                    for col_key, col_name in cols_check.items():
                        if col_key not in drivers.columns: continue
                        exp_date_str = str(row.get(col_key, ''))
                        days_left = 9999
                        status_text = "⚪ ไม่ระบุ"
                        if len(exp_date_str) >= 10:
                            try:
                                exp_dt = parse_flexible_date(exp_date_str) # type: ignore
                                if pd.notna(exp_dt):
                                    days_left = (exp_dt - datetime.now()).days
                                    if days_left < 0: status_text = "🔴 หมดอายุ!"
                                    elif days_left < 30: status_text = f"🟡 เหลือ {days_left} วัน"
                                    else: status_text = f"🟢 เหลือ {days_left} วัน"
                            except: pass
                        status_data.append({"ทะเบียน": plate, "ประเภทเอกสาร": col_name, "วันหมดอายุ": exp_date_str, "สถานะ": status_text, "_sort": days_left})
                
                if status_data:
                    df_s = pd.DataFrame(status_data).sort_values(by='_sort')
                    def hl(val): return 'color: red; font-weight: bold' if "🔴" in val else ('color: orange; font-weight: bold' if "🟡" in val else 'color: green' if "🟢" in val else 'color: gray')
                    st.dataframe(df_s[['ทะเบียน', 'ประเภทเอกสาร', 'วันหมดอายุ', 'สถานะ']].style.map(hl, subset=['สถานะ']), use_container_width=True, hide_index=True)
                else: st.info("ไม่พบข้อมูลวันหมดอายุ")
            else: st.warning("ไม่มีข้อมูลรถ")

        # 3. ประวัติซ่อมบำรุง
        with mms3:
            st.markdown("##### 📜 ประวัติการซ่อมบำรุงทั้งหมด (Inspection & Maintenance)")
            try:
                maint_logs = get_data("Maintenance_Logs")
            except: maint_logs = pd.DataFrame()

            if not maint_logs.empty:
                mc1, mc2, mc3 = st.columns(3)
                today = datetime.now().date()
                d_start = mc1.date_input("ตั้งแต่", today - timedelta(days=90))
                d_end = mc2.date_input("ถึง", today)
                all_types = ["ทั้งหมด"] + sorted(maint_logs['Service_Type'].dropna().unique().tolist()) if 'Service_Type' in maint_logs.columns else []
                sel_type = mc3.selectbox("ประเภทงาน", all_types)

                if 'Date_Service' in maint_logs.columns:
                    maint_logs['Date_Obj'] = pd.to_datetime(maint_logs['Date_Service'], errors='coerce')
                    mask = (maint_logs['Date_Obj'].dt.date >= d_start) & (maint_logs['Date_Obj'].dt.date <= d_end)
                    if sel_type != "ทั้งหมด": mask &= (maint_logs['Service_Type'] == sel_type)
                    df_show = maint_logs[mask].sort_values('Date_Obj', ascending=False).drop(columns=['Date_Obj'])
                    
                    st.dataframe(
                        df_show,
                        column_config={
                            "Date_Service": st.column_config.DateColumn("วันที่", format="DD/MM/YYYY"),
                            "Vehicle_Plate": "ทะเบียนรถ",
                            "Service_Type": "รายการ",
                            "Odometer": st.column_config.NumberColumn("เลขไมล์", format="%d"),
                            "Notes": st.column_config.TextColumn("รายละเอียด", width="large")
                        },
                        use_container_width=True, hide_index=True
                    )
                else: st.error("ข้อมูลวันที่ผิดพลาด")
            else: st.info("ยังไม่มีประวัติการซ่อมบำรุง")

        # 4. บันทึกซ่อม
        with mms4:
            st.markdown("##### ✍️ บันทึกประวัติ / เปิดใบงาน")
            with st.form("mn_form_new"):
                d = get_data("Master_Drivers")
                pl = sorted(d['Vehicle_Plate'].dropna().unique().tolist()) if not d.empty else []
                c1, c2 = st.columns(2)
                vp = c1.selectbox("ทะเบียนรถ", pl)
                sv_date = c2.date_input("วันที่ซ่อม", datetime.today())
                sv_type = st.selectbox("หมวดหมู่", ["ตรวจสภาพประจำปี", "ถ่ายน้ำมันเครื่อง", "เปลี่ยนยาง", "ซ่อมเครื่องยนต์", "ระบบเบรก/ช่วงล่าง", "อื่นๆ"])
                c3, c4 = st.columns(2)
                odo = c3.number_input("เลขไมล์ปัจจุบัน", 0)
                cost_est = c4.number_input("ค่าใช้จ่าย (ประมาณการ)", 0.0)
                desc = st.text_area("รายละเอียด / อาการเสีย")
                create_tk = st.checkbox("📢 เปิดใบสั่งซ่อม (Ticket)", value=True)
                
                if st.form_submit_button("💾 บันทึกข้อมูล"):
                    log = {"Log_ID": f"MN-{int(time.time())}", "Date_Service": sv_date.strftime("%Y-%m-%d"), "Vehicle_Plate": vp, "Service_Type": sv_type, "Odometer": odo, "Notes": f"{desc} ({cost_est} บ.)"}
                    log_maintenance_record(log) # type: ignore
                    if create_tk:
                        tk_data = {"Ticket_ID": f"TK-{int(time.time())}", "Date_Report": get_thai_time_str(), "Vehicle_Plate": vp, "Issue_Type": sv_type, "Description": desc, "Status": "รอดำเนินการ", "Photo_Url": "-", "Cost_Total": cost_est, "Driver_ID": "ADMIN"} # type: ignore
                        create_repair_ticket(tk_data) # type: ignore
                    st.success("บันทึกเรียบร้อย"); time.sleep(1); st.rerun()

    # --- Tab 4: Fuel (Updated v5.1: Fraud Detection + Best Drivers) ---
    with tab4:
        st.subheader("⛽ บริหารจัดการน้ำมัน & ประสิทธิภาพ (Fuel & Performance)")
        f1, f2, f3 = st.tabs(["📊 วิเคราะห์ผล (Analysis)", "📜 ประวัติทั้งหมด", "✍️ บันทึกข้อมูล"])
        
        fl = get_data("Fuel_Logs")
        if not fl.empty:
            if 'Date_Time' in fl.columns: fl['DT'] = fl['Date_Time'].apply(parse_flexible_date)
            else: fl['DT'] = pd.NaT
            fl['Odometer'] = pd.to_numeric(fl['Odometer'], errors='coerce').fillna(0)
            fl['Liters'] = pd.to_numeric(fl['Liters'], errors='coerce').fillna(0)
            fl = fl.sort_values(by=['Vehicle_Plate', 'DT'])
            fl['Prev_Odo'] = fl.groupby('Vehicle_Plate')['Odometer'].shift(1)
            fl['Dist_Run'] = fl['Odometer'] - fl['Prev_Odo']
            fl['KPL'] = fl.apply(lambda x: x['Dist_Run'] / x['Liters'] if x['Liters'] > 0 and x['Dist_Run'] > 0 else 0, axis=1)

        # 1. หน้าวิเคราะห์
        with f1:
            if not fl.empty:
                with st.expander("⚙️ ตั้งค่าเกณฑ์วัดผล (Thresholds)"):
                    c_t1, c_t2 = st.columns(2)
                    min_kpl = c_t1.number_input("🔴 เกณฑ์ต่ำผิดปกติ (กม./ลิตร)", value=2.0, step=0.5)
                    max_lit = c_t2.number_input("🔴 เกณฑ์เติมเยอะผิดปกติ (ลิตร/ครั้ง)", value=300.0, step=50.0)

                st.markdown("#### 🚨 รายการที่ต้องตรวจสอบ (Anomalies)")
                suspicious = fl[((fl['KPL'] < min_kpl) & (fl['KPL'] > 0)) | (fl['Liters'] > max_lit)].copy()
                suspicious = suspicious[suspicious['Dist_Run'] > 0]

                if not suspicious.empty:
                    st.error(f"พบรายการน่าสงสัย {len(suspicious)} รายการ")
                    view_susp = suspicious[['DT', 'Vehicle_Plate', 'Station_Name', 'Liters', 'Dist_Run', 'KPL']].copy()
                    view_susp = view_susp.sort_values('DT', ascending=False)
                    st.data_editor(view_susp, column_config={"DT": st.column_config.DatetimeColumn("วันที่", format="DD/MM/YYYY"), "KPL": st.column_config.NumberColumn("Km/L", format="%.2f")}, use_container_width=True, hide_index=True)
                else: st.success("✅ ไม่พบรายการผิดปกติ")

                st.divider()
                st.markdown("#### 🏆 Top 5 รถประหยัดน้ำมันยอดเยี่ยม")
                valid_runs = fl[(fl['KPL'] > 0) & (fl['KPL'] < 20)]
                if not valid_runs.empty:
                    best_performers = valid_runs.groupby('Vehicle_Plate')['KPL'].mean().reset_index().sort_values('KPL', ascending=False).head(5)
                    c_best1, c_best2 = st.columns([2, 1])
                    with c_best1: st.bar_chart(best_performers.set_index('Vehicle_Plate'), color="#4CAF50")
                    with c_best2: st.dataframe(best_performers, column_config={"KPL": st.column_config.ProgressColumn("Km/L", min_value=0, max_value=15, format="%.2f")}, hide_index=True, use_container_width=True)
                else: st.info("ข้อมูลยังไม่เพียงพอ")
            else: st.info("ยังไม่มีข้อมูลน้ำมัน")

        # 2. ประวัติทั้งหมด
        with f2:
            if not fl.empty:
                st.markdown("##### 📜 ประวัติการเติมน้ำมันทั้งหมด")
                df_show = fl.sort_values('DT', ascending=False).drop(columns=['DT', 'Prev_Odo'], errors='ignore')
                st.data_editor(df_show, column_config={"Photo_Url": st.column_config.ImageColumn("รูปสลิป", width="small"), "Price_Total": st.column_config.NumberColumn("บาท", format="%.2f"), "Liters": st.column_config.NumberColumn("ลิตร", format="%.2f"), "KPL": st.column_config.NumberColumn("Km/L", format="%.2f")}, use_container_width=True, hide_index=True, disabled=True)
            else: st.info("ไม่มีข้อมูล")
            
        # 3. บันทึกข้อมูล
        with f3:
            st.markdown("##### ✍️ บันทึกการเติมน้ำมัน")
            with st.form("adm_fuel"):
                d = get_data("Master_Drivers")
                pl = sorted(d['Vehicle_Plate'].dropna().unique().tolist()) if not d.empty else []
                c1, c2 = st.columns(2)
                vp = c1.selectbox("ทะเบียนรถ", pl)
                stn = c2.text_input("ชื่อปั๊ม", "ปตท.")
                c3, c4, c5 = st.columns(3)
                odo = c3.number_input("เลขไมล์", 0)
                lit = c4.number_input("จำนวนลิตร", 0.0)
                prc = c5.number_input("จำนวนเงิน", 0.0)
                photo_link = st.text_input("ลิงก์รูปภาพสลิป (URL)", "-")
                
                if st.form_submit_button("💾 บันทึกข้อมูล"):
                    fd = {"Log_ID": f"FA-{int(time.time())}", "Date_Time": get_thai_time_str(), "Vehicle_Plate": vp, "Odometer": odo, "Liters": lit, "Price_Total": prc, "Station_Name": stn, "Driver_ID": "ADMIN", "Photo_Url": photo_link}
                    create_fuel_log(fd)
                    st.success("บันทึกข้อมูลเรียบร้อย"); time.sleep(1); st.rerun()

    # --- Tab 5: Master (Updated v2: เพิ่มลูกค้า) ---
    with tab5:
        st.subheader("🗂️ ฐานข้อมูลหลัก (Master Data)")
        # เพิ่มแท็บ "ลูกค้า" เป็นอันสุดท้าย
        mt1, mt2, mt3, mt4, mt5, mt6 = st.tabs(["รถ", "หาง", "อะไหล่", "ยาง", "เส้นทาง", "ลูกค้า"])
        
        with mt1:
            md = get_data("Master_Drivers")
            ed_md = st.data_editor(md, num_rows="dynamic", use_container_width=True)
            if st.button("Save Car"): update_sheet("Master_Drivers", ed_md); st.success("Saved"); st.rerun()
            
        with mt2:
            tr = get_data_safe("Master_Trailers", ["Trailer_ID", "License_Plate"])
            ed_tr = st.data_editor(tr, num_rows="dynamic", use_container_width=True)
            if st.button("Save Trailer"): update_sheet("Master_Trailers", ed_tr); st.success("Saved"); st.rerun()

        with mt3:
            sp = get_data("Stock_Parts")
            ed_sp = st.data_editor(sp, num_rows="dynamic", use_container_width=True)
            if st.button("Save Stock"): update_sheet("Stock_Parts", ed_sp); st.success("Saved"); st.rerun()
            
        with mt4:
            ti = get_data_safe("Master_Tires", ["Tire_Serial", "Brand", "Status"])
            ed_ti = st.data_editor(ti, num_rows="dynamic", use_container_width=True)
            if st.button("Save Tires"): update_sheet("Master_Tires", ed_ti); st.success("Saved"); st.rerun()
            
        with mt5:
            mr = get_data("Master_Routes")
            ed_mr = st.data_editor(mr, num_rows="dynamic", use_container_width=True)
            if st.button("Save Routes"): update_sheet("Master_Routes", ed_mr); st.success("Saved"); st.rerun()

        # --- ส่วนที่เพิ่มมาใหม่: จัดการลูกค้า (Fixed Error) ---
        with mt6:
            st.markdown("##### 👥 ฐานข้อมูลลูกค้า (Customers)")
            st.info("💡 กรุณากรอก 'ที่อยู่' และ 'เลขผู้เสียภาษี' เพื่อให้แสดงในใบวางบิล")
            
            try:
                mc = get_data("Master_Customers")
            except:
                mc = pd.DataFrame(columns=["Customer_ID", "Customer_Name", "Address", "Tax_ID"])

            # --- 🔧 FIX: แปลงข้อมูลให้เป็น String ก่อนแสดงผล ---
            if not mc.empty:
                # แปลงทุกคอลัมน์ที่จะแสดงให้เป็น String เพื่อป้องกัน Error Data Type
                for col in ["Customer_Name", "Address", "Tax_ID", "Contact_Person", "Phone"]:
                    if col in mc.columns:
                        mc[col] = mc[col].astype(str).replace('nan', '')
                        # ลบ .0 ทิ้ง ถ้าเป็นตัวเลข (เช่น 1234.0 -> 1234)
                        mc[col] = mc[col].str.replace(r'\.0$', '', regex=True)
            # --------------------------------------------------

            ed_mc = st.data_editor(
                mc, 
                num_rows="dynamic", 
                use_container_width=True,
                column_config={
                    "Customer_Name": st.column_config.TextColumn("ชื่อลูกค้า", required=True),
                    "Address": st.column_config.TextColumn("ที่อยู่ (สำหรับออกบิล)", width="large"),
                    "Tax_ID": st.column_config.TextColumn("เลขผู้เสียภาษี"), # ตอนนี้ข้อมูลเป็น String แล้ว จะไม่ Error
                    "Contact_Person": st.column_config.TextColumn("ผู้ติดต่อ"),
                    "Phone": st.column_config.TextColumn("เบอร์โทร")
                }
            )
            
            if st.button("💾 บันทึกข้อมูลลูกค้า (Save Customers)", type="primary"): 
                update_sheet("Master_Customers", ed_mc)
                st.success("บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว")
                time.sleep(1); st.rerun()

    # --- Tab 6: GPS (Fixed Call) ---
    with tab6:
        render_tab6_gps()

    # --- Tab 7: Calc ---
    with tab7:
        st.subheader("🧮 Smart Calculator")
        with st.container(border=True):
            st.markdown("##### 📍 กำหนดระยะทาง")
            mr = get_data("Master_Routes")
            route_opts = ["-- กำหนดเอง --"] + sorted(mr['Route_Name'].unique().tolist()) if not mr.empty else ["-- กำหนดเอง --"]
            
            c_r1, c_r2 = st.columns([2, 1])
            sel_route = c_r1.selectbox("เลือกจากเส้นทางมาตรฐาน", route_opts)
            
            default_dist = 100.0
            if sel_route != "-- กำหนดเอง --":
                row = mr[mr['Route_Name'] == sel_route].iloc[0]
                try: default_dist = float(str(row['Distance_KM']).replace(',',''))
                except: pass

            dist = c_r2.number_input("ระยะทางไป-กลับ (กม.)", min_value=0.0, value=default_dist, step=10.0)

        c_cal1, c_cal2 = st.columns([1.5, 2])
        with c_cal1:
            st.markdown("##### 🚛 ข้อมูลรถและค่าใช้จ่าย")
            vt = st.selectbox("ประเภทรถหลัก", ["4 ล้อ", "6 ล้อ", "10 ล้อ", "รถพ่วง"], index=1)
            extra_cost = st.number_input("ค่าใช้จ่ายพิเศษ", min_value=0, value=0, step=100)
            target_margin = st.slider("กำไรที่ต้องการ (%)", 0, 100, 20)
            
            if st.button("🚀 คำนวณต้นทุนและราคา", type="primary", use_container_width=True):
                calc_date = datetime.now()
                base_cost = calculate_driver_cost(calc_date, dist, vt)
                total_cost = base_cost + extra_cost
                suggest_price = total_cost / (1 - (target_margin / 100)) if target_margin < 100 else 0
                profit = suggest_price - total_cost

                st.markdown("---")
                st.success(f"💰 ราคาขายแนะนำ: **{suggest_price:,.0f}** บาท")
                st.caption(f"(ต้นทุนรวม: {total_cost:,.0f} บ. | กำไร: {profit:,.0f} บ.)")

                st.session_state.calc_result = {"base_cost": base_cost, "extra_cost": extra_cost, "profit": profit}

        with c_cal2:
            st.markdown("##### 📊 เปรียบเทียบต้นทุนรายรถ")
            comp_data = []
            for v in ["4 ล้อ", "6 ล้อ", "10 ล้อ"]:
                c = calculate_driver_cost(datetime.now(), dist, v)
                comp_data.append({"ประเภท": v, "ต้นทุนขนส่ง": c})
            
            df_comp = pd.DataFrame(comp_data)
            try:
                st.dataframe(df_comp.style.highlight_min(axis=0, color='#ccffcc').format({"ต้นทุนขนส่ง": "{:,.0f}"}), use_container_width=True, hide_index=True)
            except:
                st.dataframe(df_comp, use_container_width=True)

            if 'calc_result' in st.session_state:
                res = st.session_state.calc_result
                st.markdown("##### 🍰 โครงสร้างราคา")
                chart_df = pd.DataFrame([
                    {"Category": "ต้นทุนรถ/น้ำมัน", "Value": res['base_cost']},
                    {"Category": "ค่าใช้จ่ายพิเศษ", "Value": res['extra_cost']},
                    {"Category": "กำไร", "Value": res['profit']},
                ])
                st.bar_chart(chart_df.set_index("Category"), color=["#FF9800"])

        st.divider()
        with st.expander("⛽ ดูราคาน้ำมันหน้าปั๊ม (Live)"):
            if st.button("🔄 อัปเดตราคาน้ำมัน"):
                st.session_state.fuel_price_data = get_fuel_prices()
            
            fp = st.session_state.get('fuel_price_data', {})
            if fp:
                ptt = fp.get('ราคาน้ำมัน ปตท. (ptt)', {})
                if ptt:
                    df_p = pd.DataFrame(list(ptt.items()), columns=['ชนิด', 'ราคา'])
                    st.dataframe(df_p.T, use_container_width=True)
                else: st.write(fp)
            else: st.info("กดปุ่มเพื่อดึงข้อมูล")

    # --- Tab 8: Config ---
    with tab8:
        st.subheader("⚙️ ตั้งค่า")
        c1, c2, c3 = st.tabs(["Config", "Users", "Tools"])
        
        with c1:
            conf = get_data("System_Config")
            ed_cf = st.data_editor(conf, num_rows="dynamic", use_container_width=True)
            if st.button("Save Config"): update_sheet("System_Config", ed_cf); st.success("Saved")
            
        with c2:
            us = get_data("Master_Drivers")
            ed_us = st.data_editor(us[['Driver_ID', 'Driver_Name', 'Role', 'Password']], use_container_width=True)
            if st.button("Update Users"):
                st.info("Function update user need full logic implementation")
        
        with c3:
            if st.button("Clear Cache"): st.cache_data.clear(); st.success("Cleared"); st.rerun()
    # --- Tab 9: Manual ---
    with tab9: # type: ignore
        st.subheader("📘 คู่มือการใช้งานระบบ")
        manual_tab1, manual_tab2, manual_tab3 = st.tabs(["คู่มือใช้งาน", "วิดีโอสอน", "ติดต่อผู้พัฒนา"])
        
        with manual_tab1:
            try:
                manual_text = get_manual_content()
                st.markdown(manual_text)
            except:
                st.info("กำลังปรับปรุงคู่มือ")
        
        with manual_tab2:
            st.info("กำลังอัปโหลดวิดีโอ")
        
        with manual_tab3:
            st.info("ติดต่อ: support@example.com")

    with tab10:
        render_tab10_accounting()

    # --- Tab 11: Billing (New) ---
    with tab11:
        render_tab11_billing()            