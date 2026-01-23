import os

from dotenv import load_dotenv
from supabase import Client, create_client

# Load env
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    # Assumed from App.js
    url = "https://jhksvhujsrbkeyzpvpog.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoa3N2aHVqc3Jia2V5enB2cG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODk2MzksImV4cCI6MjA4MTQ2NTYzOX0.JXFl-wPBInDlnc_pslt5xEH2ZpmYEBM7VmiPSjhlkXk"

supabase: Client = create_client(url, key)


def get_columns(table_name):
    print(f"\nChecking columns in {table_name}...")
    try:
        response = supabase.table(table_name).select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            columns = sorted(list(response.data[0].keys()))
            print(f"Found {len(columns)} columns:")
            print(", ".join(columns))
            return response.data[0]
        else:
            print("Table empty or no access.")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None


u = get_columns("Master_Users")
d = get_columns("Master_Drivers")

if u and d:
    print("\nPotential Links:")
    common = set(u.keys()) & set(d.keys())
    print(common)
