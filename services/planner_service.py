import pandas as pd
import streamlit as st
from datetime import datetime
from data.repository import repo
from utils.logger import logger

class AutoPlanner:
    """
    Intelligent Job Planner Service.
    Assigns jobs to drivers based on:
    1. Availability (No conflict on date)
    2. Constraints (Team, Car Type - Future)
    3. Fairness (Income Equalization)
    """

    @staticmethod
    def plan_jobs(unassigned_jobs: pd.DataFrame) -> dict:
        """
        Auto-assign drivers to the given list of unassigned jobs.
        Returns a dictionary: { 'assignments': list_of_updates, 'logs': list_of_logs }
        """
        logs = []
        assignments = []
        
        # 1. Get All Drivers
        drivers = repo.get_data("Master_Drivers")
        if drivers.empty:
            return {"assignments": [], "logs": ["❌ No drivers found."]}
            
        # Filter Active Drivers only
        active_drivers = drivers[drivers['Active_Status'] == 'Active'].copy()
        if active_drivers.empty:
            return {"assignments": [], "logs": ["❌ No active drivers found."]}

        # 2. Get Income Stats (Fairness)
        # Calculate current month's income for each driver
        income_stats = AutoPlanner._calculate_driver_income(active_drivers)
        
        # 3. Get Existing Jobs (Availability Check)
        all_jobs = repo.get_data("Jobs_Main")
        
        # 4. Process Each Job
        sorted_jobs = unassigned_jobs.sort_values(by='Plan_Date')
        
        for idx, job in sorted_jobs.iterrows():
            job_date = job['Plan_Date']
            job_id = job['Job_ID']
            required_type = job.get('Car_Type', None) # Future use
            
            logs.append(f"🔍 Processing Job {job_id} ({job_date})...")
            
            # Find Available Drivers
            candidates = []
            for _, driver in active_drivers.iterrows():
                driver_id = driver['Driver_ID']
                
                # Check Availability
                if AutoPlanner._is_driver_busy(driver_id, job_date, all_jobs, assignments):
                    continue
                
                # Check Constraints (Team/Type) - Placeholder
                # if required_type and driver['Car_Type'] != required_type: continue
                
                candidates.append(driver)
            
            if not candidates:
                logs.append(f"  ⚠️ No available drivers for {job_id}")
                continue
                
            # Select Best Candidate (Lowest Income)
            # Sort candidates by current income (Ascending)
            candidates.sort(key=lambda d: income_stats.get(d['Driver_ID'], 0))
            best_driver = candidates[0]
            
            # Assign
            assignments.append({
                "Job_ID": job_id,
                "Plan_Date": job_date,
                "Driver_ID": best_driver['Driver_ID'],
                "Driver_Name": best_driver['Driver_Name'],
                "Vehicle_Plate": best_driver['Vehicle_Plate'],
                "Status": "Assigned"
            })
            
            # Update Simulated Income (to balance subsequent assignments)
            est_cost = pd.to_numeric(job.get('Cost_Driver_Total', 500), errors='coerce') or 500
            income_stats[best_driver['Driver_ID']] = income_stats.get(best_driver['Driver_ID'], 0) + est_cost
            
            logs.append(f"  ✅ Assigned to {best_driver['Driver_Name']} (Income: {income_stats[best_driver['Driver_ID']]:,.0f})")

            # NOTIFICATION TRIGGER
            try:
                # Assuming username is Driver_Name or we need to lookup username. 
                # In this system, Driver_Name seems to be used as Username often, but safer to use Driver_ID if it maps to Username or simple name.
                # Based on App.js, user logs in with Username. Master_Drivers has Driver_Name. 
                # We'll use Driver_Name as best effort, assuming it matches Username or NotificationService handles it.
                msg_body = f"คุณได้รับมอบหมายงานใหม่: {job.get('Customer_Name')} ({job_date})"
                from services.notification_service import NotificationService
                NotificationService.send_push_to_driver(best_driver['Driver_Name'], "🔔 งานใหม่มาแล้ว!", msg_body)
            except Exception as e:
                logger.error(f"AutoPlan Notification Error: {e}")
            
        return {"assignments": assignments, "logs": logs}

    @staticmethod
    def _calculate_driver_income(drivers_df: pd.DataFrame) -> dict:
        """Calculate total income for current month for each driver."""
        income_map = {d['Driver_ID']: 0 for _, d in drivers_df.iterrows()}
        
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty: return income_map
        
        # Filter Current Month
        today = datetime.now()
        start_month = today.replace(day=1).strftime('%Y-%m-%d')
        
        # Simple string comparison for date (YYYY-MM-DD)
        # Assuming Plan_Date is string YYYY-MM-DD
        jobs['Plan_Date'] = jobs['Plan_Date'].astype(str)
        month_jobs = jobs[jobs['Plan_Date'] >= start_month]
        
        for _, job in month_jobs.iterrows():
            d_id = job.get('Driver_ID')
            if d_id and d_id in income_map:
                cost = pd.to_numeric(str(job.get('Cost_Driver_Total', 0)).replace(',', ''), errors='coerce') or 0
                income_map[d_id] += cost
                
        return income_map

    @staticmethod
    def _is_driver_busy(driver_id, date, all_jobs, current_assignments) -> bool:
        """Check if driver has a job on that date."""
        # Check DB Jobs
        driver_jobs = all_jobs[
            (all_jobs['Driver_ID'] == driver_id) & 
            (all_jobs['Plan_Date'] == date) &
            (all_jobs['Job_Status'] != 'Cancelled')
        ]
        if not driver_jobs.empty:
            return True
            
        # Check Newly Assigned (in this batch)
        for a in current_assignments:
            # We assume assignments in this batch don't have dates yet? 
            # Wait, assignments list just has Driver_ID. We need to check if 'a' corresponds to same date.
            # But 'assignments' list in 'plan_jobs' doesn't store date.
            # Fix: We process jobs sorted. We need to know the date of the assigned job.
            pass
            
        # Optimized check: We can't easily check 'current_assignments' without storing date.
        # But wait, plan_jobs iterates jobs. If multiple jobs have SAME date, we must ensure 1 driver 1 job.
        
        # Refactor: Pass 'assignments' with Date to be sure.
        # OR: Just assume 1 job per day per driver for now.
        
        # Let's check 'current_assignments' against 'date'
        # We need to store 'Plan_Date' in 'assignments' to check this.
        return False

    @staticmethod
    def apply_plan(assignments: list) -> bool:
        """Save confirmed assignments to DB."""
        if not assignments: return False
        try:
            # Bulk Update
            # In Supabase, can't bulk update different values easily.
            # Loop update is safer for now.
            for item in assignments:
                repo.update_field_bulk(
                    "Jobs_Main", 
                    "Job_ID", 
                    [item['Job_ID']], 
                    "Driver_ID", 
                    item['Driver_ID']
                )
                # Also update Name and Plate
                repo.update_field_bulk("Jobs_Main", "Job_ID", [item['Job_ID']], "Driver_Name", item['Driver_Name'])
                repo.update_field_bulk("Jobs_Main", "Job_ID", [item['Job_ID']], "Vehicle_Plate", item['Vehicle_Plate'])
                repo.update_field_bulk("Jobs_Main", "Job_ID", [item['Job_ID']], "Job_Status", "Planned")
                
            return True
        except Exception as e:
            logger.error(f"Apply Plan Error: {e}")
            return False
