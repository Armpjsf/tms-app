export const sanitizeJobData = (data: Record<string, unknown>) => {
    const clean: Record<string, any> = {}
    const allowedKeys = [
        'Job_ID', 'Job_Status', 'Plan_Date', 'Pickup_Date', 'Delivery_Date',
        'Customer_ID', 'Customer_Name', 'Route_Name', 'Driver_ID', 'Driver_Name', 
        'Vehicle_Plate', 'Vehicle_Type', 'Origin_Location', 'Dest_Location', 
        'Total_Drop', 'Price_Cust_Total', 'Cost_Driver_Total', 'Price_Cust_Extra', 
        'Cost_Driver_Extra', 'Cargo_Type', 'Notes', 'original_origins_json', 
        'original_destinations_json', 'extra_costs_json', 'Show_Price_To_Driver', 'Sub_ID', 
        'Weight_Kg', 'Volume_Cbm', 'Zone', 'Invoice_ID', 'Billing_Note_ID', 
        'Driver_Payment_ID', 'Pickup_Photo_Url', 'Pickup_Signature_Url', 
        'Pickup_Lat', 'Pickup_Lon', 'Location_Origin_Name', 'Location_Destination_Name',
        'Branch_ID', 'Created_At', 'lat', 'lon', 'Expire_Date', 'Payment_Status',
        'Failed_Reason', 'Failed_Time', 'Rating', 'Customer_Comment', 'Barcodes', 
        'Payment_Date', 'Payment_Slip_Url', 'Billing_Status', 'Invoice_No', 'Billing_Date',
        'Charge_Labor', 'Charge_Wait', 'Price_Cust_Return', 'Price_Cust_Fuel', 
        'Price_Cust_Trailer', 'Price_Cust_Other', 'Cost_Driver_Labor', 'Cost_Driver_Wait', 
        'Cost_Driver_Return', 'Cost_Driver_Fuel', 'Cost_Driver_Trailer', 'Cost_Driver_Other',
        'Verification_Status', 'Verification_Note', 'Verified_By', 'Verified_At'
    ]
    
    Object.keys(data).forEach(key => {
        if (allowedKeys.includes(key)) {
            clean[key] = data[key]
        }
    })
    return clean
}
