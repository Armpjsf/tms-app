import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";
import { MockAccountingProvider } from "./mock-provider";
import { AkauntingProvider } from "./akaunting-provider";

class AccountingServiceManager {
    private provider: AccountingProvider;

    constructor() {
        // Using Akaunting Provider with user-provided key
        // Key: process.env.AKAUNTING_API_KEY
        // Company ID: process.env.AKAUNTING_COMPANY_ID
        const apiKey = process.env.AKAUNTING_API_KEY || "";
        const companyId = process.env.AKAUNTING_COMPANY_ID || "1";
        this.provider = new AkauntingProvider(apiKey, companyId); 
    }

    public async isConnected(): Promise<boolean> {
        return this.provider.isConnected();
    }

    public async syncBillingNoteToInvoice(note: any, jobs: any[]): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Transform Billing Note + Jobs to Accounting Invoice
            const invoice = this.transformBillingNoteToInvoice(note, jobs);

            // 2. Validate
            if (!invoice.customer.name) {
                return { success: false, message: "Customer name is missing" };
            }

            // 3. Send to Provider
            const result = await this.provider.createInvoice(invoice);
            
            return {
                success: result.success,
                message: result.message || (result.success ? "Synced successfully" : "Failed to sync")
            };

        } catch (error) {
            console.error("Accounting Sync Error:", error);
            return { success: false, message: "Internal error during sync" };
        }
    }

    public async syncJobToInvoice(job: any): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Transform Job Data to Accounting Invoice
            const invoice = this.transformJobToInvoice(job);

            // 2. Validate
            if (!invoice.customer.name) {
                return { success: false, message: "Customer name is missing" };
            }

            // 3. Send to Provider
            const result = await this.provider.createInvoice(invoice);
            
            return {
                success: result.success,
                message: result.message || (result.success ? "Synced successfully" : "Failed to sync")
            };

        } catch (error) {
            console.error("Accounting Sync Error:", error);
            return { success: false, message: "Internal error during sync" };
        }
    }

    public async syncDriverPaymentToBill(payment: any, jobs: any[]): Promise<{ success: boolean; message: string }> {
        try {
            const bill = this.transformDriverPaymentToBill(payment, jobs);
            const result = await this.provider.createBill(bill);
            return {
                success: result.success,
                message: result.message || (result.success ? "Payout synced successfully" : "Failed to sync payout")
            };
        } catch (error) {
            console.error("Accounting Sync Error (Payout):", error);
            return { success: false, message: "Internal error during payout sync" };
        }
    }

    private transformBillingNoteToInvoice(note: any, jobs: any[]): AccountingInvoice {
        const totalAmount = Number(note.Total_Amount) || 0;
        
        const items = jobs.map(job => {
            const price = parseFloat(job.Price_Cust_Total) || 0;
            let extra = 0;
            if (job.extra_costs_json) {
                try {
                    let costs = job.extra_costs_json;
                    if (typeof costs === 'string') costs = JSON.parse(costs);
                    if (Array.isArray(costs)) {
                        extra = costs.reduce((sum, c) => sum + (Number(c.charge_cust) || 0), 0);
                    }
                } catch {}
            }

            return {
                description: `Transport: ${job.Job_ID} - ${job.Route_Name || 'Standard'}`,
                quantity: 1,
                unitPrice: price + extra,
                amount: price + extra,
            };
        });

        return {
            referenceId: note.Billing_Note_ID,
            issueDate: note.Billing_Date || new Date().toISOString().split('T')[0],
            dueDate: note.Due_Date,
            customer: {
                id: note.Customer_Name || "unknown",
                name: note.Customer_Name || "Unknown Customer",
                address: note.Customer_Address,
            },
            items: items,
            subtotal: totalAmount,
            vatAmount: 0,
            totalAmount: totalAmount,
            notes: `Auto-synced from TMS Billing Note #${note.Billing_Note_ID}`
        };
    }

    private transformDriverPaymentToBill(payment: any, jobs: any[]): AccountingBill {
        const totalAmount = Number(payment.Total_Amount) || 0;
        
        const items = jobs.map(job => {
            const cost = parseFloat(job.Cost_Driver_Total) || 0;
            return {
                description: `Driver Cost: ${job.Job_ID} - ${job.Route_Name || 'Standard'}`,
                quantity: 1,
                unitPrice: cost,
                amount: cost,
            };
        });

        return {
            referenceId: payment.Driver_Payment_ID,
            issueDate: payment.Payment_Date || new Date().toISOString().split('T')[0],
            contactName: payment.Driver_Name || "Unknown Driver",
            items: items,
            subtotal: totalAmount,
            totalAmount: totalAmount,
            notes: `Auto-synced from TMS Driver Payment #${payment.Driver_Payment_ID}`
        };
    }

    private transformJobToInvoice(job: any): AccountingInvoice {
        const price = parseFloat(job.Price_Cust_Total) || 0;

        return {
            referenceId: job.Job_ID,
            issueDate: new Date().toISOString().split('T')[0],
            customer: {
                id: job.Customer_Name || "unknown",
                name: job.Customer_Name || "Unknown Customer",
                address: job.Dest_Location || "",
            },
            items: [
                {
                    description: `Transport Service: ${job.Route_Name || 'Standard Route'}`,
                    quantity: 1,
                    unitPrice: price,
                    amount: price,
                }
            ],
            subtotal: price,
            vatAmount: 0,
            totalAmount: price,
        };
    }
}

export const accountingService = new AccountingServiceManager();
