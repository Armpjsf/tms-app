from data.repository import repo
import pandas as pd

def check_columns():
    try:
        print("🔍 Checking columns in Jobs_Main...")
        # Fetch 1 record to see columns
        res = repo.client.table("Jobs_Main").select("*").limit(1).execute()
        
        if res.data:
            actual_columns = list(res.data[0].keys())
            print(f"✅ Found {len(actual_columns)} columns:")
            print(", ".join(sorted(actual_columns)))
            
            # Check for specific payment columns
            print("\nSpecifc Payment Columns Check:")
            print(f"- Payment_Status (Driver?): {'Payment_Status' in actual_columns}")
            print(f"- Billing_Status (Invoice): {'Billing_Status' in actual_columns}")
            print(f"- Customer_Payment_Status: {'Customer_Payment_Status' in actual_columns}")
        else:
            print("⚠️ Table exists but is empty. Cannot determine exact columns from empty table using API select(*).")
            # If empty, we fallback to models.py or just say it's empty
            
    except Exception as e:
        print(f"❌ Error checking columns: {e}")

if __name__ == "__main__":
    check_columns()
