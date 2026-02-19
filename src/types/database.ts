export interface Job {
    Job_ID: string;
    Job_Status?: string | null;
    Plan_Date?: string | null;
    Route_Name?: string | null;
    Price_Cust_Total?: string | number | null;
    Cost_Driver_Total?: string | number | null;
    extra_costs_json?: any;
    Customer_Name?: string | null;
    Dest_Location?: string | null;
    Origin_Location?: string | null;
    Driver_Name?: string | null;
    Vehicle_Plate?: string | null;
    Billing_Note_ID?: string | null;
    Driver_Payment_ID?: string | null;
    Branch_ID?: string | null;
    Photo_Proof_Url?: string | null;
}

export interface Billing_Note {
    Billing_Note_ID: string;
    Customer_Name?: string | null;
    Billing_Date?: string | null;
    Due_Date?: string | null;
    Total_Amount?: number | null;
    Customer_Address?: string | null;
}

export interface Driver_Payment {
    Driver_Payment_ID: string;
    Driver_Name?: string | null;
    Payment_Date?: string | null;
    Total_Amount?: number | null;
}
