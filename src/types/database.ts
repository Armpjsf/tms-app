export interface Job {
    Job_ID: string;
    Job_Status?: string | null;
    Plan_Date?: string | null;
    Route_Name?: string | null;
    Price_Cust_Total?: string | number | null;
    Cost_Driver_Total?: string | number | null;
    extra_costs_json?: unknown;
    Customer_ID?: string | null;
    Customer_Name?: string | null;
    Dest_Location?: string | null;
    Origin_Location?: string | null;
    Driver_Name?: string | null;
    Vehicle_Plate?: string | null;
    Billing_Note_ID?: string | null;
    Driver_Payment_ID?: string | null;
    Branch_ID?: string | null;
    Photo_Proof_Url?: string | null;
    Signature_Url?: string | null;
    Pickup_Photo_Url?: string | null;
    Pickup_Signature_Url?: string | null;
    Cargo_Type?: string | null;
    Notes?: string | null;
    Weight_Kg?: number | null;
    Volume_Cbm?: number | null;
    Loaded_Qty?: number | null;
    Price_Per_Unit?: number | null;
    Price_Cust_Extra?: number | null;
    Charge_Labor?: number | null;
    Charge_Wait?: number | null;
    Price_Cust_Other?: number | null;
}

export interface Billing_Note {
    Billing_Note_ID: string;
    Customer_Name?: string | null;
    Billing_Date?: string | null;
    Due_Date?: string | null;
    Total_Amount?: number | null;
    Customer_Address?: string | null;
    Customer_Tax_ID?: string | null;
    Credit_Days?: number | null;
    Remarks?: string | null;
    VAT_Rate?: number | null;
    VAT_Amount?: number | null;
    Discount_Amount?: number | null;
}

export interface Driver_Payment {
    Driver_Payment_ID: string;
    Driver_Name?: string | null;
    Payment_Date?: string | null;
    Total_Amount?: number | null;
}
