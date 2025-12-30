
from data.repository import repo
import pandas as pd

def inspect_data():
    print("Fetching Master_Customers...")
    cust = repo.get_data("Master_Customers")
    print(cust[['Customer_ID', 'Customer_Name']].head(10) if not cust.empty else "No Customers")

    print("\nFetching Master_Drivers...")
    drivers = repo.get_data("Master_Drivers")
    if not drivers.empty:
        print(drivers[['Driver_ID', 'Driver_Name', 'Mobile_No', 'Line_User_ID']].head(10))
    else:
        print("No Drivers")

if __name__ == "__main__":
    inspect_data()
