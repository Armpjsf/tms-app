
import pandas as pd
from datetime import datetime
from data.repository import repo
from utils.logger import logger
from config.constants import JobStatus

class MaintenanceService:
    
    # Position Schemas
    TIRE_POSITIONS = {
        "4W": {
            "1": "FL - Front Left (หน้าซ้าย)",
            "2": "FR - Front Right (หน้าขวา)",
            "3": "RL - Rear Left (หลังซ้าย)",
            "4": "RR - Rear Right (หลังขวา)",
            "S1": "Spare - ยางอะไหล่"
        },
        "6W": {
            "1": "FL - Front Left (หน้าซ้าย)",
            "2": "FR - Front Right (หน้าขวา)",
            "3": "RLO - Rear Left Outer (หลังซ้ายนอก)",
            "4": "RLI - Rear Left Inner (หลังซ้ายใน)",
            "5": "RRI - Rear Right Inner (หลังขวาใน)",
            "6": "RRO - Rear Right Outer (หลังขวานอก)",
            "S1": "Spare - ยางอะไหล่"
        },
        "10W": {
            "1": "FL - Front Left",
            "2": "FR - Front Right",
            "3": "DLO - Drive Left Outer",
            "4": "DLI - Drive Left Inner",
            "5": "DRI - Drive Right Inner",
            "6": "DRO - Drive Right Outer",
            "7": "TLO - Trailer Left Outer",
            "8": "TLI - Trailer Left Inner",
            "9": "TRI - Trailer Right Inner",
            "10": "TRO - Trailer Right Outer",
            "S1": "Spare - ยางอะไหล่"
        }
    }

    @staticmethod
    def get_current_parts(plate: str):
        """Get currently installed parts for a vehicle."""
        df = repo.get_data("Vehicle_Parts_Current")
        if df.empty:
            return pd.DataFrame()
        return df[df['Vehicle_Plate'] == plate]

    @staticmethod
    def install_part(plate: str, part_type: str, position: str, serial_no: str, 
                     brand: str, model: str, install_odo: float, remark: str = "", 
                     ticket_id: str = None, price: float = 0):
        """
        Install a new part.
        """
        
        # 1. Check existing
        current = repo.get_data("Vehicle_Parts_Current")
        if not current.empty:
            existing = current[
                (current['Vehicle_Plate'] == plate) & 
                (current['Position'] == position) & 
                (current['Part_Type'] == part_type)
            ]
            
            if not existing.empty:
                # Remove Old Part
                old_part = existing.iloc[0].to_dict()
                MaintenanceService.remove_part(
                    plate, part_type, position, 
                    removal_odo=install_odo, # Assume replacement happens at same odo
                    reason=f"Replaced by New Part (Ticket: {ticket_id})" if ticket_id else "Replaced by New Part"
                )

        # 2. Add New Part
        new_part = {
            "Part_ID": f"PT-{datetime.now().strftime('%y%m%d%H%M%S')}",
            "Vehicle_Plate": plate,
            "Part_Type": part_type,
            "Position": position,
            "Serial_No": serial_no,
            "Brand": brand,
            "Model": model,
            "Install_Date": datetime.now().strftime("%Y-%m-%d"),
            "Install_Odometer": install_odo,
            "Status": "Active",
            "Remark": remark,
            "Ticket_ID": ticket_id,
            "Price": price
        }
        
        repo.insert_record("Vehicle_Parts_Current", new_part)
        return True

    @staticmethod
    def remove_part(plate: str, part_type: str, position: str, removal_odo: float, reason: str):
        """Remove a part and log to history with usage Stats."""
        current = repo.get_data("Vehicle_Parts_Current")
        if current.empty:
            return False
            
        # Find the part
        mask = (current['Vehicle_Plate'] == plate) & \
               (current['Position'] == position) & \
               (current['Part_Type'] == part_type)
        
        target = current[mask]
        if target.empty:
            return False
            
        part_data = target.iloc[0].to_dict()
        
        # Calculate Usage
        install_odo = float(part_data.get('Install_Odometer', 0))
        usage_km = removal_odo - install_odo
        
        install_date = pd.to_datetime(part_data.get('Install_Date', datetime.now()))
        removal_date = datetime.now()
        usage_days = (removal_date - install_date).days
        
        # Log to History
        history_record = part_data.copy()
        history_record['Removal_Date'] = removal_date.strftime("%Y-%m-%d")
        history_record['Removal_Odometer'] = removal_odo
        history_record['Total_Distance_KM'] = usage_km
        history_record['Total_Days'] = usage_days
        history_record['Removal_Reason'] = reason
        del history_record['Status'] # No longer active
        
        repo.insert_record("Parts_Usage_History", history_record)
        
        # Delete from Current
        current = current[~mask]
        repo.update_data("Vehicle_Parts_Current", current)
        
        return True
    
    @staticmethod
    def get_part_history(plate: str = None, serial_no: str = None):
        hist = repo.get_data("Parts_Usage_History")
        if hist.empty: return pd.DataFrame()
        
        if plate:
            hist = hist[hist['Vehicle_Plate'] == plate]
        if serial_no:
            hist = hist[hist['Serial_No'] == serial_no]
            
        return hist
