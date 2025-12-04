import streamlit as st # type: ignore
from modules.database import load_all_data, get_data
from modules.ui_admin import admin_flow
from modules.ui_driver import driver_flow

st.set_page_config(page_title="Logis-Pro 360", page_icon="🚚", layout="wide")

def login_page():
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        st.title("🚚 เข้าสู่ระบบ")
        with st.form("login"):
            u = st.text_input("User ID")
            p = st.text_input("Password", type="password")
            if st.form_submit_button("Login", use_container_width=True):
                drivers = get_data("Master_Drivers")
                if not drivers.empty:
                    drivers['Driver_ID'] = drivers['Driver_ID'].astype(str)
                    user = drivers[drivers['Driver_ID'] == u]
                    if not user.empty and str(user.iloc[0]['Password']) == p:
                        st.session_state.logged_in = True
                        st.session_state.driver_id = u
                        st.session_state.driver_name = user.iloc[0]['Driver_Name']
                        st.session_state.vehicle_plate = user.iloc[0].get('Vehicle_Plate', '-')
                        st.session_state.user_role = user.iloc[0].get('Role', 'Driver')
                        st.rerun()
                    else: st.error("รหัสผ่านผิด")
                else: st.error("ไม่พบข้อมูล")

def main():
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False

    if not st.session_state.logged_in:
        login_page()
    else:
        # Pre-load data once
        if 'data_store' not in st.session_state:
            with st.spinner("กำลังโหลดข้อมูล..."):
                st.session_state.data_store = load_all_data()

        if st.session_state.user_role == "Admin":
            admin_flow()
        else:
            driver_flow()

if __name__ == "__main__":
    main()