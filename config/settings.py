
import streamlit as st
import os
from pathlib import Path

class Settings:
    """
    Centralized configuration management.
    Prioritizes Streamlit Secrets, falls back to Environment Variables.
    """
    
    @property
    def SUPABASE_URL(self):
        try:
            return st.secrets["supabase"]["url"]
        except (KeyError, FileNotFoundError):
            return os.getenv("SUPABASE_URL", "")

    @property
    def SUPABASE_KEY(self):
        try:
            return st.secrets["supabase"]["key"]
        except (KeyError, FileNotFoundError):
            return os.getenv("SUPABASE_KEY", "")

    # --- DTC GPS Config ---
    @property
    def DTC_USER(self):
        return os.getenv("DTC_USER", "")

    @property
    def DTC_PASS(self):
        return os.getenv("DTC_PASS", "")

    @property
    def DTC_API_URL(self):
        # Confirmed Endpoint for Login
        return os.getenv("DTC_API_URL", "https://gps.dtc.co.th/backendv2/api/v1/auth/login")

    @property
    def DTC_REALTIME_URL(self):
        # Confirmed Endpoint for Tracking
        return os.getenv("DTC_REALTIME_URL", "https://gps.dtc.co.th/backendv2/api/v1/ultimate/realtime")

    @property
    def DTC_TOKEN(self):
        # Token should be set via environment variable or .env file
        return os.getenv("DTC_TOKEN", "")

    @property
    def DEBUG(self):
        return os.environ.get("TMS_DEBUG", "0") == "1"

    @property
    def LOG_LEVEL(self):
        return "DEBUG" if self.DEBUG else "INFO"

    @property
    def BASE_DIR(self):
        return Path(__file__).parent.parent

settings = Settings()
