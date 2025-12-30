
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
from data.repository import repo
from services.job_service import JobService
from services.driver_service import DriverService
from utils.helpers import safe_float, render_metric_card, paginate_dataframe
from config.constants import JobStatus

# Language Labels
LABELS = {
    "th": {
        "title": "📋 ศูนย์ปฏิบัติการ",
        "tab_kanban": "🎯 กระดานงาน",
        "tab_scorecard": "👷 คะแนนคนขับ",
        "tab_analytics": "📊 วิเคราะห์การทำงาน",
        "tab_edit": "📝 แก้ไขงานระหว่างขนส่ง",
        "no_data": "ไม่พบข้อมูลงาน",
        "plan_date": "วันที่วางแผน",
        "show_all": "แสดงทุกวัน",
        "filter_driver": "กรองคนขับ",
        "all_drivers": "คนขับทั้งหมด",
        "no_match": "ไม่พบงานตามเงื่อนไข",
        "edit_job": "แก้ไขงาน",
        "status": "สถานะ",
        "price": "ราคาขาย",
        "reassign": "เปลี่ยนคนขับ",
        "driver_cost": "ค่าคนขับ",
        "save": "บันทึกข้อมูล",
        "cancel": "ยกเลิก",
        "success": "บันทึกเรียบร้อย",
        "failed": "บันทึกไม่สำเร็จ",
        "scorecard_title": "🏆 ใบประเมินพนักงานขับรถ",
        "from_date": "จากวันที่",
        "to_date": "ถึงวันที่",
        "rank_by": "จัดอันดับตาม",
        "rank_opts": {
            "Overall_Score": "คะแนนรวม",
            "OTP_Rate": "อัตราตรงต่อเวลา",
            "Avg_Rating": "คะแนนเฉลี่ย",
            "Total_Jobs": "งานทั้งหมด",
            "Revenue_Generated": "รายได้ที่ทำได้"
        },
        "top_performers": "🥇 พนักงานดีเด่น",
        "full_scorecard": "📊 ตารางคะแนนรวม",
        "driver_detail": "👤 รายละเอียดพนักงาน",
        "sel_driver": "เลือกพนักงาน",
        "analytics_title": "📊 วิเคราะห์การปฏิบัติการ",
        "job_trend": "แนวโน้มงานรายวัน",
        "status_dist": "สัดส่วนสถานะงาน",
        "no_change": "- ไม่เปลี่ยนแปลง -",
        "edit_active_title": "📝 แก้ไขข้อมูลงานที่กำลังดำเนินการ",
        "sel_active_job": "เลือกงานที่ต้องการแก้ไข",
        "dest": "ปลายทาง",
        "charge_labor": "ค่าแรง (เพิ่มเติม)",
        "remark": "หมายเหตุ",
        "current_val": "ค่าปัจจุบัน",
        "edit_warning": "⚠️ การแก้ไขนี้จะมีผลทันที กรุณาตรวจสอบข้อมูลก่อนบันทึก"
    },
    "en": {
        "title": "📋 Smart Operations Center",
        "tab_kanban": "🎯 Kanban Board",
        "tab_scorecard": "👷 Driver Scorecard",
        "tab_analytics": "📊 Operations Analytics",
        "tab_edit": "📝 Edit Active Jobs",
        "no_data": "No job data available",
        "plan_date": "Plan Date",
        "show_all": "Show All Dates",
        "filter_driver": "Filter Driver",
        "all_drivers": "All Drivers",
        "no_match": "No jobs match filters",
        "edit_job": "Edit Job",
        "status": "Status",
        "price": "Price",
        "reassign": "Reassign Driver",
        "driver_cost": "Driver Cost",
        "save": "Save Changes",
        "cancel": "Cancel",
        "success": "Updated successfully",
        "failed": "Update failed",
        "scorecard_title": "🏆 Driver Performance Scorecard",
        "from_date": "From",
        "to_date": "To",
        "rank_by": "Rank By",
        "rank_opts": {
            "Overall_Score": "Overall Score",
            "OTP_Rate": "OTP Rate",
            "Avg_Rating": "Avg Rating",
            "Total_Jobs": "Total Jobs",
            "Revenue_Generated": "Revenue Generated"
        },
        "top_performers": "🥇 Top Performers",
        "full_scorecard": "📊 Full Scorecard",
        "driver_detail": "👤 Driver Detail",
        "sel_driver": "Select Driver",
        "analytics_title": "📊 Operations Analytics",
        "job_trend": "Daily Job Trend",
        "status_dist": "Job Status Distribution",
        "no_change": "- No Change -",
        "edit_active_title": "📝 Edit Active Job Details",
        "sel_active_job": "Select Active Job",
        "dest": "Destination",
        "charge_labor": "Extra Labor Cost",
        "remark": "Remark/Note",
        "current_val": "Current Value",
        "edit_warning": "⚠️ Changes apply immediately. Verify before saving."
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)


def render_monitoring_view():
    st.markdown(f"### {get_label('title')}")
    
    # ============================================================
    # 🔧 Optimized: Load data ONCE at parent level
    # ============================================================
    if 'monitoring_data' not in st.session_state or st.session_state.get('monitoring_data_stale', True):
        st.session_state.monitoring_data = {
            'jobs': repo.get_data("Jobs_Main"),  # Already limited to 60 days
            'drivers': repo.get_data("Master_Drivers")
        }
        st.session_state.monitoring_data_stale = False
    
    shared_jobs = st.session_state.monitoring_data['jobs']
    shared_drivers = st.session_state.monitoring_data['drivers']
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        get_label('tab_kanban'), 
        get_label('tab_scorecard'), 
        get_label('tab_analytics'),
        get_label('tab_edit'),
        "💬 ศูนย์สื่อสาร"
    ])
    
    with tab1:
        _render_kanban(shared_jobs, shared_drivers)
    with tab2:
        _render_driver_scorecard(shared_jobs, shared_drivers)
    with tab3:
        _render_operations_analytics(shared_jobs)
    with tab4:
        _render_edit_active_jobs(shared_jobs)
    with tab5:
        _render_communication_hub(shared_drivers)


def _render_kanban(jobs=None, drivers=None):
    """Kanban board with unified status codes."""
    # Use passed data or fetch if not provided
    if jobs is None:
        jobs = repo.get_data("Jobs_Main")
    if drivers is None:
        drivers = repo.get_data("Master_Drivers")
    
    # Filters
    col_f1, col_f2, col_f3 = st.columns([1, 1, 2])
    with col_f1:
        filter_date = st.date_input(get_label('plan_date'), datetime.now(), key="kanban_date")
    with col_f2:
        show_all = st.checkbox(get_label('show_all'), value=False)
    with col_f3:
        all_d_label = get_label('all_drivers')
        driver_opts = [all_d_label] + sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else [all_d_label]
        filter_driver = st.selectbox(get_label('filter_driver'), driver_opts, key="kanban_driver")
    
    if jobs.empty:
        st.info(get_label('no_data'))
        return

    # ✅ Normalize Statuses (Fix case sensitivity issues)
    jobs['Job_Status'] = jobs['Job_Status'].replace({
        'Assigned': JobStatus.ASSIGNED,
        'In Transit': JobStatus.IN_TRANSIT,
        'Arrived': JobStatus.ARRIVED,
        'Delivered': JobStatus.DELIVERED,
        'new': JobStatus.NEW
    })
    
    # Apply filters
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    
    if not show_all:
        filtered = jobs[jobs['Plan_Date'].dt.date == filter_date].copy()
    else:
        filtered = jobs.copy()
    
    if filter_driver != all_d_label:
        filtered = filtered[filtered['Driver_Name'] == filter_driver]
    
    if filtered.empty:
        st.info(get_label('no_match'))
        return
    
    # Summary metrics
    st.markdown("---")
    cols = st.columns(len(JobStatus.KANBAN_ORDER))
    for i, status in enumerate(JobStatus.KANBAN_ORDER):
        status_label = JobStatus.LABELS_TH.get(status, status)
        try:
             count = len(filtered[filtered['Job_Status'] == status])
        except:
             count = 0
        cols[i].metric(status_label, count)
    
    # Kanban Board (HTML Structure)
    st.markdown("---")
    
    # Start Kanban Board Container
    board_html = '<div class="tms-kanban-board">'
    
    # Status Mapping for Colors/Badges
    status_config = {
        JobStatus.NEW: {'label': 'NEW', 'badge': 'status-new'},
        JobStatus.ASSIGNED: {'label': 'ASSIGNED', 'badge': 'status-assigned'},
        JobStatus.IN_TRANSIT: {'label': 'IN TRANSIT', 'badge': 'status-transit'},
        JobStatus.ARRIVED: {'label': 'ARRIVED', 'badge': 'status-transit'}, # Map to transit for now
        JobStatus.DELIVERED: {'label': 'DELIVERED', 'badge': 'status-done'}
    }

    for status in JobStatus.KANBAN_ORDER:
        status_jobs = filtered[filtered['Job_Status'] == status]
        count = len(status_jobs)
        
        # Limit to 50 items per column for performance
        display_limit = 50
        display_jobs = status_jobs.head(display_limit)
        
        config = status_config.get(status, {'label': status, 'badge': 'status-new'})
        
        # Column Header (Minified)
        board_html += f'<div class="tms-kanban-column"><div class="tms-kanban-column-header"><div class="tms-kanban-column-title"><h3>{config["label"]}</h3></div><span class="tms-kanban-column-count">{count}</span></div><div class="tms-kanban-column-body">'
        
        # Cards
        if status_jobs.empty:
             board_html += '<div style="color:#aaa; font-style:italic; padding:10px;">No jobs</div>'
        else:
            for _, job in display_jobs.iterrows():
                jid = job.get('Job_ID', 'N/A')
                cust = str(job.get('Customer_Name', ''))[:20]
                dest = str(job.get('Dest_Location', ''))[:20] or "No Destination"
                plate = str(job.get('Vehicle_Plate', '-'))
                driver = str(job.get('Driver_Name', 'Unassigned'))[:15]
                date_str = str(job.get('Plan_Date', ''))[:10]
                driver_initial = driver[:2].upper() if driver else "??"
                
                # Card HTML (Minified)
                badge_class = config['badge']
                board_html += f'<div class="tms-kanban-card"><div class="tms-kanban-card-header"><span class="tms-kanban-card-id">{jid}</span><span class="status-badge {badge_class}">{status}</span></div><h4 class="tms-kanban-card-title">{cust}</h4><div class="tms-kanban-card-route"><span class="tms-kanban-card-route-icon">📍</span> {dest}</div><div class="tms-kanban-card-meta"><div class="tms-kanban-card-driver"><div class="tms-kanban-card-driver-avatar">{driver_initial}</div><span class="tms-kanban-card-driver-name">{driver}</span></div><span class="tms-kanban-card-time">📅 {date_str}</span></div></div>'
            
            # Show "More" indicator if truncated
            if len(status_jobs) > len(display_jobs):
                diff = len(status_jobs) - len(display_jobs)
                board_html += f'<div style="text-align:center; padding:8px; color:#888; font-size:12px;">... and {diff} more jobs ...</div>'
        
        board_html += "</div></div>" # Close cards and column

    board_html += "</div>" # Close board
    st.markdown(board_html, unsafe_allow_html=True)
    
    # Note: Edit functionality requires Streamlit buttons. 
    # With pure HTML structure, we lose direct button interactivity inside the scrollable div easily.
    # We will provide a standard "Quick Edit" selector below the board or maintain the hybrid approach if critical.
    # For this Request, we prioritize the v0 Design EXACTLY.
    st.info("💡 To edit a job, use the 'Quick Edit' panel below (Select Job ID).")
    
    # Quick Edit Panel (Restored for functionality)
    with st.expander("✏️ Quick Edit Job", expanded=False):
        all_jobs_list = filtered['Job_ID'].tolist()
        if all_jobs_list:
            sel_edit = st.selectbox("Select Job to Edit", all_jobs_list)
            if st.button("Load Job Data"):
                 job_edit = filtered[filtered['Job_ID'] == sel_edit].iloc[0]
                 st.session_state.edit_job_id = sel_edit
                 st.session_state.edit_job_data = job_edit.to_dict()
                 st.rerun()

def _render_edit_active_jobs(jobs=None):
    """Full edit tab for active jobs."""
    st.markdown(f"#### {get_label('edit_active_title')}")
    st.warning(get_label('edit_warning'))
    
    # Use passed data or fetch if not provided
    if jobs is None:
        jobs = repo.get_data("Jobs_Main")
    if jobs.empty:
        st.info(get_label('no_data'))
        return
        
    # Filter only active (Not Completed/Cancelled)
    active_jobs = jobs[~jobs['Job_Status'].isin(['Completed', 'Cancelled', 'Confirmed'])]
    
    if active_jobs.empty:
        st.info("No active jobs to edit.")
        return
        
    # Job Selector
    job_opts = active_jobs['Job_ID'].tolist()
    # Create label map
    job_labels = {
        jid: f"{jid} - {row['Customer_Name']} ({row['Job_Status']})" 
        for jid, row in active_jobs.set_index('Job_ID').iterrows()
    }
    
    sel_job_id = st.selectbox(
        get_label('sel_active_job'), 
        job_opts, 
        format_func=lambda x: job_labels.get(x, x),
        key="active_edit_sel"
    )
    
    if sel_job_id:
        job_row = active_jobs[active_jobs['Job_ID'] == sel_job_id].iloc[0]
        
        with st.form("edit_active_job_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                st.info(f"📍 {get_label('current_val')}: {job_row.get('Dest_Location', '-')}")
                new_dest = st.text_input(f"📍 {get_label('dest')}", value=job_row.get('Dest_Location', ''))
                
                # Check Plan_Date type
                pd_val = job_row.get('Plan_Date')
                try:
                    if isinstance(pd_val, str):
                        pd_date = datetime.strptime(pd_val, "%Y-%m-%d").date()
                    elif isinstance(pd_val, datetime) or isinstance(pd_val, pd.Timestamp):
                        pd_date = pd_val.date()
                    else:
                        pd_date = datetime.now().date()
                except:
                    pd_date = datetime.now().date()
                    
                new_date = st.date_input(f"📅 {get_label('plan_date')}", value=pd_date)

            with col2:
                curr_labor = safe_float(job_row.get('Cost_Driver_Labor', 0))
                new_labor = st.number_input(f"👷 {get_label('charge_labor')}", value=curr_labor)
                
                new_remark = st.text_area(f"📝 {get_label('remark')}", value=job_row.get('Remark', ''))
                
            submitted = st.form_submit_button(f"💾 {get_label('save')}", type="primary")
            
            if submitted:
                # Update Logic
                jobs.loc[jobs['Job_ID'] == sel_job_id, 'Dest_Location'] = new_dest
                jobs.loc[jobs['Job_ID'] == sel_job_id, 'Plan_Date'] = str(new_date)
                jobs.loc[jobs['Job_ID'] == sel_job_id, 'Cost_Driver_Labor'] = new_labor
                jobs.loc[jobs['Job_ID'] == sel_job_id, 'Remark'] = new_remark
                
                # Recalculate total cost if labor changed
                base = safe_float(jobs.loc[jobs['Job_ID'] == sel_job_id, 'Cost_Driver_Base'].iloc[0])
                extra = safe_float(jobs.loc[jobs['Job_ID'] == sel_job_id, 'Cost_Driver_Extra'].iloc[0])
                # ... assume total = base + extra + labor + others
                # Simplified update
                total = base + extra + new_labor # + others ignored for simplicity or need check
                jobs.loc[jobs['Job_ID'] == sel_job_id, 'Cost_Driver_Total'] = total
                
                if repo.update_data("Jobs_Main", jobs):
                    st.success(get_label('success'))
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error(get_label('failed'))

def _render_edit_modal():
    """Edit job modal."""
    jid = st.session_state.edit_job_id
    job_data = st.session_state.get('edit_job_data', {})
    
    st.markdown(f"#### ✏️ {get_label('edit_job')}: {jid}")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Check index for selectbox
        status_list = JobStatus.ALL
        curr_status = job_data.get('Job_Status', JobStatus.NEW)
        try:
            s_index = status_list.index(curr_status)
        except ValueError:
            s_index = 0

        new_status = st.selectbox(
            get_label('status'), 
            status_list,
            index=s_index,
            key="edit_status"
        )
        
        new_price = st.number_input(
            get_label('price'), 
            value=safe_float(job_data.get('Price_Cust_Total', 0)),
            key="edit_price"
        )
    
    with col2:
        drivers = repo.get_data("Master_Drivers")
        no_change = get_label('no_change')
        driver_opts = [no_change] + sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else [no_change]
        new_driver = st.selectbox(get_label('reassign'), driver_opts, key="edit_driver")
        
        new_cost = st.number_input(
            get_label('driver_cost'),
            value=safe_float(job_data.get('Cost_Driver_Total', 0)),
            key="edit_cost"
        )
    
    col_b1, col_b2 = st.columns(2)
    
    with col_b1:
        if st.button(f"💾 {get_label('save')}", type="primary"):
            update_kwargs = {
                'Price_Cust_Total': new_price,
                'Cost_Driver_Total': new_cost
            }
            
            if new_driver != no_change:
                driver_row = drivers[drivers['Driver_Name'] == new_driver].iloc[0]
                update_kwargs['Driver_ID'] = driver_row['Driver_ID']
                update_kwargs['Driver_Name'] = new_driver
                update_kwargs['Vehicle_Plate'] = driver_row.get('Vehicle_Plate', '')
            
            if JobService.update_job_status(jid, new_status, **update_kwargs):
                st.success(f"✅ {get_label('success')}")
                del st.session_state.edit_job_id
                if 'edit_job_data' in st.session_state:
                    del st.session_state.edit_job_data
                st.rerun()
            else:
                st.error(f"❌ {get_label('failed')}")
    
    with col_b2:
        if st.button(f"❌ {get_label('cancel')}"):
            del st.session_state.edit_job_id
            if 'edit_job_data' in st.session_state:
                del st.session_state.edit_job_data
            st.rerun()

def _render_driver_scorecard(jobs=None, drivers=None):
    """Driver performance scorecard."""
    st.markdown(f"#### {get_label('scorecard_title')}")
    
    lang = st.session_state.get("lang", "th")
    
    # Date filter
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        start = st.date_input(get_label('from_date'), datetime.now().replace(day=1), key="sc_start")
    with col2:
        end = st.date_input(get_label('to_date'), datetime.now(), key="sc_end")
    with col3:
        rank_opts = LABELS[lang]['rank_opts']
        rank_keys = list(rank_opts.keys())
        rank_labels = list(rank_opts.values())
        
        sel_label = st.selectbox(get_label('rank_by'), rank_labels, key="sc_metric")
        metric = rank_keys[rank_labels.index(sel_label)]
    
    # Get scorecard
    scorecard = DriverService.get_driver_scorecard(start_date=start, end_date=end)
    
    if scorecard.empty:
        st.info(get_label('no_data'))
        return
    
    # Sort by selected metric
    if metric in scorecard.columns:
        scorecard = scorecard.sort_values(metric, ascending=False)
    
    # Top 3 podium
    st.markdown("---")
    st.markdown(f"##### {get_label('top_performers')}")

    top3 = scorecard.head(3)
    podium_cols = st.columns(3)
    medals = ["🥇", "🥈", "🥉"]

    for i, (_, driver) in enumerate(top3.iterrows()):
        if i < len(podium_cols):
            with podium_cols[i]:
                from utils.helpers import render_metric_card # Local import safety
                st.markdown(f"### {medals[i]}")
                st.markdown(f"**{driver['Driver_Name']}**")
                st.markdown(render_metric_card("Score", f"{driver['Overall_Score']:.0f}/100", icon="🏆", accent_color="accent-gold"), unsafe_allow_html=True)
                st.caption(f"Jobs: {driver['Total_Jobs']} | OTP: {driver['OTP_Rate']:.0f}%")

    # Full scorecard table
    st.markdown("---")
    st.markdown(f"##### {get_label('full_scorecard')}")

    display_df = scorecard[[
        'Driver_Name', 'Vehicle_Plate', 'Total_Jobs', 'Completed_Jobs',
        'OTP_Rate', 'Avg_Rating', 'Overall_Score'
    ]].copy()

    display_df['Avg_Rating'] = display_df['Avg_Rating'].apply(lambda x: f"⭐ {x:.1f}")
    display_df['OTP_Rate'] = display_df['OTP_Rate'].apply(lambda x: f"{x:.0f}%")
    display_df['Overall_Score'] = display_df['Overall_Score'].apply(lambda x: f"{x:.0f}")
    
    # Rename columns for display
    if lang == "th":
        display_df.columns = ["ชื่อพนักงาน", "ทะเบียน", "งานทั้งหมด", "งานเสร็จ", "ตรงเวลา", "เรตติ้ง", "คะแนนรวม"]
    
    st.dataframe(display_df, hide_index=True, use_container_width=True)
    
    # Individual driver detail
    st.markdown("---")
    st.markdown(f"##### {get_label('driver_detail')}")
    
    driver_opts = scorecard['Driver_ID'].tolist()
    driver_names = scorecard.set_index('Driver_ID')['Driver_Name'].to_dict()
    
    sel_driver = st.selectbox(
        get_label('sel_driver'),
        driver_opts,
        format_func=lambda x: driver_names.get(x, x),
        key="sc_driver_detail"
    )
    
    if sel_driver:
        driver_data = scorecard[scorecard['Driver_ID'] == sel_driver].iloc[0]
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown(f"**{driver_data['Driver_Name']}**")
            st.write(f"Plate: {driver_data['Vehicle_Plate']}")
            
        with col2:
            st.metric("Total Jobs", driver_data['Total_Jobs'])

def _render_operations_analytics(jobs=None):
    """Operations analytics."""
    st.markdown(f"#### {get_label('analytics_title')}")
    
    if jobs is None:
        jobs = repo.get_data("Jobs_Main")
    if jobs.empty:
        st.info(get_label('no_data'))
        return
        
    jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
    
    # Daily Trend
    daily_jobs = jobs.groupby(jobs['Plan_Date'].dt.date).size().reset_index(name='Count')
    fig = px.bar(daily_jobs, x='Plan_Date', y='Count', title=get_label('job_trend'))
    st.plotly_chart(fig, use_container_width=True)
    
    # Status Distribution
    status_dist = jobs['Job_Status'].value_counts().reset_index()
    status_dist.columns = ['Status', 'Count']
    fig2 = px.pie(status_dist, values='Count', names='Status', title=get_label('status_dist'))
    st.plotly_chart(fig2, use_container_width=True)

def _render_edit_active_jobs(jobs=None):
    """Edit active jobs."""
    st.markdown(f"#### {get_label('edit_active_title')}")
    
    if jobs is None:
        jobs = repo.get_data("Jobs_Main")

    # Filter for active jobs only
    active_statuses = [JobStatus.ASSIGNED, JobStatus.IN_TRANSIT, JobStatus.ARRIVED, "Assigned (Sub)"]
    active_jobs = jobs[jobs['Job_Status'].isin(active_statuses)].copy()
    
    if active_jobs.empty:
        st.info(get_label('no_data'))
        return
        
    # Search/Filter
    search = st.text_input(get_label('sel_active_job'), placeholder="Job ID / Customer", key="edit_search")
    if search:
        active_jobs = active_jobs[
            active_jobs['Job_ID'].str.contains(search, case=False, na=False) | 
            active_jobs['Customer_Name'].str.contains(search, case=False, na=False)
        ]
    
    # Pagination
    paginated_jobs, total_pages, current_page = paginate_dataframe(active_jobs, page_size=10, key="edit_active_jobs")
    
    # Display as editable cards
    for idx, job in paginated_jobs.iterrows():
        with st.expander(f"📝 {job['Job_ID']} - {job['Customer_Name']} ({job['Job_Status']})"):
            with st.form(key=f"form_edit_{job['Job_ID']}"):
                c1, c2 = st.columns(2)
                with c1:
                    new_dest = st.text_input(get_label('dest'), value=job.get('Dest_Location', ''))
                    new_remark = st.text_input(get_label('remark'), value=job.get('Remark', ''))
                with c2:
                    st.info(f"{get_label('current_val')}: {job.get('Price_Cust_Total', 0)}")
                    # extra_labor = st.number_input(get_label('charge_labor'), min_value=0.0, step=100.0)
                
                st.warning(get_label('edit_warning'))
                
                if st.form_submit_button(get_label('save'), type="primary"):
                    repo.update_field("Jobs_Main", "Job_ID", job['Job_ID'], "Dest_Location", new_dest)
                    repo.update_field("Jobs_Main", "Job_ID", job['Job_ID'], "Remark", new_remark)
                    st.success(get_label('success'))
                    st.rerun()


def _render_communication_hub(drivers):
    """Unified Communication Hub: Chat & Broadcast."""
    st.markdown("### 🗣️ ศูนย์สื่อสาร (Communication Hub)")
    
    # Check services
    try:
        from services.notification_service import NotificationService
        from services.chat_service import ChatService
    except ImportError:
        st.error("❌ Service Missing")
        return

    tab_chat, tab_broadcast = st.tabs(["💬 แชท (Live Chat)", "📢 ประกาศ (Broadcast)"])

    # ---------------------------------------------------------
    # TAB 1: LIVE CHAT
    # ---------------------------------------------------------
    with tab_chat:
        c1, c2 = st.columns([1, 2])
        
        with c1:
            st.markdown("##### 👥 รายชื่อคนขับ")
            driver_list = sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else []
            
            # Select Driver
            if 'chat_target' not in st.session_state:
                st.session_state.chat_target = None
                
            for d in driver_list:
                # Mock unread indicator (In real app, fetch from DB)
                lbl = f"👤 {d}"
                if st.button(lbl, key=f"sel_chat_{d}", use_container_width=True):
                    st.session_state.chat_target = d
        
        with c2:
            target = st.session_state.get('chat_target')
            if not target:
                st.info("👈 กรุณาเลือกคนขับเพื่อเริ่มแชท")
            else:
                st.markdown(f"#### 💬 แชทกับ: **{target}**")
                
                # Chat History Container
                chat_container = st.container(height=400)
                
                # Load Messages
                msgs = ChatService.get_messages("ADMIN", target)
                
                with chat_container:
                    if msgs.empty:
                        st.write("*(ยังไม่มีข้อความ)*")
                    else:
                        for _, row in msgs.iterrows():
                            is_me = row['Sender_ID'] == "ADMIN"
                            with st.chat_message("user" if is_me else "assistant", avatar="🧑‍💼" if is_me else "🚚"):
                                st.write(row['Message_Body'])
                                ts = row['Timestamp'].strftime('%H:%M')
                                st.caption(f"{ts}")

                # Input
                prompt = st.chat_input(f"ส่งข้อความหา {target}...")
                if prompt:
                    if ChatService.send_message("ADMIN", target, prompt):
                        st.rerun()
                    else:
                        st.error("ส่งไม่สำเร็จ")

    # ---------------------------------------------------------
    # TAB 2: BROADCAST (Existing Logic)
    # ---------------------------------------------------------
    with tab_broadcast:
        st.info("ℹ️ ใช้สำหรับส่งประกาศ, แจ้งเตือนซ่อมบำรุง, หรือข้อความด่วนหาคนขับ (ผ่าน App Notification)")
        
        n_type = st.radio("ประเภทการส่ง", ["รายบุคคล (Single)", "ทุกคน (Broadcast)"], horizontal=True)
        
        target_drivers = []
        if n_type == "รายบุคคล (Single)":
            driver_opts = sorted(drivers['Driver_Name'].dropna().unique().tolist()) if not drivers.empty else []
            selected_driver = st.selectbox("เลือกคนขับ", ["- เลือก -"] + driver_opts, key="brd_driver")
            if selected_driver != "- เลือก -":
                target_drivers = [selected_driver]
        else:
            st.warning("⚠️ คำเตือน: ข้อความจะถูกส่งหาคนขับทุกคนที่มี App")
            target_drivers = ["ALL"]

        notif_title = st.text_input("หัวข้อ (Title)", "📢 ประกาศจากบริษัท", key="brd_title")
        notif_body = st.text_area("ข้อความ (Body)", "กรุณาตรวจสอบ...", key="brd_body")

        if st.button("🚀 ส่งข้อความ (Send Push)", type="primary", key="brd_send"):
            if not notif_body:
                st.error("กรุณาระบุข้อความ")
            else:
                success = 0
                if n_type == "ทุกคน (Broadcast)":
                    success = NotificationService.broadcast_announcement(notif_title, notif_body)
                    st.success(f"✅ ส่งสำเร็จ {success} ราย")
                else:
                    for d_name in target_drivers:
                         if NotificationService.send_push_to_driver(d_name, notif_title, notif_body):
                             st.success(f"✅ ส่งหา {d_name} สำเร็จ!")
                         else:
                             st.error(f"❌ ส่งไม่สำเร็จ")
