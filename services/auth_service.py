
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
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash

# Initialize Argon2 hasher with OWASP recommended parameters
ph = PasswordHasher(
    time_cost=2,        # Number of iterations
    memory_cost=65536,  # 64 MB
    parallelism=4,      # Number of parallel threads
    hash_len=32,        # Length of hash in bytes
    salt_len=16         # Length of salt in bytes
)

# --- Password Hashing Utilities (Upgraded to Argon2) ---
def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id (OWASP recommended).
    
    Argon2id is the winner of the Password Hashing Competition and is
    recommended by OWASP for password storage.
    
    Args:
        password: Plain text password
        
    Returns:
        Argon2 hash string (starts with $argon2id$)
    """
    return ph.hash(password)

def verify_password(password: str, stored_password: str) -> bool:
    """
    Verify password against stored value.
    Supports Argon2, SHA-256 (legacy), and plain text (for migration).
    
    Args:
        password: Plain text password to verify
        stored_password: Stored hash or plain text password
        
    Returns:
        True if password matches, False otherwise
    """
    # Check if it's an Argon2 hash
    if stored_password.startswith('$argon2'):
        try:
            ph.verify(stored_password, password)
            
            # Check if hash needs rehashing (parameters changed)
            if ph.check_needs_rehash(stored_password):
                logger.info("Password hash needs rehashing with new parameters")
                # Note: Actual rehashing should be done after successful login
                
            return True
        except (VerifyMismatchError, InvalidHash):
            return False
    
    # Legacy SHA-256 hash (64 hex characters)
    elif len(stored_password) == 64 and all(c in '0123456789abcdef' for c in stored_password.lower()):
        logger.warning("⚠️ Legacy SHA-256 password detected - will be upgraded on next login")
        salt = os.getenv("TMS_PASSWORD_SALT", "CHANGE_THIS_IN_PRODUCTION_12345")
        legacy_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
        return legacy_hash == stored_password.lower()
    
    # Plain text password (legacy) - direct comparison
    else:
        logger.warning("⚠️ Plain text password detected - will be upgraded on next login")
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
            
            # Auto-migrate legacy passwords to Argon2
            if not raw_pw.startswith('$argon2'):
                try:
                    new_hash = hash_password(password)
                    repo.update_data(
                        "Master_Users",
                        {"Password": new_hash},
                        {"Username": username}
                    )
                    logger.info(f"✅ Migrated password for user '{username}' to Argon2")
                except Exception as e:
                    logger.error(f"Failed to migrate password for '{username}': {e}")
            
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
