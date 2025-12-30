
"""
POD Management & Driver App View
จัดการงานขนส่งและเอกสาร POD (สำหรับคนขับและ Admin)
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import time
import random

from data.repository import repo
from config.constants import JobStatus
from utils.helpers import safe_float, paginate_dataframe

# Language labels
LABELS = {
    "th": {
        "title": "📱 Driver App & POD",
        "subtitle": "จัดการงานขนส่งและอัพเดทสถานะ (สำหรับคนขับ)",
        "pending_pod": "รอเอกสาร POD",
        "completed_pod": "มีเอกสารแล้ว",
        "upload": "อัพโหลด POD",
        "view": "ดูเอกสาร",
        "confirm": "ยืนยันความถูกต้อง",
        "reject": "ตีกลับเอกสาร",
        "filter_status": "สถานะเอกสาร",
        "all": "ทั้งหมด",
        "search": "ค้นหาเลขงาน/ลูกค้า",
        "no_data": "ไม่พบงานของคุณ",
        "drop_file": "ลากไฟล์มาวางที่นี่",
        "save success": "บันทึกเรียบร้อย",
        "my_jobs": "งานของฉัน",
        "status_new": "งานใหม่",
        "status_assigned": "ได้รับมอบหมาย",
        "status_transit": "กำลังเดินทาง",
        "status_arrived": "ถึงปลายทาง",
        "status_delivered": "ส่งสินค้าแล้ว",
        "status_completed": "จบงานแล้ว",
        "btn_start": "🚚 เริ่มออกเดินทาง",
        "btn_arrived": "🏁 ถึงปลายทาง",
        "btn_delivered": "📦 ส่งของเรียบร้อย",
        "btn_gps": "📍 อัพเดทพิกัด GPS",
        "gps_updated": "อัพเดทพิกัดเรียบร้อย",
        "location": "พิกัดปัจจุบัน"
    },
    "en": {
        "title": "📱 Driver App & POD",
        "subtitle": "Job Management & Status Updates (For Drivers)",
        "pending_pod": "Pending POD",
        "completed_pod": "POD Completed",
        "upload": "Upload POD",
        "view": "View Document",
        "confirm": "Confirm Validity",
        "reject": "Reject Document",
        "filter_status": "Document Status",
        "all": "All",
        "search": "Search Job ID/Customer",
        "no_data": "No jobs found",
        "drop_file": "Drop file here",
        "save success": "Saved successfully",
        "my_jobs": "My Jobs",
        "status_new": "New",
        "status_assigned": "Assigned",
        "status_transit": "In Transit",
        "status_arrived": "Arrived",
        "status_delivered": "Delivered",
        "status_completed": "Completed",
        "btn_start": "🚚 Start Job",
        "btn_arrived": "🏁 Arrived",
        "btn_delivered": "📦 Delivered",
        "btn_gps": "📍 Update GPS",
        "gps_updated": "GPS Updated",
        "location": "Current Location"
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_pod_view():
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    st.caption(get_label('subtitle'))
    
    # 1. User Context
    user_name = st.session_state.get("user_name", "")
    user_role = st.session_state.get("user_role", "DRIVER")
    
    if user_role == "DRIVER":
        st.info(f"👤 Driver: {user_name}")
    
    # 2. GPS Simulator Button (Top Level)
    # Allows generic GPS update for the driver
    col_gps1, col_gps2 = st.columns([3, 1])
    with col_gps2:
        if st.button(get_label("btn_gps"), key="global_gps_update", use_container_width=True):
            _simulate_gps_update(user_name)
            
    st.markdown("---")

    # 3. Load Jobs
    jobs = repo.get_data("Jobs_Main")
    
    if jobs.empty:
        st.info(get_label("no_data"))
        return
        
    # 4. Filter Logic
    # If Driver, show only their jobs
    if user_role == "DRIVER":
        my_jobs = jobs[jobs['Driver_Name'] == user_name].copy()
    else:
        # Admin sees all
        my_jobs = jobs.copy()
        
    # Filter for "Active" workflow (Assigned -> In Transit -> Arrived -> Delivered) + Completed for POD
    visible_statuses = [
        JobStatus.ASSIGNED, "Assigned (Sub)",
        JobStatus.IN_TRANSIT, 
        JobStatus.ARRIVED, 
        JobStatus.DELIVERED,
        JobStatus.COMPLETED
    ]
    
    my_jobs = my_jobs[my_jobs['Job_Status'].isin(visible_statuses)]
    
    if my_jobs.empty:
        st.info(get_label("no_data"))
        return

    # Sort: Active first, then Completed
    # create sorter
    sorter = {k: v for v, k in enumerate(visible_statuses)}
    my_jobs['status_sort'] = my_jobs['Job_Status'].map(sorter)
    my_jobs = my_jobs.sort_values('status_sort')

    # 5. Render Job Cards
    st.markdown(f"#### {get_label('my_jobs')} ({len(my_jobs)})")
    
    # Pagination
    paginated_jobs, total_pages, current_page = paginate_dataframe(my_jobs, page_size=10, key="pod_view")
    
    for _, job in paginated_jobs.iterrows():
        status = job['Job_Status']
        job_id = job['Job_ID']
        
        # Color coding
        color = "#e0e0e0"
        if status == JobStatus.IN_TRANSIT: color = "#e3f2fd" # Blue
        elif status == JobStatus.ARRIVED: color = "#fff3e0" # Orange
        elif status == JobStatus.DELIVERED: color = "#e8f5e9" # Green
        elif status == JobStatus.COMPLETED: color = "#f5f5f5" # Gray
        
        with st.container(border=True):
            # Header
            c1, c2 = st.columns([3, 1])
            with c1:
                st.markdown(f"**{job_id}**")
                st.caption(f"📍 {job.get('Route_Name', '-')}")
            with c2:
                st.markdown(f"**{status}**")
            
            # Details
            st.text(f"🏢 {job.get('Customer_Name', '-')}")
            st.text(f"📅 {job.get('Plan_Date', '-')}")
            
            # Actions based on Status
            col_act1, col_act2 = st.columns(2)
            
            with col_act1:
                # Workflow Buttons
                if status == JobStatus.ASSIGNED or status == "Assigned (Sub)":
                    if st.button(get_label("btn_start"), key=f"start_{job_id}", type="primary", use_container_width=True):
                        repo.update_field("Jobs_Main", "Job_ID", job_id, "Job_Status", JobStatus.IN_TRANSIT)
                        _simulate_gps_update(user_name) # Auto GPS update
                        st.rerun()
                        
                elif status == JobStatus.IN_TRANSIT:
                    if st.button(get_label("btn_arrived"), key=f"arr_{job_id}", type="primary", use_container_width=True):
                        repo.update_field("Jobs_Main", "Job_ID", job_id, "Job_Status", JobStatus.ARRIVED)
                        repo.update_field("Jobs_Main", "Job_ID", job_id, "Arrive_Dest_Time", str(datetime.now()))
                        _simulate_gps_update(user_name)
                        st.rerun()
                        
                elif status == JobStatus.ARRIVED:
                    if st.button(get_label("btn_delivered"), key=f"del_{job_id}", type="primary", use_container_width=True):
                        repo.update_field("Jobs_Main", "Job_ID", job_id, "Job_Status", JobStatus.DELIVERED)
                        repo.update_field("Jobs_Main", "Job_ID", job_id, "Actual_Delivery_Time", str(datetime.now()))
                        _simulate_gps_update(user_name)
                        st.rerun()

            with col_act2:
                # POD View for Delivered/Completed (View Only - Upload done by driver in mobile app)
                if status in [JobStatus.DELIVERED, JobStatus.COMPLETED]:
                    has_pod = job.get('POD_Image') or job.get('Photo_Proof_Url')
                    
                    if has_pod:
                        if st.button(f"👁️ ดู POD", key=f"pod_{job_id}", use_container_width=True):
                            _view_pod_dialog(job_id, job.get('Photo_Proof_Url') or job.get('POD_Image'))
                    else:
                        st.caption("⏳ รอคนขับอัปโหลด POD")

def _simulate_gps_update(driver_name):
    """Simulate getting GPS from phone and updating DB."""
    # 13.7563, 100.5018 is Bangkok
    # Add random jitter
    lat = 13.7563 + (random.random() - 0.5) * 0.1
    lon = 100.5018 + (random.random() - 0.5) * 0.1
    
    # Update Master_Drivers if driver exists
    drivers = repo.get_data("Master_Drivers")
    if not drivers.empty and driver_name:
        # Check if driver name exists
        if driver_name in drivers['Driver_Name'].values:
            drivers.loc[drivers['Driver_Name'] == driver_name, 'Current_Lat'] = lat
            drivers.loc[drivers['Driver_Name'] == driver_name, 'Current_Lon'] = lon
            drivers.loc[drivers['Driver_Name'] == driver_name, 'Last_Update'] = str(datetime.now())
            if repo.update_data("Master_Drivers", drivers):
                st.toast(f"📍 {driver_name}: {lat:.4f}, {lon:.4f}")
            else:
                st.error("Failed to update GPS in DB")
        else:
            # Maybe admin testing
            st.toast(f"📍 (Simulated) {lat:.4f}, {lon:.4f}")

@st.dialog("📝 ดูเอกสาร POD")
def _view_pod_dialog(job_id, pod_url):
    """View POD uploaded by driver (Admin View-Only)"""
    st.write(f"🏷️ Job ID: **{job_id}**")
    st.info("📱 เอกสารนี้อัปโหลดโดยคนขับที่ Mobile App")
    
    if pod_url:
        images = []
        # Robust Parsing Logic
        s = str(pod_url).strip()
        
        # 1. Try JSON/AST List
        if s.startswith('[') and s.endswith(']'):
            try:
                import json
                images = json.loads(s.replace("'", '"'))
            except:
                try:
                    import ast
                    images = ast.literal_eval(s)
                except:
                    pass
        
        # 2. Regex fallback / Scalar validation
        if not images or not isinstance(images, list):
             import re
             # Extract inside quotes if present
             match = re.search(r'["\'](data:image[^"\']+|http[^"\']+)["\']', s)
             if match:
                 images = [match.group(1)]
             # If direct url/base64
             elif s.startswith("data:image") or s.startswith("http"):
                 images = [s]
             # Strip quotes
             elif (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
                 images = [s[1:-1]]
        
        if images and isinstance(images, list) and len(images) > 0:
             st.write(f"📷 รูปทั้งหมด: {len(images)} รูป")
             cols = st.columns(min(len(images), 3))
             for i, img_url in enumerate(images):
                with cols[i % 3]:
                    st.image(img_url, use_container_width=True)
        else:
             st.warning("⚠️ รูปแบบไฟล์ไม่ถูกต้อง หรือเฟรมข้อมูลเสียหาย")
             # Fallback just show as-is if possible
             st.image(pod_url, use_container_width=True)
             
    else:
        st.warning("⚠️ ไม่พบไฟล์ POD")
    
    if st.button("❌ ปิด", use_container_width=True):
        st.rerun()
