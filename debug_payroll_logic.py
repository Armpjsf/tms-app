
from data.repository import repo
from config.constants import PaymentStatus
import pandas as pd
from datetime import datetime

def debug_logic():
    print("="*50)
    print("🕵️ SIMULATING PAYROLL LOGIC")
    print("="*50)
    
    # 1. Fetch
    jobs = repo.get_data("Jobs_Main")
    print(f"[1] Total Jobs: {len(jobs)}")
    if jobs.empty: return

    # 2. Status Filter
    # Fix: Case Insensitive
    jobs['Job_Status_Upper'] = jobs['Job_Status'].astype(str).str.upper()
    df = jobs[jobs['Job_Status_Upper'] == 'COMPLETED'].copy()
    print(f"[2] After Status='COMPLETED' Filter: {len(df)}")
    
    if df.empty:
        print("    Sample Statuses:", jobs['Job_Status'].unique())
        return

    # 3. Date Filter (Simulate User Input: 2025-01-01 to Today)
    start_date = datetime(2025, 1, 1).date()
    end_date = datetime.now().date()
    
    df['Plan_Date_Obj'] = pd.to_datetime(df['Plan_Date'], errors='coerce')
    
    # Check NaT
    nats = df['Plan_Date_Obj'].isna().sum()
    print(f"    NaT (Invalid Dates): {nats}")
    
    # Apply Start Date
    d1 = df[df['Plan_Date_Obj'].dt.date >= start_date]
    print(f"[3.1] After Start Date ({start_date}): {len(d1)}")
    
    # Apply End Date
    d2 = d1[d1['Plan_Date_Obj'].dt.date <= end_date]
    print(f"[3.2] After End Date ({end_date}): {len(d2)}")
    
    df = d2 
    
    if df.empty:
        print("    Dates in DB:", sorted(jobs['Plan_Date'].astype(str).unique())[:5])
        return

    # 4. Check Data Content
    print("\n[4] Checking Content of Surviving Rows:")
    sample = df.head(5)
    for _, row in sample.iterrows():
        print(f"  - ID: {row.get('Job_ID')} | Driver: {row.get('Driver_Name')} | Cost: {row.get('Cost_Driver_Total')} | PayStatus: {row.get('Payment_Status')}")

    # 5. Cost Conversion Check
    print("\n[5] Cost Conversion Check:")
    current_cost = pd.to_numeric(df['Cost_Driver_Total'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
    print(f"    Total Cost Sum: {current_cost.sum()}")
    print(f"    Max Cost: {current_cost.max()}")

if __name__ == "__main__":
    debug_logic()
