"""
Calendar View - Job Scheduling Calendar
ปฏิทินงานขนส่ง
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import calendar
from data.repository import repo
from config.constants import JobStatus

# Language labels
LABELS = {
    "th": {
        "title": "📅 ปฏิทินงาน",
        "subtitle": "ดูงานในรูปแบบปฏิทิน",
        "view_weekly": "รายสัปดาห์",
        "view_monthly": "รายเดือน",
        "today": "วันนี้",
        "prev": "◀ ก่อนหน้า",
        "next": "ถัดไป ▶",
        "jobs": "งาน",
        "no_jobs": "ไม่มีงาน",
        "days": ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."],
        "months": ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", 
                   "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
    },
    "en": {
        "title": "📅 Job Calendar",
        "subtitle": "View jobs in calendar format",
        "view_weekly": "Weekly",
        "view_monthly": "Monthly",
        "today": "Today",
        "prev": "◀ Previous",
        "next": "Next ▶",
        "jobs": "jobs",
        "no_jobs": "No jobs",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_calendar_view():
    lang = st.session_state.get("lang", "th")
    
    st.markdown(f"### {get_label('title')}")
    st.caption(get_label('subtitle'))
    
    # Initialize calendar state
    if 'cal_date' not in st.session_state:
        st.session_state.cal_date = datetime.now()
    
    # View toggle
    col1, col2, col3, col4, col5 = st.columns([1, 1, 2, 1, 1])
    
    with col1:
        if st.button(get_label('prev'), use_container_width=True, key="cal_prev"):
            st.session_state.cal_date -= timedelta(days=7)
            st.rerun()
    
    with col2:
        if st.button(get_label('today'), use_container_width=True, key="cal_today"):
            st.session_state.cal_date = datetime.now()
            st.rerun()
    
    with col3:
        view_mode = st.radio(
            "View", 
            [get_label('view_weekly'), get_label('view_monthly')],
            horizontal=True,
            key="cal_view_mode",
            label_visibility="collapsed"
        )
    
    with col4:
        if st.button(get_label('next'), use_container_width=True, key="cal_next"):
            st.session_state.cal_date += timedelta(days=7)
            st.rerun()
    
    with col5:
        # Driver filter
        drivers = repo.get_data("Master_Drivers")
        driver_opts = ["ทั้งหมด" if lang == "th" else "All"] + sorted(
            drivers['Driver_Name'].dropna().unique().tolist() if not drivers.empty else []
        )
        selected_driver = st.selectbox("Driver", driver_opts, key="cal_driver", label_visibility="collapsed")
    
    st.markdown("---")
    
    # Get jobs data
    jobs = repo.get_data("Jobs_Main")
    
    if not jobs.empty:
        jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        
        # Filter by driver if selected
        if selected_driver not in ["ทั้งหมด", "All"]:
            jobs = jobs[jobs['Driver_Name'] == selected_driver]
    
    # Render calendar
    if view_mode == get_label('view_weekly'):
        _render_weekly_view(jobs, lang)
    else:
        _render_monthly_view(jobs, lang)

def _render_weekly_view(jobs, lang):
    """Render weekly calendar view."""
    current_date = st.session_state.cal_date
    
    # Get start of week (Monday)
    start_of_week = current_date - timedelta(days=current_date.weekday())
    
    # Week header
    days = get_label('days')
    
    # Create columns for each day
    cols = st.columns(7)
    
    for i, col in enumerate(cols):
        day_date = start_of_week + timedelta(days=i)
        is_today = day_date.date() == datetime.now().date()
        
        with col:
            # Day header
            header_style = "background: #d32f2f; color: white;" if is_today else "background: #1a237e; color: white;"
            st.markdown(f"""
            <div style="{header_style} padding: 0.5rem; border-radius: 8px 8px 0 0; text-align: center;">
                <b>{days[i]}</b><br>
                <span style="font-size: 1.2rem;">{day_date.day}</span>
            </div>
            """, unsafe_allow_html=True)
            
            # Jobs for this day
            if not jobs.empty:
                day_jobs = jobs[jobs['Plan_Date'].dt.date == day_date.date()]
                
                if not day_jobs.empty:
                    for _, job in day_jobs.head(5).iterrows():  # Limit to 5 jobs
                        status = job.get('Job_Status', 'New')
                        color = JobStatus.COLORS.get(status, '#gray')
                        
                        st.markdown(f"""
                        <div style="background: {color}; color: white; padding: 0.3rem 0.5rem; 
                                    border-radius: 4px; margin: 0.2rem 0; font-size: 0.75rem;">
                            <b>{job.get('Job_ID', '')[:8]}</b><br>
                            {str(job.get('Customer_Name', ''))[:10]}
                        </div>
                        """, unsafe_allow_html=True)
                    
                    if len(day_jobs) > 5:
                        st.caption(f"+{len(day_jobs) - 5} more")
                else:
                    st.markdown(f"""
                    <div style="color: #999; padding: 1rem; text-align: center; font-size: 0.8rem;">
                        {get_label('no_jobs')}
                    </div>
                    """, unsafe_allow_html=True)
    
    # Week summary
    st.markdown("---")
    
    if not jobs.empty:
        week_end = start_of_week + timedelta(days=6)
        week_jobs = jobs[
            (jobs['Plan_Date'].dt.date >= start_of_week.date()) & 
            (jobs['Plan_Date'].dt.date <= week_end.date())
        ]
        
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("📦 " + ("งานทั้งหมด" if lang == "th" else "Total Jobs"), len(week_jobs))
        
        completed = len(week_jobs[week_jobs['Job_Status'] == JobStatus.COMPLETED])
        col2.metric("✅ " + ("เสร็จ" if lang == "th" else "Completed"), completed)
        
        in_progress = len(week_jobs[week_jobs['Job_Status'].isin([JobStatus.IN_TRANSIT, JobStatus.ASSIGNED])])
        col3.metric("🚛 " + ("กำลังดำเนินการ" if lang == "th" else "In Progress"), in_progress)
        
        pending = len(week_jobs[week_jobs['Job_Status'] == JobStatus.NEW])
        col4.metric("⏳ " + ("รอดำเนินการ" if lang == "th" else "Pending"), pending)

def _render_monthly_view(jobs, lang):
    """Render monthly calendar view."""
    current_date = st.session_state.cal_date
    year = current_date.year
    month = current_date.month
    
    months = get_label('months')
    days = get_label('days')
    
    # Month header
    st.markdown(f"""
    <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #1a237e, #283593);
                color: white; border-radius: 10px; margin-bottom: 1rem;">
        <h2 style="margin: 0;">{months[month-1]} {year}</h2>
    </div>
    """, unsafe_allow_html=True)
    
    # Calendar grid
    cal = calendar.monthcalendar(year, month)
    
    # Day headers
    header_cols = st.columns(7)
    for i, col in enumerate(header_cols):
        with col:
            st.markdown(f"""
            <div style="background: #f5f7fa; padding: 0.5rem; text-align: center; 
                        font-weight: bold; border-radius: 5px;">
                {days[i]}
            </div>
            """, unsafe_allow_html=True)
    
    # Calendar rows
    for week in cal:
        cols = st.columns(7)
        
        for i, day in enumerate(week):
            with cols[i]:
                if day == 0:
                    st.markdown("<div style='height: 80px;'></div>", unsafe_allow_html=True)
                else:
                    day_date = datetime(year, month, day).date()
                    is_today = day_date == datetime.now().date()
                    
                    # Get jobs for this day
                    job_count = 0
                    job_color = "#1a237e"
                    if not jobs.empty:
                        day_jobs = jobs[jobs['Plan_Date'].dt.date == day_date]
                        job_count = len(day_jobs)
                    
                    border_style = "border: 2px solid #d32f2f;" if is_today else "border: 1px solid #e0e0e0;"
                    bg_color = "#fff3e0" if is_today else "white"
                    
                    st.markdown(f"""
                    <div style="background: {bg_color}; {border_style} padding: 0.3rem; 
                                border-radius: 5px; height: 80px; overflow: hidden;">
                        <div style="font-weight: bold; color: {'#d32f2f' if is_today else '#333'};">
                            {day}
                        </div>
                        {f'<div style="background: {job_color}; color: white; font-size: 0.7rem; padding: 0.2rem; border-radius: 3px; margin-top: 0.2rem;">{job_count} {get_label("jobs")}</div>' if job_count > 0 else ''}
                    </div>
                    """, unsafe_allow_html=True)
    
    # Month summary
    st.markdown("---")
    
    if not jobs.empty:
        month_jobs = jobs[
            (jobs['Plan_Date'].dt.year == year) & 
            (jobs['Plan_Date'].dt.month == month)
        ]
        
        from utils.helpers import render_metric_card
        col1, col2, col3, col4 = st.columns(4)
        with col1: st.markdown(render_metric_card("📦 " + ("งานทั้งหมด" if lang == "th" else "Total Jobs"), f"{len(month_jobs)}", icon="📦"), unsafe_allow_html=True)
        
        revenue = month_jobs['Price_Cust_Total'].apply(safe_float).sum()
        with col2: st.markdown(render_metric_card("💰 " + ("รายได้" if lang == "th" else "Revenue"), f"฿{revenue:,.0f}", icon="💰", accent_color="accent-blue"), unsafe_allow_html=True)
        
        avg_jobs = len(month_jobs) / 30 if len(month_jobs) > 0 else 0
        with col3: st.markdown(render_metric_card("📊 " + ("เฉลี่ย/วัน" if lang == "th" else "Avg/Day"), f"{avg_jobs:.1f}", icon="📅"), unsafe_allow_html=True)
        
        completed = len(month_jobs[month_jobs['Job_Status'] == JobStatus.COMPLETED])
        rate = (completed / len(month_jobs) * 100) if len(month_jobs) > 0 else 0
        with col4: st.markdown(render_metric_card("✅ " + ("อัตราสำเร็จ" if lang == "th" else "Success Rate"), f"{rate:.0f}%", icon="✅", accent_color="accent-green"), unsafe_allow_html=True)
