
import streamlit as st
import pandas as pd
import plotly.express as px
import json
from datetime import datetime, timedelta
from data.repository import repo

def render_fuel_view():
    st.markdown("### ⛽ ระบบจัดการน้ำมันเชื้อเพลิง (Fuel Management)")
    
    # --- Record Fuel Form ---
    with st.expander("➕ บันทึกการเติมน้ำมัน (Record Fuel)", expanded=False):
        _render_fuel_form()
    
    tab1, tab2 = st.tabs(["📊 ภาพรวม & วิเคราะห์ (Analytics)", "📝 รายการเติมน้ำมัน (Transaction Logs)"])
    
    display_approval_section()
    
    with tab1:
        _render_analytics()
        
    with tab2:
        _render_logs()

def display_approval_section():
    """Section for approving pending fuel requests."""
    fuel = repo.get_data("Fuel_Logs")
    
    # Filter for 'Pending' status (case-insensitive)
    if not fuel.empty and 'Status' in fuel.columns:
        pending = fuel[fuel['Status'].fillna('Pending').str.lower() == 'pending'].copy()
    else:
        # Backward compatibility: if no status col, assume approved or handle migration?
        # For new feature, we handle those without status as pending or ignore?
        # Let's treat NaN as Pending for now if column exists
        pending = pd.DataFrame()
        
    if not pending.empty:
        st.warning(f"⚠️ มีรายการขออนุมัติเติมน้ำมัน {len(pending)} รายการ (Pending Requests)")
        
        for _, row in pending.iterrows():
            with st.expander(f"⛽ {row['Log_ID']} | {row.get('Driver_ID', 'N/A')} | ฿{row.get('Price_Total', 0):,.2f}", expanded=True):
                c1, c2, c3 = st.columns([2, 1, 1])
                with c1:
                    st.write(f"**Station:** {row.get('Station_Name', '-')}")
                    st.write(f"**Liters:** {row.get('Liters', 0)} L")
                    st.write(f"**Time:** {row.get('Date_Time', '-')}")
                    
                    # Show image if exists
                    img_url = row.get('Photo_Url')
                    if img_url:
                        # Simple check for array string
                        import json
                        try:
                            imgs = json.loads(img_url)
                            if imgs and isinstance(imgs, list): st.image(imgs[0], width=200)
                        except:
                            if isinstance(img_url, str) and img_url.startswith('http'):
                                st.image(img_url, width=200)

                with c2:
                    remark = st.text_input("หมายเหตุ (Note)", key=f"note_{row['Log_ID']}")
                    
                with c3:
                    if st.button("✅ อนุมัติ", key=f"app_{row['Log_ID']}", type="primary"):
                        _update_fuel_status(row['Log_ID'], "Approved", remark)
                    if st.button("❌ ไม่อนุมัติ", key=f"rej_{row['Log_ID']}"):
                        _update_fuel_status(row['Log_ID'], "Rejected", remark)

    # --- Recent Approved Section (Last 20) ---
    if 'Status' in fuel.columns:
        approved = fuel[fuel['Status'].str.lower() == 'approved'].sort_values('Date_Time', ascending=False).head(20)
        if not approved.empty:
            with st.expander(f"✅ รายการอนุมัติล่าสุด ({len(approved)})", expanded=False):
                st.dataframe(
                    approved[['Log_ID', 'Date_Time', 'Driver_ID', 'Station_Name', 'Liters', 'Price_Total', 'Reviewer_Note']],
                    use_container_width=True,
                    hide_index=True
                )
    
    st.markdown("---")

def _update_fuel_status(log_id, status, note):
    try:
        repo.update_field_bulk("Fuel_Logs", "Log_ID", [log_id], "Status", status)
        if note:
            repo.update_field_bulk("Fuel_Logs", "Log_ID", [log_id], "Reviewer_Note", note)
        st.success(f"Status updated to {status}")
        st.rerun()
    except Exception as e:
        st.error(f"Error: {e}")


def _render_fuel_form():
    """Form to record new fuel transaction."""
    drivers = repo.get_data("Master_Drivers")
    vendors = repo.get_data("Master_Vendors")
    
    with st.form("fuel_record_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle Selection
            plate_opts = sorted(drivers['Vehicle_Plate'].dropna().unique().tolist()) if not drivers.empty else []
            plate = st.selectbox("ทะเบียนรถ (Vehicle)", plate_opts if plate_opts else ["-"])
            
            # Driver Selection
            driver_opts = sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else []
            driver_name = st.selectbox("พนักงานขับรถ (Driver)", driver_opts if driver_opts else ["-"])
            
            # Date/Time
            fuel_date = st.date_input("วันที่เติม (Date)", datetime.now())
            fuel_time = st.time_input("เวลาที่เติม (Time)", datetime.now())
            
        with col2:
            odo = st.number_input("เลขไมล์ (Odometer)", min_value=0, step=1)
            liters = st.number_input("จำนวนลิตร (Liters)", min_value=0.0, step=0.1)
            price = st.number_input("ยอดเงินรวม (Total Price)", min_value=0.0, step=10.0)
        
        st.markdown("---")
        c3, c4 = st.columns(2)
        with c3:
            pay_type = st.radio("รูปแบบการชำระ (Payment Type)", ["Fleet Card (บัตรเครดิต/ฟลีทการ์ด)", "Cash (เงินสด/สำรองจ่าย)"])
        
        with c4:
            # Station / Vendor Logic
            # Filter Vendors for Gas Stations
            station_opts = []
            if not vendors.empty:
                if 'Vendor_Type' in vendors.columns:
                    # Filter 'Gas Station' or fallback to all
                    gs_vendors = vendors[vendors['Vendor_Type'].fillna('').str.contains('Gas|Station|ปั๊ม', case=False, na=False)]
                    if gs_vendors.empty: gs_vendors = vendors
                    station_opts = gs_vendors['Vendor_Name'].unique().tolist()
            
            if "Fleet Card" in pay_type:
                station = st.selectbox("ปั๊มน้ำมัน (Station/Vendor)", ["- Select Station -"] + station_opts)
            else:
                # For Cash, can be ad-hoc or listed
                station_mode = st.toggle("เลือกจากรายชื่อปั๊ม (Select from List)", value=False)
                if station_mode:
                    station = st.selectbox("ปั๊มน้ำมัน (Station)", ["- Select Station -"] + station_opts)
                else:
                    station = st.text_input("ชื่อปั๊มน้ำมัน (Station Name)", placeholder="ระบุชื่อปั๊ม...")
        
        # File Upload
        slip_file = st.file_uploader("อัพโหลดรูปสลิป/เลขไมล์ (Slip/Odometer Photo)", type=['png', 'jpg', 'jpeg'])
        
        if st.form_submit_button("บันทึกข้อมูล (Save)", type="primary"):
            # Prepare Data
            # Find Driver ID
            driver_id = None
            if not drivers.empty and driver_name != "-":
                 d_row = drivers[drivers['Driver_Name'] == driver_name]
                 if not d_row.empty: driver_id = d_row.iloc[0]['Driver_ID']
            
            # Find Vendor ID if selected
            vendor_id = None
            if not vendors.empty and station and station != "- Select Station -":
                v_row = vendors[vendors['Vendor_Name'] == station]
                if not v_row.empty: vendor_id = v_row.iloc[0]['Vendor_ID']
            
            # Image Handler (Mock for now, normally stick to base64 or storage url)
            photo_url = None
            if slip_file:
                # simple mock url or base64 storage logic
                # For local repo we won't actually save file to disk in this snippet, 
                # but let's assume valid upload flow
                photo_url = "slip_uploaded.jpg" 
            
            # Combine Date and Time
            dt_combined = datetime.combine(fuel_date, fuel_time)
            
            new_log = {
                "Log_ID": f"FL-{datetime.now().strftime('%y%m%d%H%M%S')}",
                "Date_Time": dt_combined.strftime("%Y-%m-%d %H:%M:%S"),
                "Vehicle_Plate": plate,
                "Driver_ID": driver_id,
                "Driver_Name": driver_name,
                "Odometer": odo,
                "Liters": liters,
                "Price_Total": price,
                "Payment_Type": "Fleet Card" if "Fleet Card" in pay_type else "Cash",
                "Vendor_ID": vendor_id,
                "Station_Name": station if station != "- Select Station -" else None,
                "Slip_Image": photo_url,
                "Created_At": str(datetime.now())
            }
            
            if repo.insert_record("Fuel_Logs", new_log):
                st.success("✅ บันทึกรายการเติมน้ำมันสำเร็จ")
                st.rerun()
            else:
                st.error("บันทึกข้อมูลล้มเหลว")

def _render_analytics():
    """Fuel consumption analytics (Migrated from Maintenance View)."""
    fuel = repo.get_data("Fuel_Logs")
    
    if fuel.empty:
        st.info("ไม่พบข้อมูลรายการเติมน้ำมัน")
        return
    
    # Filters
    col1, col2 = st.columns(2)
    with col1:
        start = st.date_input("จากวันที่", datetime.now() - timedelta(days=30))
    with col2:
        end = st.date_input("ถึงวันที่", datetime.now())
    
    # Process Data
    fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
    filtered = fuel[(fuel['Date'].dt.date >= start) & (fuel['Date'].dt.date <= end)].copy()
    
    if filtered.empty:
        st.warning("ไม่มีข้อมูลในช่วงเวลาที่เลือก")
        return
        
    filtered['Liters'] = pd.to_numeric(filtered['Liters'], errors='coerce').fillna(0)
    filtered['Price_Total'] = pd.to_numeric(filtered['Price_Total'], errors='coerce').fillna(0)
    
    # KPIs
    total_liters = filtered['Liters'].sum()
    total_cost = filtered['Price_Total'].sum()
    avg_price = total_cost / total_liters if total_liters > 0 else 0
    
    from utils.helpers import render_metric_card
    c1, c2, c3, c4 = st.columns(4)
    with c1: st.markdown(render_metric_card("ปริมาณน้ำมันรวม", f"{total_liters:,.2f} L", icon="🛢️"), unsafe_allow_html=True)
    with c2: st.markdown(render_metric_card("ค่าใช้จ่ายรวม", f"฿{total_cost:,.2f}", icon="💰", accent_color="accent-blue"), unsafe_allow_html=True)
    with c3: st.markdown(render_metric_card("ราคาเฉลี่ย/ลิตร", f"฿{avg_price:.2f}", icon="📊"), unsafe_allow_html=True)
    with c4: st.markdown(render_metric_card("จำนวนรายการ", f"{len(filtered)}", icon="📝"), unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Charts
    c_chart1, c_chart2 = st.columns(2)
    
    with c_chart1:
        daily = filtered.groupby(filtered['Date'].dt.date)['Liters'].sum().reset_index()
        fig1 = px.bar(daily, x='Date', y='Liters', title='ปริมาณการใช้น้ำมันรายวัน')
        st.plotly_chart(fig1, use_container_width=True)
        
    with c_chart2:
        if 'Vehicle_Plate' in filtered.columns:
            vehicle_sum = filtered.groupby('Vehicle_Plate')['Liters'].sum().reset_index().sort_values('Liters', ascending=False)
            fig2 = px.bar(vehicle_sum, x='Vehicle_Plate', y='Liters', title='การใช้น้ำมันแยกตามรถ')
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("ไม่มีข้อมูลทะเบียนรถสำหรับกราฟ")

def _render_logs():
    """Detailed logs with images."""
    fuel = repo.get_data("Fuel_Logs")
    drivers = repo.get_data("Master_Drivers")
    
    if fuel.empty:
        st.info("ไม่พบข้อมูล")
        return
    
    # Sorting
    fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
    fuel = fuel.sort_values('Date', ascending=False)
    
    # Safe Column Handling
    # 1. Driver Name
    if 'Driver_Name' not in fuel.columns:
        if 'Driver_ID' in fuel.columns and not drivers.empty:
            driver_map = drivers.set_index('Driver_ID')['Driver_Name'].to_dict()
            fuel['Driver_Name'] = fuel['Driver_ID'].map(driver_map).fillna(fuel['Driver_ID'])
        else:
            fuel['Driver_Name'] = 'Unknown'
            
    # 2. Odometer
    if 'Odometer' not in fuel.columns:
        fuel['Odometer'] = 0
        
    # 3. Vehicle Plate
    if 'Vehicle_Plate' not in fuel.columns:
        fuel['Vehicle_Plate'] = "-"
        
    # 4. Station Name
    if 'Station_Name' not in fuel.columns:
        fuel['Station_Name'] = "-"

    # Display Table (Summary)
    st.markdown("##### รายการล่าสุด")
    
    # Dynamically select columns that exist
    desired_cols = ['Log_ID', 'Date_Time', 'Vehicle_Plate', 'Driver_Name', 'Station_Name', 'Liters', 'Price_Total', 'Odometer']
    display_cols = [c for c in desired_cols if c in fuel.columns]
    
    # Select Transaction
    if 'Log_ID' in fuel.columns:
        selected_id = st.selectbox("🔍 ค้นหา/เลือกรายการ (Log ID)", ["-"] + fuel['Log_ID'].tolist())
        
        if selected_id != "-":
            row = fuel[fuel['Log_ID'] == selected_id].iloc[0]
            
            with st.container():
                st.markdown(f"#### รายละเอียด: {row['Log_ID']}")
                c1, c2 = st.columns(2)
                with c1:
                    st.write(f"**วันที่:** {row['Date_Time']}")
                    st.write(f"**รถ:** {row.get('Vehicle_Plate', '-')}")
                    st.write(f"**คนขับ:** {row.get('Driver_Name', '-')}")
                    st.write(f"**สถานที่/ปั๊ม:** {row.get('Station_Name', '-')}")
                with c2:
                    st.write(f"**จำนวนลิตร:** {row.get('Liters', 0)} L")
                    st.write(f"**ราคา:** ฿{row.get('Price_Total', 0):,.2f}")
                    st.write(f"**เลขไมล์:** {row.get('Odometer', '-')}")
                
                # Photos
                st.markdown("##### 📸 รูปภาพแนบ")
                if row.get('Photo_Url'):
                    try:
                        # Try to parse JSON array
                        photos = json.loads(row['Photo_Url'])
                        if isinstance(photos, list) and len(photos) > 0:
                            cols = st.columns(min(len(photos), 4))
                            for i, p in enumerate(photos):
                                 with cols[i % 4]:
                                    st.image(p, use_container_width=True)
                        else:
                            st.warning("รูปแบบไฟล์ภาพไม่ถูกต้อง (Not a list)")
                    except:
                        # Fallback for single string or plain text
                        st.image(row['Photo_Url'], width=300)
                else:
                    st.info("ไม่มีรูปภาพแนบ")
                    
                st.markdown("---")

    # Main Dataframe
    
    # robust clean_img logic
    import re
    import ast
    
    def clean_img(val):
        if val is None or pd.isna(val) or val == "": return None
        if isinstance(val, list): return val[0] if len(val) > 0 else None
        s = str(val).strip()
        if s.startswith('[') and s.endswith(']'):
            try:
                arr = json.loads(s.replace("'", '"'))
                if isinstance(arr, list) and len(arr) > 0: return arr[0]
            except:
                try:
                    arr = ast.literal_eval(s)
                    if isinstance(arr, list) and len(arr) > 0: return arr[0]
                except:
                    pass
            match = re.search(r'["\'](data:image[^"\']+|http[^"\']+)["\']', s)
            if match: return match.group(1)
            inner = s[1:-1].strip()
            if (inner.startswith('"') and inner.endswith('"')) or (inner.startswith("'") and inner.endswith("'")): return inner[1:-1]
        return s

    # Apply to potential image columns
    img_cols = ['Slip_Image', 'Photo_Url']
    col_config = {
        "Date_Time": st.column_config.DatetimeColumn("วัน-เวลา", format="D MMM YYYY, HH:mm"),
        "Price_Total": st.column_config.NumberColumn("ราคา (บาท)", format="฿%.2f"),
        "Liters": st.column_config.NumberColumn("ลิตร", format="%.2f L"),
    }
    
    # Ensure display_df has necessary columns
    display_df = fuel[display_cols].copy()
    
    # Check if we need to add Slip_Image if not in display_cols but exists in source
    for col in img_cols:
         if col not in display_cols and col in fuel.columns:
             display_df[col] = fuel[col]

    for col in img_cols:
        if col in display_df.columns:
            display_df[col] = display_df[col].apply(clean_img)
            col_config[col] = st.column_config.ImageColumn(col, help="Preview")

    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        column_config=col_config
    )
