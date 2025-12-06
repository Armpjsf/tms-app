import os
import logging
import streamlit as st  # type: ignore
from modules.database import load_all_data, get_data
from modules.ui_admin import admin_flow
from modules.ui_driver import driver_flow

# Debug control via env var: export TMS_DEBUG=1
DEBUG = os.environ.get("TMS_DEBUG", "0") == "1"
logging.basicConfig(level=logging.DEBUG if DEBUG else logging.INFO)
logger = logging.getLogger("tms-app")

st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

def safe_get_cell(row, col, default=""):
    try:
        if hasattr(row, "get"):
            return row.get(col, default)
        return row[col] if col in row else default
    except Exception:
        return default

def show_reload_button(msg="เกิดข้อผิดพลาด, กรุณาลองอีกครั้ง"):
    st.error(msg)
    if st.button("รีโหลด"):
        # Clear cached/stored data and rerun
        if "data_store" in st.session_state:
            del st.session_state["data_store"]
        st.rerun()

def login_page():
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        with st.form("login"):
            u = st.text_input("User ID").strip()
            p = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login", use_container_width=True)
            if submitted:
                # Get drivers data, but guard against failure
                try:
                    drivers = get_data("Master_Drivers")
                except Exception as e:
                    logger.exception("get_data(Master_Drivers) failed")
                    show_reload_button("ไม่สามารถดึงข้อมูลผู้ขับได้ (เกิดข้อผิดพลาดภายใน)")
                    return

                if drivers is None or getattr(drivers, "empty", True):
                    st.error("ไม่พบข้อมูลผู้ขับในระบบ")
                    return

                # Ensure Driver_ID exists before astype
                if "Driver_ID" not in drivers.columns:
                    logger.warning("Master_Drivers missing Driver_ID column")
                    # Try to recover by creating Driver_ID from index (best-effort)
                    try:
                        drivers = drivers.reset_index()
                        if "Driver_ID" not in drivers.columns:
                            st.error("ข้อมูลผู้ขับไม่สมบูรณ์ (ไม่มีคอลัมน์ Driver_ID)")
                            return
                    except Exception:
                        st.error("ข้อมูลผู้ขับไม่สมบูรณ์")
                        return

                # Normalize Driver_ID column safely
                try:
                    drivers["Driver_ID"] = drivers["Driver_ID"].astype(str).str.strip()
                except Exception:
                    logger.exception("Failed to convert Driver_ID to str")
                    st.error("ข้อมูลผู้ขับไม่ถูกต้อง (Driver_ID)")
                    return

                user = drivers[drivers["Driver_ID"] == u]
                if user.empty:
                    st.error("ไม่พบผู้ใช้ (User ID ไม่ถูกต้อง)")
                    return

                # Access password field safely
                stored_pw = safe_get_cell(user.iloc[0], "Password", "")
                if stored_pw is None or stored_pw == "":
                    st.error("บัญชีผู้ใช้ยังไม่มีการตั้งรหัสผ่าน")
                    return

                # NOTE: For now compare plaintext (security improvements planned later)
                try:
                    if str(stored_pw) == p:
                        st.session_state.logged_in = True
                        st.session_state.driver_id = u
                        st.session_state.driver_name = safe_get_cell(user.iloc[0], "Driver_Name", u)
                        st.session_state.vehicle_plate = safe_get_cell(user.iloc[0], "Vehicle_Plate", "-")
                        st.session_state.user_role = safe_get_cell(user.iloc[0], "Role", "Driver")
                        st.experimental_rerun()
                    else:
                        st.error("รหัสผ่านผิด")
                except Exception:
                    logger.exception("Error while comparing password")
                    st.error("เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน")

def do_logout():
    keys_to_clear = ["logged_in", "driver_id", "driver_name", "vehicle_plate", "user_role", "data_store"]
    for k in keys_to_clear:
        if k in st.session_state:
            del st.session_state[k]
    st.experimental_rerun()

# Provide a cached wrapper if Streamlit supports it; otherwise fallback to direct call
def get_full_data(force_reload=False):
    if force_reload and "data_store" in st.session_state:
        del st.session_state["data_store"]

    if "data_store" in st.session_state:
        return st.session_state["data_store"]

    try:
        data = load_all_data()
        st.session_state["data_store"] = data
        return data
    except Exception as e:
        logger.exception("load_all_data failed")
        # store an empty dict to avoid reattempt loops unless user presses reload
        st.session_state["data_store"] = {}
        return st.session_state["data_store"]

def main():
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False

    # Sidebar controls: logout and reload data for operators
    with st.sidebar:
        st.markdown("## ควบคุมระบบ")
        if st.button("รีโหลดข้อมูล (Reload Data)"):
            get_full_data(force_reload=True)
            st.experimental_rerun()
        if st.button("Logout"):
            do_logout()
        if DEBUG:
            st.markdown("**DEBUG MODE**")

    if not st.session_state.logged_in:
        login_page()
    else:
        # Pre-load data once (get_full_data handles errors)
        with st.spinner("กำลังโหลดข้อมูล..."):
            data_store = get_full_data()
            if data_store == {}:
                show_reload_button("ไม่สามารถโหลดข้อมูลทั้งหมดได้ โปรดรีโหลดหรือแจ้งผู้ดูแลระบบ")
                return

        # At this point, data_store exists (could be dict/dfs depending on implementation)
        try:
            if st.session_state.get("user_role") == "Admin":
                admin_flow()
            else:
                driver_flow()
        except Exception:
            logger.exception("Error in UI flow")
            st.error("เกิดข้อผิดพลาดขณะแสดงหน้า UI")
            if st.button("กลับไปหน้า Login"):
                do_logout()

if __name__ == "__main__":
    main()