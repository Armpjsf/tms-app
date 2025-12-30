
import streamlit as st
from data.repository import repo
from datetime import datetime

class WarehouseService:
    @staticmethod
    def process_inbound(item_id, qty, location):
        """Receive goods into stock."""
        # 1. Update Stock Quantity
        # 2. Create Transaction Log
        log = {
            "Txn_Type": "INBOUND",
            "Item_ID": item_id,
            "Qty": qty,
            "Date": datetime.now().isoformat()
        }
        repo.insert_record("WMS_Transactions", log)
        return True

    @staticmethod
    def process_outbound(item_id, qty, job_ref):
        """Pick goods for job."""
        log = {
            "Txn_Type": "OUTBOUND",
            "Item_ID": item_id,
            "Qty": qty,
            "Ref_Job": job_ref,
            "Date": datetime.now().isoformat()
        }
        repo.insert_record("WMS_Transactions", log)
        return True
