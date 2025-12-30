
import pandas as pd
from data.repository import repo
from utils.logger import logger

class PricingService:
    @staticmethod
    def get_config_value(key, default_value):
        try:
            df = repo.get_data("System_Config")
            if df.empty: return default_value
            
            # Flexible column lookup
            key_col, val_col = "Key", "Value"
            for col in df.columns:
                if "Key" in col: key_col = col
                if "Value" in col: val_col = col
                
            row = df[df[key_col].astype(str) == str(key)]
            if not row.empty: 
                val = str(row.iloc[0][val_col]).replace(',', '')
                return float(val)
            return default_value
        except: return default_value

    @staticmethod
    def _get_static_kpl(vehicle_type):
        try:
            rate_4w = PricingService.get_config_value("fuel_4w", 11.5)
            rate_6w = PricingService.get_config_value("fuel_6w", 5.5)
            rate_10w = PricingService.get_config_value("fuel_10w", 3.5)
            
            v_type = str(vehicle_type)
            if "พ่วง" in v_type or "เทรลเลอร์" in v_type: return 2.75
            elif "10" in v_type: return rate_10w
            elif "6" in v_type: return rate_6w
            else: return rate_4w
        except: return 11.5

    @staticmethod
    def calculate_driver_cost(plan_date, distance, vehicle_type, current_diesel_price=None, vehicle_plate=None, total_drops=1):
        try:
            try: distance = float(distance)
            except: return 0.0

            # 1. Base Rate (Fixed)
            df = repo.get_data("Rate_Card")
            base_rate = 0.0
            
            if not df.empty:
                dist_col_idx = 0
                for i, col_name in enumerate(df.columns):
                    if "ระยะทาง" in str(col_name) or "Distance" in str(col_name): 
                        dist_col_idx = i; break
                
                dist_col_name = df.columns[dist_col_idx]
                df[dist_col_name] = pd.to_numeric(df[dist_col_name], errors='coerce').fillna(0)
                
                tier = df[df[dist_col_name] >= float(distance)].sort_values(by=dist_col_name).head(1)
                if tier.empty: tier = df.sort_values(by=dist_col_name).tail(1)
                
                if not tier.empty:
                    try: price = float(str(current_diesel_price).replace(',','')) if current_diesel_price else 30.00
                    except: price = 30.00

                    group_offset = 1 
                    if price <= 27.00: group_offset = 0
                    elif 27.01 <= price <= 30.00: group_offset = 1
                    elif 30.01 <= price <= 32.00: group_offset = 2
                    elif price > 32.00: group_offset = 3
                    
                    veh_offset = 0 
                    if "6" in str(vehicle_type): veh_offset = 1
                    elif "10" in str(vehicle_type): veh_offset = 2
                    
                    target_col_idx = dist_col_idx + 1 + (group_offset * 3) + veh_offset
                    if target_col_idx < len(df.columns):
                        val = str(tier.iloc[0, target_col_idx]).replace(',', '')
                        base_rate = float(val) if val else 0.0
            
            # 2. Dynamic Fuel
            diesel_price = float(str(current_diesel_price).replace(',','')) if current_diesel_price else PricingService.get_config_value("fuel_diesel_price", 30.00)
            
            # Note: We rely on static KPL here for simplicity, or we could inject FuelService dependency
            kpl_to_use = PricingService._get_static_kpl(vehicle_type)
            
            dynamic_fuel_cost = 0.0
            if kpl_to_use > 0:
                fuel_cost_per_km = diesel_price / kpl_to_use
                dynamic_fuel_cost = distance * fuel_cost_per_km
            
            # 3. Other Costs
            depreciation_rate = PricingService.get_config_value("cost_depreciation_per_km", 3.00)
            depreciation_cost = distance * depreciation_rate
            
            labor_cost_per_drop = PricingService.get_config_value("cost_labor_per_drop", 50.00)
            labor_cost = total_drops * labor_cost_per_drop
            
            toll_fee = PricingService.get_config_value("cost_default_toll", 100.00)

            final_cost = base_rate + dynamic_fuel_cost + depreciation_cost + labor_cost + toll_fee
            return final_cost
        except Exception as e: 
            logger.error(f"Cost Calc Error: {e}")
            return 0.0
