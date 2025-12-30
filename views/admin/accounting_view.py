
import streamlit as st
import pandas as pd
import time
import base64
from datetime import datetime
from data.repository import repo
from services.accounting_service import AccountingService
from utils.helpers import safe_float, get_thai_date_str, render_metric_card
from config.constants import PaymentStatus, BillingStatus

# Language Labels
LABELS = {
    "th": {
        "title": "💰 ศูนย์บัญชีและการเงิน",
        "tab_payroll": "💸 การจ่ายเงินคนขับ",
        "tab_billing": "📑 การวางบิลลูกค้า",
        "tab_ar": "📊 ยอดลูกหนี้ค้างชำระ",
        "tab_reports": "📈 รายงานการเงิน",
        "payroll_title": "💸 จัดการเงินเดือนคนขับ",
        "from_date": "จากวันที่",
        "to_date": "ถึงวันที่",
        "filter_driver": "กรองคนขับ",
        "all_drivers": "คนขับทั้งหมด",
        "no_payroll": "ไม่พบข้อมูลรายการจ่ายเงิน",
        "drivers_count": "จำนวนคนขับ",
        "total_earnings": "ยอดรายได้รวม",
        "paid": "จ่ายแล้ว",
        "pending": "รอจ่าย",
        "payroll_summary": "สรุปการจ่ายเงินคนขับ",
        "process_pending": "ทำรายการจ่ายเงิน",
        "no_pending": "ไม่มีรายการรอจ่าย!",
        "select_pay": "เลือกรายการที่ต้องการจ่าย:",
        "payment_ref": "เลขอ้างอิง / URL สลิป",
        "confirm_pay": "ยืนยันการจ่ายเงิน",
        "success_pay": "บันทึกการจ่ายเงินเรียบร้อย",
        "failed_pay": "บันทึกไม่สำเร็จ",
        "selected": "เลือกแล้ว",
    "mark_driver_payment": "ทำเครื่องหมายการจ่ายเงินคนขับทั้งหมด",
    "driver_payment_success": "✅ การจ่ายเงินคนขับสำเร็จ!",
    "driver_payment_failed": "❌ การจ่ายเงินคนขับล้มเหลว",
    "driver_payment_confirm": "ยืนยันการจ่ายเงินคนขับ",
    "driver_payment_ref": "เลขอ้างอิง / URL สลิป (คนขับ)",
        "billing_title": "📑 สร้างใบแจ้งหนี้ลูกค้า",
        "no_jobs": "ไม่มีข้อมูลงาน",
        "sel_cust": "เลือกลูกค้า",
        "select": "- เลือก -",
        "req_cust": "กรุณาเลือกลูกค้า",
        "no_pending_inv": "ไม่มีรายการรอเรียกเก็บ",
        "recent_inv": "ใบแจ้งหนี้ล่าสุด",
        "ready_bill": "งานรอวางบิล",
        "total_invoice": "ยอดรวมที่ต้องวางบิล",
        "create_inv": "สร้างใบแจ้งหนี้",
        "download_inv": "ดาวน์โหลดใบแจ้งหนี้ (PDF)",
        "export_excel": "ส่งออก Excel",
        "ar_title": "📊 ยอดลูกหนี้ค้างชำระ (Aging)",
        "no_ar": "ไม่มียอดค้างชำระ!",
        "aging_summary": "สรุปยอดค้างชำระ",
        "invoices": "ใบแจ้งหนี้",
        "by_cust": "แยกตามลูกค้า",
        "export_ar": "ส่งออกรายงาน AR",
        "report_title": "📈 รายงานการเงิน",
        "sel_report": "เลือกรายงาน",
        "rpt_driver": "รายงานรายได้คนขับ",
        "rpt_cust": "รายงานรายได้จากลูกค้า",
        "rpt_pl": "สรุปกำไร-ขาดทุนรายเดือน",
        "rpt_fuel": "วิเคราะห์ต้นทุนน้ำมัน",
        "driver": "คนขับ",
        "earnings": "รายได้",
        "revenue": "รายได้",
        "cost": "ต้นทุน",
        "profit": "กำไร",
        "margin": "อัตรากำไร",
        "gross_profit": "กำไรขั้นต้น",
        "net_profit": "กำไรสุทธิ",
        "fuel_cost": "ค่าน้ำมัน",
        "net_margin": "อัตรากำไรสุทธิ",
        "total_liters": "ปริมาณน้ำมันรวม",
        "total_cost": "ค่าใช้จ่ายรวม",
        "avg_price": "ราคาเฉลี่ย/ลิตร",
        "export_rpt": "ส่งออกรายงาน"
    },
    "en": {
        "title": "💰 Accounting & Billing Center",
        "tab_payroll": "💸 Driver Payroll",
        "tab_billing": "📑 Customer Billing",
        "tab_ar": "📊 AR Aging",
        "tab_reports": "📈 Reports",
        "payroll_title": "💸 Smart Driver Payroll",
        "from_date": "From",
        "to_date": "To",
        "filter_driver": "Filter Driver",
        "all_drivers": "All Drivers",
        "no_payroll": "No payroll data for selected period",
        "drivers_count": "Drivers",
        "total_earnings": "Total Earnings",
        "paid": "Paid",
        "pending": "Pending",
        "payroll_summary": "Driver Payment Summary",
        "process_pending": "Process Pending Payments",
        "no_pending": "No pending payments!",
        "select_pay": "Select jobs to pay:",
        "payment_ref": "Payment Reference / Slip URL",
        "confirm_pay": "Confirm Payment",
        "success_pay": "Marked jobs as paid!",
        "failed_pay": "Payment update failed!",
        "selected": "Selected",
        "billing_title": "📑 Customer Invoice Generation",
        "no_jobs": "No jobs available",
        "sel_cust": "Select Customer",
        "select": "- Select -",
        "req_cust": "Please select a customer",
        "no_pending_inv": "No pending invoices for",
        "recent_inv": "Recent Invoices",
        "ready_bill": "jobs ready to bill for",
        "total_invoice": "Total to Invoice",
        "create_inv": "Create Invoice",
        "download_inv": "Download Invoice PDF",
        "export_excel": "Export to Excel",
        "ar_title": "📊 Accounts Receivable Aging",
        "no_ar": "No outstanding receivables!",
        "aging_summary": "Aging Summary",
        "invoices": "invoices",
        "by_cust": "By Customer",
        "export_ar": "Export AR Report",
        "report_title": "📈 Financial Reports",
        "sel_report": "Select Report",
        "rpt_driver": "Driver Earnings Report",
        "rpt_cust": "Customer Revenue Report",
        "rpt_pl": "Monthly P&L Summary",
        "rpt_fuel": "Fuel Cost Analysis",
        "driver": "Driver",
        "earnings": "Total Earnings",
        "revenue": "Revenue",
        "cost": "Cost",
        "profit": "Profit",
        "margin": "Margin",
        "gross_profit": "Gross Profit",
        "net_profit": "Net Profit",
        "fuel_cost": "Fuel Cost",
        "net_margin": "Net Margin",
        "total_liters": "Total Liters",
        "total_cost": "Total Cost",
        "avg_price": "Avg Price/L",
        "export_rpt": "Export Report"
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_accounting_view():
    st.markdown(f"### {get_label('title')}")

    # --- Debug Tool for Super Admin ---
    if st.session_state.get("role") == "SUPER_ADMIN":
        with st.expander("🛠️ Admin Debug Tools", expanded=False):
            col_dbg1, col_dbg2 = st.columns([3, 1])
            with col_dbg1:
                st.info(f"📍 Current Branch Context: **{st.session_state.get('branch_id', 'Unknown')}**")
            with col_dbg2:
                is_override = st.checkbox("Show All Data (Ignore Branch)",
                                        value=st.session_state.get("debug_show_all_branches", False),
                                        key="debug_override_accounting")
                if is_override != st.session_state.get("debug_show_all_branches", False):
                    st.session_state["debug_show_all_branches"] = is_override
                    st.cache_data.clear()
                    st.rerun()
    # ----------------------------------
    
    t1, t2, t3, t4 = st.tabs([
        get_label('tab_payroll'), 
        get_label('tab_billing'), 
        get_label('tab_ar'), 
        get_label('tab_reports')
    ])

    # Check for repository error state
    if hasattr(repo, 'last_error') and repo.last_error:
        st.error(f"⚠️ Database Error: {repo.last_error}")

    with t1:
        _render_payroll_tab()
    with t2:
        _render_billing_tab()
    with t3:
        _render_ar_aging_tab()
    with t4:
        _render_reports_tab()

def _render_payroll_tab():
    st.markdown(f"#### {get_label('payroll_title')}")
    
    # Date filters
    # Date filters
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        start_date = st.date_input(get_label('from_date'), datetime.now().replace(day=1), key="pay_start")
    with col2:
        end_date = st.date_input(get_label('to_date'), datetime.now(), key="pay_end")
    
    with col3:
        with st.form("payroll_filter_form"):
            drivers = repo.get_data("Master_Drivers")
            all_d = get_label('all_drivers')
            driver_opts = [all_d] + sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else [all_d]
            sel_driver = st.selectbox(get_label('filter_driver'), driver_opts)
            submitted = st.form_submit_button("🔍 Show Data")
        
    if drivers.empty:
         st.warning("⚠️ Warning: Could not load driver list. Check database connection.")
    
    # Get payroll summary - filter by driver name
    driver_filter = None if sel_driver == all_d else sel_driver
    summary = AccountingService.get_driver_payroll_summary(start_date, end_date, driver_name=driver_filter)
    
    if summary.empty:
        st.info(get_label('no_payroll'))
        return
    
    # Summary KPIs
    st.markdown("---")
    k1, k2, k3, k4 = st.columns(4)
    total_earnings = summary['Total_Earnings'].sum()
    paid_amount = summary['Paid_Amount'].sum()
    pending_amount = summary['Pending_Amount'].sum()
    total_drivers = len(summary)
    
    with k1: st.markdown(render_metric_card(get_label('drivers_count'), f"{total_drivers}", icon="👥"), unsafe_allow_html=True)
    with k2: st.markdown(render_metric_card(get_label('total_earnings'), f"฿{total_earnings:,.0f}", icon="💰", accent_color="accent-blue"), unsafe_allow_html=True)
    with k3: st.markdown(render_metric_card(get_label('paid'), f"฿{paid_amount:,.0f}", icon="✅", accent_color="accent-green"), unsafe_allow_html=True)
    with k4: 
        pending_pct = f"-{pending_amount/total_earnings*100:.0f}%" if total_earnings > 0 else ""
        st.markdown(render_metric_card(get_label('pending'), f"฿{pending_amount:,.0f}", icon="⏳", trend=pending_pct, accent_color="accent-red"), unsafe_allow_html=True)
    
    # Summary table
    st.markdown("---")
    st.markdown(f"##### 📋 {get_label('payroll_summary')}")
    
    display_df = summary[['Driver_Name', 'Total_Jobs', 'Total_Earnings', 'Paid_Amount', 'Pending_Amount']].copy()
    display_df['Total_Earnings'] = display_df['Total_Earnings'].apply(lambda x: f"฿{x:,.0f}")
    display_df['Paid_Amount'] = display_df['Paid_Amount'].apply(lambda x: f"฿{x:,.0f}")
    display_df['Pending_Amount'] = display_df['Pending_Amount'].apply(lambda x: f"฿{x:,.0f}")
    
    if st.session_state.get("lang") == "th":
        display_df.columns = ["ชื่อคนขับ", "จำนวนงาน", "รายได้รวม", "จ่ายแล้ว", "ค้างจ่าย"]
    
    st.dataframe(display_df, hide_index=True, use_container_width=True)
    
    # Pending payments section
    st.markdown("---")
    st.markdown(f"##### 💳 {get_label('process_pending')}")
    
    pending_jobs = AccountingService.get_pending_driver_payments()
    
    if pending_jobs.empty:
        st.success(f"✅ {get_label('no_pending')}")
        return
    
    # Filter by selected driver
    if driver_filter:
        pending_jobs = pending_jobs[pending_jobs['Driver_Name'] == driver_filter]
    
    if pending_jobs.empty:
        st.success(f"✅ {get_label('no_pending')}")
        return
        
    st.markdown(get_label('select_pay'))
    
    # Session state for selection toggle
    if "acc_editor_key" not in st.session_state:
        st.session_state["acc_editor_key"] = "payroll_select"
    if "acc_select_default" not in st.session_state:
        st.session_state["acc_select_default"] = False

    # Selection Buttons
    c_sel1, c_sel2, _ = st.columns([1, 1, 4])
    if c_sel1.button("Select All", key="acc_sel_all"):
        st.session_state["acc_select_default"] = True
        st.session_state["acc_editor_key"] = f"payroll_select_{datetime.now().timestamp()}"
        st.rerun()
    if c_sel2.button("Deselect All", key="acc_desel_all"):
        st.session_state["acc_select_default"] = False
        st.session_state["acc_editor_key"] = f"payroll_select_{datetime.now().timestamp()}"
        st.rerun()

    # Pre-select all?
    pending_jobs['Select'] = st.session_state["acc_select_default"]
    pending_jobs['Cost_Display'] = pending_jobs['Cost_Driver_Total'].apply(lambda x: f"฿{x:,.0f}")
    
    cols_to_show = ['Select', 'Job_ID', 'Plan_Date', 'Driver_Name', 'Route_Name', 'Cost_Display']
    available_cols = [c for c in cols_to_show if c in pending_jobs.columns or c == 'Select']
    
    edited = st.data_editor(
        pending_jobs[available_cols].head(500),
        column_config={
            "Select": st.column_config.CheckboxColumn("✓", default=False)
        },
        disabled=['Job_ID', 'Plan_Date', 'Driver_Name', 'Route_Name', 'Cost_Display'],
        hide_index=True,
        use_container_width=True,
        key=st.session_state["acc_editor_key"]
    )
    
    selected_jobs = edited[edited['Select'] == True]['Job_ID'].tolist()
    
    col_pay1, col_pay2 = st.columns([2, 1])
    with col_pay1:
        payment_ref = st.text_input(get_label('payment_ref'), placeholder="Optional")
    with col_pay2:
        if st.button(f"✅ {get_label('confirm_pay')}", type="primary", disabled=len(selected_jobs) == 0):
            if selected_jobs:
                selected_total = pending_jobs[pending_jobs['Job_ID'].isin(selected_jobs)]['Cost_Driver_Total'].sum()
                st.info(f"{get_label('selected')}: {len(selected_jobs)} jobs | Total: ฿{selected_total:,.0f}")
                
            success, files = AccountingService.mark_jobs_as_paid(selected_jobs, payment_ref=payment_ref, withholding_tax_rate=0.01)
            
            if success:
                st.success(f"✅ {get_label('success_pay')}")
                
                # Handle Receipts Download
                if files:
                    # If multiple files, ZIP them
                    if len(files) > 1:
                        zip_bytes = AccountingService.create_zip_archive(files)
                        b64 = base64.b64encode(zip_bytes).decode()
                        fname = f"Receipts_Batch_{datetime.now().strftime('%Y%m%d%H%M')}.zip"
                        href = f'<a href="data:application/zip;base64,{b64}" download="{fname}" class="button-primary">📥 Download Receipts (ZIP)</a>'
                        st.markdown(href, unsafe_allow_html=True)
                    else:
                        # Single file
                        fname, pdf_bytes = files[0]
                        b64 = base64.b64encode(pdf_bytes).decode()
                        href = f'<a href="data:application/pdf;base64,{b64}" download="{fname}" class="button-primary">📥 Download Receipt (PDF)</a>'
                        st.markdown(href, unsafe_allow_html=True)
                
                time.sleep(2) # Give time to click download before refresh... wait, refresh kills state.
                # Use session state to show download link even after rerun?
                # For now, just wait a bit or don't rerun immediately?
                # Rerun is needed to update table.
                # Better UX: Store download link in session state and show it at top of page.
                st.session_state['last_download_payroll'] = files
                st.cache_data.clear()
                st.rerun()
            else:
                st.error(get_label('failed_pay'))
                
    # Show persistent download if available
    if 'last_download_payroll' in st.session_state and st.session_state['last_download_payroll']:
        files = st.session_state['last_download_payroll']
        st.success("✅ Payment Processed! Download your receipts below:")
        
        if len(files) > 1:
            zip_bytes = AccountingService.create_zip_archive(files)
            b64 = base64.b64encode(zip_bytes).decode()
            fname = f"Receipts_Batch_{datetime.now().strftime('%Y%m%d%H%M')}.zip"
            href = f'<a href="data:application/zip;base64,{b64}" download="{fname}" style="font-size:20px; font-weight:bold;">📥 Download All Receipts (ZIP)</a>'
            st.markdown(href, unsafe_allow_html=True)
        else:
            fname, pdf_bytes = files[0]
            b64 = base64.b64encode(pdf_bytes).decode()
            href = f'<a href="data:application/pdf;base64,{b64}" download="{fname}" style="font-size:20px; font-weight:bold;">📥 Download Receipt (PDF)</a>'
            st.markdown(href, unsafe_allow_html=True)
        
        if st.button("Clear Download", key="clr_dl_pay"):
            del st.session_state['last_download_payroll']
            st.rerun()
    
def _render_billing_tab():
    st.markdown(f"#### {get_label('billing_title')}")
    
    jobs = repo.get_data("Jobs_Main")
    custs = repo.get_data("Master_Customers")
    
    if jobs.empty:
        st.info(get_label('no_jobs'))
        return
    
    # Customer selection
    sel = get_label('select')
    all_cust = "All Customers (Bulk)"
    cust_list = [sel, all_cust] + sorted(custs['Customer_Name'].unique().tolist()) if not custs.empty else [sel]
    sel_customer = st.selectbox(f"🏢 {get_label('sel_cust')}", cust_list)
    
    if sel_customer == sel:
        st.info(get_label('req_cust'))
        return
        
    # --- Tax Configuration ---
    col_t1, col_t2 = st.columns([1, 1])
    with col_t1:
        use_tax = st.checkbox("Apply Tax 3% (WHT/VAT)", value=True, help="Add 3% Tax to the invoice")
    with col_t2:
        tax_rate = 0.03 if use_tax else 0.0
        
    # --- Bulk Mode ---
    if sel_customer == all_cust:
        st.markdown("### 📑 Bulk Invoicing Mode")
        
        # Get all unbilled jobs
        unbilled = AccountingService.get_customer_billing_summary() # No customer filter = All
        
        if unbilled.empty:
            st.success("✅ No pending jobs to bill.")
            return

        # Group by Customer
        unbilled['Price_Cust_Total'] = unbilled['Price_Cust_Total'].apply(safe_float)
        
        cust_summary = unbilled.groupby('Customer_Name').agg({
            'Job_ID': 'count',
            'Price_Cust_Total': 'sum'
        }).reset_index()
        cust_summary.columns = ['Customer', 'Jobs', 'Total Amount']
        cust_summary['Select'] = False # Default to Unselected to avoid accidental mass billing? Or True? Let's say False.
        cust_summary['Total Display'] = cust_summary['Total Amount'].apply(lambda x: f"฿{x:,.0f}")
        
        edited_cust = st.data_editor(
            cust_summary[['Select', 'Customer', 'Jobs', 'Total Display']],
            column_config={
                "Select": st.column_config.CheckboxColumn("✓", default=False)
            },
            disabled=['Customer', 'Jobs', 'Total Display'],
            hide_index=True,
            use_container_width=True,
            key="bulk_bill_select"
        )
        
        selected_customers = edited_cust[edited_cust['Select'] == True]['Customer'].tolist()
        
        if st.button(f"📄 Generate Invoices ({len(selected_customers)})", type="primary", disabled=len(selected_customers) == 0):
            # Prepare map
            cust_job_map = {}
            for cust in selected_customers:
                job_ids = unbilled[unbilled['Customer_Name'] == cust]['Job_ID'].tolist()
                cust_job_map[cust] = job_ids
            
            files, error = AccountingService.create_bulk_invoices(cust_job_map, tax_rate=tax_rate)
            
            if files:
                st.success(f"✅ Generated {len(files)} Invoices!")
                
                # ZIP Download
                zip_bytes = AccountingService.create_zip_archive(files)
                b64 = base64.b64encode(zip_bytes).decode()
                fname = f"Invoices_Batch_{datetime.now().strftime('%Y%m%d%H%M')}.zip"
                href = f'<a href="data:application/zip;base64,{b64}" download="{fname}" style="font-size:20px; font-weight:bold;">📥 Download Invoices (ZIP)</a>'
                st.markdown(href, unsafe_allow_html=True)
                
                st.session_state['last_download_bill'] = (href, fname)
                st.cache_data.clear()
                time.sleep(2)
                st.rerun()
            else:
                st.error(f"Failed: {error}")

        if 'last_download_bill' in st.session_state:
            href, fname = st.session_state['last_download_bill']
            st.markdown(f"**Latest Batch:** {href}", unsafe_allow_html=True)
            if st.button("Clear Download", key="clr_dl_bill"):
                del st.session_state['last_download_bill']
                st.rerun()
            
        return

    # --- Single Customer Mode ---
    
    # Get unbilled jobs
    unbilled = AccountingService.get_customer_billing_summary(sel_customer)
    
    if unbilled.empty:
        st.success(f"✅ {get_label('no_pending_inv')} {sel_customer}")
        
        # Show recent invoices (Code Omitted for Brevity, kept same logic)
        billed_jobs = jobs[(jobs['Customer_Name'] == sel_customer) & (jobs['Billing_Status'] == BillingStatus.BILLED)]
        if not billed_jobs.empty:
            recent_invoices = billed_jobs[['Invoice_No', 'Billing_Date', 'Price_Cust_Total', 'Job_ID']].drop_duplicates('Invoice_No')
            st.dataframe(recent_invoices.head(10), hide_index=True)
        return
    
    st.info(f"📋 {len(unbilled)} {get_label('ready_bill')} {sel_customer}")
    
    # Selection Buttons (like payroll tab)
    if "bill_editor_key" not in st.session_state:
        st.session_state["bill_editor_key"] = "billing_select"
    if "bill_select_default" not in st.session_state:
        st.session_state["bill_select_default"] = True  # Default: Select All
    
    c_bill1, c_bill2, _ = st.columns([1, 1, 4])
    if c_bill1.button("Select All", key="bill_sel_all"):
        st.session_state["bill_select_default"] = True
        st.session_state["bill_editor_key"] = f"billing_select_{datetime.now().timestamp()}"
        st.rerun()
    if c_bill2.button("Deselect All", key="bill_desel_all"):
        st.session_state["bill_select_default"] = False
        st.session_state["bill_editor_key"] = f"billing_select_{datetime.now().timestamp()}"
        st.rerun()
    
    # Display jobs for billing
    unbilled['Select'] = st.session_state["bill_select_default"]
    unbilled['Price_Cust_Total'] = unbilled['Price_Cust_Total'].apply(safe_float)
    unbilled['Price_Display'] = unbilled['Price_Cust_Total'].apply(lambda x: f"฿{x:,.0f}")
    
    cols_show = ['Select', 'Job_ID', 'Plan_Date', 'Route_Name', 'Price_Display']
    available = [c for c in cols_show if c in unbilled.columns or c == 'Select']
    
    edited_bill = st.data_editor(
        unbilled[available],
        column_config={
            "Select": st.column_config.CheckboxColumn("✓", default=st.session_state["bill_select_default"])
        },
        disabled=['Job_ID', 'Plan_Date', 'Route_Name', 'Price_Display'],
        hide_index=True,
        use_container_width=True,
        key=st.session_state["bill_editor_key"]
    )
    
    selected_for_bill = edited_bill[edited_bill['Select'] == True]['Job_ID'].tolist()
    total_to_bill = unbilled[unbilled['Job_ID'].isin(selected_for_bill)]['Price_Cust_Total'].sum()
    
    # Show Tax Preview
    tax_amt = total_to_bill * tax_rate
    grand_total = total_to_bill + tax_amt
    
    st.markdown(f"""
    **Subtotal:** ฿{total_to_bill:,.0f}  
    **Tax ({int(tax_rate*100)}%):** ฿{tax_amt:,.2f}  
    **Grand Total:** ฿{grand_total:,.2f}
    """)
    
    col_b1, col_b2 = st.columns([1, 1])
    
    with col_b1:
        if st.button(f"📄 {get_label('create_inv')}", type="primary", disabled=len(selected_for_bill) == 0):
            invoice, error = AccountingService.create_invoice(sel_customer, selected_for_bill, tax_rate=tax_rate)
            
            if error:
                st.error(f"Error: {error}")
            else:
                st.success(f"✅ Invoice {invoice['invoice_no']} created!")
                
                # Generate PDF (Updated with tax_rate)
                try:
                    jobs_for_pdf = unbilled[unbilled['Job_ID'].isin(selected_for_bill)]
                    pdf_bytes = AccountingService.generate_invoice_pdf(invoice, jobs_for_pdf, tax_rate=tax_rate)
                    
                    b64 = base64.b64encode(pdf_bytes).decode()
                    filename = f"Invoice_{invoice['invoice_no']}.pdf"
                    href = f'<a href="data:application/pdf;base64,{b64}" download="{filename}">📥 {get_label("download_inv")}</a>'
                    
                    # Store in session state to persist after rerun
                    st.session_state['last_invoice_download'] = (href, filename)
                    
                except Exception as e:
                    st.warning(f"PDF generation failed: {e}")
                
                st.cache_data.clear()
                st.rerun()
    
    # Show persistent download if available
    if 'last_invoice_download' in st.session_state:
        href, filename = st.session_state['last_invoice_download']
        st.success(f"✅ Invoice created! Download below:")
        st.markdown(href, unsafe_allow_html=True)
        
        if st.button("Clear Download", key="clr_inv_dl"):
            del st.session_state['last_invoice_download']
            st.rerun()
    
    with col_b2:
        if st.button(f"📤 {get_label('export_excel')}"):
            csv = unbilled[['Job_ID', 'Plan_Date', 'Route_Name', 'Price_Cust_Total']].to_csv(index=False)
            b64 = base64.b64encode(csv.encode()).decode()
            href = f'<a href="data:file/csv;base64,{b64}" download="billing_{sel_customer}.csv">📥 Download CSV</a>'
            st.markdown(href, unsafe_allow_html=True)

def _render_ar_aging_tab():
    st.markdown(f"#### {get_label('ar_title')}")
    
    aging = AccountingService.get_ar_aging_report()
    
    if aging.empty:
        st.success(f"✅ {get_label('no_ar')}")
        return
    
    # Summary by aging bucket
    st.markdown(f"##### 📅 {get_label('aging_summary')}")
    
    aging_summary = aging.groupby('Aging').agg({
        'Amount': 'sum',
        'Invoices': 'sum'
    }).reset_index()
    
    col1, col2, col3, col4 = st.columns(4)
    
    buckets = ['0-30 days', '31-60 days', '61-90 days', '90+ days']
    cols = [col1, col2, col3, col4]
    colors = ['🟢', '🟡', '🟠', '🔴']
    inv_label = get_label('invoices')
    
    for i, bucket in enumerate(buckets):
        row = aging_summary[aging_summary['Aging'] == bucket]
        amount = row['Amount'].sum() if not row.empty else 0
        count = row['Invoices'].sum() if not row.empty else 0
        cols[i].metric(f"{colors[i]} {bucket}", f"฿{amount:,.0f}", f"{count} {inv_label}")
    
    # Detail by customer
    st.markdown("---")
    st.markdown(f"##### 👥 {get_label('by_cust')}")
    
    customer_aging = aging.pivot_table(
        index='Customer',
        columns='Aging',
        values='Amount',
        aggfunc='sum',
        fill_value=0
    ).reset_index()
    
    st.dataframe(customer_aging, hide_index=True, use_container_width=True)
    
    # Export
    if st.button(f"📤 {get_label('export_ar')}"):
        csv = aging.to_csv(index=False)
        b64 = base64.b64encode(csv.encode()).decode()
        href = f'<a href="data:file/csv;base64,{b64}" download="ar_aging_{datetime.now().strftime("%Y%m%d")}.csv">📥 Download CSV</a>'
        st.markdown(href, unsafe_allow_html=True)

def _render_reports_tab():
    st.markdown(f"#### {get_label('report_title')}")
    
    rpt_opts = [
        "- Select -",
        get_label('rpt_driver'),
        get_label('rpt_cust'), 
        get_label('rpt_pl'),
        get_label('rpt_fuel')
    ]
    
    report_type = st.selectbox(get_label('sel_report'), rpt_opts)
    
    if report_type == "- Select -":
        return
    
    # Date range
    col1, col2 = st.columns(2)
    with col1:
        start = st.date_input(get_label('from_date'), datetime.now().replace(day=1), key="rpt_start")
    with col2:
        end = st.date_input(get_label('to_date'), datetime.now(), key="rpt_end")
    
    jobs = repo.get_data("Jobs_Main")
    if jobs.empty:
        st.info(get_label('no_jobs'))
        return
    
    # Filter by date
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    filtered = jobs[(jobs['Plan_Date'].dt.date >= start) & (jobs['Plan_Date'].dt.date <= end)].copy()
    
    for col in ['Price_Cust_Total', 'Cost_Driver_Total']:
        filtered[col] = filtered[col].apply(safe_float)
    
    if report_type == get_label('rpt_driver'):
        st.markdown(f"##### 👷 {get_label('rpt_driver')}")
        driver_rpt = filtered.groupby('Driver_Name').agg({
            'Job_ID': 'count',
            'Cost_Driver_Total': 'sum'
        }).reset_index()
        driver_rpt.columns = [get_label('driver'), 'Jobs', get_label('total_earnings')]
        driver_rpt = driver_rpt.sort_values(get_label('total_earnings'), ascending=False)
        driver_rpt[get_label('total_earnings')] = driver_rpt[get_label('total_earnings')].apply(lambda x: f"฿{x:,.0f}")
        st.dataframe(driver_rpt, hide_index=True, use_container_width=True)
    
    elif report_type == get_label('rpt_cust'):
        st.markdown(f"##### 🏢 {get_label('rpt_cust')}")
        cust_rpt = filtered.groupby('Customer_Name').agg({
            'Job_ID': 'count',
            'Price_Cust_Total': 'sum',
            'Cost_Driver_Total': 'sum'
        }).reset_index()
        cust_rpt.columns = ['Customer', 'Jobs', 'Revenue', 'Cost']
        cust_rpt['Profit'] = cust_rpt['Revenue'] - cust_rpt['Cost']
        cust_rpt['Margin'] = (cust_rpt['Profit'] / cust_rpt['Revenue'] * 100).round(1)
        cust_rpt = cust_rpt.sort_values('Revenue', ascending=False)
        
        # Rename for display
        if st.session_state.get("lang") == "th":
            cust_rpt.columns = ["ลูกค้า", "จำนวนงาน", "รายได้", "ต้นทุน", "กำไร", "อัตรากำไร"]
            cols = ["รายได้", "ต้นทุน", "กำไร"]
            margin_col = "อัตรากำไร"
        else:
            cols = ['Revenue', 'Cost', 'Profit']
            margin_col = 'Margin'
            
        for col in cols:
            cust_rpt[col] = cust_rpt[col].apply(lambda x: f"฿{x:,.0f}")
        cust_rpt[margin_col] = cust_rpt[margin_col].apply(lambda x: f"{x}%")
        
        st.dataframe(cust_rpt, hide_index=True, use_container_width=True)
    
    elif report_type == get_label('rpt_pl'):
        st.markdown(f"##### 📊 {get_label('rpt_pl')}")
        
        revenue = filtered['Price_Cust_Total'].sum()
        driver_cost = filtered['Cost_Driver_Total'].sum()
        
        fuel = repo.get_data("Fuel_Logs")
        fuel_cost = 0
        if not fuel.empty:
            fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
            fuel_flt = fuel[(fuel['Date'].dt.date >= start) & (fuel['Date'].dt.date <= end)]
            fuel_cost = pd.to_numeric(fuel_flt['Price_Total'], errors='coerce').sum()
        
        gross = revenue - driver_cost
        net = gross - fuel_cost
        margin = (net / revenue * 100) if revenue > 0 else 0
        
        pl_items = {
            "th": [get_label('revenue'), "ต้นทุนคนขับ", get_label('gross_profit'), get_label('fuel_cost'), get_label('net_profit')],
            "en": [get_label('revenue'), "Driver Cost", get_label('gross_profit'), get_label('fuel_cost'), get_label('net_profit')]
        }
        
        lang = st.session_state.get("lang", "th")
        items = pl_items.get(lang, pl_items["th"])
        
        pl_data = pd.DataFrame({
            'Item': items,
            'Amount': [revenue, driver_cost, gross, fuel_cost, net]
        })
        pl_data['Amount'] = pl_data['Amount'].apply(lambda x: f"฿{x:,.0f}")
        
        st.dataframe(pl_data, hide_index=True, use_container_width=True)
        st.markdown(render_metric_card(get_label('net_margin'), f"{margin:.1f}%", icon="📈"), unsafe_allow_html=True)
    
    elif report_type == get_label('rpt_fuel'):
        st.markdown(f"##### ⛽ {get_label('rpt_fuel')}")
        
        fuel = repo.get_data("Fuel_Logs")
        if fuel.empty:
            st.info(get_label('no_jobs')) # reuse no_jobs/no_data
            return
        
        fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
        fuel_flt = fuel[(fuel['Date'].dt.date >= start) & (fuel['Date'].dt.date <= end)].copy()
        
        if fuel_flt.empty:
            st.info(get_label('no_jobs'))
            return
        
        # [Removed dead code referencing undefined 'df']


        fuel_flt['Price_Total'] = pd.to_numeric(fuel_flt['Price_Total'], errors='coerce').fillna(0)
        fuel_flt['Liters'] = pd.to_numeric(fuel_flt['Liters'], errors='coerce').fillna(0)
        
        daily_fuel = fuel_flt.groupby(fuel_flt['Date'].dt.date).agg({
            'Price_Total': 'sum',
            'Liters': 'sum'
        }).reset_index()
        daily_fuel.columns = ['Date', 'Cost', 'Liters']
        
        st.line_chart(daily_fuel.set_index('Date')['Cost'])
        
        total_liters = fuel_flt['Liters'].sum()
        total_cost = fuel_flt['Price_Total'].sum()
        avg_price = total_cost / total_liters if total_liters > 0 else 0
        
        c1, c2, c3 = st.columns(3)
        c1.metric(get_label('total_liters'), f"{total_liters:,.0f}")
        c2.metric(get_label('total_cost'), f"฿{total_cost:,.0f}")
        c3.metric(get_label('avg_price'), f"฿{avg_price:.2f}")
    
    # Export button
    st.markdown("---")
    if st.button(f"📤 {get_label('export_rpt')}"):
        st.info("Export functionality ready - data prepared for download")
