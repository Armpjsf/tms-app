
import streamlit as st
import pandas as pd
from services.archive_service import archive_service, ARCHIVE_SHEET_NAME

def render_history_view():
    st.markdown("### 🗄️ ประวัติข้อมูลย้อนหลัง (Historical Archive)")
    st.info("ข้อมูลเก่าเกิน 45 วันจะถูกเก็บไว้ที่ Google Sheets เพื่อความรวดเร็วของระบบ")
    
    if not archive_service.connected:
        st.error("⚠️ ไม่สามารถเชื่อมต่อกับ Google Sheets ได้ (กรุณาตรวจสอบ service_account.json)")
        return

    # Filter Controls
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown(f"**Source:** `{ARCHIVE_SHEET_NAME}`")
    with col2:
        threshold = st.number_input("อายุข้อมูลที่จะเก็บ (วัน)", min_value=0, value=45, help="ใส่ 0 เพื่อย้ายข้อมูลที่เสร็จแล้วทั้งหมดทันที")
        if st.button("🔄 Sync Now (Archive)", type="primary"):
             with st.spinner("Processing Archive..."):
                 success, count = archive_service.check_and_archive(days_threshold=threshold)
                 if success:
                     st.success(f"Archived {count} items.")
                 else:
                     st.error(f"Failed: {count}")
             st.rerun()
            
    # Fetch Data On-Demand
    try:
        # Access the spreadsheet (cached client from service logic if possible, or re-open)
        # Using service client attribute
        sh = archive_service.client.open(ARCHIVE_SHEET_NAME)
        
        tab_jobs, tab_fuel, tab_maint = st.tabs(["🚚 Job History", "⛽ Fuel Logs", "🔧 Maintenance"])
        
        with tab_jobs:
            _render_archive_tab(sh, "Jobs_Archive", fallback_sheet1=True)
            
        with tab_fuel:
            _render_archive_tab(sh, "Fuel_Archive")
            
        with tab_maint:
            _render_archive_tab(sh, "Tickets_Archive")
        
    except Exception as e:
        st.error(f"เกิดข้อผิดพลาดในการดึงข้อมูล: {e}")

def _render_archive_tab(sh, sheet_name, fallback_sheet1=False):
    try:
        try:
            worksheet = sh.worksheet(sheet_name)
        except:
            if fallback_sheet1:
                worksheet = sh.sheet1
            else:
                st.info(f"ยังไม่มีข้อมูล {sheet_name}")
                return

        all_rows = worksheet.get_all_values()
        if not all_rows or len(all_rows) < 2:
            st.warning("ไม่พบข้อมูล")
            return
            
        headers = all_rows[0]
        df = pd.DataFrame(all_rows[1:], columns=headers)
        
        st.markdown(f"**จำนวนรายการ:** {len(df)}")
        st.dataframe(df, use_container_width=True, hide_index=True)
        
    except Exception as e:
        st.error(f"Error loading {sheet_name}: {e}")
