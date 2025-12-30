
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import datetime, date
import pandas as pd

class JobModel(BaseModel):
    Job_ID: str
    Job_Status: str = "New"
    Plan_Date: Optional[Union[str, date]] = None
    Customer_ID: Optional[str] = None
    Customer_Name: Optional[str] = None
    Route_Name: Optional[str] = None
    Driver_ID: Optional[str] = None
    Driver_Name: Optional[str] = None
    Vehicle_Plate: Optional[str] = None
    Price_Cust_Total: float = 0.0
    Cost_Driver_Total: float = 0.0
    Created_At: Optional[str] = None
    
    # Safe conversion helpers
    @validator('Price_Cust_Total', 'Cost_Driver_Total', pre=True)
    def parse_float_safe(cls, v):
        if isinstance(v, str):
            v = v.replace(',', '').strip()
            if not v or v.lower() in ['nan', 'none']:
                return 0.0
            return float(v)
        return v or 0.0

class DriverModel(BaseModel):
    Driver_ID: str
    Driver_Name: str
    Vehicle_Plate: Optional[str] = None
    Mobile_No: Optional[str] = None
    Active_Status: Optional[str] = "Active"

class FuelLogModel(BaseModel):
    Log_ID: str
    Date_Time: Optional[str] = None
    Driver_ID: Optional[str] = None
    Vehicle_Plate: Optional[str] = None
    Liters: float = 0.0
    Price_Total: float = 0.0
    
    @validator('Liters', 'Price_Total', pre=True)
    def parse_float_safe(cls, v):
        if isinstance(v, str):
            return float(v.replace(',', '').strip())
        return v or 0.0

class MaintenanceLogModel(BaseModel):
    Log_ID: str
    Date_Service: Optional[str] = None
    Vehicle_Plate: str
    Service_Type: str
    Odometer: float = 0.0
    Cost: float = 0.0

# Complete Schema definitions for all tables (consolidated from modules/database.py)
SCHEMAS = {
    "Jobs_Main": [
        "Job_ID", "Job_Status", "Plan_Date", "Customer_ID", "Customer_Name", "Route_Name",
        "Vehicle_Type", "Cargo_Qty", "Total_Weight_kg", "Total_Volume_cbm",
        "Origin_Location", "Dest_Location", "Total_Drop",
        "Est_Distance_KM", "GoogleMap_Link", 
        "Driver_ID", "Driver_Name", "Vehicle_Plate", 
        "Actual_Pickup_Time", "Actual_Delivery_Time", "Arrive_Dest_Time", 
        "Photo_Proof_Url", "Signature_Url", "Delivery_Lat", "Delivery_Lon", 
        "Price_Cust_Base", "Price_Cust_Extra", "Charge_Labor", "Charge_Wait", 
        "Price_Cust_Return", "Price_Cust_Fuel", "Price_Cust_Trailer", "Price_Cust_Other", "Price_Cust_Total", 
        "Cost_Driver_Base", "Cost_Driver_Extra", "Cost_Driver_Labor", "Cost_Driver_Wait", 
        "Cost_Driver_Return", "Cost_Driver_Fuel", "Cost_Driver_Trailer", "Cost_Driver_Other", 
        "Price_Total", "Station_Name", "Photo_Url", "Cost_Driver_Total", 
        "Payment_Status", "PD", "Failed_Reason", "Failed_Time",
        "Rating", "Customer_Comment", "Barcodes",
        "Payment_Date", "Payment_Slip_Url",
        "Customer_Payment_Status", "Customer_Payment_Date", "Customer_Payment_Slip_Url",
        "Billing_Status", "Invoice_No", "Billing_Date",
        "Branch_ID", "Created_At", "Created_By", "Last_Updated"
    ],
    "Fuel_Logs": [
        "Log_ID", "Date_Time", "Driver_ID", "Vehicle_Plate", "Odometer", "Liters", 
        "Price_Total", "Station_Name", "Photo_Url", "Branch_ID", "Created_By"
    ],
    "Maintenance_Logs": [
        "Log_ID", "Date_Service", "Vehicle_Plate", "Service_Type", "Odometer", 
        "Next_Due_Odometer", "Notes", "Cost", "Garage_Name", "Invoice_Ref"
    ],
    "Repair_Tickets": [
        "Ticket_ID", "Date_Report", "Driver_ID", "Vehicle_Plate", "Issue_Type", "Description", 
        "Photo_Url", "Status", "Approver", "Cost_Total", "Date_Finish", "Remark"
    ],
    "Stock_Parts": [
        "Part_ID", "Part_Name", "Part_Model", "Qty_On_Hand", "Unit_Price", "Min_Level", "Location_Shelf"
    ],
    "Master_Drivers": [
        "Driver_ID", "Driver_Name", "Role", "Mobile_No", "Line_User_ID", "Password",
        "Vehicle_Plate", "Vehicle_Type", "Max_Weight_kg", "Max_Volume_cbm",
        "Insurance_Expiry", "Tax_Expiry", "Act_Expiry",
        "Current_Mileage", "Next_Service_Mileage", "Last_Service_Date",
        "Bank_Name", "Bank_Account_No", "Bank_Account_Name",
        "Driver_Score", "Current_Lat", "Current_Lon", "Last_Update", "Branch_ID", "Active_Status"
    ],
    "Master_Customers": [
        "Customer_ID", "Customer_Name", "Default_Origin", "Contact_Person", "Phone", 
        "Address", "Tax_ID", "Branch_ID", "Credit_Term", "Lat", "Lon", "GoogleMap_Link"
    ],
    "Master_Routes": [
        "Route_ID", "Route_Name", "Origin", "Destination", "Distance_KM", 
        "Standard_Price_4W", "Standard_Price_6W", "Standard_Price_10W", "Standard_Cost_Driver", "Branch_ID"
    ],
    "Rate_Card": ["Distance_Start", "Distance_End", "Price_4W", "Price_6W", "Price_10W", "Price_Trailer"],
    "Master_Users": ["Username", "Password", "Role", "Name", "Branch_ID", "Vehicle_Plate", "Active_Status"],
    "Master_Vendors": ["Vendor_ID", "Vendor_Name", "Contact_Person", "Phone", "Email", "Address", "Rating", "Total_Jobs", "Active_Status"],
    "Master_Vehicles": [
        "Vehicle_Plate", "Vehicle_Type", "Brand", "Model", "Year", "Color",
        "Engine_No", "Chassis_No", "Max_Weight_kg", "Max_Volume_cbm",
        "Insurance_Company", "Insurance_Expiry", "Tax_Expiry", "Act_Expiry",
        "Current_Mileage", "Last_Service_Date", "Next_Service_Mileage",
        "Driver_ID", "Branch_ID", "Active_Status", "Notes"
    ],
    "chat_messages": ["driver_id", "driver_name", "sender", "message", "created_at", "read"],
    "System_Config": ["Key", "Value", "Description", "Category"]
}

# Example Data for Templates
SAMPLE_DATA = {
    "Jobs_Main": {
        "Job_ID": "JOB-202X-001", "Plan_Date": "2024-01-01", "Customer_Name": "Example Customer", 
        "Route_Name": "BKK -> CNX", "Vehicle_Type": "4W", "Price_Cust_Total": 5000, "Branch_ID": "HEAD"
    },
    "Master_Drivers": {
        "Driver_ID": "DRV-001", "Driver_Name": "Somchai Jaidee", "Mobile_No": "081-234-5678", 
        "Vehicle_Plate": "70-1234", "Branch_ID": "HEAD"
    },
    "Master_Customers": {
        "Customer_ID": "CUST-001", "Customer_Name": "Big Company Ltd", "Contact_Person": "Manager A",
        "Phone": "02-123-4567", "Address": "123 Silom Rd", "Branch_ID": "HEAD"
    },
    "Master_Routes": {
        "Route_Name": "BKK -> Chonburi", "Origin": "Bangkok", "Destination": "Chonburi", "Distance_KM": 80,
        "Standard_Price_4W": 1500
    },
    "Master_Vendors": {
        "Vendor_Name": "Example Logistics Co", "Contact_Person": "Ms. B", "Phone": "099-999-9999", "Email": "contact@vendor.com"
    },
    "Stock_Parts": {
        "Part_ID": "P-001", "Part_Name": "Engine Oil", "Qty_On_Hand": 100, "Unit_Price": 500
    }
}

def get_template_df(table_name: str) -> pd.DataFrame:
    """Returns a DataFrame with columns and 1 sample row."""
    cols = SCHEMAS.get(table_name, [])
    if not cols: return pd.DataFrame()
    
    df = pd.DataFrame(columns=cols)
    
    # Add sample row
    sample = SAMPLE_DATA.get(table_name, {})
    # Fill missing sample keys with empty string or 0
    row_data = {col: sample.get(col, "") for col in cols}
    
    df = pd.concat([df, pd.DataFrame([row_data])], ignore_index=True)
    return df
