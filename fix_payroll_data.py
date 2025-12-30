
from data.repository import repo
from config.constants import PaymentStatus
import pandas as pd

def fix_payroll():
    print("="*50)
    print("🛠️  FIXING PAYROLL DATA (DUMMY VALUES)")
    print("="*50)
    
    jobs = repo.get_data("Jobs_Main")
    
    # Filter Completed check (Case Insensitive)
    mask = jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED'
    to_update = jobs[mask].copy()
    
    count = len(to_update)
    print(f"Found {count} COMPLETED jobs to update.")
    
    if count > 0:
        updates = []
        for index, row in to_update.iterrows():
            current_cost = pd.to_numeric(str(row.get('Cost_Driver_Total', '')).replace(',', ''), errors='coerce')
            
            # Update if cost is 0 or NaN
            if pd.isna(current_cost) or current_cost == 0:
                updates.append({
                    "Job_ID": row['Job_ID'],
                    "Cost_Driver_Total": 500, # Dummy Cost
                    "Payment_Status": row.get('Payment_Status') or "รอจ่าย"
                })
        
        if updates:
            print(f"Updating {len(updates)} rows with Cost=500...")
            
             # Batch update
            batch_size = 100
            client = repo.client
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i+batch_size]
                try:
                    client.table("Jobs_Main").upsert(batch).execute()
                    print(f"  - Batch {i//batch_size + 1} updated.")
                except Exception as e:
                    print(f"  ❌ Error: {e}")
            
            print("✅ Update Complete.")
        else:
            print("All completed jobs already have cost > 0.")
    else:
        print("No completed jobs found.")

if __name__ == "__main__":
    fix_payroll()
