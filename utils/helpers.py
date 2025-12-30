
import pandas as pd
import pytz
from datetime import datetime
import re

def get_thai_time_str():
    tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

def get_thai_date_str():
    tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(tz).strftime("%Y-%m-%d")

def parse_flexible_date(s):
    try:
        s = str(s).strip()
        if not s or s.lower() in ['nan', 'nat', 'none']: return pd.NaT
        
        # 1. Fix Thai Year BE
        if len(s) >= 4:
            years = re.findall(r'\d{4}', s)
            for year in years:
                if int(year) > 2400: # BE
                    s = s.replace(year, str(int(year) - 543))
        
        # 2. Parse
        try: return pd.to_datetime(s, dayfirst=True)
        except: return pd.to_datetime(s, errors='coerce')
    except: 
        return pd.NaT

def safe_float(val, default=0.0):
    try:
        if val is None: return default
        s_val = str(val).replace(',', '').strip()
        if not s_val or s_val.lower() in ['none', 'nan', 'nat']: return default
        return float(s_val)
    except: return default

def render_metric_card(title, value, icon="📊", trend=None, sub=None, accent_color=None):
    """
    Generate HTML for a Lovable Design metric card.
    Args:
        title (str): Metric label
        value (str): Main value
        icon (str): Emoji or icon character
        trend (str, optional): Trend text (e.g. "+5%")
        sub (str, optional): Subtitle text
        accent_color (str, optional): "accent-red" or "accent-green"
    """
    cls = f"tms-metric-card {accent_color}" if accent_color else "tms-metric-card"
    trend_html = ""
    if trend:
        # Simple heuristic for trend color and icon
        color = "up" if "▲" in trend or "+" in trend or "%" in trend and "-" not in trend else "down" 
        trend_icon = "↑" if color == "up" else "↓"
        trend_html = f'<span class="tms-metric-trend {color}"><span>{trend_icon}</span> {trend}</span>'
        
    return f'<div class="{cls}"><div class="tms-metric-header"><div class="tms-metric-icon">{icon}</div>{trend_html}</div><div class="tms-metric-label">{title}</div><div class="tms-metric-value">{value}</div><div class="tms-metric-subtext">{sub or ""}</div></div>'

def paginate_dataframe(df, page_size=10, key="default"):
    """
    Helper to paginate a dataframe in Streamlit.
    Returns: (subset_df, total_pages, current_page)
    """
    import streamlit as st
    import math
    
    if df.empty:
        return df, 1, 1
        
    total_items = len(df)
    total_pages = math.ceil(total_items / page_size)
    
    # Session state for page number
    page_key = f"page_{key}"
    if page_key not in st.session_state:
        st.session_state[page_key] = 1
        
    # Pagination Controls
    col1, col2, col3 = st.columns([2, 3, 2])
    with col2:
        # Create a container for controls to keep them centered and nice
        c1, c2, c3 = st.columns([1, 1, 1])
        with c1:
            if st.button("◀", key=f"prev_{key}", disabled=st.session_state[page_key] <= 1):
                st.session_state[page_key] -= 1
                st.rerun()
        with c2:
            st.markdown(f"<div style='text-align: center; padding-top: 5px;'>Page {st.session_state[page_key]} / {total_pages}</div>", unsafe_allow_html=True)
        with c3:
            if st.button("▶", key=f"next_{key}", disabled=st.session_state[page_key] >= total_pages):
                st.session_state[page_key] += 1
                st.rerun()
                
    # Slice Data
    start_idx = (st.session_state[page_key] - 1) * page_size
    end_idx = start_idx + page_size
    
    return df.iloc[start_idx:end_idx], total_pages, st.session_state[page_key]
