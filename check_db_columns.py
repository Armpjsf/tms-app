import json

# from data.repository import repo # Removed to avoid circular import
import pandas as pd
from supabase import create_client

# Manual config since we can't import settings easily due to path issues sometimes
# Or we can try importing from config if possible, but hardcoding keys for a check script is safer
SUPABASE_URL = "https://jhksvhujsrbkeyzpvpog.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoa3N2aHVqc3Jia2V5enB2cG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODk2MzksImV4cCI6MjA4MTQ2NTYzOX0.JXFl-wPBInDlnc_pslt5xEH2ZpmYEBM7VmiPSjhlkXk"


def check_columns():
    try:
        print("Checking columns in Jobs_Main...")

        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Fetch 1 record to see columns
        res = client.table("Jobs_Main").select("*").limit(1).execute()

        if res.data:
            actual_columns = list(res.data[0].keys())
            print(f"Found {len(actual_columns)} columns:")
            print(", ".join(sorted(actual_columns)))

            # Check for Volume column
            print("\nVolume Column Check:")
            print(f"- Total_CBM: {'Total_CBM' in actual_columns}")
            print(f"- Total_Volume_cbm: {'Total_Volume_cbm' in actual_columns}")
            print(f"- Volume: {'Volume' in actual_columns}")
            print(f"- cbm: {'cbm' in actual_columns}")

        else:
            print("Table exists but is empty. Cannot determine exact columns from empty table using API select(*).")

    except Exception as e:
        print(f"Error checking columns: {e}")


if __name__ == "__main__":
    check_columns()
