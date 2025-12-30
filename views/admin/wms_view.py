
import streamlit as st
import pandas as pd
import uuid
from datetime import datetime
from data.repository import repo

# Language Labels
LABELS = {
    "th": {
        "title": "📦 WMS Lite (จัดการคลังสินค้า)",
        "inbound_today": "รับเข้าวันนี้",
        "outbound_today": "เบิกออกวันนี้",
        "low_stock": "สินค้าเหลือน้อย",
        "total_sku": "รหัสสินค้าทั้งหมด",
        "tab_inv": "📦 สินค้าคงคลัง",
        "tab_in": "📥 รับสินค้าเข้า",
        "tab_out": "📤 เบิก/แพ็คสินค้าออก",
        "tab_hist": "📜 ประวัติการเคลื่อนไหว",
        "current_inv": "สินค้าคงคลังปัจจุบัน",
        "search": "ค้นหาสินค้า",
        "filter_low": "แสดงเฉพาะสินค้าเหลือน้อย",
        "no_items": "ไม่พบสินค้า",
        "receive_title": "รับสินค้าเข้า (Inbound)",
        "select_item": "เลือกสินค้า",
        "qty": "จำนวน",
        "location": "ตำแหน่งจัดเก็บ",
        "ref_doc": "เลขอ้างอิง / ใบส่งของ",
        "notes": "หมายเหตุ",
        "confirm_receive": "ยืนยันการรับ",
        "received": "รับสินค้าเรียบร้อย",
        "pick_title": "เบิกสินค้าออก (Outbound)",
        "job_ref": "งานที่เกี่ยวข้อง (Optional)",
        "manual_pick": "- เบิกทั่วไป -",
        "confirm_pick": "ยืนยันการเบิก",
        "picked": "เบิกสินค้าเรียบร้อย",
        "history_title": "ประวัติการเคลื่อนไหว",
        "type": "ประเภท",
        "all": "ทั้งหมด",
        "date": "วันที่",
        "by": "โดย"
    },
    "en": {
        "title": "📦 WMS Lite (Warehouse Management)",
        "inbound_today": "Inbound Today",
        "outbound_today": "Outbound Today",
        "low_stock": "Low Stock Items",
        "total_sku": "Total SKUs",
        "tab_inv": "📦 Inventory",
        "tab_in": "📥 Receive (Inbound)",
        "tab_out": "📤 Pick/Pack (Outbound)",
        "tab_hist": "📜 Transaction History",
        "current_inv": "Current Inventory",
        "search": "Search Item",
        "filter_low": "Show only low stock items",
        "no_items": "No items found",
        "receive_title": "Receive Items (Inbound)",
        "select_item": "Select Item",
        "qty": "Quantity",
        "location": "Location",
        "ref_doc": "Reference Doc",
        "notes": "Notes",
        "confirm_receive": "Confirm Receipt",
        "received": "Received successfully",
        "pick_title": "Pick Items (Outbound)",
        "job_ref": "Related Job (Optional)",
        "manual_pick": "- Manual Pick -",
        "confirm_pick": "Confirm Pick",
        "picked": "Picked successfully",
        "history_title": "Transaction History",
        "type": "Type",
        "all": "All",
        "date": "Date",
        "by": "By"
    }
}

def get_label(key: str) -> str:
    lang = st.session_state.get("lang", "th")
    return LABELS.get(lang, LABELS["th"]).get(key, key)

def render_wms_view():
    st.markdown(f'<div class="tms-page-title">{get_label("title")}</div>', unsafe_allow_html=True)
    
    # Get Data
    inventory = repo.get_data("Stock_Parts")
    transactions = _get_or_create_transactions()
    
    if inventory.empty:
        # initialize if empty structure
        inventory = pd.DataFrame(columns=["Part_ID", "Part_Name", "Qty_On_Hand", "Min_Level"])
    
    # Calculate Metrics
    today = datetime.now().date()
    
    today_in = 0
    today_out = 0
    
    if not transactions.empty:
        transactions['Date_Obj'] = pd.to_datetime(transactions['Date'], errors='coerce').dt.date
        today_in = len(transactions[(transactions['Txn_Type'] == 'INBOUND') & (transactions['Date_Obj'] == today)])
        today_out = len(transactions[(transactions['Txn_Type'] == 'OUTBOUND') & (transactions['Date_Obj'] == today)])
    
    low_stock = 0
    if not inventory.empty:
        # Ensure columns exist
        if 'Qty_On_Hand' not in inventory.columns: inventory['Qty_On_Hand'] = 0
        if 'Min_Level' not in inventory.columns: inventory['Min_Level'] = 0

        # Clean data for calc
        inventory['Qty_On_Hand'] = pd.to_numeric(inventory['Qty_On_Hand'], errors='coerce').fillna(0)
        inventory['Min_Level'] = pd.to_numeric(inventory['Min_Level'], errors='coerce').fillna(0)
        
        low_stock = len(inventory[inventory['Qty_On_Hand'] <= inventory['Min_Level']])
    

    from utils.helpers import render_metric_card
    c1, c2, c3, c4 = st.columns(4)
    with c1: st.markdown(render_metric_card(get_label('inbound_today'), f"{today_in}", icon="📥"), unsafe_allow_html=True)
    with c2: st.markdown(render_metric_card(get_label('outbound_today'), f"{today_out}", icon="📤"), unsafe_allow_html=True)
    with c3: 
        is_low = low_stock > 0
        st.markdown(render_metric_card(get_label('low_stock'), f"{low_stock}", icon="⚠️", accent_color="accent-red" if is_low else None), unsafe_allow_html=True)
    with c4: st.markdown(render_metric_card(get_label('total_sku'), f"{len(inventory)}", icon="📦"), unsafe_allow_html=True)
    
    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        get_label('tab_inv'), 
        get_label('tab_in'), 
        get_label('tab_out'),
        get_label('tab_hist')
    ])
    
    with tab1:
        _render_inventory(inventory)
    with tab2:
        _render_inbound(inventory)
    with tab3:
        _render_outbound(inventory)
    with tab4:
        _render_transactions(transactions)

def _render_inventory(inventory):
    """Inventory management."""
    st.markdown(f"#### {get_label('current_inv')}")
    
    df = inventory.copy()
    
    # Search
    search = st.text_input(f"🔍 {get_label('search')}", placeholder="...")
    
    if search and not df.empty:
        mask = df.astype(str).apply(lambda x: x.str.contains(search, case=False)).any(axis=1)
        df = df[mask]
    
    # Low stock filter
    show_low = st.checkbox(get_label('filter_low'))
    
    if show_low and not df.empty:
        df = df[df['Qty_On_Hand'] <= df['Min_Level']]
    
    if df.empty:
        st.info(get_label('no_items'))
        return
    
    # Display with color for low stock
    st.dataframe(
        df,
        hide_index=True,
        use_container_width=True
    )

def _render_inbound(inventory):
    """Receive items."""
    st.markdown(f"#### {get_label('receive_title')}")
    
    if inventory.empty:
        st.warning(get_label('no_items'))
        return
        
    with st.form("inbound_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            item_opts = inventory['Part_ID'].tolist()
            # Map ID to Name
            item_map = inventory.set_index('Part_ID')['Part_Name'].to_dict()
            
            selected_item = st.selectbox(
                get_label('select_item'), 
                item_opts,
                format_func=lambda x: f"{x}: {item_map.get(x, '')}"
            )
            
            qty = st.number_input(get_label('qty'), min_value=1, value=10)
        
        with col2:
            location = st.text_input(get_label('location'), placeholder="A-01")
            ref_doc = st.text_input(get_label('ref_doc'), placeholder="PO-XXXX")
        
        notes = st.text_area(get_label('notes'))
        
        if st.form_submit_button(f"📥 {get_label('confirm_receive')}", type="primary"):
            # Update Inventory
            current_qty = inventory.loc[inventory['Part_ID'] == selected_item, 'Qty_On_Hand'].values[0]
            new_qty = current_qty + qty
            
            inventory.loc[inventory['Part_ID'] == selected_item, 'Qty_On_Hand'] = new_qty
            
            # Save to DB
            if repo.update_data("Stock_Parts", inventory):
                # Log Transaction
                txn = {
                    "Txn_ID": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                    "Txn_Type": "INBOUND",
                    "Item_ID": selected_item,
                    "Qty": qty,
                    "Location": location,
                    "Ref_Doc": ref_doc,
                    "Notes": notes,
                    "Date": datetime.now().isoformat(),
                    "Created_By": st.session_state.get('user_name', 'Admin')
                }
                
                _add_transaction(txn)
                st.success(f"✅ {get_label('received')}: +{qty}")
                time.sleep(1)
                st.rerun()

def _render_outbound(inventory):
    """Pick/Pack items."""
    st.markdown(f"#### {get_label('pick_title')}")
    
    if inventory.empty:
        st.warning(get_label('no_items'))
        return
    
    # Get active jobs for assignment
    jobs = repo.get_data("Jobs_Main")
    open_jobs = []
    if not jobs.empty:
        open_jobs = jobs[jobs['Job_Status'].isin(['New', 'Planned', 'In Progress'])]['Job_ID'].tolist()
    
    job_opts = [get_label('manual_pick')] + open_jobs
    
    with st.form("outbound_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            item_opts = inventory['Part_ID'].tolist()
            item_map = inventory.set_index('Part_ID')['Part_Name'].to_dict()
            
            selected_item = st.selectbox(
                get_label('select_item'), 
                item_opts,
                format_func=lambda x: f"{x}: {item_map.get(x, '')}",
                key="out_item"
            )
            
            # Show current stock
            curr_stock = inventory.loc[inventory['Part_ID'] == selected_item, 'Qty_On_Hand'].values[0]
            st.caption(f"On Hand: {curr_stock}")
            
            pick_qty = st.number_input(get_label('qty'), min_value=1, max_value=int(curr_stock) if curr_stock > 0 else 1, value=1)
        
        with col2:
            selected_job = st.selectbox(get_label('job_ref'), job_opts)
            pick_location = st.text_input(get_label('location'), placeholder="Loading Dock")
        
        if st.form_submit_button(f"📤 {get_label('confirm_pick')}", type="primary"):
            if pick_qty > curr_stock:
                st.error("Insufficient Stock!")
            else:
                # Update Inventory
                new_qty = curr_stock - pick_qty
                inventory.loc[inventory['Part_ID'] == selected_item, 'Qty_On_Hand'] = new_qty
                
                if repo.update_data("Stock_Parts", inventory):
                    txn = {
                        "Txn_ID": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                        "Txn_Type": "OUTBOUND",
                        "Item_ID": selected_item,
                        "Qty": -pick_qty,
                        "Location": pick_location,
                        "Ref_Doc": selected_job if selected_job != get_label('manual_pick') else "",
                        "Notes": f"Picked for Job: {selected_job}",
                        "Date": datetime.now().isoformat(),
                        "Created_By": st.session_state.get('user_name', 'Admin')
                    }
                    
                    _add_transaction(txn)
                    st.success(f"✅ {get_label('picked')}: -{pick_qty}")
                    time.sleep(1)
                    st.rerun()

def _render_transactions(transactions):
    """Transaction history."""
    st.markdown(f"#### {get_label('history_title')}")
    
    if transactions.empty:
        st.info(get_label('no_items')) # reuse no items/transactions
        return
    
    # Filter
    col1, col2 = st.columns(2)
    with col1:
        txn_type = st.multiselect(get_label('type'), ["INBOUND", "OUTBOUND"], default=["INBOUND", "OUTBOUND"])
    with col2:
        search = st.text_input(f"{get_label('search')} (ID)", key="txn_search")
    
    filtered = transactions[transactions['Txn_Type'].isin(txn_type)] if txn_type else transactions
    
    if search:
        filtered = filtered[filtered['Item_ID'].astype(str).str.contains(search, case=False)]
    
    # Sort
    filtered = filtered.sort_values('Date', ascending=False)
    
    st.dataframe(filtered, hide_index=True, use_container_width=True)

# Helper functions for Transactions (Session State)
def _get_or_create_transactions():
    if 'wms_transactions' in st.session_state:
        df = st.session_state.wms_transactions
        if 'Date_Obj' in df.columns: # Clean up cleanup temp col
             df = df.drop(columns=['Date_Obj'])
        return df
    
    return pd.DataFrame(columns=[
        "Txn_ID", "Txn_Type", "Item_ID", "Qty", "Location", 
        "Ref_Doc", "Notes", "Date", "Created_By"
    ])

def _add_transaction(txn_dict):
    transactions = _get_or_create_transactions()
    transactions = pd.concat([transactions, pd.DataFrame([txn_dict])], ignore_index=True)
    st.session_state.wms_transactions = transactions
