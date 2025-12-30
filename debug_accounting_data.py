"""Debug script to check accounting data"""
import sys
sys.path.insert(0, 'c:\\Users\\Armdd\\TMS_ePOD')

from data.repository import repo
import pandas as pd

# Fetch Jobs_Main data
print("=" * 60)
print("FETCHING JOBS_MAIN DATA")
print("=" * 60)

jobs = repo.get_data("Jobs_Main")
print(f"\n✅ Total rows fetched: {len(jobs)}")

if jobs.empty:
    print("❌ No data found in Jobs_Main!")
    sys.exit(1)

print(f"\n📊 Columns in Jobs_Main:")
print(jobs.columns.tolist())

# Check unique values for key filters
print(f"\n🔍 Unique Job_Status values:")
if 'Job_Status' in jobs.columns:
    print(jobs['Job_Status'].value_counts())
else:
    print("❌ Job_Status column not found!")

print(f"\n🔍 Unique Payment_Status values:")
if 'Payment_Status' in jobs.columns:
    print(jobs['Payment_Status'].value_counts())
else:
    print("❌ Payment_Status column not found!")

print(f"\n🔍 Unique Billing_Status values:")
if 'Billing_Status' in jobs.columns:
    print(jobs['Billing_Status'].value_counts())
else:
    print("❌ Billing_Status column not found!")

# Check completed jobs
print(f"\n📋 Filtering: Job_Status == 'Completed'")
completed = jobs[jobs['Job_Status'] == 'Completed'] if 'Job_Status' in jobs.columns else pd.DataFrame()
print(f"   Found {len(completed)} completed jobs")

# Check pending driver payments
print(f"\n💰 Filtering: Completed AND Payment_Status != 'PAID'")
if 'Payment_Status' in jobs.columns:
    pending_driver = completed[completed['Payment_Status'] != 'PAID'] if not completed.empty else pd.DataFrame()
    print(f"   Found {len(pending_driver)} pending driver payments")
    if not pending_driver.empty and 'Driver_Name' in pending_driver.columns:
        print(f"\n   Drivers with pending payments:")
        print(pending_driver['Driver_Name'].value_counts())
else:
    print("   ❌ Cannot filter - Payment_Status column missing")

# Check customer billing
print(f"\n🧾 Filtering: Completed AND Billing_Status != 'BILLED'")
if 'Billing_Status' in jobs.columns:
    unbilled = completed[completed['Billing_Status'] != 'BILLED'] if not completed.empty else pd.DataFrame()
    print(f"   Found {len(unbilled)} unbilled jobs")
    if not unbilled.empty and 'Customer_Name' in unbilled.columns:
        print(f"\n   Customers with unbilled jobs:")
        print(unbilled['Customer_Name'].value_counts())
else:
    print("   ❌ Cannot filter - Billing_Status column missing")

print(f"\n" + "=" * 60)
print("DEBUG COMPLETE")
print("=" * 60)
