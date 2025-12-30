"""
Driver-Admin Chat View - Admin Panel
แชทกับคนขับแบบ real-time พร้อม auto-refresh
"""
import streamlit as st
import pandas as pd
from datetime import datetime
from supabase import create_client
from config.settings import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def render_chat_view():
    st.markdown('<div class="tms-page-title">💬 Driver Chat</div>', unsafe_allow_html=True)
    st.caption("แชทกับคนขับ - Auto-refresh ทุก 30 วินาที")
    
    # Auto-refresh button
    col1, col2 = st.columns([3, 1])
    with col2:
        if st.button("🔄 Refresh", use_container_width=True):
            st.rerun()
    
    # Get all unique drivers who have sent messages
    try:
        response = supabase.table('chat_messages').select('driver_id, driver_name').execute()
        all_messages = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        all_messages = []
    
    if not all_messages:
        st.info("ยังไม่มีข้อความจากคนขับ")
        return
    
    # Get unique drivers
    drivers = {}
    for msg in all_messages:
        did = msg.get('driver_id')
        if did and did not in drivers:
            drivers[did] = msg.get('driver_name', did)
    
    # Count unread messages per driver
    try:
        unread_response = supabase.table('chat_messages').select('driver_id').eq('sender', 'driver').eq('read', False).execute()
        unread_msgs = unread_response.data if unread_response.data else []
        unread_count = {}
        for msg in unread_msgs:
            did = msg.get('driver_id')
            unread_count[did] = unread_count.get(did, 0) + 1
    except:
        unread_count = {}
    
    # Driver selection
    with col1:
        driver_options = [(f"{name} {'🔴 '+str(unread_count.get(did, 0)) if unread_count.get(did, 0) > 0 else ''}", did) for did, name in drivers.items()]
        driver_labels = [opt[0] for opt in driver_options]
        driver_ids = [opt[1] for opt in driver_options]
        
        selected_idx = st.selectbox("เลือกคนขับ", range(len(driver_labels)), format_func=lambda x: driver_labels[x])
        selected_driver = driver_ids[selected_idx]
    
    st.divider()
    
    # Load conversation with selected driver
    try:
        response = supabase.table('chat_messages').select('*').eq('driver_id', selected_driver).order('created_at', desc=False).limit(100).execute()
        messages = response.data if response.data else []
    except Exception as e:
        st.error(f"โหลดข้อความไม่สำเร็จ: {e}")
        messages = []
    
    # Mark as read
    if messages:
        try:
            supabase.table('chat_messages').update({'read': True}).eq('driver_id', selected_driver).eq('sender', 'driver').execute()
        except:
            pass
    
    # Display messages
    chat_container = st.container()
    with chat_container:
        for msg in messages:
            is_admin = msg.get('sender') == 'admin'
            col1, col2 = st.columns([1, 3] if is_admin else [3, 1])
            
            if is_admin:
                with col2:
                    st.markdown(f"""
                    <div style="background-color: #1976d2; color: white; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                        <strong>Admin:</strong> {msg.get('message', '')}
                        <br><span style="font-size: 0.8em; opacity: 0.7;">{msg.get('created_at', '')[-8:-3] if msg.get('created_at') else ''}</span>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                with col1:
                    st.markdown(f"""
                    <div style="background-color: #e0e0e0; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                        <strong>{msg.get('driver_name', 'Driver')}:</strong> {msg.get('message', '')}
                        <br><span style="font-size: 0.8em; color: #666;">{msg.get('created_at', '')[-8:-3] if msg.get('created_at') else ''}</span>
                    </div>
                    """, unsafe_allow_html=True)
    
    st.divider()
    
    # Reply form
    with st.form("reply_form", clear_on_submit=True):
        reply_text = st.text_input("พิมพ์ข้อความ", placeholder="ตอบกลับคนขับ...")
        submit = st.form_submit_button("📤 ส่ง", use_container_width=True)
        
        if submit and reply_text.strip():
            try:
                supabase.table('chat_messages').insert({
                    'driver_id': selected_driver,
                    'driver_name': drivers.get(selected_driver, selected_driver),
                    'sender': 'admin',
                    'message': reply_text.strip(),
                    'created_at': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
                    'read': True
                }).execute()
                st.success("ส่งข้อความสำเร็จ!")
                st.rerun()
            except Exception as e:
                st.error(f"ส่งไม่สำเร็จ: {e}")
