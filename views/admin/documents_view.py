"""
Vehicle Documents/Renewals Management - Admin Panel
จัดการเอกสารรถ เช่น ภาษี พรบ ประกันภัย พร้อมแจ้งเตือนก่อนหมดอายุ
"""
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client
from config.settings import settings
from data.repository import repo

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def render_documents_view():
    st.markdown('<div class="tms-page-title">📄 เอกสารรถและการต่อสัญญา</div>', unsafe_allow_html=True)
    st.caption("จัดการภาษี พรบ ประกันภัย และเอกสารอื่นๆ พร้อมแจ้งเตือนก่อนหมดอายุ")
    
    # Create tabs
    tab1, tab2, tab3 = st.tabs(["⚠️ ใกล้หมดอายุ", "📋 รายการทั้งหมด", "➕ เพิ่มเอกสาร"])
    
    with tab1:
        render_expiring_documents()
    
    with tab2:
        render_all_documents()
    
    with tab3:
        render_add_document()

def render_expiring_documents():
    """แสดงเอกสารที่ใกล้หมดอายุ (ภายใน 30 วัน)"""
    try:
        response = supabase.table('vehicle_documents').select('*').order('expiry_date', desc=False).execute()
        documents = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        documents = []
    
    today = datetime.now().date()
    warning_date = today + timedelta(days=30)
    
    # Filter expiring documents
    expiring = [d for d in documents if d.get('expiry_date') and datetime.strptime(d['expiry_date'], '%Y-%m-%d').date() <= warning_date]
    
    if not expiring:
        st.success("✅ ไม่มีเอกสารที่ใกล้หมดอายุภายใน 30 วัน")
        return
    
    st.warning(f"⚠️ มี {len(expiring)} รายการที่ใกล้หมดอายุ")
    
    for doc in expiring:
        expiry = datetime.strptime(doc['expiry_date'], '%Y-%m-%d').date()
        days_left = (expiry - today).days
        
        # Color based on urgency
        if days_left < 0:
            color = "🔴"
            status = f"หมดอายุแล้ว {abs(days_left)} วัน"
            bg_color = "#ffebee"
        elif days_left <= 7:
            color = "🟠"
            status = f"เหลือ {days_left} วัน"
            bg_color = "#fff3e0"
        else:
            color = "🟡"
            status = f"เหลือ {days_left} วัน"
            bg_color = "#fffde7"
        
        with st.container():
            st.markdown(f"""
            <div style="background-color: {bg_color}; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                <strong>{color} {doc.get('vehicle_plate', '-')}</strong> - {doc.get('document_type', '-')}
                <br><span style="color: #666;">หมดอายุ: {doc.get('expiry_date', '-')} ({status})</span>
                <br><span style="font-size: 0.9em; color: #888;">หมายเหตุ: {doc.get('notes', '-')}</span>
            </div>
            """, unsafe_allow_html=True)

def render_all_documents():
    """แสดงเอกสารทั้งหมด"""
    # Filters
    col1, col2, col3 = st.columns(3)
    with col1:
        vehicle_filter = st.text_input("🚛 ทะเบียนรถ", placeholder="ค้นหา...")
    with col2:
        doc_types = ["ทั้งหมด", "ภาษีรถ", "พรบ.", "ประกันภัย", "ใบขับขี่", "อื่นๆ"]
        type_filter = st.selectbox("📑 ประเภท", doc_types)
    with col3:
        status_filter = st.selectbox("⏰ สถานะ", ["ทั้งหมด", "ยังไม่หมดอายุ", "หมดอายุแล้ว"])
    
    # Fetch data
    try:
        response = supabase.table('vehicle_documents').select('*').order('expiry_date', desc=False).execute()
        documents = response.data if response.data else []
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูลได้: {e}")
        documents = []
    
    # Apply filters
    if vehicle_filter:
        documents = [d for d in documents if vehicle_filter.lower() in (d.get('vehicle_plate', '') or '').lower()]
    if type_filter != "ทั้งหมด":
        documents = [d for d in documents if d.get('document_type') == type_filter]
    
    today = datetime.now().date()
    if status_filter == "ยังไม่หมดอายุ":
        documents = [d for d in documents if d.get('expiry_date') and datetime.strptime(d['expiry_date'], '%Y-%m-%d').date() >= today]
    elif status_filter == "หมดอายุแล้ว":
        documents = [d for d in documents if d.get('expiry_date') and datetime.strptime(d['expiry_date'], '%Y-%m-%d').date() < today]
    
    if not documents:
        st.info("ไม่พบข้อมูลเอกสาร")
        return
    
    st.success(f"พบ {len(documents)} รายการ")
    
    # Display as table
    df = pd.DataFrame(documents)
    display_cols = ['vehicle_plate', 'document_type', 'issue_date', 'expiry_date', 'cost', 'notes']
    display_cols = [c for c in display_cols if c in df.columns]
    
    # Rename columns for display
    col_names = {
        'vehicle_plate': 'ทะเบียนรถ',
        'document_type': 'ประเภท',
        'issue_date': 'วันที่ต่อ',
        'expiry_date': 'หมดอายุ',
        'cost': 'ค่าใช้จ่าย',
        'notes': 'หมายเหตุ'
    }
    
    if not df.empty:
        df_display = df[display_cols].rename(columns=col_names)
        st.dataframe(df_display, use_container_width=True, hide_index=True)

def render_add_document():
    """ฟอร์มเพิ่มเอกสารใหม่"""
    st.subheader("➕ เพิ่มเอกสารใหม่")
    
    # Get list of vehicles
    try:
        vehicles = repo.get_data("Master_Vehicles")
        if not vehicles.empty and 'Vehicle_Plate' in vehicles.columns:
            vehicle_list = vehicles['Vehicle_Plate'].dropna().tolist()
        else:
            vehicle_list = []
    except:
        vehicle_list = []
    
    with st.form("add_document_form", clear_on_submit=True):
        col1, col2 = st.columns(2)
        
        with col1:
            if vehicle_list:
                vehicle_plate = st.selectbox("🚛 ทะเบียนรถ", vehicle_list)
            else:
                vehicle_plate = st.text_input("🚛 ทะเบียนรถ")
            
            doc_type = st.selectbox("📑 ประเภทเอกสาร", ["ภาษีรถ", "พรบ.", "ประกันภัย", "ใบขับขี่", "อื่นๆ"])
        
        with col2:
            issue_date = st.date_input("📅 วันที่ต่อ/ออก", value=datetime.now())
            expiry_date = st.date_input("⏰ วันหมดอายุ", value=datetime.now() + timedelta(days=365))
        
        col3, col4 = st.columns(2)
        with col3:
            cost = st.number_input("💰 ค่าใช้จ่าย (บาท)", min_value=0.0, step=100.0)
        with col4:
            notes = st.text_input("📝 หมายเหตุ")
        
        submitted = st.form_submit_button("💾 บันทึก", use_container_width=True)
        
        if submitted:
            if not vehicle_plate:
                st.error("กรุณาระบุทะเบียนรถ")
            else:
                try:
                    doc_id = f"DOC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    supabase.table('vehicle_documents').insert({
                        'document_id': doc_id,
                        'vehicle_plate': vehicle_plate,
                        'document_type': doc_type,
                        'issue_date': issue_date.isoformat(),
                        'expiry_date': expiry_date.isoformat(),
                        'cost': cost,
                        'notes': notes,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    st.success(f"✅ บันทึกเอกสาร {doc_type} สำหรับ {vehicle_plate} สำเร็จ!")
                    st.rerun()
                except Exception as e:
                    st.error(f"บันทึกไม่สำเร็จ: {e}")
