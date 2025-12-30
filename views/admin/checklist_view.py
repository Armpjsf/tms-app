"""
Driver Checklists View - Admin Panel
แสดง Checklist ก่อนออกรถของคนขับ พร้อมรูปสภาพรถ
"""
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client
from config.settings import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def render_checklist_view():
    st.markdown('<div class="tms-page-title">📋 Driver Pre-Trip Checklists</div>', unsafe_allow_html=True)
    st.caption("ตรวจสอบ Checklist ก่อนออกรถของคนขับ")
    
    # Filters
    col1, col2, col3 = st.columns(3)
    with col1:
        date_filter = st.date_input("📅 วันที่", value=datetime.now().date())
    with col2:
        driver_filter = st.text_input("🔍 ค้นหาคนขับ", placeholder="ชื่อหรือ ID")
    with col3:
        vehicle_filter = st.text_input("🚛 ทะเบียนรถ", placeholder="ทะเบียน")
    
    # Fetch data (no date filter for now - fetch all and filter client-side)
    try:
        response = supabase.table('driver_checklists').select('*').order('created_at', desc=True).limit(100).execute()
        checklists = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        checklists = []
    
    # Apply client-side filters
    if date_filter:
        checklists = [c for c in checklists if c.get('date') == date_filter.isoformat()]
    if driver_filter:
        checklists = [c for c in checklists if driver_filter.lower() in (c.get('driver_name', '') or '').lower()]
    if vehicle_filter:
        checklists = [c for c in checklists if vehicle_filter.lower() in (c.get('vehicle_plate', '') or '').lower()]
    
    if not checklists:
        st.info("ไม่พบ Checklist ในวันที่เลือก")
        return
    
    st.success(f"พบ {len(checklists)} รายการ")
    
    # Display checklists
    for checklist in checklists:
        with st.expander(f"🚛 {checklist.get('vehicle_plate', '-')} - {checklist.get('driver_name', '-')}", expanded=False):
            col1, col2 = st.columns([2, 1])
            
            with col1:
                st.write(f"**Checklist ID:** {checklist.get('checklist_id', '-')}")
                st.write(f"**วันที่:** {checklist.get('date', '-')}")
                st.write(f"**เวลา:** {checklist.get('created_at', '-')[:19] if checklist.get('created_at') else '-'}")
                
                st.divider()
                
                # Checklist items
                fuel_ok = checklist.get('fuel_ok', False)
                tires_ok = checklist.get('tires_ok', False)
                docs_ok = checklist.get('documents_ok', False)
                
                st.write("**สถานะการตรวจสอบ:**")
                st.write(f"{'✅' if fuel_ok else '❌'} น้ำมันเพียงพอ")
                st.write(f"{'✅' if tires_ok else '❌'} ยางรถสภาพดี")
                st.write(f"{'✅' if docs_ok else '❌'} เอกสารครบถ้วน")
                
                # Notes
                notes = checklist.get('notes')
                if notes:
                    st.warning(f"📝 หมายเหตุ: {notes}")
            
            with col2:
                # Vehicle photo
                photo = checklist.get('vehicle_photo')
                if photo and photo.startswith('data:image'):
                    st.image(photo, caption="รูปสภาพรถ", use_container_width=True)
                else:
                    st.info("ไม่มีรูปภาพ")
    
    # Summary stats
    st.divider()
    st.subheader("📊 สรุปสถิติวันนี้")
    
    total = len(checklists)
    all_ok = sum(1 for c in checklists if c.get('fuel_ok') and c.get('tires_ok') and c.get('documents_ok'))
    has_notes = sum(1 for c in checklists if c.get('notes'))
    
    col1, col2, col3 = st.columns(3)
    with col1: 
        from utils.helpers import render_metric_card
        st.markdown(render_metric_card("Checklist ทั้งหมด", f"{total}", icon="📋"), unsafe_allow_html=True)
    with col2: 
        pct = f"{all_ok/total*100:.0f}%" if total > 0 else "0%"
        st.markdown(render_metric_card("ผ่านทุกข้อ", f"{all_ok}", icon="✅", trend=pct, accent_color="accent-green"), unsafe_allow_html=True)
    with col3: st.markdown(render_metric_card("มีหมายเหตุ", f"{has_notes}", icon="📝", accent_color="accent-orange"), unsafe_allow_html=True)
