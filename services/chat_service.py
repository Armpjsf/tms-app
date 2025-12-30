from datetime import datetime
import pandas as pd
from data.repository import repo
from utils.logger import logger
import streamlit as st

class ChatService:
    """
    Handles Chat Logic between Admin and Drivers.
    Table: Chat_Messages
    """

    @staticmethod
    def send_message(sender_id: str, receiver_id: str, message_body: str, job_id: str = None) -> bool:
        """Send a new message via 'chat_messages' table (Matching App.js Schema)."""
        try:
            # Determine logic
            # If Admin sending -> receiver_id is driver_id
            # If Driver sending -> sender_id is driver_id (not handled here usually, but good to know)
            
            is_admin = sender_id == "ADMIN"
            driver_id = receiver_id if is_admin else sender_id
            sender_role = "admin" if is_admin else "driver"
            
            payload = {
                "driver_id": driver_id,
                "driver_name": "", # Optional / Fetch if needed
                "sender": sender_role,
                "message": message_body,
                "created_at": datetime.now().isoformat(),
                "read": False
            }
            
            if is_admin:
                from services.notification_service import NotificationService
                NotificationService.send_push_to_driver(driver_id, "💬 ข้อความใหม่จากแอดมิน", message_body)

            return repo.insert_record("chat_messages", payload)
        except Exception as e:
            logger.error(f"Send Chat Error: {e}")
            return False

    @staticmethod
    def get_messages(user1: str, user2: str, limit: int = 50) -> pd.DataFrame:
        """Get conversation history."""
        try:
            # user2 is likely the driver_id if user1 is ADMIN
            driver_id = user2 if user1 == "ADMIN" else user1
            
            df = repo.get_data("chat_messages")
            if df.empty: return pd.DataFrame()

            # Filter by driver_id
            # In App.js logic, it just filters by driver_id
            chat_df = df[df['driver_id'] == driver_id].copy()
            
            # Map columns to standarized names for UI if needed or keep raw
            # UI uses: Sender_ID, Message_Body, Timestamp
            
            chat_df['Sender_ID'] = chat_df['sender'].apply(lambda x: "ADMIN" if x == 'admin' else driver_id)
            chat_df['Message_Body'] = chat_df['message']
            chat_df['Timestamp'] = pd.to_datetime(chat_df['created_at'])
            
            chat_df = chat_df.sort_values(by='Timestamp', ascending=True)
            return chat_df.tail(limit)
        except Exception as e:
            logger.error(f"Get Chat Error: {e}")
            return pd.DataFrame()

    @staticmethod
    def get_unread_count(receiver_id: str) -> int:
        """Count unread messages for a user."""
        try:
            df = repo.get_data("chat_messages")
            if df.empty: return 0
            
            # For admin, unread messages are those from 'driver' that are read=False
            # receiver_id here would be the admin looking at a specific driver? 
            # Or general dashboard?
            
            # Assuming check for specific driver's unread messages sent to admin
            return len(df[(df['driver_id'] == receiver_id) & (df['sender'] == 'driver') & (df['read'] == False)])
        except: return 0
