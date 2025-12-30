
import streamlit as st
import pandas as pd
import base64
import time
from data.repository import repo
from data.models import SCHEMAS, get_template_df
from services.auth_service import hash_password
from config.constants import UserRole

# Language Labels
LABELS = {
    "th": {
        "title": "🗄️ จัดการข้อมูลหลัก",
        "tab_drivers": "🚛 พนักงานขับรถ/รถ",
        "tab_cust": "🏢 ลูกค้า",
        "tab_routes": "📍 เส้นทาง",
        "tab_users": "👥 ผู้ใช้งาน",
        "tab_config": "⚙️ ตั้งค่าระบบ",
        "tab_advanced": "🛠️ จัดการฐานข้อมูล (ขั้นสูง)",
        "search": "ค้นหา",
        "refresh": "รีเฟรช",
        "import": "นำเข้า CSV",
        "export": "ส่งออก Excel",
        "save": "บันทึกการแก้ไข",
        "success": "บันทึกเรียบร้อย",
        "failed": "บันทึกไม่สำเร็จ",
        "no_data": "ไม่พบข้อมูล",
        "add_new": "เพิ่มข้อมูลใหม่",
        "select_table": "เลือกตารางข้อมูล",
        "table": "ตาราง",
        "showing": "แสดงผล",
        "records": "รายการ",
        "warning_advanced": "⚠️ คำเตือน: การแก้ไขในหน้านี้จะมีผลโดยตรงกับฐานข้อมูล โปรดระมัดระวัง",
        "user_mgmt": "จัดการผู้ใช้งานระบบ",
        "create_user": "สร้างผู้ใช้งานใหม่",
        "reset_pw": "รีเซ็ตรหัสผ่าน",
        "username": "ชื่อผู้ใช้",
        "password": "รหัสผ่าน",
        "confirm_pw": "ยืนยันรหัสผ่าน",
        "display_name": "ชื่อที่แสดง",
        "role": "สิทธิ์การใช้งาน",
        "branch": "สาขา",
        "req_fields": "กรุณากรอกข้อมูลให้ครบ",
        "pw_mismatch": "รหัสผ่านไม่ตรงกัน",
        "user_exists": "ชื่อผู้ใช้นี้มีอยู่แล้ว",
        "user_created": "สร้างผู้ใช้งานเรียบร้อย",
        "pw_reset_success": "รีเซ็ตรหัสผ่านเรียบร้อย",
        "import_preview": "ตัวอย่างข้อมูล",
        "confirm_import": "ยืนยันการนำเข้า",
        "cancel": "ยกเลิก",
        "download_template": "ดาวน์โหลดฟอร์ม (Template)",
        "import_help": "💡 ใช้ฟอร์มนี้กรอกข้อมูล: หากมี ID ซ้ำจะเป็นการแก้ไข, หาก ID ใหม่จะเป็นการเพิ่มต่อท้าย"
    },
    "en": {
        "title": "🗄️ Master Data Management",
        "tab_drivers": "🚛 Drivers/Vehicles",
        "tab_cust": "🏢 Customers",
        "tab_routes": "📍 Routes",
        "tab_users": "👥 Users",
        "tab_config": "⚙️ Config",
        "tab_advanced": "🛠️ Database Manager (Advanced)",
        "search": "Search",
        "refresh": "Refresh",
        "import": "Import CSV",
        "export": "Export CSV",
        "save": "Save Changes",
        "success": "Saved successfully!",
        "failed": "Save failed",
        "no_data": "No data found",
        "add_new": "Add New Record",
        "select_table": "Select Table",
        "table": "Table",
        "showing": "Showing",
        "records": "records",
        "warning_advanced": "⚠️ AWS: Direct database editing. Proceed with caution.",
        "user_mgmt": "User Management",
        "create_user": "Create New User",
        "reset_pw": "Reset Password",
        "username": "Username",
        "password": "Password",
        "confirm_pw": "Confirm Password",
        "display_name": "Display Name",
        "role": "Role",
        "branch": "Branch",
        "req_fields": "Please fill all required fields",
        "pw_mismatch": "Passwords do not match",
        "user_exists": "Username already exists",
        "user_created": "User created successfully",
        "pw_reset_success": "Password reset successfully",
        "import_preview": "Data Preview",
        "confirm_import": "Confirm Import",
        "cancel": "Cancel",
        "download_template": "Download Template CSV",
        "import_help": "💡 Use this template: Existing IDs update, New IDs append."
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_master_data_view():
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    
    t1, t1b, t2, t3, t4, t5, t6 = st.tabs([
        get_label('tab_drivers'),
        "🚛 รถ/ทะเบียน",
        get_label('tab_cust'),
        get_label('tab_routes'),
        get_label('tab_users'),
        get_label('tab_config'),
        get_label('tab_advanced')
    ])
    
    with t1:
        _render_table_editor("Master_Drivers", get_label('tab_drivers'))
    with t1b:
        _render_table_editor("Master_Vehicles", "🚛 รถ/ทะเบียน")
    with t2:
        _render_table_editor("Master_Customers", get_label('tab_cust'))
    with t3:
        _render_table_editor("Master_Routes", get_label('tab_routes'))
    with t4:
        _render_user_management()
    with t5:
        _render_table_editor("System_Config", get_label('tab_config'))
    with t6:
        _render_advanced_editor()

def _render_table_editor(table_name, display_name, key_suffix=""):
    """Generic table editor with search, import, export."""
    """Generic table editor with search, import, export."""
    
    # --- Debug/Admin Tools ---
    if st.session_state.get("role") == "SUPER_ADMIN":
        with st.expander("🛠️ Admin Debug Tools", expanded=False):
            col_dbg1, col_dbg2 = st.columns([3, 1])
            with col_dbg1:
                st.info(f"📍 Current Branch Context: **{st.session_state.get('branch_id', 'Unknown')}**")
            with col_dbg2:
                # Toggle for overriding branch filter
                # Use a reliable key for session state
                is_override = st.checkbox("Show All Data (Ignore Branch)", 
                                        value=st.session_state.get("debug_show_all_branches", False),
                                        key=f"debug_override_{table_name}{key_suffix}")
                
                # Check if changed
                if is_override != st.session_state.get("debug_show_all_branches", False):
                    st.session_state["debug_show_all_branches"] = is_override
                    st.cache_data.clear() # Clear cache to reflect change
                    st.rerun()

    st.markdown(f"#### 📋 {display_name}")
    
    df = repo.get_data(table_name)
    
    # Unique keys for session state
    import_key = f'show_import_{table_name}{key_suffix}'
    
    # Init session state for this table if not exists
    if import_key not in st.session_state:
        st.session_state[import_key] = False
    
    # Toolbar
    col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
    
    with col1:
        search = st.text_input(get_label('search'), key=f"search_{table_name}{key_suffix}", placeholder="...")
    
    with col2:
        if st.button(get_label('refresh'), key=f"refresh_{table_name}{key_suffix}"):
            st.cache_data.clear()
            st.rerun()
    
    with col3:
        if st.button(get_label('import'), key=f"import_{table_name}{key_suffix}"):
            st.session_state[import_key] = not st.session_state[import_key]
    
    with col4:
        if not df.empty:
            # Exclude image/base64 columns for cleaner export
            exclude_cols = ['Photo_Proof_Url', 'Photo_Url', 'Signature_Url', 'vehicle_photo']
            export_df = df.drop(columns=[c for c in exclude_cols if c in df.columns], errors='ignore')
            csv = export_df.to_csv(index=False)
            b64 = base64.b64encode(csv.encode()).decode()
            href = f'<a href="data:file/csv;base64,{b64}" download="{table_name}.csv" class="css-button">{get_label("export")}</a>'
            st.markdown(href, unsafe_allow_html=True)
    
    # Import Section
    if st.session_state[import_key]:
        with st.container(border=True):
            st.markdown(f"##### 📥 {get_label('import')}")
            
            # Template Download
            template_df = get_template_df(table_name)
            
            if not template_df.empty:
                csv = template_df.to_csv(index=False)
                b64 = base64.b64encode(csv.encode()).decode()
                href = f'<a href="data:file/csv;base64,{b64}" download="{table_name}_template.csv" style="text-decoration:none; color:#1976d2; font-weight:bold;">📄 {get_label("download_template")}</a>'
                st.markdown(href, unsafe_allow_html=True)
                st.caption(get_label('import_help'))

            uploaded = st.file_uploader(f"Upload CSV", type=['csv'], key=f"upload_{table_name}{key_suffix}")
            
            if uploaded:
                try:
                    # Try multiple encodings for CSV
                    import_df = None
                    for encoding in ['utf-8', 'utf-8-sig', 'tis-620', 'cp874', 'latin-1']:
                        try:
                            uploaded.seek(0)
                            import_df = pd.read_csv(uploaded, encoding=encoding)
                            break
                        except (UnicodeDecodeError, LookupError):
                            continue
                    if import_df is None:
                        uploaded.seek(0)
                        import_df = pd.read_csv(uploaded, encoding='latin-1', errors='ignore')
                    st.write(f"{get_label('import_preview')}: {len(import_df)} {get_label('records')}")
                    st.dataframe(import_df.head())
                    
                    if st.button(get_label('confirm_import'), key=f"confirm_imp_{table_name}{key_suffix}"):
                        try:
                            from supabase import create_client
                            from config.settings import settings
                            sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                            
                            # Convert DataFrame to records, handle empty values properly
                            import numpy as np
                            # Replace invalid values with None (including Excel errors)
                            invalid_values = [np.inf, -np.inf, np.nan, '', '-', 'N/A', 'n/a', 'NA', 'None', 'null',
                                            '#VALUE!', '#REF!', '#NAME?', '#DIV/0!', '#NULL!', '#N/A', '#NUM!', '#ERROR!']
                            import_df = import_df.replace(invalid_values, None)
                            
                            # Convert date columns from DD/MM/YYYY to YYYY-MM-DD
                            date_columns = ['Plan_Date', 'Date_Service', 'Date_Report', 'Date_Finish', 
                                          'Insurance_Expiry', 'Tax_Expiry', 'Act_Expiry', 'expiry_date',
                                          'issue_date', 'Last_Service_Date', 'Payment_Date', 'Billing_Date']
                            for col in date_columns:
                                if col in import_df.columns:
                                    import_df[col] = pd.to_datetime(import_df[col], dayfirst=True, errors='coerce').dt.strftime('%Y-%m-%d')
                                    import_df[col] = import_df[col].replace('NaT', None)
                            
                            # Convert to dict and clean None/NaN values, fix numeric formatting
                            import re
                            date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}')  # YYYY-MM-DD pattern
                            math_pattern = re.compile(r'^[\d\.\+\-\*\/\(\)\s]+$')  # Simple math expression
                            data_to_save = []
                            for record in import_df.to_dict(orient='records'):
                                clean_record = {}
                                for k, v in record.items():
                                    if v is None or v == 'NaT' or (isinstance(v, float) and (np.isnan(v) if not isinstance(v, type(None)) else False)):
                                        clean_record[k] = None
                                    elif isinstance(v, str):
                                        # Skip date strings - don't convert to float
                                        if date_pattern.match(v):
                                            clean_record[k] = v
                                        # Remove commas from numbers like "6,593" -> "6593"
                                        elif v.replace(',', '').replace('.', '').lstrip('-').isdigit() and ',' in v:
                                            clean_record[k] = float(v.replace(',', ''))
                                        # Evaluate simple math expressions like "800+1600"
                                        elif math_pattern.match(v) and any(op in v for op in ['+', '-', '*', '/']):
                                            try:
                                                clean_record[k] = eval(v)
                                            except:
                                                clean_record[k] = None  # Replace with null if can't evaluate
                                        else:
                                            clean_record[k] = v
                                    else:
                                        clean_record[k] = v
                                data_to_save.append(clean_record)
                            
                            # Filter out empty rows (rows with null primary key)
                            pk_cols = {'Jobs_Main': 'Job_ID', 'Master_Drivers': 'Driver_ID', 'Master_Customers': 'Customer_ID',
                                      'Master_Routes': 'Route_ID', 'Master_Users': 'Username', 'Master_Vehicles': 'Vehicle_Plate',
                                      'Fuel_Logs': 'Log_ID', 'Repair_Tickets': 'Ticket_ID', 'Maintenance_Logs': 'Log_ID'}
                            pk_col = pk_cols.get(table_name, list(data_to_save[0].keys())[0] if data_to_save else None)
                            if pk_col:
                                data_to_save = [r for r in data_to_save if r.get(pk_col) is not None and r.get(pk_col) != '']
                            
                            sb.table(table_name).upsert(data_to_save).execute()
                            st.success(get_label('success'))
                            st.cache_data.clear()
                            st.session_state[import_key] = False
                            st.rerun()
                        except Exception as e:
                            st.error(f"❌ Import Error: {e}")
                except Exception as e:
                    st.error(f"Error: {e}")
    
    # Filter
    if search and not df.empty:
        mask = df.apply(lambda row: row.astype(str).str.contains(search, case=False).any(), axis=1)
        df = df[mask]
    
    if df.empty:
        st.info(get_label('no_data'))
        # Create empty DF with columns if empty
        cols = SCHEMAS.get(table_name, [])
        df = pd.DataFrame(columns=cols)
    else:
        st.caption(f"{get_label('showing')} {len(df)} {get_label('records')}")
    
    # Clean column names (Fix whitespace issues)
    df.columns = df.columns.astype(str).str.strip()

    # Configure Image Columns
    column_config = {}
    image_cols = ['Photo_Url', 'Photo_Proof_Url', 'Slip_Image', 'POD_Image', 'Signature_Url', 'vehicle_photo', 'Ticket_Image']
    
    # Clean image data for display (extract first image from JSON list)
    for col in image_cols:
        if col in df.columns:
            # Clean data strictly for ImageColumn compatibility
            import re
            def clean_img(val):
                if val is None or pd.isna(val) or val == "": return None
                
                # Case 1: Already a list
                if isinstance(val, list):
                    return val[0] if len(val) > 0 else None
                
                # Case 2: String Parsing
                s = str(val).strip()
                
                # If it looks like a list string
                if s.startswith('[') and s.endswith(']'):
                    # Try explicit parsing
                    try:
                        import json
                        # Replacements for common loose JSON issues
                        arr = json.loads(s.replace("'", '"'))
                        if isinstance(arr, list) and len(arr) > 0: return arr[0]
                    except:
                        try:
                            import ast
                            arr = ast.literal_eval(s)
                            if isinstance(arr, list) and len(arr) > 0: return arr[0]
                        except:
                            pass
                    
                    # Regex Fallback for complex strings or errors
                    # Find first occurrence of data:image or http inside quotes
                    match = re.search(r'["\'](data:image[^"\']+|http[^"\']+)["\']', s)
                    if match:
                        return match.group(1)
                        
                    # Last resort: simple strip
                    inner = s[1:-1].strip()
                    if (inner.startswith('"') and inner.endswith('"')) or (inner.startswith("'") and inner.endswith("'")):
                        return inner[1:-1]

                return s
            
            # Apply cleaning
            df[col] = df[col].apply(clean_img)
            
            # Configure column
            column_config[col] = st.column_config.ImageColumn(
                col, 
                help="Double click to preview (Displaying 1st image only)", 
                width="medium"
            )

    # Data Editor
    edited_df = st.data_editor(
        df,
        num_rows="dynamic",
        use_container_width=True,
        key=f"editor_{table_name}{key_suffix}_v3",
        height=500,
        column_config=column_config
    )
    
    # Save button
    col_save, _ = st.columns([1, 4])
    with col_save:
        if st.button(f"💾 {get_label('save')}", key=f"save_{table_name}{key_suffix}", type="primary"):
            if repo.update_data(table_name, edited_df):
                st.success(get_label('success'))
                st.cache_data.clear()
                time.sleep(1)
                st.rerun()
            else:
                st.error(f"{get_label('failed')}: {repo.last_error}")

def _render_advanced_editor():
    """Advanced editor for ANY table."""
    st.markdown(f"#### {get_label('tab_advanced')}")
    st.warning(get_label('warning_advanced'))
    
    # Table Selector
    all_tables = sorted(list(SCHEMAS.keys()))
    selected_table = st.selectbox(get_label('select_table'), all_tables, key="adv_table_select")
    
    if selected_table:
        st.markdown("---")
        _render_table_editor(selected_table, f"{selected_table} (Raw Data)", key_suffix="_adv")

def _render_user_management():
    """User management with password hashing."""
    st.markdown(f"#### {get_label('user_mgmt')}")
    
    users = repo.get_data("Master_Users")
    
    if users.empty:
        st.info("No users. Creating default admin...")
        users = pd.DataFrame([{
            "Username": "admin",
            "Password": "1234",
            "Role": "SUPER_ADMIN",
            "Name": "System Admin",
            "Branch_ID": "ALL",
            "Active_Status": "Active"
        }])
    
    # Hide passwords for display
    display_df = users.copy()
    if 'Password' in display_df.columns:
        display_df['Password'] = display_df['Password'].apply(lambda x: "••••••" if pd.notna(x) and str(x) else "")
    
    st.dataframe(display_df, hide_index=True, use_container_width=True)
    
    # Add user form
    st.markdown("---")
    st.markdown(f"##### ➕ {get_label('create_user')}")
    
    with st.form("add_user"):
        col1, col2 = st.columns(2)
        
        with col1:
            username = st.text_input(f"{get_label('username')}*", key="new_u")
            password = st.text_input(f"{get_label('password')}*", type="password", key="new_p")
            confirm_pw = st.text_input(f"{get_label('confirm_pw')}*", type="password", key="new_cp")
        
        with col2:
            name = st.text_input(f"{get_label('display_name')}*", key="new_n")
            role = st.selectbox(f"{get_label('role')}*", UserRole.ALL, key="new_r")
            
            # Smart Branch Selection
            existing_branches = sorted(list(set(users['Branch_ID'].dropna().astype(str).unique()) | {"HEAD", "ALL"}))
            branch_select = st.selectbox(f"{get_label('branch')}", existing_branches + ["➕ New Branch..."], key="new_b_select")
            if branch_select == "➕ New Branch...":
                branch = st.text_input("ระบุชื่อสาขาใหม่ (Enter Branch Name)", key="new_b_custom")
            else:
                branch = branch_select
        
        if st.form_submit_button(get_label('create_user')):
            if not all([username, password, name]):
                st.error(get_label('req_fields'))
            elif password != confirm_pw:
                st.error(get_label('pw_mismatch'))
            elif username in users['Username'].astype(str).values:
                st.error(get_label('user_exists'))
            else:
                # Hash password
                hashed_pw = hash_password(password)
                
                new_user = {
                    "Username": username,
                    "Password": hashed_pw,
                    "Role": role,
                    "Name": name,
                    "Branch_ID": branch
                }
                
                # Direct Supabase insert with error display
                try:
                    from supabase import create_client
                    from config.settings import settings
                    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                    result = sb.table("Master_Users").insert(new_user).execute()
                    st.success(f"✅ {get_label('user_created')}")
                    st.cache_data.clear()
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ Error: {e}")
    
    # Reset password
    st.markdown("---")
    st.markdown(f"##### 🔑 {get_label('reset_pw')}")
    
    with st.form("reset_password"):
        col1, col2 = st.columns(2)
        
        with col1:
            user_to_reset = st.selectbox(get_label('username'), users['Username'].tolist())
        
        with col2:
            new_password = st.text_input(get_label('password'), type="password", key="reset_p")
        
        if st.form_submit_button(get_label('reset_pw')):
            if not new_password:
                st.error("Password required")
            else:
                hashed = hash_password(new_password)
                users.loc[users['Username'] == user_to_reset, 'Password'] = hashed
                
                if repo.update_data("Master_Users", users):
                    st.success(f"✅ {get_label('pw_reset_success')}")
                else:
                    st.error(get_label('failed'))
