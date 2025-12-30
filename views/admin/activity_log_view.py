"""
Activity Log View - Audit Trail
ประวัติการใช้งานระบบ
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from data.repository import repo

# Language labels
LABELS = {
    "th": {
        "title": "📋 ประวัติการใช้งาน",
        "subtitle": "ตรวจสอบการทำงานของผู้ใช้ในระบบ",
        "user_filter": "กรองตามผู้ใช้",
        "action_filter": "กรองตามการกระทำ",
        "date_filter": "ช่วงวันที่",
        "all_users": "ทุกคน",
        "all_actions": "ทั้งหมด",
        "export": "ส่งออก",
        "no_logs": "ไม่มีประวัติการใช้งาน",
        "recent": "กิจกรรมล่าสุด",
        "actions": {
            "LOGIN": "เข้าสู่ระบบ",
            "LOGOUT": "ออกจากระบบ",
            "CREATE_JOB": "สร้างงาน",
            "UPDATE_JOB": "แก้ไขงาน",
            "DELETE_JOB": "ลบงาน",
            "UPDATE_STATUS": "อัพเดทสถานะ",
            "CREATE_INVOICE": "สร้างใบแจ้งหนี้",
            "PAYMENT": "บันทึกการชำระ",
            "FUEL_LOG": "บันทึกน้ำมัน",
            "MAINTENANCE": "บันทึกซ่อมบำรุง",
            "MASTER_UPDATE": "อัพเดทข้อมูลหลัก",
        }
    },
    "en": {
        "title": "📋 Activity Log",
        "subtitle": "Track user activities in the system",
        "user_filter": "Filter by User",
        "action_filter": "Filter by Action",
        "date_filter": "Date Range",
        "all_users": "All Users",
        "all_actions": "All Actions",
        "export": "Export",
        "no_logs": "No activity logs",
        "recent": "Recent Activity",
        "actions": {
            "LOGIN": "Login",
            "LOGOUT": "Logout",
            "CREATE_JOB": "Create Job",
            "UPDATE_JOB": "Update Job",
            "DELETE_JOB": "Delete Job",
            "UPDATE_STATUS": "Update Status",
            "CREATE_INVOICE": "Create Invoice",
            "PAYMENT": "Record Payment",
            "FUEL_LOG": "Fuel Log",
            "MAINTENANCE": "Maintenance Log",
            "MASTER_UPDATE": "Master Data Update",
        }
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def log_activity(action: str, details: str = "", ref_id: str = ""):
    """Log an activity to the system."""
    if 'activity_logs' not in st.session_state:
        st.session_state.activity_logs = []
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "user_id": st.session_state.get("user_id", "SYSTEM"),
        "user_name": st.session_state.get("user_name", "System"),
        "action": action,
        "details": details,
        "ref_id": ref_id,
        "ip": "127.0.0.1"  # In production, get real IP
    }
    
    st.session_state.activity_logs.insert(0, log_entry)
    
    # Keep only last 1000 logs in session
    if len(st.session_state.activity_logs) > 1000:
        st.session_state.activity_logs = st.session_state.activity_logs[:1000]
    
    # Also try to save to Supabase if table exists
    try:
        repo.insert_record("System_Logs", log_entry)
    except:
        pass

def render_activity_log_view():
    lang = st.session_state.get("lang", "th")
    
    st.markdown(f"### {get_label('title')}")
    st.caption(get_label('subtitle'))
    
    # Get logs from session and database
    logs = _get_all_logs()
    
    if not logs:
        # Generate sample logs for demo
        logs = _generate_sample_logs()
        st.session_state.activity_logs = logs
    
    # Filters
    col1, col2, col3 = st.columns(3)
    
    with col1:
        users = list(set([log.get('user_name', '') for log in logs if log.get('user_name')]))
        user_opts = [get_label('all_users')] + sorted(users)
        selected_user = st.selectbox(get_label('user_filter'), user_opts, key="log_user")
    
    with col2:
        action_labels = LABELS[lang]['actions']
        action_opts = [get_label('all_actions')] + list(action_labels.values())
        selected_action = st.selectbox(get_label('action_filter'), action_opts, key="log_action")
    
    with col3:
        date_filter = st.date_input(get_label('date_filter'), 
                                    [datetime.now() - timedelta(days=7), datetime.now()],
                                    key="log_dates")
    
    st.markdown("---")
    
    # Filter logs
    filtered = logs.copy()
    
    if selected_user != get_label('all_users'):
        filtered = [l for l in filtered if l.get('user_name') == selected_user]
    
    if selected_action != get_label('all_actions'):
        # Find action key from label
        action_key = None
        for k, v in LABELS[lang]['actions'].items():
            if v == selected_action:
                action_key = k
                break
        if action_key:
            filtered = [l for l in filtered if l.get('action') == action_key]
    
    if len(date_filter) == 2:
        start, end = date_filter
        filtered = [l for l in filtered if _parse_date(l.get('timestamp')) and 
                    start <= _parse_date(l.get('timestamp')).date() <= end]
    
    # Summary stats
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("📊 " + ("บันทึกทั้งหมด" if lang == "th" else "Total Logs"), len(filtered))
    
    unique_users = len(set([l.get('user_name') for l in filtered]))
    col2.metric("👥 " + ("ผู้ใช้ที่ใช้งาน" if lang == "th" else "Active Users"), unique_users)
    
    today_logs = [l for l in filtered if _parse_date(l.get('timestamp')) and 
                  _parse_date(l.get('timestamp')).date() == datetime.now().date()]
    col3.metric("📅 " + ("วันนี้" if lang == "th" else "Today"), len(today_logs))
    
    critical_actions = ['DELETE_JOB', 'MASTER_UPDATE']
    critical = len([l for l in filtered if l.get('action') in critical_actions])
    col4.metric("⚠️ " + ("การกระทำสำคัญ" if lang == "th" else "Critical Actions"), critical)
    
    st.markdown("---")
    
    # Activity timeline
    st.markdown(f"#### {get_label('recent')}")
    
    if not filtered:
        st.info(get_label('no_logs'))
        return
    
    for log in filtered[:50]:  # Show last 50
        timestamp = log.get('timestamp', '')
        user = log.get('user_name', 'Unknown')
        action = log.get('action', '')
        details = log.get('details', '')
        ref_id = log.get('ref_id', '')
        
        # Get action label
        action_label = LABELS[lang]['actions'].get(action, action)
        
        # Action icon & color
        action_icons = {
            'LOGIN': ('🔑', '#4caf50'),
            'LOGOUT': ('🚪', '#9e9e9e'),
            'CREATE_JOB': ('➕', '#2196f3'),
            'UPDATE_JOB': ('✏️', '#ff9800'),
            'DELETE_JOB': ('🗑️', '#f44336'),
            'UPDATE_STATUS': ('🔄', '#9c27b0'),
            'CREATE_INVOICE': ('📄', '#673ab7'),
            'PAYMENT': ('💰', '#4caf50'),
            'FUEL_LOG': ('⛽', '#ff5722'),
            'MAINTENANCE': ('🔧', '#795548'),
            'MASTER_UPDATE': ('📝', '#607d8b'),
        }
        
        icon, color = action_icons.get(action, ('📌', '#666'))
        
        # Format timestamp
        try:
            dt = datetime.fromisoformat(timestamp)
            time_str = dt.strftime("%Y-%m-%d %H:%M")
        except:
            time_str = timestamp
        
        st.markdown(f"""
        <div style="display: flex; align-items: start; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
            <div style="background: {color}; width: 32px; height: 32px; border-radius: 50%; 
                        display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                <span style="color: white; font-size: 0.9rem;">{icon}</span>
            </div>
            <div style="flex: 1;">
                <p style="margin: 0; font-weight: 500; color: {color};">
                    {action_label}
                </p>
                <p style="margin: 0.2rem 0; color: #333;">
                    {details if details else f"โดย {user}" if lang == "th" else f"by {user}"}
                </p>
                <p style="margin: 0; color: #999; font-size: 0.8rem;">
                    ⏰ {time_str} | 👤 {user} {f'| 🔗 {ref_id}' if ref_id else ''}
                </p>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    # Export button
    st.markdown("---")
    if st.button(f"📥 {get_label('export')}", key="export_logs"):
        df = pd.DataFrame(filtered)
        csv = df.to_csv(index=False)
        st.download_button(
            label="Download CSV",
            data=csv,
            file_name=f"activity_log_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )

def _get_all_logs():
    """Get logs from session and database."""
    logs = st.session_state.get('activity_logs', [])
    
    # Try to also get from database
    try:
        db_logs = repo.get_data("System_Logs")
        if not db_logs.empty:
            db_logs_list = db_logs.to_dict('records')
            # Merge and dedupe
            existing_ids = set([l.get('timestamp', '') for l in logs])
            for log in db_logs_list:
                if log.get('timestamp') not in existing_ids:
                    logs.append(log)
    except:
        pass
    
    # Sort by timestamp descending
    logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return logs

def _parse_date(ts):
    """Parse timestamp to datetime."""
    try:
        return datetime.fromisoformat(ts)
    except:
        return None

def _generate_sample_logs():
    """Generate sample logs for demo."""
    sample_actions = [
        ("LOGIN", "Admin logged in", ""),
        ("CREATE_JOB", "Created job JOB-2024-001", "JOB-2024-001"),
        ("UPDATE_STATUS", "Changed status to In Transit", "JOB-2024-001"),
        ("FUEL_LOG", "Recorded 50L fuel", "V-001"),
        ("UPDATE_JOB", "Updated customer details", "JOB-2024-002"),
        ("CREATE_INVOICE", "Invoice #INV-001 generated", "INV-001"),
        ("PAYMENT", "Recorded payment ฿15,000", "PAY-001"),
        ("MAINTENANCE", "Created repair ticket", "T-001"),
        ("MASTER_UPDATE", "Updated driver information", "D-001"),
        ("UPDATE_STATUS", "Job completed", "JOB-2024-001"),
    ]
    
    logs = []
    base_time = datetime.now()
    
    for i, (action, details, ref_id) in enumerate(sample_actions):
        logs.append({
            "timestamp": (base_time - timedelta(hours=i*2)).isoformat(),
            "user_id": "admin",
            "user_name": "Admin User",
            "action": action,
            "details": details,
            "ref_id": ref_id,
            "ip": "127.0.0.1"
        })
    
    return logs
