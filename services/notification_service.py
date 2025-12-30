import requests
import streamlit as st
from data.repository import repo
from utils.logger import logger

class NotificationService:
    """
    Handles sending Push Notifications to Mobile App via Expo.
    Requires 'Push_Token' in Master_Users.
    """
    
    EXPO_API_URL = "https://exp.host/--/api/v2/push/send"

    @staticmethod
    def send_push_to_driver(driver_user_id: str, title: str, body: str, data: dict = None) -> bool:
        """
        Send a push notification to a specific driver.
        
        Args:
            driver_user_id (str): The Username (or Driver_ID) of the recipient.
            title (str): Notification Title.
            body (str): Notification Body.
            data (dict, optional): Extra data payload (e.g. { "type": "new_job", "id": "123" }).
        """
        try:
            # 1. Fetch User Token
            users = repo.get_data("Master_Users")
            if users.empty:
                logger.warning(f"Notification skipped: Master_Users empty")
                return False
            
            # Find user case-insensitively
            target = users[users['Username'].astype(str).str.lower() == str(driver_user_id).lower()]
            
            if target.empty:
                logger.warning(f"Notification skipped: User {driver_user_id} not found")
                return False
            
            # Check for Token
            token = target.iloc[0].get('Push_Token')
            if not token or not str(token).startswith('ExponentPushToken'):
                logger.warning(f"Notification skipped: No valid token for {driver_user_id}")
                return False

            # 2. Prepare Payload
            payload = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "priority": "high",
                "data": data or {}
            }

            # 3. Send Request
            response = requests.post(NotificationService.EXPO_API_URL, json=payload)
            response.raise_for_status()
            
            res_json = response.json()
            if res_json.get('data', {}).get('status') == 'ok':
                logger.info(f"Push Sent to {driver_user_id}: {title}")
                return True
            else:
                logger.error(f"Push Error {driver_user_id}: {res_json}")
                return False

        except Exception as e:
            logger.error(f"Notification Exception: {e}")
            return False

    @staticmethod
    def broadcast_announcement(title: str, body: str):
        """Send a message to ALL drivers with tokens."""
        users = repo.get_data("Master_Users")
        # Filter only drivers with tokens
        valid_users = users[
            (users['Role'] == 'Driver') & 
            (users['Push_Token'].notna()) & 
            (users['Push_Token'].str.startswith('ExponentPushToken', na=False))
        ]
        
        count = 0
        for _, user in valid_users.iterrows():
            if NotificationService.send_push_to_driver(user['Username'], title, body):
                count += 1
        
        return count
