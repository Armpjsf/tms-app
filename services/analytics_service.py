
import pandas as pd
from data.repository import repo
from datetime import datetime

class AnalyticsService:
    """
    Service for advanced analytics and reporting.
    Calculates Financial KPIs like Cost Per KM.
    """

    @staticmethod
    def get_cost_per_km(start_date, end_date) -> pd.DataFrame:
        """
        Calculate Cost Per KM for each vehicle in the given date range.
        Formula: (Total Fuel Cost + Total Maint Cost) / Distance Traveled
        Distance is calculated from Min/Max Odometer in Fuel Logs.
        """
        # 1. Fetch Data
        fuel_logs = repo.get_data("Fuel_Logs")
        maint_tickets = repo.get_data("Maintenance_Tickets")
        drivers = repo.get_data("Master_Drivers")
        
        results = []
        
        # Ensure dates are datetime
        start_ts = pd.to_datetime(start_date)
        end_ts = pd.to_datetime(end_date)
        
        # 2. Process Each Active Vehicle
        # Group by Vehicle Plate or Driver? Plate is better for asset tracking.
        # But Fuel Log uses 'Vehicle_Plate'.
        
        if fuel_logs.empty and maint_tickets.empty:
            return pd.DataFrame()
            
        vehicles = fuel_logs['Vehicle_Plate'].unique() if not fuel_logs.empty else []
        
        for plate in vehicles:
            if not plate: continue
            
            # Filter Logs for this vehicle & date range
            # Fuel
            f_logs = fuel_logs[fuel_logs['Vehicle_Plate'] == plate].copy()
            if not f_logs.empty:
                f_logs['Date_Time'] = pd.to_datetime(f_logs['Date_Time'], errors='coerce').dt.tz_localize(None)
                f_logs = f_logs[(f_logs['Date_Time'] >= start_ts) & (f_logs['Date_Time'] <= end_ts)]
            
            # Maintenance
            m_logs = maint_tickets[maint_tickets['Vehicle_Plate'] == plate].copy() if not maint_tickets.empty else pd.DataFrame()
            if not m_logs.empty:
                m_logs['Report_Date'] = pd.to_datetime(m_logs['Report_Date']).dt.tz_localize(None)
                m_logs = m_logs[(m_logs['Report_Date'] >= start_ts) & (m_logs['Report_Date'] <= end_ts)]
                
            # 3. Calculate Metrics
            total_fuel_cost = f_logs['Price_Total'].sum() if not f_logs.empty else 0
            total_liters = f_logs['Liters'].sum() if not f_logs.empty else 0
            total_maint_cost = m_logs['Cost'].sum() if not m_logs.empty else 0
            
            # Distance Calculation (Max Odo - Min Odo)
            distance = 0
            if not f_logs.empty and 'Odometer' in f_logs.columns:
                try:
                    # Drop zeros or NaNs for Odo
                    valid_odo = f_logs[f_logs['Odometer'] > 0]['Odometer']
                    if len(valid_odo) > 1:
                        distance = valid_odo.max() - valid_odo.min()
                except:
                    pass
            
            # Cost Per KM
            cost_per_km = 0
            if distance > 0:
                cost_per_km = (total_fuel_cost + total_maint_cost) / distance
                
            # Avg Consumption (Km/L)
            km_per_liter = 0
            if total_liters > 0:
                km_per_liter = distance / total_liters
                
            results.append({
                "Vehicle": plate,
                "Distance (km)": distance,
                "Fuel Cost": total_fuel_cost,
                "Maint Cost": total_maint_cost,
                "Total Cost": total_fuel_cost + total_maint_cost,
                "Cost/KM (THB)": cost_per_km,
                "Km/L": km_per_liter
            })
            
        return pd.DataFrame(results)
