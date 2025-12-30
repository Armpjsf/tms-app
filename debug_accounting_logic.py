
from data.repository import repo
from config.constants import PaymentStatus, BillingStatus
import pandas as pd
from datetime import datetime
import streamlit as st

# Mock session state if needed (though repo might use it)
if not hasattr(st, "session_state"):
    st.session_state = {}
    st.session_state["branch_id"] = "ALL" # Simulate showing all branches
    st.session_state["role"] = "SUPER_ADMIN"
    st.session_state["debug_show_all_branches"] = True

def debug_accounting():
    print("="*50)
    print("🕵️ DEBUGGING ACCOUNTING LOGIC")
    print("="*50)
    
    # 1. Fetch Data
    print("\n[1] Fetching Jobs_Main...")
    jobs = repo.get_data("Jobs_Main")
    print(f"    Total Rows in DB: {len(jobs)}")
    if jobs.empty: return

    # 2. Check Job_Status
    status_counts = jobs['Job_Status'].value_counts()
    print(f"\n[2] Job_Status Distribution:\n{status_counts}")

    # 3. Simulate Payroll Filter (Status)
    # Using the fix I applied: .astype(str).str.upper() == 'COMPLETED'
    completed_jobs = jobs[jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED'].copy()
    print(f"\n[3] Filter 'COMPLETED' (Case Insensitive):")
    print(f"    Rows remaining: {len(completed_jobs)}")
    if not completed_jobs.empty:
        print("    Sample Statuses:", completed_jobs['Job_Status'].unique())
    else:
        print("    ❌ No COMPLETED jobs found! Stopping.")
        return

    # 4. Simulate Date Filter
    # User range: 2025-01-01 to 2025-12-27
    start_date = datetime(2025, 1, 1).date()
    end_date = datetime(2025, 12, 27).date()
    
    print(f"\n[4] Date Filter ({start_date} to {end_date}):")
    
    # Convert Plan_Date
    completed_jobs['Plan_Date_Obj'] = pd.to_datetime(completed_jobs['Plan_Date'], errors='coerce')
    
    # Show some dates before filter
    print("    Sample Plan_Dates (Raw):", completed_jobs['Plan_Date'].head(5).tolist())
    print("    Sample Plan_Dates (Converted):", completed_jobs['Plan_Date_Obj'].head(5).tolist())

    date_filtered = completed_jobs[
        (completed_jobs['Plan_Date_Obj'].dt.date >= start_date) & 
        (completed_jobs['Plan_Date_Obj'].dt.date <= end_date)
    ].copy()
    
    print(f"    Rows remaining after Date Filter: {len(date_filtered)}")
    
    if date_filtered.empty:
        print("    ❌ All jobs filtered out by Date! Check Plan_Date format.")
        # Check if dates are outside range
        print("    Min Date:", completed_jobs['Plan_Date_Obj'].min())
        print("    Max Date:", completed_jobs['Plan_Date_Obj'].max())
        return

    # 5. Simulate Billing Logic
    print(f"\n[5] Billing Logic Check:")
    # Filter not billed
    # Logic: (jobs['Billing_Status'] != BillingStatus.BILLED)
    # Check current Billing_Status values
    print("    Billing_Status values:", date_filtered['Billing_Status'].unique() if 'Billing_Status' in date_filtered.columns else "Column Missing")
    
    unbilled = date_filtered[date_filtered['Billing_Status'] != BillingStatus.BILLED]
    print(f"    Rows available for Billing: {len(unbilled)}")

    # 6. Simulate Payroll Logic
    print(f"\n[6] Payroll Logic Check:")
    print("    Payment_Status values:", date_filtered['Payment_Status'].unique() if 'Payment_Status' in date_filtered.columns else "Column Missing")
    
    unpaid = date_filtered[date_filtered['Payment_Status'] != PaymentStatus.PAID]
    print(f"    Rows available for Payroll: {len(unpaid)}")

if __name__ == "__main__":
    debug_accounting()
