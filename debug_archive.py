
import pandas as pd
from data.repository import repo

# Fetch all jobs
print("Fetching jobs...")
jobs = repo.get_data("Jobs_Main")
with open("debug_output.txt", "w", encoding="utf-8") as f:
    f.write(f"Total rows fetched: {len(jobs)}\n")

    if not jobs.empty:
        # 1. Check Status Distribution
        f.write("\n--- Job Status Counts ---\n")
        if 'Job_Status' in jobs.columns:
            f.write(jobs['Job_Status'].value_counts(dropna=False).to_string() + "\n")
        else:
            f.write("Column 'Job_Status' not found!\n")

        # 2. Check Date Validity
        f.write("\n--- Date Analysis ---\n")
        # Try coalescing like the service does
        if 'Actual_Delivery_Time' in jobs.columns and 'Plan_Date' in jobs.columns:
            jobs['Archive_Date_Check'] = pd.to_datetime(jobs['Actual_Delivery_Time'].fillna(jobs['Plan_Date']), errors='coerce')
        elif 'Actual_Delivery_Time' in jobs.columns:
            jobs['Archive_Date_Check'] = pd.to_datetime(jobs['Actual_Delivery_Time'], errors='coerce')
        else:
            jobs['Archive_Date_Check'] = pd.to_datetime(jobs.get('Plan_Date'), errors='coerce')
            
        f.write(f"Total valid dates found: {jobs['Archive_Date_Check'].notna().sum()}\n")
        f.write(f"Total NaT (invalid dates): {jobs['Archive_Date_Check'].isna().sum()}\n")
        
        # 3. Check Candidates for Archive (Threshold=0)
        cutoff = pd.Timestamp.now()
        candidates = jobs[
            (jobs['Job_Status'] == 'Completed') & 
            (jobs['Archive_Date_Check'] < cutoff)
        ]
        f.write(f"\nCandidates for Archive (Status='Completed' & Date < Now): {len(candidates)}\n")
    else:
        f.write("Jobs table is empty.\n")
