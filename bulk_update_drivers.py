
from data.repository import repo
import pandas as pd
import os

def bulk_update_drivers():
    print("="*50)
    print("🚚 BULK UPDATE DRIVERS FROM INPUT LIST")
    print("="*50)
    
    # 1. Load Input List
    input_file = r"c:\Users\Armdd\TMS_ePOD\driver_names_input.txt"
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return
        
    with open(input_file, "r", encoding="utf-8") as f:
        # Read lines and strip whitespace
        driver_names = [line.strip() for line in f if line.strip()]
        
    print(f"[1] Loaded {len(driver_names)} driver names from input.")

    # 2. Load Master Drivers for Mapping
    masters = repo.get_data("Master_Drivers")
    if masters.empty:
        print("❌ Master_Drivers empty. Cannot map IDs.")
        return
        
    # Create Name -> ID map (Normalize spaces if needed)
    # Handle duplicates in master? Take first one found.
    name_to_id = {}
    for _, row in masters.iterrows():
        name = str(row['Driver_Name']).strip()
        if name not in name_to_id:
            name_to_id[name] = row['Driver_ID']
            
    print(f"[2] Loaded {len(name_to_id)} drivers from Master.")

    # 3. Load Jobs to Update
    # Target: All jobs sorted by Job_ID (assuming sequential input matches sequential jobs)
    jobs = repo.get_data("Jobs_Main")
    if jobs.empty:
        print("❌ No jobs found.")
        return
        
    # Sort by Job_ID to ensure alignment
    jobs_sorted = jobs.sort_values(by="Job_ID", ascending=True)
    
    # We will update ALL jobs or just invalid ones?
    # User said: "This is the real driver names..." implies the whole list corresponds to the jobs.
    # We should match length.
    
    total_jobs = len(jobs_sorted)
    count_input = len(driver_names)
    
    print(f"[3] Total Jobs in DB: {total_jobs} | Input Names: {count_input}")
    
    if count_input > total_jobs:
        print("⚠️ Warning: More names than jobs! Some names will be unused.")
    elif count_input < total_jobs:
        print("⚠️ Warning: Fewer names than jobs! Not all jobs will be updated.")
        
    updates = []
    
    # Iterate through jobs and assign names
    for i, (idx, job_row) in enumerate(jobs_sorted.iterrows()):
        if i >= count_input:
            break
            
        target_name = driver_names[i]
        
        # Look up ID
        target_id = name_to_id.get(target_name)
        
        # If not found, do we specific logic? 
        # User said "pull id to match". If no match, maybe keep name but empty ID?
        # Or try to find by partial match? For now strict match.
        
        update_payload = {
            "Job_ID": job_row['Job_ID'],
            "Driver_Name": target_name
        }
        
        if target_id:
            update_payload["Driver_ID"] = target_id
        else:
             # Mark unknown if needed, or leave existing ID?
             # Better to clear invalid ID if name changes to something unknown
             # But let's check if name exists in map
             pass
             
        updates.append(update_payload)

    # 4. Execute Update
    if updates:
        print(f"\n[4] Updating {len(updates)} jobs...")
        
        batch_size = 100
        client = repo.client
        
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i+batch_size]
            try:
                client.table("Jobs_Main").upsert(batch).execute()
                print(f"  - Batch {i//batch_size + 1} updated.")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                
        print("✅ Bulk Update Complete.")
        
        # Report Missing Mappings
        missing_map = [u['Driver_Name'] for u in updates if 'Driver_ID' not in u]
        if missing_map:
            print(f"\n⚠️ {len(missing_map)} names could not be mapped to an ID:")
            print(list(set(missing_map))[:20]) # Show unique missing
    else:
        print("No updates prepared.")

if __name__ == "__main__":
    bulk_update_drivers()
