
import streamlit as st
from supabase import create_client, Client
from config.settings import settings

@st.cache_resource
def get_supabase_client() -> Client:
    """cached Supabase client to avoid overhead."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
