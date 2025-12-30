
import sys
import os
import random

# Add project path
sys.path.insert(0, os.getcwd())

from data.repository import repo
import pandas as pd

def fix_data():
    client = repo.client
    
    print("="*50)
    print("🛠️  STARTING DATA CLEANUP")
    print("="*50)

    # 1. Fix Branch_ID -> "นวนคร"
    # Target tables: Jobs_Main, Master_Drivers, Master_Vehicles
    target_branch = "นวนคร"
    tables_to_update_branch = ["Jobs_Main", "Master_Drivers", "Master_Vehicles"]
    
    print(f"\n[1] Updating Branch_ID to '{target_branch}'...")
    for table in tables_to_update_branch:
        try:
            # Check if table has Branch_ID column (fetch 1 row)
            res = client.table(table).select("Branch_ID").limit(1).execute()
            if res.data: # Table exists and has data
                # Update all rows
                # Note: supabase-py might restrict update all without where. 
                # We will fetch IDs and update in batches if needed, or try update with a dummy where clause if allowed.
                # Safer: Fetch all IDs and upsert.
                
                # Fetch all data
                rows = repo.get_data(table)
                if not rows.empty:
                    print(f"    - Updating {len(rows)} rows in '{table}'...")
                    pk_map = {
                        "Jobs_Main": "Job_ID", 
                        "Master_Drivers": "Driver_ID",
                        "Master_Vehicles": "Vehicle_Plate"
                    }
                    pk = pk_map.get(table)
                    
                    updates = []
                    for _, row in rows.iterrows():
                        record = {pk: row[pk], "Branch_ID": target_branch}
                        updates.append(record)
                    
                    # Upsert in batches of 100
                    batch_size = 100
                    for i in range(0, len(updates), batch_size):
                        batch = updates[i:i+batch_size]
                        client.table(table).upsert(batch).execute()
                    print(f"      ✅ Done.")
            else:
                 print(f"    - Table '{table}' empty or no Branch_ID.")
        except Exception as e:
            print(f"    ❌ Error updating {table}: {e}")

    # 2. Fix Customer_ID in Jobs_Main
    print(f"\n[2] Fixing Missing Customer_ID in Jobs_Main...")
    try:
        customers = repo.get_data("Master_Customers")
        jobs = repo.get_data("Jobs_Main")
        
        if not customers.empty and not jobs.empty:
            # Create Name -> ID map
            cust_map = dict(zip(customers['Customer_Name'], customers['Customer_ID']))
            
            updates = []
            fixed_count = 0
            
            for _, job in jobs.iterrows():
                current_id = job.get('Customer_ID')
                cust_name = job.get('Customer_Name')
                
                # Check if need update (ID is missing or mismatch)
                if (pd.isna(current_id) or current_id == '') and cust_name in cust_map:
                    updates.append({
                        "Job_ID": job['Job_ID'],
                        "Customer_ID": cust_map[cust_name]
                    })
                    fixed_count += 1
            
            if updates:
                print(f"    - Fixing {len(updates)} jobs...")
                for i in range(0, len(updates), 100):
                    batch = updates[i:i+100]
                    client.table("Jobs_Main").upsert(batch).execute()
                print(f"      ✅ Fixed {fixed_count} missing Customer_IDs.")
            else:
                print("    - No jobs needed Customer_ID fix.")
        else:
            print("    - Master_Customers or Jobs_Main empty.")
            
    except Exception as e:
        print(f"    ❌ Error fixing Customer_IDs: {e}")

    # 3. Fix Duplicate Driver Mobile/Line
    print(f"\n[3] Fixing Duplicate Driver Data...")
    try:
        drivers = repo.get_data("Master_Drivers")
        if not drivers.empty:
            updates = []
            
            # Base numbers
            base_mobile = "081-111-22"
            base_line = "U1234567"
            
            for index, row in drivers.iterrows():
                # Generate unique suffix based on index (00-99)
                suffix = f"{index+1:02d}"
                
                # Assign unique
                new_mobile = f"{base_mobile}{suffix}"
                new_line = f"{base_line}{suffix}"
                
                updates.append({
                    "Driver_ID": row['Driver_ID'],
                    "Mobile_No": new_mobile,
                    "Line_User_ID": new_line
                })
            
            print(f"    - Updating {len(updates)} drivers with unique contacts...")
            client.table("Master_Drivers").upsert(updates).execute()
            print(f"      ✅ Drivers updated.")
            
    except Exception as e:
        print(f"    ❌ Error fixing drivers: {e}")

    # Cache will be cleared by user refresh
    print("\n✅ DATA CLEANUP COMPLETE! Please refresh the application.")

if __name__ == "__main__":
    fix_data()
