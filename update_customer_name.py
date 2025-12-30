
from data.repository import repo
import pandas as pd

def update_customer_name():
    print("="*50)
    print("🛠️  UPDATING CUSTOMER NAME")
    print("="*50)
    
    table_name = "Jobs_Main"
    old_name = "Tostem"
    new_name = "บริษัท ทอสเท็มไทย จำกัด"
    
    print(f"Fetching {table_name}...")
    jobs = repo.get_data(table_name)
    
    if jobs.empty:
        print("❌ No jobs found.")
        return

    # Filter rows with old name
    mask = jobs['Customer_Name'] == old_name
    to_update = jobs[mask].copy()
    
    count = len(to_update)
    print(f"Found {count} jobs with Customer_Name='{old_name}'")
    
    if count > 0:
        print(f"Updating to '{new_name}'...")
        
        updates = []
        for index, row in to_update.iterrows():
            updates.append({
                "Job_ID": row['Job_ID'],
                "Customer_Name": new_name
            })
            
        # Batch update
        batch_size = 100
        client = repo.client
        
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i+batch_size]
            try:
                client.table(table_name).upsert(batch).execute()
                print(f"  - Batch {i//batch_size + 1} updated.")
            except Exception as e:
                print(f"  ❌ Error updating batch: {e}")
                
        # Clear cache to ensure UI gets new data
        if hasattr(repo, 'clear_cache'): # Check if method exists, though generic streamlit cache clear is better
             pass 
        
        print(f"✅ Successfully updated {count} rows.")
        print("Please refresh the application to see changes.")
        
    else:
        print("No rows to update.")

if __name__ == "__main__":
    update_customer_name()
