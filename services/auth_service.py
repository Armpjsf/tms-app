
import streamlit as st
import pandas as pd
import hashlib
from data.repository import repo
from services.audit_service import AuditService
from utils.logger import logger

# Role Definitions
ROLES = {
    "SUPER_ADMIN": ["*"],
    "MANAGER": ["view_dashboard", "manage_jobs", "view_reports", "manage_drivers"],
    "DISPATCHER": ["manage_jobs", "view_planning", "view_monitoring"],
    "DRIVER": ["view_my_jobs", "update_job_status"],
    "VIEWER": ["view_dashboard", "view_monitoring"]
}

import os

# --- Password Hashing Utilities ---
def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt from environment."""
    # SECURITY: Use unique salt from environment variable
    salt = os.getenv("TMS_PASSWORD_SALT", "CHANGE_THIS_IN_PRODUCTION_12345")
    if salt == "CHANGE_THIS_IN_PRODUCTION_12345":
        logger.warning("⚠️ Using default password salt - SET TMS_PASSWORD_SALT environment variable in production!")
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def verify_password(password: str, stored_password: str) -> bool:
    """
    Verify password against stored value.
    Supports both plain text (for migration) and hashed passwords.
    """
    # Check if stored password is a SHA-256 hash (64 hex characters)
    if len(stored_password) == 64 and all(c in '0123456789abcdef' for c in stored_password.lower()):
        # It's hashed, verify against hash
        return hash_password(password) == stored_password.lower()
    else:
        # Plain text password (legacy) - direct comparison
        return password == stored_password

class AuthService:
    @staticmethod
    def login(username, password):
        users = repo.get_data("Master_Users")
        if users.empty:
            # SECURITY: No fallback admin - must bootstrap via database
            logger.warning("Login attempted but Master_Users table is empty")
            return None

        # Normalize
        if "Username" in users.columns:
            users["Username"] = users["Username"].astype(str).str.strip()

        target = users[users["Username"] == username]
        if target.empty:
            return None

        # Check Password with hash support
        raw_pw = str(target.iloc[0]["Password"]).strip()
        if raw_pw.endswith(".0"): raw_pw = raw_pw[:-2]

        if verify_password(password, raw_pw):
            user = target.iloc[0]
            role = user.get("Role", "DRIVER").upper()
            
            # Log success
            AuditService.log_action(username, "LOGIN", "AuthService", "User logged in")
            
            branch_val = user.get("Branch_ID")
            if pd.isna(branch_val) or str(branch_val).strip() == "":
                branch_val = "ALL"
            
            return _create_session_user(
                username, 
                user.get("Name", username), 
                role, 
                branch_val
            )
        else:
            # SECURITY: Generic message to prevent username enumeration
            AuditService.log_action(username, "LOGIN_FAILED", "AuthService", "Invalid credentials", "Failed")
            return None

    @staticmethod
    def check_permission(required_perm):
        """
        Checks if current user has the required permission.
        Super Admin always returns True.
        """
        if not st.session_state.get("logged_in"): return False
        
        role = st.session_state.get("user_role", "").upper()
        if role == "SUPER_ADMIN" or "ADMIN" in role: return True
        
        allowed_perms = ROLES.get(role, [])
        return required_perm in allowed_perms

def _create_session_user(uid, name, role, branch):
    return {
        "user_id": uid,
        "user_name": name,
        "user_role": role,
        "branch_id": branch,
        "logged_in": True
    }
