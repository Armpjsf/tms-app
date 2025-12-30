
from data.repository import repo
import pandas as pd

def check_status_values_2():
    print("Fetching Jobs_Main...")
    jobs = repo.get_data("Jobs_Main")
    
    if jobs.empty:
        print("❌ Jobs_Main is empty!")
        return

    print("\n📊 Payment_Status Unique Values:")
    if 'Payment_Status' in jobs.columns:
        print(jobs['Payment_Status'].unique())
        
    print("\n📊 Billing_Status Unique Values:")
    if 'Billing_Status' in jobs.columns:
        print(jobs['Billing_Status'].unique())

if __name__ == "__main__":
    check_status_values_2()
