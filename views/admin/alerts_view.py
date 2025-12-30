"""
Alerts View - Enterprise Alert Center
ศูนย์แจ้งเตือนรวม
"""

import streamlit as st
import pandas as pd
from datetime import datetime
from services.alert_service import AlertService, AlertType, AlertSeverity

# Language labels
LABELS = {
    "th": {
        "title": "🔔 ศูนย์แจ้งเตือน",
        "subtitle": "รวมการแจ้งเตือนสำคัญทั้งหมดในที่เดียว",
        "critical": "วิกฤต",
        "high": "สูง",
        "medium": "ปานกลาง",
        "low": "ต่ำ",
        "no_alerts": "✅ ไม่มีการแจ้งเตือน! ระบบทำงานปกติ",
        "filter": "กรองประเภท",
        "all_types": "ทั้งหมด",
        "dismiss": "ปิด",
        "refresh": "รีเฟรช",
        "total_alerts": "แจ้งเตือนทั้งหมด",
    },
    "en": {
        "title": "🔔 Alert Center",
        "subtitle": "All important notifications in one place",
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
        "no_alerts": "✅ No alerts! System running normally",
        "filter": "Filter Type",
        "all_types": "All Types",
        "dismiss": "Dismiss",
        "refresh": "Refresh",
        "total_alerts": "Total Alerts",
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_alerts_view():
    lang = st.session_state.get("lang", "th")
    
    # "Read" logic: When user opens this page, mark all current alerts as "Seen/Read"
    # so the notification count resets on next page load
    AlertService.mark_all_read()
    
    st.markdown(f"### {get_label('title')}")
    st.caption(get_label('subtitle'))
    
    # Get all alerts
    alerts = AlertService.get_all_alerts(lang)
    
    # Filter out dismissed alerts
    dismissed = st.session_state.get('dismissed_alerts', set())
    alerts = [a for a in alerts if a['id'] not in dismissed]
    
    # Summary cards
    counts = {
        AlertSeverity.CRITICAL: 0,
        AlertSeverity.HIGH: 0,
        AlertSeverity.MEDIUM: 0,
        AlertSeverity.LOW: 0
    }
    
    for alert in alerts:
        sev = alert.get("severity")
        if sev in counts:
            counts[sev] += 1
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #1a237e, #283593); 
                    color: white; padding: 1rem; border-radius: 10px; text-align: center;">
            <h2 style="margin: 0; font-size: 2rem;">{len(alerts)}</h2>
            <p style="margin: 0; opacity: 0.9;">{get_label('total_alerts')}</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div style="background: {AlertSeverity.COLORS[AlertSeverity.CRITICAL]}; 
                    color: white; padding: 1rem; border-radius: 10px; text-align: center;">
            <h2 style="margin: 0; font-size: 2rem;">{counts[AlertSeverity.CRITICAL]}</h2>
            <p style="margin: 0;">{get_label('critical')}</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div style="background: {AlertSeverity.COLORS[AlertSeverity.HIGH]}; 
                    color: white; padding: 1rem; border-radius: 10px; text-align: center;">
            <h2 style="margin: 0; font-size: 2rem;">{counts[AlertSeverity.HIGH]}</h2>
            <p style="margin: 0;">{get_label('high')}</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div style="background: {AlertSeverity.COLORS[AlertSeverity.MEDIUM]}; 
                    color: black; padding: 1rem; border-radius: 10px; text-align: center;">
            <h2 style="margin: 0; font-size: 2rem;">{counts[AlertSeverity.MEDIUM]}</h2>
            <p style="margin: 0;">{get_label('medium')}</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col5:
        st.markdown(f"""
        <div style="background: {AlertSeverity.COLORS[AlertSeverity.LOW]}; 
                    color: white; padding: 1rem; border-radius: 10px; text-align: center;">
            <h2 style="margin: 0; font-size: 2rem;">{counts[AlertSeverity.LOW]}</h2>
            <p style="margin: 0;">{get_label('low')}</p>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Filters
    col_f1, col_f2 = st.columns([2, 1])
    
    with col_f1:
        type_labels = AlertType.LABELS[lang]
        type_options = [get_label('all_types')] + [f"{AlertType.ICONS[t]} {type_labels[t]}" for t in AlertType.ALL]
        selected_type = st.selectbox(get_label('filter'), type_options, key="alert_type_filter")
    
    with col_f2:
        c1, c2 = st.columns(2)
        with c1:
            if st.button(f"🗑️ Clear All", use_container_width=True, type="secondary", help="ลบการแจ้งเตือนทั้งหมดในหน้านี้"):
                AlertService.dismiss_all_alerts(alerts)
                st.success("Deleted all alerts!")
                st.rerun()
        with c2:
            if st.button(f"🔄 {get_label('refresh')}", use_container_width=True):
                st.rerun()
    
    # Filter alerts
    if selected_type != get_label('all_types'):
        # Find the type key from selected label
        for t in AlertType.ALL:
            if f"{AlertType.ICONS[t]} {AlertType.LABELS[lang][t]}" == selected_type:
                alerts = [a for a in alerts if a['type'] == t]
                break
    
    st.markdown("---")
    
    # Alert list
    if not alerts:
        st.success(get_label('no_alerts'))
        return
    
    for alert in alerts:
        severity = alert.get('severity', AlertSeverity.LOW)
        icon = AlertSeverity.ICONS.get(severity, "⚪")
        color = AlertSeverity.COLORS.get(severity, "#666")
        type_icon = AlertType.ICONS.get(alert.get('type'), "📌")
        
        with st.container():
            col_icon, col_content, col_action = st.columns([0.5, 5, 1])
            
            with col_icon:
                st.markdown(f"""
                <div style="background: {color}; width: 40px; height: 40px; 
                            border-radius: 50%; display: flex; align-items: center; 
                            justify-content: center; color: white; font-size: 1.2rem;">
                    {type_icon}
                </div>
                """, unsafe_allow_html=True)
            
            with col_content:
                st.markdown(f"""
                <div style="border-left: 3px solid {color}; padding-left: 1rem;">
                    <p style="margin: 0; font-weight: 600; color: {color};">
                        {icon} {alert.get('title', 'Alert')}
                    </p>
                    <p style="margin: 0.3rem 0 0; color: #333;">
                        {alert.get('message', '')}
                    </p>
                    <p style="margin: 0.2rem 0 0; color: #999; font-size: 0.8rem;">
                        🔗 {alert.get('ref_id', '')}
                    </p>
                </div>
                """, unsafe_allow_html=True)
            
            with col_action:
                if st.button(get_label('dismiss'), key=f"dismiss_{alert['id']}"):
                    AlertService.dismiss_alert(alert['id'])
                    st.rerun()
        
        st.markdown("<hr style='margin: 0.5rem 0; border: none; border-top: 1px solid #eee;'>", unsafe_allow_html=True)
