
from data.repository import repo
import pandas as pd

def check_status_values():
    print("Fetching Jobs_Main...")
    jobs = repo.get_data("Jobs_Main")
    
    if jobs.empty:
        print("❌ Jobs_Main is empty!")
        return

    print("\n📊 Job_Status Unique Values:")
    print(jobs['Job_Status'].unique())
    
    print("\n📊 Payment_Status Unique Values:")
    if 'Payment_Status' in jobs.columns:
        print(jobs['Payment_Status'].unique())
        
    print("\n📊 Billing_Status Unique Values:")
    if 'Billing_Status' in jobs.columns:
        print(jobs['Billing_Status'].unique())

    print("\nSample Data (Job_Status, Payment_Status, Billing_Status):")
    cols = ['Job_Status', 'Payment_Status', 'Billing_Status']
    print(jobs[[c for c in cols if c in jobs.columns]].head(5))

if __name__ == "__main__":
    check_status_values()
