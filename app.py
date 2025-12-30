"""
LOGIS-PRO 360 - Enterprise Transport Management System
One Stop Solution for Logistics Management
"""

import streamlit as st
import time
from config.settings import settings
from data.repository import repo, clear_all_cache
from services.auth_service import AuthService
from services.alert_service import AlertService
from utils.translations import menu, t, MENU, UI

# ============================================================
# Page Configuration
# ============================================================
st.set_page_config(
    page_title="LOGIS-PRO 360",
    page_icon="🚚",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# Real-time Alert Polling (Streamlit 1.37+)
# ============================================================
if hasattr(st, "fragment"):
    @st.fragment(run_every=12)
    def check_updates():
        """High-frequency polling for real-time notifications (Optimized)."""
        try:
            from services.supabase_client import get_supabase_client
            from datetime import datetime
            
            # Initialize Session State if missing
            if 'alert_counts' not in st.session_state:
                st.session_state.alert_counts = {'sos': 0, 'chat': 0, 'repairs': 0, 'fuel': 0}
            
            play_sound = False
            sb = get_supabase_client()
            
            current_counts = st.session_state.alert_counts.copy()
            new_counts = current_counts.copy()
            has_changes = False

            # 1. SOS Alerts
            try:
                sos_res = sb.table('sos_alerts').select('alert_id', count='exact', head=True).eq('status', 'ACTIVE').execute()
                sos_count = sos_res.count if sos_res.count is not None else 0
                
                if sos_count > current_counts.get('sos', 0):
                    st.toast(f"🚨 SOS ฉุกเฉิน: {sos_count} รายการ!", icon="🚨")
                    play_sound = True
                
                if sos_count != current_counts.get('sos', 0):
                    new_counts['sos'] = sos_count
                    has_changes = True
            except Exception: pass

            # 2. Chat Messages
            try:
                chat_res = sb.table('chat_messages').select('id', count='exact', head=True).eq('sender', 'driver').eq('read', False).execute()
                chat_count = chat_res.count if chat_res.count is not None else 0
                
                if chat_count > current_counts.get('chat', 0):
                    st.toast(f"💬 ข้อความใหม่ ({chat_count})", icon="💬")
                    play_sound = True
                    
                if chat_count != current_counts.get('chat', 0):
                    new_counts['chat'] = chat_count
                    has_changes = True
            except Exception: pass

            # 3. Maintenance
            try:
                repair_res = sb.table('Repair_Tickets').select('Ticket_ID', count='exact', head=True).eq('Status', 'Open').execute()
                repair_count = repair_res.count if repair_res.count is not None else 0
                
                if repair_count > current_counts.get('repairs', 0):
                    st.toast(f"🔧 แจ้งซ่อมใหม่ ({repair_count})", icon="🔧")
                    play_sound = True
                
                if repair_count != current_counts.get('repairs', 0):
                    new_counts['repairs'] = repair_count
                    has_changes = True
            except Exception: pass
            
            # 4. Fuel
            try:
                today_str = datetime.now().strftime('%Y-%m-%d')
                fuel_res = sb.table('Fuel_Logs').select('Log_ID', count='exact', head=True).gte('Date_Time', today_str).execute()
                fuel_count = fuel_res.count if fuel_res.count is not None else 0

                if fuel_count > current_counts.get('fuel', 0):
                     st.toast(f"⛽ เติมน้ำมันใหม่ ({fuel_count})", icon="⛽")
                     play_sound = True 

                if fuel_count != current_counts.get('fuel', 0):
                    new_counts['fuel'] = fuel_count
                    has_changes = True
            except Exception: pass

            # Only update session state if actually changed (Prevents Rerun loops)
            if has_changes:
                st.session_state.alert_counts = new_counts

            # 3. Sound Effect
            if play_sound:
                st.markdown("""
                    <audio autoplay>
                        <source src="https://www.soundjay.com/buttons/beep-07a.mp3" type="audio/mpeg">
                    </audio>
                """, unsafe_allow_html=True)
                
        except Exception as e:
            pass # Fail silently in background

    try:
        check_updates()
    except Exception:
        pass

# ============================================================
# Custom CSS for Enterprise Look
# ============================================================
def load_custom_css():
    st.markdown("""
    <style>
    /* ============================================
       LOGISTICS TMS & ePOD - ENTERPRISE DESIGN SYSTEM
       Theme: Enterprise Premium (Lovable)
       ============================================ */
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

    :root {
      /* Primary Palette */
      --primary-deep-blue: #1a237e;
      --primary-dark-blue: #0d1442;
      --primary-accent-red: #d32f2f;
      
      /* Extended Blues */
      --blue-50: #e8eaf6;
      --blue-100: #c5cae9;
      --blue-200: #9fa8da;
      --blue-300: #7986cb;
      --blue-400: #5c6bc0;
      --blue-500: #3f51b5;
      --blue-600: #3949ab;
      --blue-700: #303f9f;
      --blue-800: #283593;
      --blue-900: #1a237e;
      
      /* Neutrals */
      --background: #F8F9FA;
      --surface: #FFFFFF;
      --surface-elevated: #FFFFFF;
      --border-light: #E2E8F0;
      --border-medium: #CBD5E1;
      --text-primary: #1E293B;
      --text-secondary: #64748B;
      --text-muted: #94A3B8;
      --text-inverse: #FFFFFF;
      
      /* Status Colors */
      --success: #22C55E;
      --success-bg: #F0FDF4;
      --warning: #F59E0B;
      --warning-bg: #FFFBEB;
      --error: #EF4444;
      --error-bg: #FEF2F2;
      --info: #3B82F6;
      --info-bg: #EFF6FF;
      
      /* Shadows */
      --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --shadow-card: 0 2px 8px rgba(26, 35, 126, 0.08);
      --shadow-card-hover: 0 8px 24px rgba(26, 35, 126, 0.12);
      
      /* Glassmorphism */
      --glass-bg: rgba(255, 255, 255, 0.1);
      --glass-border: rgba(255, 255, 255, 0.2);
      --glass-blur: blur(12px);
      
      /* Transitions */
      --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
      
      /* Border Radius */
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --radius-2xl: 24px;
      
      /* Typography */
      --font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Base Styles */
    html, body, [class*="css"] {
      font-family: var(--font-family);
      background: var(--background);
      color: var(--text-primary);
    }
    .stApp { background-color: var(--background); }

    /* ================= SIDEBAR (Robust Styling) ================= */
    section[data-testid="stSidebar"] {
        background-color: #1a237e !important;
        background: linear-gradient(180deg, #1a237e 0%, #0d1442 100%) !important;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
    }
    
    /* Ensure content background is transparent so gradient shows */
    section[data-testid="stSidebar"] > div {
        background: transparent !important;
    }

    /* Force all text in sidebar to be white/light */
    section[data-testid="stSidebar"] h1,
    section[data-testid="stSidebar"] h2,
    section[data-testid="stSidebar"] h3,
    section[data-testid="stSidebar"] p, 
    section[data-testid="stSidebar"] span,
    section[data-testid="stSidebar"] label,
    section[data-testid="stSidebar"] div {
        color: #ffffff !important;
    }
    
    /* Menu Group Headers */
    .menu-group {
        font-size: 0.8rem !important;
        font-weight: 700 !important;
        color: rgba(255,255,255,0.5) !important;
        margin-top: 24px !important; 
        margin-bottom: 8px !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
    }

    /* Navigation Buttons (Standardizing all sidebar buttons) */
    section[data-testid="stSidebar"] .stButton button {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: rgba(255, 255, 255, 0.9) !important;
        text-align: left !important;
        padding: 10px 16px !important;
        margin-bottom: 4px !important;
        border-radius: var(--radius-md) !important;
        transition: all 0.2s ease-in-out !important;
        font-family: 'Sarabun', sans-serif !important;
        box-shadow: none !important;
        display: flex !important;
        justify-content: flex-start !important;
    }
    
    section[data-testid="stSidebar"] .stButton button:hover {
        background: rgba(255, 255, 255, 0.15) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        color: white !important;
        transform: translateX(4px);
    }
    
    section[data-testid="stSidebar"] .stButton button:active,
    section[data-testid="stSidebar"] .stButton button:focus {
        background: var(--primary-accent-red) !important;
        border-color: var(--primary-accent-red) !important;
        color: white !important;
    }

    /* Fix Badge/Icon Spacing in Sidebar Buttons */
    section[data-testid="stSidebar"] .stButton button p {
        color: inherit !important;
        font-weight: 500 !important;
    }
    
    /* Hide default Streamlit decoration */
    div[data-testid="stDecoration"] {
        background-image: none;
        background: var(--primary-deep-blue);
    }

    /* ================= METRIC CARDS (Lovable) ================= */
    .tms-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .tms-metric-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 24px;
      position: relative;
      box-shadow: var(--shadow-card);
      transition: all var(--transition-base);
      border: 1px solid var(--border-light);
      overflow: hidden;
      color: var(--text-primary);
    }

    .tms-metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-deep-blue) 0%, var(--blue-500) 100%);
    }

    .tms-metric-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-2px); }
    .tms-metric-card.accent-red::before { background: linear-gradient(90deg, var(--primary-accent-red) 0%, #f44336 100%); }
    .tms-metric-card.accent-green::before { background: linear-gradient(90deg, #22C55E 0%, #4ADE80 100%); }

    .tms-metric-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    
    .tms-metric-icon {
      width: 48px; height: 48px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      background: var(--blue-50); color: var(--primary-deep-blue);
    }
    
    .tms-metric-card.accent-red .tms-metric-icon { background: #FFEBEE; color: var(--primary-accent-red); }

    .tms-metric-trend {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px;
    }
    .tms-metric-trend.up { background: var(--success-bg); color: var(--success); }
    .tms-metric-trend.down { background: var(--error-bg); color: var(--error); }

    .tms-metric-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .tms-metric-value { font-size: 32px; font-weight: 700; color: var(--text-primary); line-height: 1.1; letter-spacing: -0.02em; }
    .tms-metric-subtext { font-size: 13px; color: var(--text-muted); margin-top: 8px; }

    /* ================= KANBAN BOARD (Lovable) ================= */
    .tms-kanban-board { display: flex; gap: 20px; overflow-x: auto; padding: 16px 0 32px 0; }
    .tms-kanban-column {
      flex: 0 0 320px;
      height: 75vh;
      max-height: 800px;
      background: #F1F5F9;
      border-radius: var(--radius-lg);
      display: flex; flex-direction: column;
      border: 1px solid var(--border-light);
    }

    .tms-kanban-column-body {
      padding: 12px;
      display: flex; flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      flex: 1; /* Take remaining height */
      
      /* Custom Scrollbar */
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }
    .tms-kanban-column-body::-webkit-scrollbar { width: 6px; }
    .tms-kanban-column-body::-webkit-scrollbar-track { background: transparent; }
    .tms-kanban-column-body::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
    .tms-kanban-column-body::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

    .tms-kanban-card {
      background: var(--surface);
      border-radius: var(--radius-md);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-light);
      cursor: pointer;
      transition: all var(--transition-base);
    }
    .tms-kanban-card:hover { box-shadow: var(--shadow-md); border-color: var(--blue-300); transform: translateY(-1px); }

    .tms-kanban-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .tms-kanban-card-id { font-size: 12px; font-weight: 600; color: var(--primary-deep-blue); background: var(--blue-50); padding: 3px 8px; border-radius: var(--radius-sm); }
    
    .status-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; }
    .status-new { background: #F3F4F6; color: #4B5563; }
    .status-assigned { background: #E0F2FE; color: #0284C7; }
    .status-transit { background: #FFEDD5; color: #C2410C; }
    .status-done { background: #DCFCE7; color: #15803D; }

    .tms-kanban-card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px 0; line-height: 1.4; }
    
    .tms-kanban-card-meta { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border-light); margin-top: 12px;}
    .tms-kanban-meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    
    /* Login Page Overrides */
    .login-logo h1 { font-family: var(--font-family); background: linear-gradient(135deg, var(--primary-deep-blue) 0%, var(--primary-accent-red) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    
    /* Hide Streamlit Elements */
    #MainMenu {visibility: hidden;} footer {visibility: hidden;} header {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)


# ============================================================
# Import Views (Moved to render_main_content for Lazy Loading)
# ============================================================
# Legacy driver module removed - all functionality now in mobile app


# ============================================================
# Login Page
# ============================================================
def login_page():
    load_custom_css()
    
    # Get language
    lang = st.session_state.get("lang", "th")
    
    # Main layout columns - use a narrower middle column for a 'card' feel
    col1, col2, col3 = st.columns([1.5, 2, 1.5])
    with col2:
        st.markdown("<br><br>", unsafe_allow_html=True)
        
        # 1. Logo Centering (Using sub-columns)
        # Simply using 3 equal columns and placing logo in the middle one
        lc1, lc2, lc3 = st.columns([1, 1.5, 1])
        with lc2:
            try:
                st.image("assets/logo.png", use_container_width=True)
            except:
                st.markdown('<div style="font-size: 5rem; text-align: center;">🚚</div>', unsafe_allow_html=True)
        
        # 2. Title & Description
        st.markdown("""
        <div style="text-align: center; margin-bottom: 2rem; margin-top: 1rem;">
            <h1 style="background: linear-gradient(135deg, #1a237e 0%, #d32f2f 100%);
                       -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                       font-size: 2.5rem; font-weight: 700; margin: 0;">
                LOGIS-PRO 360
            </h1>
            <p style="color: #666; font-size: 1rem;">Enterprise Transport Management System</p>
        </div>
        """, unsafe_allow_html=True)
        
        # 3. Language Toggle
        lang_col1, lang_col2 = st.columns([5, 1])
        with lang_col2:
            if st.button("🌐 TH/EN", key="lang_toggle_login"):
                st.session_state.lang = "en" if lang == "th" else "th"
                st.rerun()

        # 4. Login Form (Native Streamlit Form)
        # We can mimic a card with a container, but avoid custom HTML background to prevent glitches
        with st.container():
            with st.form("login"):
                st.markdown(f"### {t('login', lang)}")
                u = st.text_input(t('username', lang), placeholder="Username").strip()
                p = st.text_input(t('password', lang), type="password", placeholder="Password")
                
                st.markdown("<br>", unsafe_allow_html=True)
                submitted = st.form_submit_button(f"🔒 {t('login', lang)}", use_container_width=True, type="primary")

        
        if submitted:
            user_session = AuthService.login(u, p)
            
            if user_session:
                for k, v in user_session.items():
                    st.session_state[k] = v
                
                st.session_state.driver_id = st.session_state.user_id
                st.session_state.driver_name = st.session_state.user_name
                st.session_state.vehicle_plate = "-"
                
                st.toast(f"✅ {t('welcome', lang)} {st.session_state.user_name}")
                time.sleep(0.5)
                st.rerun()
            else:
                st.error(f"❌ {t('error', lang)}: Invalid credentials")
        
        # Footer
        st.markdown("""
        <div style="text-align: center; margin-top: 3rem; color: #999; font-size: 0.8rem;">
            © 2024 LOGIS-PRO 360 | Enterprise Edition <br> v2.0
        </div>
        """, unsafe_allow_html=True)


# ============================================================
# Logout
# ============================================================
def logout():
    for k in list(st.session_state.keys()):
        del st.session_state[k]
    st.rerun()


# ============================================================
# Enterprise Sidebar Navigation
# ============================================================
def render_sidebar():
    lang = st.session_state.get("lang", "th")
    
    with st.sidebar:
        # Logo & User
        # Logo & User
        try:
            st.image("assets/logo.png", use_container_width=True)
            st.markdown('<div style="margin-bottom: 1rem;"></div>', unsafe_allow_html=True)
        except:
            st.markdown("""
            <div style="text-align: center; padding: 1rem 0;">
                <div style="font-size: 2.5rem;">🚚</div>
                <h2 style="color: white; margin: 0.5rem 0 0;">LOGIS-PRO 360</h2>
            </div>
            """, unsafe_allow_html=True)
        
        # Bell Icon + User Profile
        c_bell_1, c_bell_2 = st.columns([4, 1])
        with c_bell_1:
            st.markdown(f"""
            <div style="text-align: left; padding: 0.5rem; background: rgba(255,255,255,0.1); 
                        border-radius: 8px;">
                <p style="color: white; margin: 0; font-weight: 600;">👤 {st.session_state.user_name}</p>
                <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 0.8rem;">
                    {st.session_state.user_role}
                </p>
            </div>
            """, unsafe_allow_html=True)
        # Notification & User Profile
        c1, c2 = st.columns([1, 4])
        with c1:
            unread_count = AlertService.get_unread_count()
            lbl = "🔔"
            if unread_count > 0:
                lbl = f"🔔 ({unread_count})"
                
            if st.button(lbl, key="btn_alerts", help="ดูการแจ้งเตือน"):
                st.session_state.current_page = 'alerts'
                st.rerun()
        
        # --- Auto-Archive Trigger (Background) ---
        if "archive_checked" not in st.session_state:
            st.session_state.archive_checked = True 
            # Only run for Admin
            role = str(st.session_state.user_role).lower()
            if "admin" in role:
                try:
                    from services.archive_service import archive_service
                    # Run check (45 days rule)
                    if archive_service.connected:
                        success, result = archive_service.check_and_archive(days_threshold=45)
                        if success and result > 0:
                            st.toast(f"📦 Auto-Archived {result} old jobs to Google Sheets", icon="🗄️")
                except Exception as e:
                    print(f"Archive Trigger Error: {e}")
        # ----------------------------------------
        
        st.divider()
        
        # Language Toggle
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🇹🇭 ไทย" if lang == "th" else "🇹🇭 TH", use_container_width=True, 
                        type="primary" if lang == "th" else "secondary"):
                st.session_state.lang = "th"
                st.rerun()
        with col2:
            if st.button("🇬🇧 EN" if lang == "en" else "🇬🇧 English", use_container_width=True,
                        type="primary" if lang == "en" else "secondary"):
                st.session_state.lang = "en"
                st.rerun()
        
        st.divider()
        
        # Initialize current page
        if "current_page" not in st.session_state:
            st.session_state.current_page = "dashboard"
        
        # Menu Groups
        # Group 1: Main
        st.markdown(f'<p class="menu-group">{"📊 หลัก" if lang == "th" else "📊 MAIN"}</p>', unsafe_allow_html=True)
        if st.button(menu("dashboard", lang), key="nav_dashboard", use_container_width=True):
            st.session_state.current_page = "dashboard"
            st.rerun()
        
        # Group 2: Operations
        st.markdown(f'<p class="menu-group">{"🚛 ปฏิบัติการ" if lang == "th" else "🚛 OPERATIONS"}</p>', unsafe_allow_html=True)
        if st.button(menu("planning", lang), key="nav_planning", use_container_width=True):
            st.session_state.current_page = "planning"
            st.rerun()
        if st.button(menu("monitor", lang), key="nav_monitor", use_container_width=True):
            st.session_state.current_page = "monitoring"
            st.rerun()
        if st.button(menu("gps", lang), key="nav_gps", use_container_width=True):
            st.session_state.current_page = "gps"
            st.rerun()
        if st.button("📄 " + ("จัดการ POD" if lang == "th" else "POD"), key="nav_pod", use_container_width=True):
            st.session_state.current_page = "pod"
            st.rerun()
        if st.button("📋 " + ("Checklist คนขับ" if lang == "th" else "Driver Checklist"), key="nav_checklist", use_container_width=True):
            st.session_state.current_page = "checklist"
            st.rerun()
        
        # SOS Alerts with badge
        try:
            from services.supabase_client import get_supabase_client
            sb = get_supabase_client()
            sos_response = sb.table('sos_alerts').select('alert_id').eq('status', 'ACTIVE').execute()
            sos_count = len(sos_response.data) if sos_response.data else 0
            sos_label = "🚨 " + ("SOS Alerts" if lang == "th" else "SOS Alerts")
            if sos_count > 0:
                sos_label += f" 🔴 {sos_count}"
        except:
            sos_label = "🚨 SOS Alerts"
            sos_count = 0
        
        if st.button(sos_label, key="nav_sos", use_container_width=True):
            st.session_state.current_page = "sos"
            st.rerun()
        
        # Chat with badge
        try:
            chat_response = sb.table('chat_messages').select('driver_id').eq('sender', 'driver').eq('read', False).execute()
            chat_count = len(chat_response.data) if chat_response.data else 0
            chat_label = "💬 " + ("แชทคนขับ" if lang == "th" else "Driver Chat")
            if chat_count > 0:
                chat_label += f" 🔴 {chat_count}"
        except:
            chat_label = "💬 " + ("แชทคนขับ" if lang == "th" else "Driver Chat")
        
        if st.button(chat_label, key="nav_chat", use_container_width=True):
            st.session_state.current_page = "chat"
            st.rerun()
            
        # Group 3: Fleet
        st.markdown(f'<p class="menu-group">{"🔧 กองยาน" if lang == "th" else "🔧 FLEET"}</p>', unsafe_allow_html=True)
        
        # Maintenance with badge
        try:
            tickets = repo.get_data("Repair_Tickets")
            open_count = len(tickets[tickets['Status'] == 'Open']) if not tickets.empty and 'Status' in tickets.columns else 0
            maintenance_label = menu("maintenance", lang)
            if open_count > 0:
                maintenance_label += f" 🔴 {open_count}"
        except:
            maintenance_label = menu("maintenance", lang)
            
        if st.button(maintenance_label, key="nav_maintenance", use_container_width=True):
            st.session_state.current_page = "maintenance"
            st.rerun()
        if st.button(menu("vendor", lang), key="nav_vendor", use_container_width=True):
            st.session_state.current_page = "vendor"
            st.rerun()
            
        # Fuel with badge
        try:
            fuel = repo.get_data("Fuel_Logs")
            # Count today's fuel logs
            from datetime import datetime, timedelta
            import pandas as pd
            if not fuel.empty and 'Date_Time' in fuel.columns:
                fuel['Date'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
                today = datetime.now().date()
                today_count = len(fuel[fuel['Date'].dt.date == today])
                fuel_label = "⛽ " + ("จัดการน้ำมัน" if lang == "th" else "Fuel Mgmt")
                if today_count > 0:
                    fuel_label += f" 🆕 {today_count}"
            else:
                fuel_label = "⛽ " + ("จัดการน้ำมัน" if lang == "th" else "Fuel Mgmt")
        except:
            fuel_label = "⛽ " + ("จัดการน้ำมัน" if lang == "th" else "Fuel Mgmt")
            
        if st.button(fuel_label, key="nav_fuel", use_container_width=True):
            st.session_state.current_page = "fuel"
            st.rerun()
        if st.button("📄 " + ("เอกสารรถ/ต่อสัญญา" if lang == "th" else "Vehicle Docs"), key="nav_documents", use_container_width=True):
            st.session_state.current_page = "documents"
            st.rerun()
        
        # Group 4: Finance
        st.markdown(f'<p class="menu-group">{"💰 การเงิน" if lang == "th" else "💰 FINANCE"}</p>', unsafe_allow_html=True)
        if st.button(menu("accounting", lang), key="nav_accounting", use_container_width=True):
            st.session_state.current_page = "accounting"
            st.rerun()
        if st.button(menu("wms", lang), key="nav_wms", use_container_width=True):
            st.session_state.current_page = "wms"
            st.rerun()
        
        # Group 5: Analytics (NEW!)
        st.markdown(f'<p class="menu-group">{"📊 วิเคราะห์" if lang == "th" else "📊 ANALYTICS"}</p>', unsafe_allow_html=True)
        if st.button("🔔 " + ("แจ้งเตือน" if lang == "th" else "Alerts"), key="nav_alerts", use_container_width=True):
            st.session_state.current_page = "alerts"
            st.rerun()
        if st.button("📊 " + ("รายงาน" if lang == "th" else "Reports"), key="nav_reports", use_container_width=True):
            st.session_state.current_page = "reports"
            st.rerun()
        if st.button("📅 " + ("ปฏิทิน" if lang == "th" else "Calendar"), key="nav_calendar", use_container_width=True):
            st.session_state.current_page = "calendar"
            st.rerun()
        
        # Group 6: System
        st.markdown(f'<p class="menu-group">{"⚙️ ระบบ" if lang == "th" else "⚙️ SYSTEM"}</p>', unsafe_allow_html=True)
        if st.button(menu("master", lang), key="nav_master", use_container_width=True):
            st.session_state.current_page = "master_data"
            st.rerun()
        if st.button("📋 " + ("ประวัติ" if lang == "th" else "Activity"), key="nav_activity", use_container_width=True):
            st.session_state.current_page = "activity"
            st.rerun()
        if st.button(menu("manual", lang), key="nav_manual", use_container_width=True):
            st.session_state.current_page = "manual"
            st.rerun()
        if st.button("🗄️ " + ("คลังข้อมูลเก่า" if lang == "th" else "Archive"), key="nav_history", use_container_width=True):
            st.session_state.current_page = "history"
            st.rerun()
        
        st.divider()
        
        # Actions
        if st.button(f"🔄 {t('refresh', lang)}", key="nav_sync", use_container_width=True):
            clear_all_cache()
            st.rerun()
        
        if st.button(menu("logout", lang), key="nav_logout", use_container_width=True, type="primary"):
            logout()


# ============================================================
# Alerts Service (Deprecated - Moved to Fragment)
# ============================================================
# Logic moved to check_updates() fragment at top


# ============================================================
# Main Content Router
# ============================================================
def render_main_content():
    page = st.session_state.get("current_page", "dashboard")
    
    # --- Routing ---
    # --- Lazy Routing ---
    if page == "dashboard":
        from views.admin.dashboard_view import render_dashboard_view
        render_dashboard_view()
    elif page == "planning":
        from views.admin.planning_view import render_planning_view
        render_planning_view()
    elif page == "monitoring":
        from views.admin.monitoring_view import render_monitoring_view
        render_monitoring_view()
    elif page == "gps":
        from views.admin.gps_view import render_gps_view
        render_gps_view()
    elif page == "maintenance":
        from views.admin.maintenance_view import render_maintenance_view
        render_maintenance_view()
    elif page == "master_data":
        from views.admin.master_data_view import render_master_data_view
        render_master_data_view()
    elif page == "accounting":
        from views.admin.accounting_view import render_accounting_view
        render_accounting_view()
    elif page == "manual":
        from views.admin.manual_view import render_manual_view
        render_manual_view()
    elif page == "wms":
        from views.admin.wms_view import render_wms_view
        render_wms_view()
    elif page == "vendor":
        from views.admin.vendor_view import render_vendor_view
        render_vendor_view()
    elif page == "alerts":
        from views.admin.alerts_view import render_alerts_view
        render_alerts_view()
    elif page == "reports":
        from views.admin.reports_view import render_reports_view
        render_reports_view()
    elif page == "calendar":
        from views.admin.calendar_view import render_calendar_view
        render_calendar_view()
    elif page == "activity":
        from views.admin.activity_log_view import render_activity_log_view
        render_activity_log_view()
    elif page == "pod":
        from views.admin.pod_view import render_pod_view
        render_pod_view()
    elif page == "fuel":
        from views.admin.fuel_view_v2 import render_fuel_view
        render_fuel_view()
    elif page == "sos":
        from views.admin.sos_view import render_sos_view
        render_sos_view()
    elif page == "checklist":
        from views.admin.checklist_view import render_checklist_view
        render_checklist_view()
    elif page == "chat":
        from views.admin.chat_view import render_chat_view
        render_chat_view()
    elif page == "documents":
        from views.admin.documents_view import render_documents_view
        render_documents_view()
    elif page == "history":
        from views.admin.history_view import render_history_view
        render_history_view()
    else:
        # Default
        from views.admin.dashboard_view import render_dashboard_view
        render_dashboard_view()


# ============================================================
# Main Application
# ============================================================
def main():
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = False
    if "user_role" not in st.session_state:
        st.session_state.user_role = ""
    if "lang" not in st.session_state:
        st.session_state.lang = "th"
    
    if not st.session_state.logged_in:
        login_page()
    else:
        load_custom_css()
        
        role = str(st.session_state.user_role).lower()
        is_admin = "admin" in role or "super" in role
        
        if is_admin:
            render_sidebar()
            render_main_content()
        else:
            # Driver flow
            driver_flow()


if __name__ == "__main__":
    main()
