"""
SOS Alerts Dashboard - Admin View
แสดงสัญญาณ SOS ฉุกเฉินจากคนขับและให้ Admin ตอบรับ/ปิดการแจ้งเตือน
"""
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, timezone
from supabase import create_client
from config.settings import settings

# Thailand timezone (UTC+7)
TH_TZ = timezone(timedelta(hours=7))

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def render_sos_view():
    st.markdown('<div class="tms-page-title">🚨 SOS Alerts Dashboard</div>', unsafe_allow_html=True)
    st.caption("สัญญาณขอความช่วยเหลือฉุกเฉินจากคนขับ")
    
    # Create tabs
    tab1, tab2 = st.tabs(["🔴 Active Alerts", "📜 History"])
    
    with tab1:
        render_active_alerts()
    
    with tab2:
        render_alert_history()

def render_active_alerts():
    """แสดงรายการ SOS ที่ยังไม่ได้รับการตอบรับ"""
    try:
        response = supabase.table('sos_alerts').select('*').eq('status', 'ACTIVE').order('created_at', desc=True).execute()
        alerts = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        alerts = []
    
    if not alerts:
        st.success("✅ ไม่มี SOS ที่รอการตอบรับ")
        return
    
    st.warning(f"⚠️ มี {len(alerts)} รายการที่รอการตอบรับ")
    
    for alert in alerts:
        with st.container():
            col1, col2, col3 = st.columns([3, 2, 2])
            
            with col1:
                st.markdown(f"### 🚨 {alert.get('driver_name', 'Unknown')}")
                st.caption(f"ID: {alert.get('alert_id', '-')}")
                
                # Show time since alert
                created = alert.get('created_at')
                if created:
                    try:
                        # Parse timestamp as Thai local time (stored without timezone)
                        dt_str = str(created).replace('T', ' ').split('.')[0]
                        dt_thai = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
                        now_thai = datetime.now()
                        time_diff = now_thai - dt_thai
                        minutes = int(time_diff.total_seconds() / 60)
                        st.error(f"⏱️ {minutes} นาทีที่แล้ว ({dt_thai.strftime('%H:%M')})")
                    except Exception as e:
                        st.caption(f"เวลา: {created}")
            
            with col2:
                lat = alert.get('latitude')
                lng = alert.get('longitude')
                if lat and lng:
                    st.write(f"📍 พิกัด: {lat:.4f}, {lng:.4f}")
                    map_url = f"https://www.google.com/maps?q={lat},{lng}"
                    st.markdown(f"[🗺️ เปิดแผนที่]({map_url})")
                else:
                    st.write("📍 ไม่มีข้อมูลพิกัด")
            
            with col3:
                if st.button("✅ รับทราบ/ปิดเคส", key=f"resolve_{alert.get('alert_id')}"):
                    resolve_alert(alert.get('alert_id'))
                    st.rerun()
            
            st.divider()

def render_alert_history():
    """แสดงประวัติ SOS ที่ปิดแล้ว"""
    try:
        response = supabase.table('sos_alerts').select('*').neq('status', 'ACTIVE').order('created_at', desc=True).limit(50).execute()
        alerts = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        alerts = []
    
    if not alerts:
        st.info("ไม่มีประวัติ SOS")
        return
    
    df = pd.DataFrame(alerts)
    
    # Format columns - display as stored (already in Thai time)
    if 'created_at' in df.columns:
        df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce').dt.strftime('%d/%m/%Y %H:%M')
    if 'resolved_at' in df.columns:
        df['resolved_at'] = pd.to_datetime(df['resolved_at'], errors='coerce').dt.strftime('%d/%m/%Y %H:%M')
    
    display_cols = ['alert_id', 'driver_name', 'status', 'created_at', 'resolved_at', 'resolved_by']
    display_cols = [c for c in display_cols if c in df.columns]
    
    st.dataframe(df[display_cols], use_container_width=True, hide_index=True)

def resolve_alert(alert_id):
    """ปิด SOS Alert"""
    try:
        user = st.session_state.get('user', {})
        username = user.get('name', 'Admin')
        
        supabase.table('sos_alerts').update({
            'status': 'RESOLVED',
            'resolved_at': datetime.now().isoformat(),
            'resolved_by': username
        }).eq('alert_id', alert_id).execute()
        
        st.success("✅ ปิดเคสเรียบร้อย")
    except Exception as e:
        st.error(f"ผิดพลาด: {e}")
