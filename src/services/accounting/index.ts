import { AccountingProvider, AccountingInvoice } from "@/types/accounting";
import { MockAccountingProvider } from "./mock-provider";
import { AkauntingProvider } from "./akaunting-provider";

class AccountingServiceManager {
    private provider: AccountingProvider;

    constructor() {
        // Using Akaunting Provider with user-provided key
        // Key: api c0c29410-e07c-49b1-9dc2-fe7699fe927b
        // We'll treat the whole string as the token for now, or just the UUID if "api" is username.
        // Common Akaunting Cloud API Key is just the token. The user wrote "api <UUID>".
        // Use just the UUID for Bearer.
        const apiKey = "c0c29410-e07c-49b1-9dc2-fe7699fe927b";
        this.provider = new AkauntingProvider(apiKey); 
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
