
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta

from data.repository import repo
from utils.helpers import safe_float, render_metric_card
from config.constants import JobStatus, PaymentStatus, DriverStatus

# Language labels
LABELS = {
    "th": {
        "title": "📊 ศูนย์บัญชาการ",
        "from": "ตั้งแต่",
        "to": "ถึง",
        "quick_filter": "ช่วงเวลา",
        "total_jobs": "📦 รวมงาน",
        "revenue": "💰 รายได้",
        "profit": "📊 กำไรสุทธิ",
        "active_jobs": "🚛 งานกำลังทำ",
        "otd_rate": "⏱️ ส่งตรงเวลา",
        "expense_summary": "💸 สรุปรายจ่าย",
        "driver_cost": "💵 ต้นทุนคนขับ",
        "fuel_cost": "⛽ ค่าน้ำมัน",
        "total_expense": "📉 รวมรายจ่าย",
        "expense_ratio": "📊 % ต่อรายได้",
        "completed": "เสร็จ",
        "no_data": "ยังไม่มีข้อมูลงาน กรุณาสร้างงานก่อน",
    },
    "en": {
        "title": "📊 Enterprise Command Center",
        "from": "From",
        "to": "To",
        "quick_filter": "Quick Filter",
        "total_jobs": "📦 Total Jobs",
        "revenue": "💰 Revenue",
        "profit": "📊 Net Profit",
        "active_jobs": "🚛 Active Jobs",
        "otd_rate": "⏱️ OTD Rate",
        "expense_summary": "💸 Expense Summary",
        "driver_cost": "💵 Driver Cost",
        "fuel_cost": "⛽ Fuel Cost",
        "total_expense": "📉 Total Expense",
        "expense_ratio": "📊 % of Revenue",
        "completed": "completed",
        "no_data": "No jobs data. Please create a job first.",
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_dashboard_view():
    from utils.helpers import render_metric_card  # Local import to fix potential reload issues
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    # ============================================================
    # 🔧 Optimized Data Loading - Load with date limits
    # ============================================================
    # ============================================================
    # 🔧 Optimized Data Loading - Load with date limits
    # ============================================================
    # Jobs: Select ONLY needed columns
    job_cols = "Job_ID,Job_Status,Plan_Date,Price_Cust_Total,Cost_Driver_Total,Driver_Name,Customer_Name,Payment_Status,Billing_Status"
    jobs = repo.get_data("Jobs_Main", columns=job_cols)
    
    # Master data (drivers needed for Fleet Status)
    # drivers = repo.get_data("Master_Drivers") # Full fetch needed for expiry checks? Yes.
    
    # Customers not used in this view? Removed for speed.
    # customers = repo.get_data("Master_Customers") 
    
    if jobs.empty: 
        st.info(get_label("no_data"))
        return
    
    # Wrap interactive part in Fragment
    if hasattr(st, "fragment"):
        @st.fragment
        def render_dashboard_charts(jobs_df):
            _render_interactive_content(jobs_df)
            
        render_dashboard_charts(jobs)
    else:
        _render_interactive_content(jobs)

def _render_interactive_content(jobs):
    # Master Drivers needed here
    drivers = repo.get_data("Master_Drivers")

    # --- Date Filter ---
    col_f1, col_f2, col_f3 = st.columns([1, 1, 2])
    with col_f1:
        s_date = st.date_input(get_label("from"), datetime.now().replace(day=1), key="dash_from")
    with col_f2:
        e_date = st.date_input(get_label("to"), datetime.now(), key="dash_to")
    with col_f3:
        quick_filter = st.selectbox(get_label("quick_filter"), ["Custom", "Today", "This Week", "This Month", "Last 30 Days"], key="dash_filter")
        if quick_filter == "Today":
            s_date = e_date = datetime.now().date()
        elif quick_filter == "This Week":
            s_date = (datetime.now() - timedelta(days=datetime.now().weekday())).date()
            e_date = datetime.now().date()
        elif quick_filter == "Last 30 Days":
            s_date = (datetime.now() - timedelta(days=30)).date()
            e_date = datetime.now().date()
    
    # --- Data Prep ---
    jobs['PD'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    view = jobs[(jobs['PD'].dt.date >= s_date) & (jobs['PD'].dt.date <= e_date)].copy()
    
    # Clean numeric columns
    for c in ['Price_Cust_Total', 'Cost_Driver_Total']: 
        view[c] = view[c].apply(safe_float)
    
    # =====================================================
    # SECTION 1: Executive KPI Cards (Cached)
    # =====================================================
    st.markdown("---")
    
    from services.report_service import ReportService
    
    # 1. Get Cached Metrics
    current_branch = st.session_state.get("branch_id", "ALL")
    metrics = ReportService.get_performance_metrics(s_date, e_date, current_branch)
    
    # 2. Extract values
    total_jobs = metrics.get('total_jobs', 0)
    completed_jobs = metrics.get('completed_jobs', 0)
    revenue = metrics.get('revenue', 0)
    gross_profit = metrics.get('gross_profit', 0)
    margin = metrics.get('margin', 0)
    
    # Active/Cancelled still calculated from view (lightweight filtered df)
    active_jobs = len(view[view['Job_Status'].isin(JobStatus.ACTIVE)])
    
    # Display KPIs - Row 1
    html = '<div class="tms-metrics-grid">'
    html += render_metric_card(get_label("total_jobs"), f"{total_jobs}", icon="📦", trend=None, sub=f"{completed_jobs} {get_label('completed')}")
    html += render_metric_card(get_label("revenue"), f"฿{revenue:,.0f}", icon="💰", accent_color="accent-red")
    html += render_metric_card(get_label("profit"), f"฿{gross_profit:,.0f}", icon="📈", trend=f"{margin:.1f}%", accent_color="accent-green")
    html += render_metric_card(get_label("active_jobs"), f"{active_jobs}", icon="🚛")
    
    # OTD Rate
    otd_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
    html += render_metric_card(get_label("otd_rate"), f"{otd_rate:.1f}%", icon="⏱️")
    html += '</div>'
    
    st.markdown(html, unsafe_allow_html=True)
    
    # Display KPIs - Row 2 (Expense Summary)
    # Note: Fuel cost omitted in cached version for speed, can add back if critical
    # For now, showing calculated driver cost from cached revenue - profit
    driver_cost = revenue - gross_profit 
    
    # Fix NameError: Define fuel_cost and net_profit for Waterfall Chart
    fuel_cost = 0.0 # Optimized out for speed in Phase 4
    net_profit = gross_profit - fuel_cost 
    
    st.markdown(f"##### {get_label('expense_summary')}")
    exp1, exp2, exp3, exp4 = st.columns(4)
    with exp1: st.markdown(render_metric_card(get_label("driver_cost"), f"฿{driver_cost:,.0f}", icon="💵"), unsafe_allow_html=True)
    with exp2: st.markdown(render_metric_card(get_label("fuel_cost"), "N/A", icon="⛽", sub="Detail in Reports"), unsafe_allow_html=True) # Optimized out
    with exp3: st.markdown(render_metric_card(get_label("total_expense"), f"฿{driver_cost:,.0f}", icon="📉", sub="Driver Only"), unsafe_allow_html=True)
    with exp4: 
        expense_ratio = (driver_cost / revenue * 100) if revenue > 0 else 0
        st.markdown(render_metric_card(get_label("expense_ratio"), f"{expense_ratio:.1f}%", icon="📊"), unsafe_allow_html=True)
    
    # =====================================================
    # SECTION 2: Financial Waterfall + Trend
    # =====================================================
    st.markdown("---")
    col_chart1, col_chart2 = st.columns(2)
    
    with col_chart1:
        st.markdown("#### 💰 Profit Waterfall")
        fig_water = go.Figure(go.Waterfall(
            name="Profit", orientation="v",
            measure=["relative", "relative", "relative", "total"],
            x=["Revenue", "Driver Cost", "Fuel Cost", "Net Profit"],
            textposition="outside",
            text=[f"{revenue/1000:.1f}k", f"-{driver_cost/1000:.1f}k", f"-{fuel_cost/1000:.1f}k", f"{net_profit/1000:.1f}k"],
            y=[revenue, -driver_cost, -fuel_cost, net_profit],
            connector={"line": {"color": "rgb(63, 63, 63)"}},
            decreasing={"marker": {"color": "#ff6b6b"}},
            increasing={"marker": {"color": "#51cf66"}},
            totals={"marker": {"color": "#339af0"}}
        ))
        fig_water.update_layout(height=300, margin=dict(t=30, b=30))
        st.plotly_chart(fig_water, use_container_width=True)
    
    with col_chart2:
        st.markdown("#### 📈 Daily Revenue Trend")
        if not view.empty:
            daily = view.groupby(view['PD'].dt.date).agg({
                'Price_Cust_Total': 'sum',
                'Job_ID': 'count'
            }).reset_index()
            daily.columns = ['Date', 'Revenue', 'Jobs']
            
            fig_trend = px.area(daily, x='Date', y='Revenue', 
                               color_discrete_sequence=['#339af0'])
            fig_trend.update_layout(height=300, margin=dict(t=30, b=30))
            st.plotly_chart(fig_trend, use_container_width=True)
        else:
            st.info("ไม่มีข้อมูลในช่วงที่เลือก")
    
    # =====================================================
    # SECTION 3: Fleet Status (REAL DATA)
    # =====================================================
    st.markdown("---")
    st.markdown("#### 🚛 Real-Time Fleet Status")
    
    col_fleet1, col_fleet2 = st.columns([1, 2])
    
    with col_fleet1:
        # Calculate REAL fleet status
        total_drivers = len(drivers) if not drivers.empty else 0
        
        # Get today's active jobs
        today = datetime.now().date()
        today_jobs = jobs[jobs['PD'].dt.date == today] if not jobs.empty else pd.DataFrame()
        
        on_job_drivers = []
        if not today_jobs.empty:
            active_today = today_jobs[today_jobs['Job_Status'].isin(JobStatus.ACTIVE)]
            on_job_drivers = active_today['Driver_ID'].dropna().unique().tolist()
        
        on_job_count = len(on_job_drivers)
        
        # Check maintenance
        maintenance_plates = []
        tickets = repo.get_data("Repair_Tickets")
        if not tickets.empty:
            open_tickets = tickets[tickets['Status'].isin(['รอดำเนินการ', 'กำลังซ่อม'])]
            maintenance_plates = open_tickets['Vehicle_Plate'].unique().tolist()
        
        maintenance_count = len(maintenance_plates)
        
        # Check inactive
        inactive_count = 0
        if not drivers.empty and 'Active_Status' in drivers.columns:
            inactive_count = len(drivers[drivers['Active_Status'] == 'Inactive'])
        
        available_count = max(0, total_drivers - on_job_count - maintenance_count - inactive_count)
        
        # Create pie chart
        status_data = pd.DataFrame({
            'Status': [DriverStatus.AVAILABLE, DriverStatus.ON_JOB, DriverStatus.MAINTENANCE, DriverStatus.INACTIVE],
            'Count': [available_count, on_job_count, maintenance_count, inactive_count]
        })
        status_data = status_data[status_data['Count'] > 0]  # Remove zeros
        
        if not status_data.empty:
            fig_pie = px.pie(status_data, values='Count', names='Status', hole=0.5,
                            color='Status',
                            color_discrete_map={
                                DriverStatus.AVAILABLE: '#51cf66',
                                DriverStatus.ON_JOB: '#339af0',
                                DriverStatus.MAINTENANCE: '#fcc419',
                                DriverStatus.INACTIVE: '#868e96'
                            })
            fig_pie.update_layout(height=250, margin=dict(t=0, b=0))
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("ไม่มีข้อมูลรถ")
    
    with col_fleet2:
        # Maintenance Alerts (REAL DATA)
        st.markdown("##### 🔧 Maintenance Alerts")
        
        if not drivers.empty:
            alerts = []
            
            # Check service mileage
            if 'Current_Mileage' in drivers.columns and 'Next_Service_Mileage' in drivers.columns:
                drivers['KM_Until_Service'] = pd.to_numeric(drivers['Next_Service_Mileage'], errors='coerce') - \
                                              pd.to_numeric(drivers['Current_Mileage'], errors='coerce')
                
                urgent_service = drivers[drivers['KM_Until_Service'] < 500]
                for _, d in urgent_service.iterrows():
                    alerts.append({
                        "Vehicle": d.get('Vehicle_Plate', 'N/A'),
                        "Alert": f"Service due in {d['KM_Until_Service']:.0f} km",
                        "Priority": "🔴 High"
                    })
                
                soon_service = drivers[(drivers['KM_Until_Service'] >= 500) & (drivers['KM_Until_Service'] < 2000)]
                for _, d in soon_service.iterrows():
                    alerts.append({
                        "Vehicle": d.get('Vehicle_Plate', 'N/A'),
                        "Alert": f"Service in {d['KM_Until_Service']:.0f} km",
                        "Priority": "🟡 Medium"
                    })
            
            # Check document expiry
            doc_cols = ['Insurance_Expiry', 'Tax_Expiry', 'Act_Expiry']
            for _, d in drivers.iterrows():
                for col in doc_cols:
                    if col in drivers.columns:
                        try:
                            exp_date = pd.to_datetime(d[col], errors='coerce')
                            if pd.notna(exp_date):
                                days_left = (exp_date - datetime.now()).days
                                if days_left < 0:
                                    alerts.append({
                                        "Vehicle": d.get('Vehicle_Plate', 'N/A'),
                                        "Alert": f"{col.replace('_', ' ')} EXPIRED!",
                                        "Priority": "🔴 High"
                                    })
                                elif days_left < 30:
                                    alerts.append({
                                        "Vehicle": d.get('Vehicle_Plate', 'N/A'),
                                        "Alert": f"{col.replace('_', ' ')} in {days_left} days",
                                        "Priority": "🟡 Medium"
                                    })
                        except:
                            pass
            
            if alerts:
                alert_df = pd.DataFrame(alerts)
                st.dataframe(alert_df, hide_index=True, use_container_width=True)
            else:
                st.success("✅ No maintenance alerts!")
        else:
            st.info("ไม่มีข้อมูลรถ")
    
    # =====================================================
    # SECTION 4: Job Status Overview
    # =====================================================
    st.markdown("---")
    st.markdown("#### 📋 Job Status Breakdown")
    
    col_status1, col_status2, col_status3 = st.columns([2, 1, 1])
    
    with col_status1:
        if not view.empty:
            status_counts = view['Job_Status'].value_counts().reset_index()
            status_counts.columns = ['Status', 'Count']
            
            fig_bar = px.bar(status_counts, x='Status', y='Count', 
                            color='Status',
                            color_discrete_map={
                                JobStatus.NEW: '#868e96',
                                JobStatus.ASSIGNED: '#339af0',
                                JobStatus.IN_TRANSIT: '#fd7e14',
                                JobStatus.COMPLETED: '#51cf66',
                                JobStatus.CANCELLED: '#ff6b6b'
                            })
            fig_bar.update_layout(height=250, showlegend=False)
            st.plotly_chart(fig_bar, use_container_width=True)
    
    with col_status2:
        st.markdown("##### 💳 Payment Status")
        if 'Payment_Status' in view.columns:
            paid = len(view[view['Payment_Status'] == PaymentStatus.PAID])
            pending = len(view) - paid
            st.metric("Paid", paid)
            st.metric("Pending", pending, delta=f"-{pending/len(view)*100:.0f}%" if len(view) > 0 else "")
    
    with col_status3:
        st.markdown("##### 🧾 Billing Status")
        if 'Billing_Status' in view.columns:
            billed = len(view[view['Billing_Status'] == 'Billed'])
            unbilled = len(view) - billed
            st.metric("Billed", billed)
            st.metric("Unbilled", unbilled)
    
    # =====================================================
    # SECTION 5: Top Performers
    # =====================================================
    st.markdown("---")
    col_top1, col_top2 = st.columns(2)
    
    with col_top1:
        st.markdown("#### 🏆 Top Drivers (by Jobs)")
        if not view.empty and 'Driver_Name' in view.columns:
            driver_perf = view[view['Job_Status'] == JobStatus.COMPLETED].groupby('Driver_Name').agg({
                'Job_ID': 'count',
                'Cost_Driver_Total': 'sum'
            }).reset_index()
            driver_perf.columns = ['Driver', 'Jobs', 'Earnings']
            driver_perf = driver_perf.sort_values('Jobs', ascending=False).head(5)
            st.dataframe(driver_perf, hide_index=True, use_container_width=True)
    
    with col_top2:
        st.markdown("#### 💰 Top Customers (by Revenue)")
        if not view.empty and 'Customer_Name' in view.columns:
            cust_perf = view.groupby('Customer_Name').agg({
                'Job_ID': 'count',
                'Price_Cust_Total': 'sum'
            }).reset_index()
            cust_perf.columns = ['Customer', 'Jobs', 'Revenue']
            cust_perf = cust_perf.sort_values('Revenue', ascending=False).head(5)
            cust_perf['Revenue'] = cust_perf['Revenue'].apply(lambda x: f"฿{x:,.0f}")
            st.dataframe(cust_perf, hide_index=True, use_container_width=True)
