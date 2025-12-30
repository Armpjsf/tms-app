"""
Reports Hub - Enterprise Reporting Center
ศูนย์รายงานสำเร็จรูป
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import base64
import io
from data.repository import repo
from utils.helpers import safe_float
from services.analytics_service import AnalyticsService

# Language labels
LABELS = {
    "th": {
        "title": "📊 ศูนย์รายงาน",
        "subtitle": "รายงานสำเร็จรูปสำหรับผู้บริหาร",
        "select_report": "เลือกรายงาน",
        "date_range": "ช่วงวันที่",
        "from": "จาก",
        "to": "ถึง",
        "generate": "สร้างรายงาน",
        "export_excel": "ส่งออก Excel",
        "export_pdf": "ส่งออก PDF",
        "no_data": "ไม่มีข้อมูลในช่วงที่เลือก",
        # Report names
        "report_pl": "📈 รายงานกำไร-ขาดทุน",
        "report_cost": "💰 วิเคราะห์ต้นทุน (Cost/KM)",
        "report_driver": "👷 รายงานประสิทธิภาพคนขับ",
        "report_customer": "🏢 รายงานลูกค้า",
        "report_route": "🗺️ รายงานเส้นทาง",
        "report_fuel": "⛽ รายงานน้ำมัน",
        "report_maintenance": "🔧 รายงานซ่อมบำรุง",
        "report_daily": "📅 รายงานประจำวัน",
        "report_monthly": "📆 รายงานประจำเดือน",
    },
    "en": {
        "title": "📊 Reports Hub",
        "subtitle": "Ready-to-use executive reports",
        "select_report": "Select Report",
        "date_range": "Date Range",
        "from": "From",
        "to": "To",
        "generate": "Generate Report",
        "export_excel": "Export Excel",
        "export_pdf": "Export PDF",
        "no_data": "No data in selected period",
        # Report names
        "report_pl": "📈 Profit & Loss Report",
        "report_cost": "💰 Cost Analysis (Cost/KM)",
        "report_driver": "👷 Driver Performance Report",
        "report_customer": "🏢 Customer Report",
        "report_route": "🗺️ Route Analysis Report",
        "report_fuel": "⛽ Fuel Consumption Report",
        "report_maintenance": "🔧 Maintenance Report",
        "report_daily": "📅 Daily Operations Report",
        "report_monthly": "📆 Monthly Summary Report",
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_reports_view():
    lang = st.session_state.get("lang", "th")
    
    st.markdown(f"### {get_label('title')}")
    st.caption(get_label('subtitle'))
    
    # Report selector
    report_options = [
        get_label("report_pl"),
        get_label("report_cost"),
        get_label("report_driver"),
        get_label("report_customer"),
        get_label("report_route"),
        get_label("report_fuel"),
        get_label("report_maintenance"),
        get_label("report_daily"),
        get_label("report_monthly"),
    ]
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        selected = st.selectbox(get_label("select_report"), report_options, key="report_selector")
    with col2:
        start_date = st.date_input(get_label("from"), datetime.now().replace(day=1), key="report_start")
    with col3:
        end_date = st.date_input(get_label("to"), datetime.now(), key="report_end")
    
    st.markdown("---")
    
    # Route to specific report
    if selected == get_label("report_pl"):
        _render_pl_report(start_date, end_date, lang)
    elif selected == get_label("report_cost"):
        _render_cost_report(start_date, end_date)
    elif selected == get_label("report_driver"):
        _render_driver_report(start_date, end_date, lang)
    elif selected == get_label("report_customer"):
        _render_customer_report(start_date, end_date, lang)
    elif selected == get_label("report_route"):
        _render_route_report(start_date, end_date, lang)
    elif selected == get_label("report_fuel"):
        _render_fuel_report(start_date, end_date, lang)
    elif selected == get_label("report_maintenance"):
        _render_maintenance_report(start_date, end_date, lang)
    elif selected == get_label("report_daily"):
        _render_daily_report(start_date, end_date, lang)
    elif selected == get_label("report_monthly"):
        _render_monthly_report(start_date, end_date, lang)

def _get_filtered_jobs(start_date, end_date):
    """Get jobs filtered by date range."""
    # Calculate days back needed
    from datetime import datetime
    if isinstance(start_date, datetime):
        start_date = start_date.date()
    days_back = (datetime.now().date() - start_date).days + 5 # Add buffer
    if days_back < 60: days_back = 60 # Check at least default
    
    jobs = repo.get_data("Jobs_Main", days_back=days_back)
    if jobs.empty:
        return jobs
    
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    jobs = jobs[(jobs['Plan_Date'].dt.date >= start_date) & (jobs['Plan_Date'].dt.date <= end_date)]
    
    for col in ['Price_Cust_Total', 'Cost_Driver_Total']:
        jobs[col] = jobs[col].apply(safe_float)
    
    return jobs

def _export_button(df, filename, lang):
    """Add export buttons."""
    col1, col2 = st.columns(2)
    
    with col1:
        csv = df.to_csv(index=False)
        b64 = base64.b64encode(csv.encode()).decode()
        st.markdown(f'<a href="data:file/csv;base64,{b64}" download="{filename}.csv" class="stButton">📥 {get_label("export_excel")}</a>', unsafe_allow_html=True)
    
    with col2:
        # Strip Timezone for Excel Compatibility
        export_df = df.copy()
        for col in export_df.columns:
            if pd.api.types.is_datetime64_any_dtype(export_df[col]):
                 export_df[col] = export_df[col].apply(lambda x: x.replace(tzinfo=None) if pd.notnull(x) and hasattr(x, 'tzinfo') else x)

        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            export_df.to_excel(writer, index=False, sheet_name='Report')
        
        b64 = base64.b64encode(excel_buffer.getvalue()).decode()
        st.markdown(f'<a href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{b64}" download="{filename}.xlsx">📥 Download Excel</a>', unsafe_allow_html=True)

def _render_pl_report(start_date, end_date, lang):
    """Profit & Loss Report."""
    st.markdown("#### 📈 " + ("รายงานกำไร-ขาดทุน" if lang == "th" else "Profit & Loss Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    fuel = repo.get_data("Fuel_Logs")
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    # Calculate P&L
    revenue = jobs['Price_Cust_Total'].sum()
    driver_cost = jobs['Cost_Driver_Total'].sum()
    
    fuel_cost = 0
    if not fuel.empty:
        fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
        fuel_filtered = fuel[(fuel['Date'].dt.date >= start_date) & (fuel['Date'].dt.date <= end_date)]
        fuel_cost = pd.to_numeric(fuel_filtered['Price_Total'], errors='coerce').sum()
    
    gross_profit = revenue - driver_cost
    net_profit = gross_profit - fuel_cost
    margin = (net_profit / revenue * 100) if revenue > 0 else 0
    
    # Summary cards
    from utils.helpers import render_metric_card
    col1, col2, col3, col4 = st.columns(4)
    with col1: st.markdown(render_metric_card("💰 " + ("รายได้" if lang == "th" else "Revenue"), f"฿{revenue:,.0f}", icon="💰", accent_color="accent-blue"), unsafe_allow_html=True)
    with col2: st.markdown(render_metric_card("💵 " + ("ต้นทุน" if lang == "th" else "Cost"), f"฿{driver_cost + fuel_cost:,.0f}", icon="📉"), unsafe_allow_html=True)
    with col3: st.markdown(render_metric_card("📊 " + ("กำไรสุทธิ" if lang == "th" else "Net Profit"), f"฿{net_profit:,.0f}", icon="💵", accent_color="accent-green"), unsafe_allow_html=True)
    with col4: st.markdown(render_metric_card("📈 " + ("อัตรากำไร" if lang == "th" else "Margin"), f"{margin:.1f}%", icon="💹", trend=f"{margin:.1f}%"), unsafe_allow_html=True)
    
    # Waterfall chart
    fig = go.Figure(go.Waterfall(
        orientation="v",
        measure=["absolute", "relative", "relative", "total"],
        x=["Revenue" if lang == "en" else "รายได้", 
           "Driver Cost" if lang == "en" else "ค่าคนขับ", 
           "Fuel" if lang == "en" else "ค่าน้ำมัน", 
           "Net Profit" if lang == "en" else "กำไรสุทธิ"],
        text=[f"฿{revenue:,.0f}", f"-฿{driver_cost:,.0f}", f"-฿{fuel_cost:,.0f}", f"฿{net_profit:,.0f}"],
        y=[revenue, -driver_cost, -fuel_cost, net_profit],
        connector={"line": {"color": "rgb(63, 63, 63)"}},
        increasing={"marker": {"color": "#2e7d32"}},
        decreasing={"marker": {"color": "#d32f2f"}},
        totals={"marker": {"color": "#1a237e"}}
    ))
    fig.update_layout(title="P&L Breakdown", height=400)
    st.plotly_chart(fig, use_container_width=True)
    
    # Daily breakdown
    daily = jobs.groupby(jobs['Plan_Date'].dt.date).agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Cost_Driver_Total': 'sum'
    }).reset_index()
    daily.columns = ['Date', 'Jobs', 'Revenue', 'Cost']
    daily['Profit'] = daily['Revenue'] - daily['Cost']
    
    st.dataframe(daily, hide_index=True, use_container_width=True)
    _export_button(daily, f"pl_report_{start_date}_{end_date}", lang)

def _render_driver_report(start_date, end_date, lang):
    """Driver Performance Report."""
    st.markdown("#### 👷 " + ("รายงานประสิทธิภาพคนขับ" if lang == "th" else "Driver Performance Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    # Group by driver
    driver_stats = jobs.groupby('Driver_Name').agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Cost_Driver_Total': 'sum',
        'Job_Status': lambda x: (x == 'Completed').sum()
    }).reset_index()
    
    driver_stats.columns = ['Driver', 'Total_Jobs', 'Revenue', 'Earnings', 'Completed']
    driver_stats['Completion_Rate'] = (driver_stats['Completed'] / driver_stats['Total_Jobs'] * 100).round(1)
    driver_stats = driver_stats.sort_values('Total_Jobs', ascending=False)
    
    # Chart
    fig = px.bar(driver_stats, x='Driver', y='Total_Jobs', color='Completion_Rate',
                 title="Jobs by Driver", color_continuous_scale='RdYlGn')
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(driver_stats, hide_index=True, use_container_width=True)
    _export_button(driver_stats, f"driver_report_{start_date}_{end_date}", lang)

def _render_customer_report(start_date, end_date, lang):
    """Customer Report."""
    st.markdown("#### 🏢 " + ("รายงานลูกค้า" if lang == "th" else "Customer Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    # Group by customer
    cust_stats = jobs.groupby('Customer_Name').agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Cost_Driver_Total': 'sum'
    }).reset_index()
    
    cust_stats.columns = ['Customer', 'Total_Jobs', 'Revenue', 'Cost']
    cust_stats['Profit'] = cust_stats['Revenue'] - cust_stats['Cost']
    cust_stats['Margin'] = (cust_stats['Profit'] / cust_stats['Revenue'] * 100).round(1)
    cust_stats = cust_stats.sort_values('Revenue', ascending=False)
    
    # Chart
    fig = px.pie(cust_stats.head(10), values='Revenue', names='Customer', 
                 title="Top 10 Customers by Revenue", hole=0.4)
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(cust_stats, hide_index=True, use_container_width=True)
    _export_button(cust_stats, f"customer_report_{start_date}_{end_date}", lang)

def _render_route_report(start_date, end_date, lang):
    """Route Analysis Report."""
    st.markdown("#### 🗺️ " + ("รายงานเส้นทาง" if lang == "th" else "Route Analysis Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    # Group by route
    route_stats = jobs.groupby('Route_Name').agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Est_Distance_KM': 'mean'
    }).reset_index()
    
    route_stats.columns = ['Route', 'Trips', 'Revenue', 'Avg_Distance']
    route_stats['Avg_Revenue'] = (route_stats['Revenue'] / route_stats['Trips']).round(0)
    route_stats = route_stats.sort_values('Trips', ascending=False)
    
    fig = px.bar(route_stats.head(15), x='Route', y='Trips', color='Revenue',
                 title="Top Routes by Frequency")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(route_stats, hide_index=True, use_container_width=True)
    _export_button(route_stats, f"route_report_{start_date}_{end_date}", lang)

def _render_fuel_report(start_date, end_date, lang):
    """Fuel Consumption Report."""
    st.markdown("#### ⛽ " + ("รายงานน้ำมัน" if lang == "th" else "Fuel Consumption Report"))
    
    fuel = repo.get_data("Fuel_Logs")
    
    if fuel.empty:
        st.info(get_label("no_data"))
        return
    
    fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
    fuel = fuel[(fuel['Date'].dt.date >= start_date) & (fuel['Date'].dt.date <= end_date)]
    fuel['Liters'] = pd.to_numeric(fuel['Liters'], errors='coerce').fillna(0)
    fuel['Price_Total'] = pd.to_numeric(fuel['Price_Total'], errors='coerce').fillna(0)
    
    if fuel.empty:
        st.info(get_label("no_data"))
        return
    
    # Summary
    total_liters = fuel['Liters'].sum()
    total_cost = fuel['Price_Total'].sum()
    avg_price = total_cost / total_liters if total_liters > 0 else 0
    
    col1, col2, col3 = st.columns(3)
    col1.metric("⛽ Total Liters", f"{total_liters:,.0f} L")
    col2.metric("💰 Total Cost", f"฿{total_cost:,.0f}")
    col3.metric("💵 Avg Price/L", f"฿{avg_price:.2f}")
    
    # By vehicle
    by_vehicle = fuel.groupby('Vehicle_Plate').agg({
        'Liters': 'sum',
        'Price_Total': 'sum'
    }).reset_index().sort_values('Liters', ascending=False)
    
    fig = px.bar(by_vehicle, x='Vehicle_Plate', y='Liters', color='Price_Total',
                 title="Fuel by Vehicle")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(by_vehicle, hide_index=True, use_container_width=True)
    _export_button(by_vehicle, f"fuel_report_{start_date}_{end_date}", lang)

def _render_maintenance_report(start_date, end_date, lang):
    """Maintenance Report."""
    st.markdown("#### 🔧 " + ("รายงานซ่อมบำรุง" if lang == "th" else "Maintenance Report"))
    
    tickets = repo.get_data("Repair_Tickets")
    
    if tickets.empty:
        st.info(get_label("no_data"))
        return
    
    tickets['Date_Report'] = pd.to_datetime(tickets['Date_Report'], errors='coerce')
    
    # Calculate Status Distribution
    status_counts = tickets['Status'].value_counts().reset_index()
    status_counts.columns = ['Status', 'Count']
    
    fig = px.pie(status_counts, values='Count', names='Status', title="Tickets by Status", hole=0.4)
    st.plotly_chart(fig, use_container_width=True)
    
    # Process Image Columns for Display (Fix for raw JSON/String in Report)
    display_df = tickets.copy()
    
    # Image cleaning logic
    import re
    import json
    import ast

    def clean_img_report(val):
        if val is None or pd.isna(val) or val == "": return None
        
        if isinstance(val, list):
            return val[0] if len(val) > 0 else None
        
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
            if (inner.startswith('"') and inner.endswith('"')) or (inner.startswith("'") and inner.endswith("'")):
                return inner[1:-1]

        return s

    image_cols = ['Photo_Url', 'Photo_Proof_Url', 'Slip_Image', 'POD_Image']
    column_config = {}
    
    for col in image_cols:
        if col in display_df.columns:
            display_df[col] = display_df[col].apply(clean_img_report)
            column_config[col] = st.column_config.ImageColumn(col, help="Preview", width="medium")

    st.dataframe(
        display_df, 
        hide_index=True, 
        use_container_width=True,
        column_config=column_config
    )
    _export_button(tickets, f"maintenance_report_{start_date}_{end_date}", lang)

def _render_daily_report(start_date, end_date, lang):
    """Daily Operations Report."""
    st.markdown("#### 📅 " + ("รายงานประจำวัน" if lang == "th" else "Daily Operations Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    daily = jobs.groupby(jobs['Plan_Date'].dt.date).agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Cost_Driver_Total': 'sum',
        'Job_Status': lambda x: (x == 'Completed').sum()
    }).reset_index()
    
    daily.columns = ['Date', 'Jobs', 'Revenue', 'Cost', 'Completed']
    daily['Profit'] = daily['Revenue'] - daily['Cost']
    
    fig = px.line(daily, x='Date', y=['Revenue', 'Cost', 'Profit'], title="Daily Trend")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(daily, hide_index=True, use_container_width=True)
    _export_button(daily, f"daily_report_{start_date}_{end_date}", lang)

def _render_monthly_report(start_date, end_date, lang):
    """Monthly Summary Report."""
    st.markdown("#### 📆 " + ("รายงานประจำเดือน" if lang == "th" else "Monthly Summary Report"))
    
    jobs = _get_filtered_jobs(start_date, end_date)
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
    
    monthly = jobs.groupby(jobs['Plan_Date'].dt.to_period('M')).agg({
        'Job_ID': 'count',
        'Price_Cust_Total': 'sum',
        'Cost_Driver_Total': 'sum'
    }).reset_index()
    
    monthly.columns = ['Month', 'Jobs', 'Revenue', 'Cost']
    monthly['Month'] = monthly['Month'].astype(str)
    monthly['Profit'] = monthly['Revenue'] - monthly['Cost']
    monthly['Margin'] = (monthly['Profit'] / monthly['Revenue'] * 100).round(1)
    
    fig = px.bar(monthly, x='Month', y=['Revenue', 'Cost', 'Profit'], barmode='group',
                 title="Monthly Performance")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(monthly, hide_index=True, use_container_width=True)
    _export_button(monthly, f"monthly_report_{start_date}_{end_date}", lang)

def _render_cost_report(start, end):
    st.info("💡 รายงานนี้วิเคราะห์ต้นทุนต่อกิโลเมตร โดยรวมค่าน้ำมันและค่าซ่อมบำรุงหารด้วยระยะทางจริง")
    
    if st.button("🚀 คำนวณต้นทุน (Calculate Run)", type="primary"):
        df = AnalyticsService.get_cost_per_km(start, end)
        
        if df.empty:
            st.warning("ไม่พบข้อมูลในช่วงเวลานี้")
            return
            
        # KPI Cards
        avg_cost = df['Cost/KM (THB)'].mean()
        total_expense = df['Total Cost'].sum()
        total_dist = df['Distance (km)'].sum()
        
        k1, k2, k3 = st.columns(3)
        k1.metric("ต้นทุนเฉลี่ย/กม.", f"฿{avg_cost:.2f}")
        k2.metric("ค่าใช้จ่ายรวม (Fleet)", f"฿{total_expense:,.0f}")
        k3.metric("ระยะวิ่งรวม (Fleet)", f"{total_dist:,.0f} km")
        
        # Quadrant Chart (Efficiency Matrix)
        # X=Distance, Y=Cost/KM
        fig = px.scatter(
            df, 
            x="Distance (km)", 
            y="Cost/KM (THB)", 
            size="Total Cost", 
            color="Vehicle",
            hover_name="Vehicle",
            title="Efficiency Matrix (ยิ่งต่ำขวายิ่งดี: วิ่งเยอะ-จ่ายน้อย)",
            template="plotly_white"
        )
        # Add average line
        fig.add_hline(y=avg_cost, line_dash="dash", annotation_text="Average")
        st.plotly_chart(fig, use_container_width=True)
        
        # Detailed Table with Highlights
        st.dataframe(
            df.style.format({
                "Cost/KM (THB)": "{:.2f}",
                "Km/L": "{:.1f}", 
                "Fuel Cost": "{:,.0f}",
                "Maint Cost": "{:,.0f}",
                "Total Cost": "{:,.0f}",
                "Distance (km)": "{:,.0f}"
            }).background_gradient(subset=["Cost/KM (THB)"], cmap="Reds")
        )
