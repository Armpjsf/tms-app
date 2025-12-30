
from data.repository import repo
import pandas as pd

def debug_payroll():
    print("="*50)
    print("🕵️ DEBUGGING PAYROLL DATA")
    print("="*50)
    
    jobs = repo.get_data("Jobs_Main")
    if jobs.empty:
        print("❌ Jobs_Main is empty")
        return

    # Filter Completed
    completed = jobs[jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED'].copy()
    print(f"Total COMPLETED Jobs: {len(completed)}")
    
    if completed.empty:
        return

    # Check Columns
    cols = ['Job_ID', 'Driver_Name', 'Cost_Driver_Total', 'Payment_Status']
    print("\n[1] Sample Data (First 10):")
    print(completed[cols].head(10))
    
    # Check Cost Stats
    print("\n[2] Cost_Driver_Total Stats:")
    # Clean and convert
    completed['Cost_Clean'] = pd.to_numeric(
        completed['Cost_Driver_Total'].astype(str).str.replace(',', ''), 
        errors='coerce'
    ).fillna(0)
    
    print(f"    - Zero Cost Rows: {len(completed[completed['Cost_Clean'] == 0])}")
    print(f"    - Non-Zero Cost Rows: {len(completed[completed['Cost_Clean'] > 0])}")
    print(f"    - Max Cost: {completed['Cost_Clean'].max()}")
    
    # Check Drivers
    print("\n[3] Driver Names in COMPLETED Jobs:")
    print(completed['Driver_Name'].unique())

if __name__ == "__main__":
    debug_payroll()
