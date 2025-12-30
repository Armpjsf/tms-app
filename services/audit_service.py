
import time
from datetime import datetime
import streamlit as st
from data.repository import repo
from utils.logger import logger

class AuditService:
    @staticmethod
    def log_action(user_id: str, action: str, target: str, details: str = "", status: str = "Success"):
        """
        Logs a user action to 'System_Logs' table.
        """
        try:
            log_entry = {
                "Log_ID": f"LOG-{int(time.time() * 1000)}",
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "User_ID": user_id,
                "Action": action,      # e.g., "LOGIN", "CREATE_JOB", "UPDATE_STATUS"
                "Target": target,      # e.g., "JOB-230101", "Master_Drivers"
                "Details": details,    # e.g., "Changed status from New to ASSIGNED"
                "Status": status
            }
            
            # Non-blocking attempt (fire and forget mostly, but here we wait)
            # ideally we put this in a queue, but direct insert is fine for now
            repo.insert_record("System_Logs", log_entry)
        except Exception as e:
            logger.error(f"Audit Log Failed: {e}")

    @staticmethod
    def get_logs(limit=100):
        try:
            df = repo.get_data("System_Logs")
            if df.empty: return df
            # Sort desc
            if "Timestamp" in df.columns:
                df = df.sort_values("Timestamp", ascending=False)
            return df.head(limit)
        except:
            return None
