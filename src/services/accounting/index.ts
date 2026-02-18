import { AccountingProvider, AccountingInvoice } from "@/types/accounting";
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

    private transformJobToInvoice(job: any): AccountingInvoice {
        // This is where we map TMS database fields to the standard Accounting format
        // Modify this logic when connecting to real data
        
        const price = parseFloat(job.Price) || 0;

        return {
            referenceId: job.Job_ID,
            issueDate: new Date().toISOString().split('T')[0],
            customer: {
                id: job.Customer_ID || "unknown",
                name: job.Customer_Name || "Unknown Customer",
                address: job.Dest_Location, // Example logic
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
            vatAmount: 0, // Calculate 7% here if needed
            totalAmount: price,
        };
    }
}

export const accountingService = new AccountingServiceManager();
