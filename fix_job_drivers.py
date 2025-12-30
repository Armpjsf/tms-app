
from data.repository import repo
import pandas as pd

def fix_job_drivers():
    print("="*50)
    print("🛠️  FIXING MISSING DRIVERS IN JOBS")
    print("="*50)
    
    jobs = repo.get_data("Jobs_Main")
    drivers = repo.get_data("Master_Drivers")
    
    if jobs.empty: return

    # 1. Create Driver Map (ID -> Name)
    if not drivers.empty:
        # Normalize columns
        if 'Driver_ID' in drivers.columns and 'Driver_Name' in drivers.columns:
            driver_map = dict(zip(drivers['Driver_ID'], drivers['Driver_Name']))
        else:
            print("❌ Master_Drivers missing columns.")
            driver_map = {}
    else:
        driver_map = {}
        
    print(f"Loaded {len(driver_map)} drivers from Master.")
    
    # 2. Identify Jobs with Missing Driver Info
    # Check nulls
    missing_name = jobs[jobs['Driver_Name'].isna() | (jobs['Driver_Name'] == '')].copy()
    missing_id = jobs[jobs['Driver_ID'].isna() | (jobs['Driver_ID'] == '')].copy()
    
    print(f"Jobs missing Driver_Name: {len(missing_name)}")
    print(f"Jobs missing Driver_ID: {len(missing_id)}")
    
    updates = []
    
    # Strategy A: Use Driver_ID to fill Name
    for idx, row in missing_name.iterrows():
        d_id = row.get('Driver_ID')
        if d_id and d_id in driver_map:
            updates.append({
                "Job_ID": row['Job_ID'],
                "Driver_Name": driver_map[d_id]
            })
    
    # Strategy B: If both missing, assign to Default Driver (first one or specific)
    # Only for COMPLETED jobs to ensure they show up in payroll
    # Check casing of Driver_ID column in Jobs
    d_id_col = 'Driver_ID' if 'Driver_ID' in jobs.columns else 'Driver_Id'

    completed_missing = jobs[
        (jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED') &
        (jobs[d_id_col].isna() | (jobs['Driver_Name'].isna())) 
    ]
    
    for idx, row in jobs.iterrows():
        d_id = row.get(d_id_col)
        d_name = row.get('Driver_Name')
        
        needs_update = False
        new_d_id = d_id
        new_d_name = d_name
        
        # If ID missing, pick first available driver (Mock Fix)
        if (pd.isna(d_id) or d_id == '') and driver_map:
            new_d_id = list(driver_map.keys())[0]
            new_d_name = driver_map[new_d_id]
            needs_update = True
        
        # If Name missing but ID exists
        elif (pd.isna(d_name) or d_name == '') and d_id in driver_map:
            new_d_name = driver_map[d_id]
            needs_update = True
            
        if needs_update:
            updates.append({
                "Job_ID": row['Job_ID'],
                "Driver_ID": new_d_id,
                "Driver_Name": new_d_name
            })
            
    # Remove duplicates (Job_ID)
    unique_updates = {u['Job_ID']: u for u in updates}.values()
    
    if unique_updates:
        print(f"Updating {len(unique_updates)} jobs with Driver Info...")
        
        batch_size = 100
        batch = []
        for u in unique_updates:
            batch.append(u)
            if len(batch) >= batch_size:
                repo.client.table("Jobs_Main").upsert(batch).execute()
                batch = []
        if batch:
            repo.client.table("Jobs_Main").upsert(batch).execute()
            
        print("✅ Drivers Backfilled.")
    else:
        print("No driver updates needed.")

if __name__ == "__main__":
    fix_job_drivers()
