
import streamlit as st
import pandas as pd
import time
import base64
from datetime import datetime
from services.vendor_service import VendorService
from data.repository import repo
from utils.helpers import safe_float, render_metric_card
from config.constants import JobStatus
from data.models import get_template_df

# Language Labels
LABELS = {
    "th": {
        "title": "🤝 จัดการผู้รับเหมาช่วงและผู้ขาย",
        "tab_list": "📋 รายชื่อผู้ขาย",
        "tab_assign": "📝 มอบหมายงาน",
        "tab_payment": "💰 การชำระเงิน",
        "tab_perf": "📊 ผลการประเมิน",
        "reg_vendors": "ผู้ขายที่ลงทะเบียน",
        "total_vendors": "ผู้ขายทั้งหมด",
        "active": "ใช้งานอยู่",
        "avg_rating": "คะแนนเฉลี่ย",
        "reg_new": "ลงทะเบียนผู้ขายใหม่",
        "vendor_type": "ประเภทผู้ขาย",
        "vendor_name": "ชื่อผู้ขาย",
        "contact": "ผู้ติดต่อ",
        "phone": "เบอร์โทรศัพท์",
        "email": "อีเมล",
        "address": "ที่อยู่",
        "btn_register": "ลงทะเบียน",
        "req_name": "กรุณาระบุชื่อผู้ขาย",
        "success_reg": "ลงทะเบียนเรียบร้อยแล้ว",
        "save_changes": "บันทึกการแก้ไข",
        "assign_title": "มอบหมายงานผู้รับเหมาช่วง",
        "no_jobs": "ไม่มีงาน",
        "no_vendors": "ไม่มีผู้ขาย",
        "open_jobs": "งานรอจ่ายงาน",
        "sel_job": "เลือกงาน",
        "job_details": "รายละเอียดงาน",
        "date": "วันที่",
        "customer": "ลูกค้า",
        "route": "เส้นทาง",
        "distance": "ระยะทาง",
        "assignment": "การมอบหมาย",
        "assign_to": "เลือกผู้รับเหมา",
        "agreed_cost": "ตกลงราคา (บาท)",
        "margin": "กำไรของคุณ",
        "confirm_assign": "ยืนยันการมอบหมาย",
        "assigned": "มอบหมายงานสำเร็จ",
        "failed": "มอบหมายงานล้มเหลว",
        "payment_track": "ติดตามการชำระเงิน",
        "no_data": "ไม่พบข้อมูล",
        "summary": "สรุปรายผู้รับเหมา",
        "total_jobs": "งานทั้งหมด",
        "total_amount": "ยอดรวม",
        "payment_details": "รายละเอียดการจ่ายเงิน",
        "perf_analysis": "วิเคราะห์ผลงานผู้รับเหมา",
        "import_csv": "📥 นำเข้าข้อมูล (CSV)",
        "download_template": "ดาวน์โหลดฟอร์ม (Template)",
        "upload_csv": "อัพโหลดไฟล์ CSV",
        "import_success": "นำเข้าข้อมูลสำเร็จ",
        "import_help": "💡 ใช้ฟอร์มนี้กรอกข้อมูลผู้ขาย",
        "from_date": "จากวันที่",
        "to_date": "ถึงวันที่"
    },
    "en": {
        "title": "🤝 Sub-contractor & Vendor Management",
        "tab_list": "📋 Vendor List",
        "tab_assign": "📝 Assign Jobs",
        "tab_payment": "💰 Vendor Payments",
        "tab_perf": "📊 Performance",
        "reg_vendors": "Registered Vendors",
        "total_vendors": "Total Vendors",
        "active": "Active",
        "avg_rating": "Avg Rating",
        "reg_new": "Register New Vendor",
        "vendor_name": "Vendor Name",
        "contact": "Contact Person",
        "phone": "Phone",
        "email": "Email",
        "address": "Address",
        "btn_register": "Register Vendor",
        "req_name": "Vendor name is required",
        "success_reg": "Vendor registered!",
        "save_changes": "Save Changes",
        "assign_title": "Job Assignment to Sub-contractors",
        "no_jobs": "No jobs available",
        "no_vendors": "No vendors registered",
        "open_jobs": "Open Jobs Available",
        "sel_job": "Select Job",
        "job_details": "Job Details",
        "date": "Date",
        "customer": "Customer",
        "route": "Route",
        "distance": "Distance",
        "assignment": "Assignment",
        "assign_to": "Assign to Vendor",
        "agreed_cost": "Agreed Cost (THB)",
        "margin": "Your Margin",
        "confirm_assign": "Confirm Assignment",
        "assigned": "Job assigned successfully!",
        "failed": "Assignment failed",
        "payment_track": "Vendor Payment Tracking",
        "no_data": "No data available",
        "summary": "Summary by Vendor",
        "total_jobs": "Total Jobs",
        "total_amount": "Total Amount",
        "payment_details": "Payment Details",
        "perf_analysis": "Vendor Performance Analysis",
        "import_csv": "📥 Import Vendors (CSV)",
        "download_template": "Download Template CSV",
        "upload_csv": "Upload CSV File",
        "import_success": "Vendors imported successfully",
        "import_help": "💡 Use this template to add vendors.",
        "from_date": "From Date",
        "to_date": "To Date"
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_vendor_view():
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    
    tab1, tab2, tab3, tab4 = st.tabs([
        get_label('tab_list'), 
        get_label('tab_assign'), 
        get_label('tab_payment'),
        get_label('tab_perf')
    ])
    
    with tab1:
        _render_vendor_list()
    with tab2:
        _render_assign_jobs()
    with tab3:
        _render_vendor_payments()
    with tab4:
        _render_vendor_performance()

def _render_vendor_list():
    """Vendor CRUD operations."""
    st.markdown(f"#### {get_label('reg_vendors')}")
    
    # Try to get vendors, create sample if empty
    vendors = _get_or_create_vendors()
    
    # Summary
    col1, col2, col3 = st.columns(3)
    col1.metric(get_label('total_vendors'), len(vendors))
    active = len(vendors[vendors.get('Active_Status', 'Active') == 'Active']) if 'Active_Status' in vendors.columns else len(vendors)
    col2.metric(get_label('active'), active)
    avg_rating = vendors['Rating'].mean() if 'Rating' in vendors.columns else 0
    col3.metric(get_label('avg_rating'), f"⭐ {avg_rating:.1f}")
    
    st.markdown("---")
    
    # Add new vendor
    with st.expander(f"➕ {get_label('reg_new')}", expanded=False):
        with st.form("new_vendor"):
            col1, col2 = st.columns(2)
            
            with col1:
                v_type = st.selectbox(f"{get_label('vendor_type')}*", 
                    ["Sub-Contractor (รถร่วม)", "Maintenance (อู่ซ่อม/ช่าง)", "Parts (ร้านอะไหล่)", "Gas Station (ปั๊มน้ำมัน)", "Services (บริการอื่นๆ)"])
                v_name = st.text_input(f"{get_label('vendor_name')}*")
                v_contact = st.text_input(get_label('contact'))
            
            with col2:
                v_phone = st.text_input(get_label('phone'))
                v_email = st.text_input(get_label('email'))
                v_address = st.text_area(get_label('address'), height=100)
            
            if st.form_submit_button(get_label('btn_register')):
                if not v_name:
                    st.error(get_label('req_name'))
                else:
                    new_vendor = {
                        "Vendor_ID": f"V-{datetime.now().strftime('%y%m%d%H%M')}",
                        "Vendor_Type": v_type.split(" ")[0], # Store just the key code
                        "Vendor_Name": v_name,
                        "Contact_Person": v_contact,
                        "Phone": v_phone,
                        "Email": v_email,
                        "Address": v_address,
                        "Rating": 0,
                        "Total_Jobs": 0,
                        "Active_Status": "Active",
                        "Created_At": str(datetime.now())
                    }
                    
                    vendors = pd.concat([vendors, pd.DataFrame([new_vendor])], ignore_index=True)
                    _save_vendors(vendors)
                    st.success(f"✅ {v_name} {get_label('success_reg')}")
                    st.rerun()

    # Import Section
    with st.expander(get_label('import_csv')):
        col_imp1, col_imp2 = st.columns(2)
        
        with col_imp1:
            # Template Download
            template_df = get_template_df("Master_Vendors")
            
            if not template_df.empty:
                csv = template_df.to_csv(index=False)
                b64 = base64.b64encode(csv.encode()).decode()
                href = f'<a href="data:file/csv;base64,{b64}" download="vendor_template.csv" style="text-decoration:none; color:#1976d2; font-weight:bold;">📄 {get_label("download_template")}</a>'
                st.markdown(href, unsafe_allow_html=True)
                st.caption(get_label('import_help'))
        
        with col_imp2:
            uploaded = st.file_uploader(get_label('upload_csv'), type=["csv"], key="vendor_upload")
            if uploaded:
                try:
                    imp_df = pd.read_csv(uploaded)
                    st.write(f"Found {len(imp_df)} records")
                    
                    if st.button("Confirm Import", key="conf_vendor_imp"):
                        # Process import
                        new_vendors = []
                        for _, row in imp_df.iterrows():
                            v_data = row.to_dict()
                            
                            # Handle ID: if not present or empty, generate new
                            if 'Vendor_ID' not in v_data or not str(v_data['Vendor_ID']).strip() or pd.isna(v_data['Vendor_ID']):
                                v_data["Vendor_ID"] = f"V-{datetime.now().strftime('%H%M%S%f')[:8]}"
                            
                            # Default values
                            if 'Rating' not in v_data: v_data["Rating"] = 0
                            if 'Total_Jobs' not in v_data: v_data["Total_Jobs"] = 0
                            if 'Active_Status' not in v_data: v_data["Active_Status"] = "Active"
                            
                            new_vendors.append(v_data)
                        
                        vendors = pd.concat([vendors, pd.DataFrame(new_vendors)], ignore_index=True)
                        _save_vendors(vendors)
                        st.success(get_label('import_success'))
                        time.sleep(1)
                        st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")
    
    # Vendor list
    if not vendors.empty:
        edited = st.data_editor(
            vendors,
            num_rows="dynamic",
            use_container_width=True,
            key="vendor_editor"
        )
        
        if st.button(f"💾 {get_label('save_changes')}", key="vendor_save_btn"):
            _save_vendors(edited)
            st.success("Saved!")
            st.rerun()

def _render_assign_jobs():
    """Assign jobs to vendors."""
    st.markdown(f"#### {get_label('assign_title')}")
    
    jobs = repo.get_data("Jobs_Main")
    vendors = _get_or_create_vendors()
    
    if jobs.empty:
        st.info(get_label('no_jobs'))
        return
    
    if vendors.empty:
        st.warning(get_label('no_vendors'))
        return
    
    # Filter unassigned/new jobs
    open_jobs = jobs[jobs['Job_Status'].isin([JobStatus.NEW, 'New'])]
    
    if open_jobs.empty:
        st.info(get_label('no_jobs'))
        return
    
    st.markdown(f"##### 📋 {len(open_jobs)} {get_label('open_jobs')}")
    
    # Job selection
    job_opts = open_jobs['Job_ID'].tolist()
    selected_job = st.selectbox(get_label('sel_job'), job_opts)
    
    if selected_job:
        job_data = open_jobs[open_jobs['Job_ID'] == selected_job].iloc[0]
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown(f"**{get_label('job_details')}**")
            st.write(f"📅 {get_label('date')}: {job_data.get('Plan_Date', 'N/A')}")
            st.write(f"🏢 {get_label('customer')}: {job_data.get('Customer_Name', 'N/A')}")
            st.write(f"📍 {get_label('route')}: {job_data.get('Route_Name', 'N/A')}")
            st.write(f"📏 {get_label('distance')}: {job_data.get('Est_Distance_KM', 'N/A')} km")
        
        with col2:
            st.markdown(f"**{get_label('assignment')}**")
            
            # Filter only Sub-Contractors for Transportation Jobs
            if 'Vendor_Type' in vendors.columns:
                transport_vendors = vendors[vendors['Vendor_Type'].astype(str).str.contains('Sub-Contractor', case=False, na=False)]
            else:
                transport_vendors = vendors
                
            vendor_opts = transport_vendors['Vendor_ID'].tolist() if not transport_vendors.empty else []
            vendor_names = transport_vendors.set_index('Vendor_ID')['Vendor_Name'].to_dict() if not transport_vendors.empty else {}
            
            sel_vendor = st.selectbox(
                get_label('assign_to'),
                vendor_opts,
                format_func=lambda x: f"{x}: {vendor_names.get(x, 'Unknown')}"
            )
            
            orig_price = safe_float(job_data.get('Price_Cust_Total', 0))
            vendor_cost = st.number_input(
                get_label('agreed_cost'),
                value=orig_price * 0.8,  # Default 80% of customer price
                min_value=0.0
            )
            
            margin = orig_price - vendor_cost
            margin_pct = (margin / orig_price * 100) if orig_price > 0 else 0
            
            from utils.helpers import render_metric_card # Local import safety
            st.markdown(render_metric_card(f"💵 {get_label('margin')}", f"฿{margin:,.0f}", icon="💵", trend=f"{margin_pct:.1f}%"), unsafe_allow_html=True)
        
        if st.button(f"✅ {get_label('confirm_assign')}", type="primary"):
            if VendorService.assign_job_to_vendor(selected_job, sel_vendor, vendor_cost):
                st.success(f"{selected_job} {get_label('assigned')}")
                
                # Update job status
                jobs.loc[jobs['Job_ID'] == selected_job, 'Job_Status'] = "Assigned (Sub)"
                jobs.loc[jobs['Job_ID'] == selected_job, 'Cost_Driver_Total'] = vendor_cost
                jobs.loc[jobs['Job_ID'] == selected_job, 'Remark'] = f"Assigned to Vendor: {sel_vendor}"
                repo.update_data("Jobs_Main", jobs)
                
                time.sleep(1)
                st.rerun()
            else:
                st.error(get_label('failed'))

def _render_vendor_payments():
    """Vendor payment tracking."""
    st.markdown(f"#### {get_label('payment_track')}")
    
    # 1. Filters
    # 1. Filters
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        start_date = st.date_input(get_label('from_date'), datetime.now().replace(day=1), key="v_pay_start")
    with col2:
        end_date = st.date_input(get_label('to_date'), datetime.now(), key="v_pay_end")
    
    with col3:
        with st.form("vendor_filter_form"):
            vendors = _get_or_create_vendors()
            vendor_opts = ["All Vendors"] + vendors['Vendor_ID'].tolist() if not vendors.empty else ["All Vendors"]
            sel_vendor = st.selectbox(get_label('assign_to'), vendor_opts)
            submitted = st.form_submit_button("🔍 Show Data")

    vendor_filter = sel_vendor if sel_vendor != "All Vendors" else None
    
    # 2. Get Summary Data
    summary = VendorService.get_vendor_payment_summary(start_date, end_date, vendor_filter)
    
    if summary.empty:
        st.info(get_label('no_data'))
    else:
        # Summary KPI Cards
        st.markdown("---")
        k1, k2, k3, k4 = st.columns(4)
        total_earnings = summary['Total_Earnings'].sum()
        paid_amount = summary['Paid_Amount'].sum()
        pending_amount = summary['Pending_Amount'].sum()
        total_jobs = summary['Total_Jobs'].sum()
        
        from utils.helpers import render_metric_card
        with k1: st.markdown(render_metric_card(get_label('total_jobs'), f"{total_jobs}", icon="📦"), unsafe_allow_html=True)
        with k2: st.markdown(render_metric_card(get_label('total_amount'), f"฿{total_earnings:,.0f}", icon="💰", accent_color="accent-blue"), unsafe_allow_html=True)
        with k3: st.markdown(render_metric_card("จ่ายแล้ว (Paid)", f"฿{paid_amount:,.0f}", icon="✅", accent_color="accent-green"), unsafe_allow_html=True)
        with k4: 
            pending_pct = f"-{pending_amount/total_earnings*100:.0f}%" if total_earnings > 0 else ""
            st.markdown(render_metric_card("รอจ่าย (Pending)", f"฿{pending_amount:,.0f}", icon="⏳", trend=pending_pct, accent_color="accent-red"), unsafe_allow_html=True)

        # Summary Table
        st.markdown("---")
        st.markdown(f"##### 📋 {get_label('summary')}")
        st.dataframe(summary, hide_index=True, use_container_width=True)

    # 3. Process Pending Payments
    st.markdown("---")
    st.markdown(f"##### 💳 อนุมัติการจ่ายเงิน (Process Payments)")
    
    pending_jobs = VendorService.get_pending_vendor_payments(vendor_filter)
    
    if pending_jobs.empty:
        st.success(f"✅ ไม่มีรายการรอจ่าย (No Pending Payments)")
        return
        
    st.markdown("เลือกรายการที่ต้องการจ่าย:")
    
    # Pre-select setup
    # Session state for selection toggle
    if "v_pay_editor_key" not in st.session_state:
        st.session_state["v_pay_editor_key"] = "vendor_pay_select"
    if "v_pay_select_default" not in st.session_state:
        st.session_state["v_pay_select_default"] = False

    # Selection Buttons
    c_sel1, c_sel2, _ = st.columns([1, 1, 4])
    if c_sel1.button("Select All", key="v_sel_all"):
        st.session_state["v_pay_select_default"] = True
        st.session_state["v_pay_editor_key"] = f"vendor_pay_select_{datetime.now().timestamp()}"
        st.rerun()
    if c_sel2.button("Deselect All", key="v_desel_all"):
        st.session_state["v_pay_select_default"] = False
        st.session_state["v_pay_editor_key"] = f"vendor_pay_select_{datetime.now().timestamp()}"
        st.rerun()

    # Apply default
    pending_jobs['Select'] = st.session_state["v_pay_select_default"]
    pending_jobs['Cost_Display'] = pending_jobs['Cost_Driver_Total'].apply(lambda x: f"฿{x:,.0f}")
    
    cols_to_show = ['Select', 'Job_ID', 'Plan_Date', 'Vendor_Name', 'Cost_Display']
    
    edited = st.data_editor(
        pending_jobs[cols_to_show].head(500),
        column_config={
            "Select": st.column_config.CheckboxColumn("✓", default=False)
        },
        disabled=['Job_ID', 'Plan_Date', 'Vendor_Name', 'Cost_Display'],
        hide_index=True,
        use_container_width=True,
        key=st.session_state["v_pay_editor_key"]
    )
    
    selected_jobs = edited[edited['Select'] == True]['Job_ID'].tolist()
    
    col_pay1, col_pay2 = st.columns([2, 1])
    with col_pay1:
        payment_ref = st.text_input("Payment Ref / Slip URL", placeholder="Optional", key="v_pay_ref")
    with col_pay2:
        if st.button(f"✅ ยืนยันการจ่ายเงิน ({len(selected_jobs)})", type="primary", disabled=len(selected_jobs) == 0):
            if selected_jobs:
                success, files = VendorService.mark_vendor_jobs_as_paid(selected_jobs, payment_ref)
                
                if success:
                    st.success("บันทึกการจ่ายเงินเรียบร้อย!")
                    
                    # Handle Receipts Download
                    if files:
                        import base64
                        # Single file for now (first one) or ZIP if multiple vendors? 
                        # Logic in service returns list of (fname, bytes)
                        for fname, pdf_bytes in files:
                            b64 = base64.b64encode(pdf_bytes).decode()
                            href = f'<a href="data:application/pdf;base64,{b64}" download="{fname}" class="button-primary" style="display:inline-block; margin-top:10px;">📥 Download {fname}</a>'
                            st.markdown(href, unsafe_allow_html=True)
                    
                    time.sleep(2)
                    st.rerun()
                else:
                    st.error("Operation failed")
    
    # Rename cols for display if TH
    cols = ['Job_ID', 'Plan_Date', 'Customer_Name', 'Cost_Driver_Total', 'Payment_Status']
    disp_jobs = vendor_jobs[cols].copy()
    
    st.dataframe(
        disp_jobs,
        hide_index=True,
        use_container_width=True
    )

def _render_vendor_performance():
    """Vendor performance analytics."""
    st.markdown(f"#### {get_label('perf_analysis')}")
    
    vendors = _get_or_create_vendors()
    
    if vendors.empty:
        st.info(get_label('no_vendors'))
        return
    
    # Performance metrics
    for _, vendor in vendors.iterrows():
        with st.container(border=True):
            col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
            
            with col1:
                st.markdown(f"**{vendor.get('Vendor_Name', 'N/A')}**")
                st.caption(vendor.get('Vendor_ID', ''))
            
            with col2:
                st.markdown(render_metric_card(get_label('total_jobs'), f"{vendor.get('Total_Jobs', 0)}", icon="📦"), unsafe_allow_html=True)
            
            with col3:
                st.markdown(render_metric_card(get_label('avg_rating'), f"⭐ {vendor.get('Rating', 0):.1f}", icon="⭐"), unsafe_allow_html=True)
            
            with col4:
                status = vendor.get('Active_Status', 'Active')
                color = "🟢" if status == 'Active' else "🔴"
                st.markdown(f"{color} {status}")

def _get_or_create_vendors():
    """Get vendors or create sample data."""
    # Try to get from session state first
    if 'vendors_data' in st.session_state:
        return st.session_state.vendors_data
    
    # Create sample vendors
    vendors = pd.DataFrame([
        {
            "Vendor_ID": "V-001",
            "Vendor_Name": "Fast Transport Co.",
            "Contact_Person": "คุณสมชาย",
            "Phone": "081-111-2222",
            "Email": "fast@transport.co.th",
            "Address": "Bangkok",
            "Rating": 4.5,
            "Total_Jobs": 25,
            "Active_Status": "Active"
        },
        {
            "Vendor_ID": "V-002",
            "Vendor_Name": "Speedy Trucking",
            "Contact_Person": "คุณสมหญิง",
            "Phone": "089-999-8888",
            "Email": "speedy@trucking.com",
            "Address": "Chonburi",
            "Rating": 3.8,
            "Total_Jobs": 15,
            "Active_Status": "Active"
        }
    ])
    
    st.session_state.vendors_data = vendors
    return vendors

def _save_vendors(df):
    """Save vendors to session state."""
    st.session_state.vendors_data = df
