export interface Job {
    Job_ID: string;
    Route_Name?: string;
    Price_Cust_Total?: string | number;
    Cost_Driver_Total?: string | number;
    extra_costs_json?: any;
    Customer_Name?: string;
    Dest_Location?: string;
    Billing_Note_ID?: string | null;
    Driver_Payment_ID?: string | null;
    Branch_ID?: string;
    Photo_Proof_Url?: string | null;
}

export interface Billing_Note {
    Billing_Note_ID: string;
    Customer_Name?: string;
    Billing_Date?: string;
    Due_Date?: string | null;
    Total_Amount?: number;
    Customer_Address?: string;
}

export interface Driver_Payment {
    Driver_Payment_ID: string;
    Driver_Name?: string;
    Payment_Date?: string;
    Total_Amount?: number;
}
