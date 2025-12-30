# services/driver_service.py
"""
Driver Service for TMS ePOD
Handles driver performance, scorecard, and analytics
"""

import pandas as pd
from datetime import datetime, timedelta
from data.repository import repo
from utils.logger import logger
from config.constants import JobStatus

class DriverService:
    
    @staticmethod
    def get_driver_scorecard(driver_id: str = None, start_date=None, end_date=None):
        """
        Calculate driver performance scorecard.
        Returns metrics: OTP, Fuel efficiency, Safety, Customer rating
        """
        jobs = repo.get_data("Jobs_Main")
        drivers = repo.get_data("Master_Drivers")
        fuel = repo.get_data("Fuel_Logs")
        
        if jobs.empty or drivers.empty:
            return pd.DataFrame()
        
        # Date filter
        jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        if start_date:
            jobs = jobs[jobs['Plan_Date'].dt.date >= start_date]
        if end_date:
            jobs = jobs[jobs['Plan_Date'].dt.date <= end_date]
        
        # Driver filter
        if driver_id:
            jobs = jobs[jobs['Driver_ID'] == driver_id]
            drivers = drivers[drivers['Driver_ID'] == driver_id]
        
        if jobs.empty:
            return pd.DataFrame()
        
        scorecards = []
        
        for _, driver in drivers.iterrows():
            d_id = driver['Driver_ID']
            d_name = driver.get('Driver_Name', d_id)
            d_jobs = jobs[jobs['Driver_ID'] == d_id]
            
            if d_jobs.empty:
                continue
            
            # 1. Total Jobs & Completion Rate
            total_jobs = len(d_jobs)
            completed = len(d_jobs[d_jobs['Job_Status'] == JobStatus.COMPLETED])
            completion_rate = (completed / total_jobs * 100) if total_jobs > 0 else 0
            
            # 2. On-Time Delivery Rate (simplified: completed = on time)
            otp_rate = completion_rate  # In real system: compare actual vs planned time
            
            # 3. Customer Rating
            ratings = pd.to_numeric(d_jobs['Rating'], errors='coerce').dropna()
            avg_rating = ratings.mean() if len(ratings) > 0 else 0
            
            # 4. Fuel Efficiency (if fuel data available)
            fuel_efficiency = 0
            if not fuel.empty:
                d_fuel = fuel[fuel['Driver_ID'] == d_id]
                if not d_fuel.empty:
                    total_liters = pd.to_numeric(d_fuel['Liters'], errors='coerce').sum()
                    
                    # Get total distance from jobs
                    total_km = pd.to_numeric(d_jobs['Est_Distance_KM'], errors='coerce').sum()
                    
                    if total_liters > 0 and total_km > 0:
                        fuel_efficiency = total_km / total_liters  # km per liter
            
            # 5. Revenue Generated
            revenue = pd.to_numeric(
                d_jobs['Price_Cust_Total'].astype(str).str.replace(',', ''), 
                errors='coerce'
            ).sum()
            
            # 6. Earnings
            earnings = pd.to_numeric(
                d_jobs['Cost_Driver_Total'].astype(str).str.replace(',', ''),
                errors='coerce'
            ).sum()
            
            # 7. Failed/Cancelled Jobs
            failed = len(d_jobs[d_jobs['Job_Status'].isin([JobStatus.FAILED, JobStatus.CANCELLED])])
            failure_rate = (failed / total_jobs * 100) if total_jobs > 0 else 0
            
            # Calculate Overall Score (weighted average)
            otp_score = min(otp_rate, 100)
            rating_score = (avg_rating / 5 * 100) if avg_rating > 0 else 50
            efficiency_score = min(fuel_efficiency * 10, 100) if fuel_efficiency > 0 else 50
            failure_penalty = failure_rate * 2
            
            overall_score = (
                otp_score * 0.35 +
                rating_score * 0.30 +
                efficiency_score * 0.20 +
                (100 - failure_penalty) * 0.15
            )
            
            scorecards.append({
                'Driver_ID': d_id,
                'Driver_Name': d_name,
                'Vehicle_Plate': driver.get('Vehicle_Plate', 'N/A'),
                'Total_Jobs': total_jobs,
                'Completed_Jobs': completed,
                'OTP_Rate': round(otp_rate, 1),
                'Avg_Rating': round(avg_rating, 2),
                'Fuel_Efficiency': round(fuel_efficiency, 2),
                'Revenue_Generated': revenue,
                'Total_Earnings': earnings,
                'Failed_Jobs': failed,
                'Overall_Score': round(overall_score, 1)
            })
        
        return pd.DataFrame(scorecards)
    
    @staticmethod
    def get_driver_performance_trend(driver_id: str, days: int = 30):
        """Get daily performance trend for a driver."""
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
        
        jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        start_date = datetime.now() - timedelta(days=days)
        
        d_jobs = jobs[
            (jobs['Driver_ID'] == driver_id) & 
            (jobs['Plan_Date'] >= start_date)
        ].copy()
        
        if d_jobs.empty:
            return pd.DataFrame()
        
        d_jobs['Cost_Driver_Total'] = pd.to_numeric(
            d_jobs['Cost_Driver_Total'].astype(str).str.replace(',', ''),
            errors='coerce'
        ).fillna(0)
        
        daily = d_jobs.groupby(d_jobs['Plan_Date'].dt.date).agg({
            'Job_ID': 'count',
            'Cost_Driver_Total': 'sum',
            'Rating': lambda x: pd.to_numeric(x, errors='coerce').mean()
        }).reset_index()
        
        daily.columns = ['Date', 'Jobs', 'Earnings', 'Avg_Rating']
        return daily
    
    @staticmethod
    def get_driver_ranking(metric: str = 'Overall_Score', limit: int = 10):
        """Get top drivers by specified metric."""
        scorecard = DriverService.get_driver_scorecard()
        if scorecard.empty:
            return pd.DataFrame()
        
        if metric not in scorecard.columns:
            metric = 'Overall_Score'
        
        return scorecard.sort_values(metric, ascending=False).head(limit)
    
    @staticmethod
    def get_driver_alerts():
        """Get drivers with performance issues or expiring documents."""
        drivers = repo.get_data("Master_Drivers")
        if drivers.empty:
            return []
        
        alerts = []
        today = datetime.now()
        
        # Check document expiry
        doc_cols = ['Insurance_Expiry', 'Tax_Expiry', 'Act_Expiry']
        
        for _, d in drivers.iterrows():
            driver_id = d['Driver_ID']
            driver_name = d.get('Driver_Name', driver_id)
            
            for col in doc_cols:
                if col in drivers.columns:
                    try:
                        exp_date = pd.to_datetime(d[col], errors='coerce')
                        if pd.notna(exp_date):
                            days_left = (exp_date - today).days
                            if days_left < 0:
                                alerts.append({
                                    'Driver_ID': driver_id,
                                    'Driver_Name': driver_name,
                                    'Alert_Type': 'Document Expired',
                                    'Message': f"{col.replace('_', ' ')} has expired",
                                    'Severity': 'High'
                                })
                            elif days_left < 30:
                                alerts.append({
                                    'Driver_ID': driver_id,
                                    'Driver_Name': driver_name,
                                    'Alert_Type': 'Document Expiring',
                                    'Message': f"{col.replace('_', ' ')} expires in {days_left} days",
                                    'Severity': 'Medium'
                                })
                    except:
                        pass
            
            # Check service mileage
            if 'Current_Mileage' in drivers.columns and 'Next_Service_Mileage' in drivers.columns:
                try:
                    current = pd.to_numeric(d['Current_Mileage'], errors='coerce')
                    next_service = pd.to_numeric(d['Next_Service_Mileage'], errors='coerce')
                    
                    if pd.notna(current) and pd.notna(next_service):
                        km_left = next_service - current
                        if km_left < 0:
                            alerts.append({
                                'Driver_ID': driver_id,
                                'Driver_Name': driver_name,
                                'Alert_Type': 'Service Overdue',
                                'Message': f"Vehicle service overdue by {abs(km_left):.0f} km",
                                'Severity': 'High'
                            })
                        elif km_left < 500:
                            alerts.append({
                                'Driver_ID': driver_id,
                                'Driver_Name': driver_name,
                                'Alert_Type': 'Service Due',
                                'Message': f"Vehicle service due in {km_left:.0f} km",
                                'Severity': 'Medium'
                            })
                except:
                    pass
        
        return alerts
    
    @staticmethod
    def compare_drivers(driver_ids: list):
        """Compare performance of multiple drivers."""
        scorecard = DriverService.get_driver_scorecard()
        if scorecard.empty:
            return pd.DataFrame()
        
        return scorecard[scorecard['Driver_ID'].isin(driver_ids)]
