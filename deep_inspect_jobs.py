
from data.repository import repo
import pandas as pd

def deep_inspect():
    print("="*50)
    print("🕵️ DEEP INSPECTION: Jobs_Main")
    print("="*50)
    
    jobs = repo.get_data("Jobs_Main")
    
    if jobs.empty: 
        print("❌ Jobs_Main is empty")
        return

    # 1. Print Columns
    print(f"\n[1] Columns Found ({len(jobs.columns)}):")
    print(jobs.columns.tolist())
    
    # 2. Check Cost Column existence (Case Check)
    cost_col = None
    for c in jobs.columns:
        if c.lower() == 'cost_driver_total':
            cost_col = c
            print(f"\n✅ Found Cost Column: '{c}'")
            break
            
    if not cost_col:
        print("\n❌ 'Cost_Driver_Total' column NOT FOUND in DataFrame!")
    else:
        # Check Sample Values
        print(f"\n[2] Sample Values for '{cost_col}':")
        print(jobs[cost_col].head(10).tolist())
        print(f"    Type: {jobs[cost_col].dtype}")

    # 3. Check Plan_Date
    if 'Plan_Date' in jobs.columns:
        print(f"\n[3] Sample Plan_Date:")
        print(jobs['Plan_Date'].head(5).tolist())
        
        # Try Conversion
        converted = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        nat_count = converted.isna().sum()
        print(f"    Conversion NaT Count: {nat_count} / {len(jobs)}")
        if nat_count > 0:
            print("    ⚠️ Problematic Dates (Sample):")
            print(jobs[jobs['Plan_Date'].apply(lambda x: pd.to_datetime(x, errors='coerce') is pd.NaT)]['Plan_Date'].head())
    else:
        print("\n❌ 'Plan_Date' column missing")

if __name__ == "__main__":
    deep_inspect()
