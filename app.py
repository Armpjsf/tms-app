import os
import logging
import streamlit as st  # type: ignore
from modules.database import load_all_data, get_data, get_connection, Config
from modules.ui_admin import admin_flow
from modules.ui_driver import driver_flow

# Debug control
DEBUG = os.environ.get("TMS_DEBUG", "0") == "1"
logging.basicConfig(level=logging.DEBUG if DEBUG else logging.INFO)
logger = logging.getLogger("tms-app")

st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

# --- Helper Functions ---
def safe_rerun():
    try:
        if hasattr(st, "rerun"):
            st.rerun()
        else:
            st.experimental_rerun()
    except Exception:
        pass

def safe_get_cell(row, col, default=""):
    try:
        if hasattr(row, "get"):
            return row.get(col, default)
        return row[col] if col in row else default
    except Exception:
        return default

def show_reload_button(msg="เกิดข้อผิดพลาด, กรุณาลองอีกครั้ง"):
    st.error(msg)
    # ปุ่มนี้จะกดได้แล้ว เพราะเราย้าย Logic ออกมานอก Form
    if st.button("🔄 ลองโหลดใหม่ (Reload)"):
        if "data_store" in st.session_state:
            del st.session_state["data_store"]
        safe_rerun()

def login_page():
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        
        # 1. ส่วนรับข้อมูล (Form)
        with st.form("login"):
            u = st.text_input("User ID").strip()
            p = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login", use_container_width=True)
            
        # 2. ส่วนตรวจสอบ (Logic) -> ย้ายออกมาอยู่นอก with st.form
        if submitted:
            try:
                # ใช้ get_connection โดยตรงเพื่อความชัวร์
                conn = get_connection()
                # ttl=0 คือโหลดสด (อาจติด Quota ได้ถ้ากดรัว)
                drivers = conn.read(spreadsheet=Config.SHEET_URL, worksheet="Master_Drivers", ttl=0)
            except Exception as e:
                logger.exception("Login fetch failed")
                # แสดง Error ที่อ่านง่ายขึ้น
                if "429" in str(e) or "Quota" in str(e):
                    show_reload_button("⚠️ ระบบ Google Sheet กำลังยุ่ง (Quota Exceeded) กรุณารอ 1 นาทีแล้วกดปุ่มด้านล่าง")
                else:
                    show_reload_button(f"ไม่สามารถดึงข้อมูลได้: {e}")
                return

            if drivers is None or getattr(drivers, "empty", True):
                st.error("ไม่พบข้อมูลผู้ขับในระบบ")
                return

            # Validate Columns
            if "Driver_ID" not in drivers.columns:
                try:
                    drivers = drivers.reset_index()
                except: pass
                if "Driver_ID" not in drivers.columns:
                    st.error("ตาราง Master_Drivers ผิดพลาด (ไม่มีคอลัมน์ Driver_ID)")
                    return

            # Check User
            try:
                drivers["Driver_ID"] = drivers["Driver_ID"].astype(str).str.strip()
                user = drivers[drivers["Driver_ID"] == u]
            except Exception:
                st.error("ข้อมูล Driver_ID ผิดพลาด")
                return

            if user.empty:
                st.error("ไม่พบ User ID นี้")
                return

            # Check Password
            stored_pw = safe_get_cell(user.iloc[0], "Password", "")
            if str(stored_pw) == p:
                st.session_state.logged_in = True
                st.session_state.driver_id = u
                st.session_state.driver_name = safe_get_cell(user.iloc[0], "Driver_Name", u)
                st.session_state.vehicle_plate = safe_get_cell(user.iloc[0], "Vehicle_Plate", "-")
                st.session_state.user_role = safe_get_cell(user.iloc[0], "Role", "Driver")
                st.success("Login สำเร็จ!")
                safe_rerun()
            else:
                st.error("รหัสผ่านผิด")

def do_logout():
    keys = ["logged_in", "driver_id", "driver_name", "vehicle_plate", "user_role", "data_store"]
    for k in keys:
        if k in st.session_state: del st.session_state[k]
    safe_rerun()

def get_full_data(force_reload=False):
    if force_reload and "data_store" in st.session_state:
        del st.session_state["data_store"]
    if "data_store" in st.session_state:
        return st.session_state["data_store"]
    try:
        data = load_all_data()
        st.session_state["data_store"] = data
        return data
    except Exception:
        return {}

def main():
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False

    with st.sidebar:
        if st.button("รีโหลดข้อมูล"):
            get_full_data(force_reload=True)
            safe_rerun()
        if st.button("Logout"):
            do_logout()
        if DEBUG: st.write("DEBUG MODE")

    if not st.session_state.logged_in:
        login_page()
    else:
        # Pre-load data
        data_store = get_full_data()
        
        # Route Flow
        if st.session_state.get("user_role") == "Admin":
            admin_flow()
        else:
            driver_flow()

if __name__ == "__main__":
    main()