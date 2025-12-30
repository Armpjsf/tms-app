import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from services.gps_service import gps_service
from data.repository import repo
from utils.helpers import safe_float
import pydeck as pdk  # PERFORMANCE: Import once at module level

# Language Labels
LABELS = {
    "th": {
        "title": "📍 ระบบติดตามยานพาหนะ",
        "tab_map": "🗺️ แผนที่สด",
        "tab_alerts": "⚠️ แจ้งเตือน",
        "tab_history": "📜 ประวัติการเดินทาง",
        "connected": "🟢 เชื่อมต่อระบบ GPS",
        "disconnected": "🔴 ไม่ได้เชื่อมต่อ (จำลองข้อมูล)",
        "auto_refresh": "รีเฟรชอัตโนมัติ (30วิ)",
        "no_drivers": "ไม่พบข้อมูลพนักงานขับรถในฐานข้อมูล",
        "vehicle": "ทะเบียนรถ",
        "driver": "คนขับ",
        "speed": "ความเร็ว",
        "status": "สถานะ",
        "last_update": "อัพเดทล่าสุด",
        "unknown": "ไม่ระบุ",
        "alerts_title": "🚨 แจ้งเตือนความปลอดภัย",
        "speeding": "ความเร็วเกินกำหนด",
        "route_deviate": "ออกนอกเส้นทาง",
        "long_stop": "จอดนานผิดปกติ",
        "history_title": "📜 ประวัติการเดินทางย้อนหลัง",
        "select_vehicle": "เลือกยานพาหนะ",
        "from_date": "จากวันที่",
        "to_date": "ถึงวันที่",
        "show_route": "แสดงเส้นทาง",
        "no_history": "ไม่พบข้อมูลการเดินทางในช่วงเวลาที่เลือก",
        "moving": "กำลังวิ่ง",
        "stopped": "จอดนิ่ง"
    },
    "en": {
        "title": "📍 Live GPS & Fleet Tracking",
        "tab_map": "🗺️ Live Map",
        "tab_alerts": "⚠️ Alerts",
        "tab_history": "📜 History",
        "connected": "🟢 Connected to DTC",
        "disconnected": "🔴 Disconnected (Mock Mode)",
        "auto_refresh": "Auto Refresh (30s)",
        "no_drivers": "No drivers found in database.",
        "vehicle": "Vehicle",
        "driver": "Driver",
        "speed": "Speed",
        "status": "Status",
        "last_update": "Last Update",
        "unknown": "Unknown",
        "alerts_title": "🚨 Safety Alerts",
        "speeding": "Speeding",
        "route_deviate": "Route Deviation",
        "long_stop": "Long Stop",
        "history_title": "📜 Travel History",
        "select_vehicle": "Select Vehicle",
        "from_date": "From",
        "to_date": "To",
        "show_route": "Show Route",
        "no_history": "No travel history found for selected range",
        "moving": "Moving",
        "stopped": "Stopped"
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_gps_view():
    """GPS View with live tracking, alerts, and history."""
    
    # PERFORMANCE: Fetch only active drivers with assigned vehicles
    drivers = repo.get_data("Master_Drivers")
    
    if not drivers.empty:
        # Filter: Only active drivers with vehicle plates (massive speedup)
        if 'Active_Status' in drivers.columns:
            drivers = drivers[drivers['Active_Status'] == 'Active']
        if 'Vehicle_Plate' in drivers.columns:
            drivers = drivers[drivers['Vehicle_Plate'].notna()]
            drivers = drivers[drivers['Vehicle_Plate'] != '']
    
    # Check Connection Status
    api_status = get_label('disconnected')
    
    # Simple check if any driver has coordinates
    if not drivers.empty:
        has_coords = drivers[['Current_Lat', 'Current_Lon']].notna().any().any()
        if has_coords:
            api_status = get_label('connected')

    c1, c2, c3 = st.columns([2, 1, 1])
    with c1:
        st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    with c2:
        st.caption(f"API: {api_status}")
    with c3:
        auto_refresh = st.checkbox(get_label('auto_refresh'), value=False)

    if drivers.empty:
        st.warning(get_label('no_drivers'))
        return

    # Tabs
    tab1, tab2, tab3 = st.tabs([get_label('tab_map'), get_label('tab_alerts'), get_label('tab_history')])
    
    with tab1:
        _render_live_map(drivers)
    with tab2:
        _render_alerts(drivers)
    with tab3:
        _render_history(drivers)
    
    # Auto refresh script
    if auto_refresh:
        st.markdown("""
        <script>
        setTimeout(function(){
            window.location.reload();
        }, 30000);
        </script>
        """, unsafe_allow_html=True)

def _render_live_map(drivers):
    """Live map with vehicle locations - OPTIMIZED."""
    
    # PERFORMANCE: Quick check
    if drivers.empty:
        st.info("No active drivers with vehicles")
        return
    
    if "Vehicle_Plate" not in drivers.columns:
        drivers["Vehicle_Plate"] = "UNKNOWN-" + drivers.index.astype(str)
    
    # PERFORMANCE: Vectorized coordinate extraction (safer column handling)
    if 'Current_Lat' in drivers.columns:
        drivers['lat'] = drivers['Current_Lat'].fillna(0).apply(safe_float)
    else:
        drivers['lat'] = 0
        
    if 'Current_Lon' in drivers.columns:
        drivers['lon'] = drivers['Current_Lon'].fillna(0).apply(safe_float)
    else:
        drivers['lon'] = 0
        
    if 'Speed' in drivers.columns:
        drivers['Speed'] = drivers['Speed'].fillna(0)
    else:
        drivers['Speed'] = 0
    
    # Only keep drivers with valid GPS coordinates
    valid_drivers = drivers[(drivers['lat'] != 0) & (drivers['lon'] != 0)].copy()
    
    if valid_drivers.empty:
        st.warning("⚠️ No vehicles currently reporting GPS location. Ensure mobile apps are active.")
        return
    
    # PERFORMANCE: Build dataframe directly (no loop)
    gps_df = pd.DataFrame({
        "Vehicle": valid_drivers["Vehicle_Plate"].astype(str),
        "Driver": valid_drivers.get("Driver_Name", "Unknown").astype(str),
        "lat": valid_drivers['lat'],
        "lon": valid_drivers['lon'],
        "Speed": valid_drivers['Speed'].round(1),
        "Status": valid_drivers['Speed'].apply(lambda x: get_label('moving') if x > 0 else get_label('stopped')),
        "Last_Update": valid_drivers.get('Last_Update', '-').astype(str)
    })
    
    # Dropdown Selection Logic (Moved Top for Reactivity)
    selected_row = None
    if not gps_df.empty:
        gps_df['label'] = gps_df.apply(lambda x: f"{x['Vehicle']} ({x['Driver']})", axis=1)
        
        # Selectbox
        c_sel1, c_sel2 = st.columns([3, 1])
        with c_sel1:
            selected_label = st.selectbox(
                f"🎯 {get_label('select_vehicle')} (Focus Map)", 
                gps_df['label'].tolist(),
                index=0,
                key="gps_focus_selector"
            )
        
        # Get selected data
        if selected_label:
            selected_row = gps_df[gps_df['label'] == selected_label].iloc[0]
            st.session_state.map_focus = {'lat': selected_row['lat'], 'lon': selected_row['lon']}

    col_map, col_info = st.columns([3, 1])
    
    with col_map:
        if not gps_df.empty:
            import pydeck as pdk
            
            # Color Logic: Moving (>0) = Green, Stopped = Red
            gps_df['color'] = gps_df['Speed'].apply(lambda x: [0, 255, 0, 160] if x > 0 else [255, 0, 0, 160])
            gps_df['size'] = 100

            tooltip = {
                "html": "<b>{Vehicle}</b><br/>Driver: {Driver}<br/>Speed: {Speed} km/h<br/>Status: {Status}<br/>Updated: {Last_Update}",
                "style": {"backgroundColor": "steelblue", "color": "white"}
            }

            layer = pdk.Layer(
                "ScatterplotLayer",
                gps_df,
                get_position='[lon, lat]',
                get_color='color',
                get_radius=200,
            )

            # Determine View State (Center)
            # Default to mean
            view_lat = gps_df['lat'].mean()
            view_lon = gps_df['lon'].mean()
            view_zoom = 10
            
            # If user clicked a vehicle, perform a one-time center
            if 'map_focus' in st.session_state and st.session_state.map_focus:
                 view_lat = st.session_state.map_focus['lat']
                 view_lon = st.session_state.map_focus['lon']
                 view_zoom = 15

            view_state = pdk.ViewState(
                latitude=view_lat,
                longitude=view_lon,
                zoom=view_zoom,
                pitch=50,
            )

            # Use key to force re-render when focus changes
            st.pydeck_chart(pdk.Deck(
                map_provider='carto',
                map_style='light', # Free style, no token needed
                layers=[layer],
                initial_view_state=view_state,
                tooltip=tooltip
            ), key=f"map_{view_lat}_{view_lon}") 
        else:
            st.info("No GPS data available")
            
    with col_info:
        st.markdown(f"#### ℹ️ {get_label('status')}")
        if selected_row is not None:
             st.info(f"📍 **{selected_row['Vehicle']}**")
             st.write(f"**{get_label('driver')}:** {selected_row['Driver']}")
             st.write(f"**{get_label('speed')}:** {selected_row['Speed']} km/h")
             st.write(f"**{get_label('status')}:** {selected_row['Status']}")
             st.write(f"**{get_label('last_update')}:** {selected_row['Last_Update']}")
             st.caption(f"Lat: {selected_row['lat']:.4f}, Lon: {selected_row['lon']:.4f}")
        else:
             st.info("No Vehicle Selected")


def _render_alerts(drivers):
    """Safety alerts."""
    st.markdown(f"#### {get_label('alerts_title')}")
    
    # Mock alerts
    alerts = [
        {"type": get_label('speeding'), "vehicle": "70-1234", "time": "10:30", "val": "110 km/h"},
        {"type": get_label('long_stop'), "vehicle": "71-5678", "time": "09:15", "val": "45 min"},
    ]
    
    for alert in alerts:
        st.error(f"⚠️ **{alert['type']}**: {alert['vehicle']} @ {alert['time']} ({alert['val']})")

def _render_history(drivers=None):
    """Historical route playback."""
    st.markdown(f"#### {get_label('history_title')}")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        if drivers is not None and not drivers.empty:
            v_list = drivers['Vehicle_Plate'].tolist()
            sel_v = st.selectbox(get_label('select_vehicle'), v_list)
    with col2:
        d1 = st.date_input(get_label('from_date'), datetime.now())
    with col3:
        d2 = st.date_input(get_label('to_date'), datetime.now())
    with col4:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button(f"🔎 {get_label('show_route')}", type="primary", use_container_width=True):
            st.info(get_label('no_history') + " (Mock Data)")
