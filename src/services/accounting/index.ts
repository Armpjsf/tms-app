import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";
import { AkauntingProvider } from "./akaunting-provider";
import { getServerSetting } from "@/lib/supabase/system_settings_server";
import { Billing_Note, Job, Driver_Payment } from "@/types/database";

class AccountingServiceManager {
    private provider: AccountingProvider | null = null;

    private async getProvider(): Promise<AccountingProvider> {
        // Fetch from DB every time for now to ensure we have latest, or implement caching
        const apiKey = String(await getServerSetting('akaunting_api_key', process.env.AKAUNTING_API_KEY || "")).trim();
        const companyId = String(await getServerSetting('akaunting_company_id', process.env.AKAUNTING_COMPANY_ID || "1")).trim();
        
        return new AkauntingProvider(apiKey, companyId);
    }

    public async isConnected(): Promise<{ connected: boolean; message?: string }> {
        const provider = await this.getProvider();
        return provider.isConnected();
    }

    public async syncBillingNoteToInvoice(note: Billing_Note, jobs: Job[]): Promise<{ success: boolean; message: string }> {
        try {
            const provider = await this.getProvider();
            const invoice = this.transformBillingNoteToInvoice(note, jobs);

            if (!invoice.customer.name) {
                return { success: false, message: "Customer name is missing" };
            }

            const result = await provider.createInvoice(invoice);
            
            return {
                success: result.success,
                message: result.message || (result.success ? "Synced successfully" : "Failed to sync")
            };

        } catch (error) {
            console.error("Accounting Sync Error:", error);
            return { success: false, message: "Internal error during sync" };
        }
    }

    public async syncJobToInvoice(job: Job): Promise<{ success: boolean; message: string }> {
        try {
            const provider = await this.getProvider();
            const invoice = this.transformJobToInvoice(job);

            if (!invoice.customer.name) {
                return { success: false, message: "Customer name is missing" };
            }

            const result = await provider.createInvoice(invoice);
            
            return {
                success: result.success,
                message: result.message || (result.success ? "Synced successfully" : "Failed to sync")
            };

        } catch (error) {
            console.error("Accounting Sync Error:", error);
            return { success: false, message: "Internal error during sync" };
        }
    }

    public async syncDriverPaymentToBill(payment: Driver_Payment, jobs: Job[]): Promise<{ success: boolean; message: string }> {
        try {
            const provider = await this.getProvider();
            const bill = this.transformDriverPaymentToBill(payment, jobs);
            const result = await provider.createBill(bill);
            return {
                success: result.success,
                message: result.message || (result.success ? "Payout synced successfully" : "Failed to sync payout")
            };
        } catch (error) {
            console.error("Accounting Sync Error (Payout):", error);
            return { success: false, message: "Internal error during payout sync" };
        }
    }

    private transformBillingNoteToInvoice(note: Billing_Note, jobs: Job[]): AccountingInvoice {
        const totalAmount = Number(note.Total_Amount) || 0;
        
        const items = jobs.map(job => {
            const price = parseFloat(job.Price_Cust_Total || "0") || 0;
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
                address: note.Customer_Address || "",
            },
            items: items,
            subtotal: totalAmount,
            vatAmount: 0,
            totalAmount: totalAmount,
            notes: `Auto-synced from TMS Billing Note #${note.Billing_Note_ID}`
        };
    }

    private transformDriverPaymentToBill(payment: Driver_Payment, jobs: Job[]): AccountingBill {
        const totalAmount = Number(payment.Total_Amount) || 0;
        
        const items = jobs.map(job => {
            const cost = parseFloat(job.Cost_Driver_Total || "0") || 0;
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

    private transformJobToInvoice(job: Job): AccountingInvoice {
        const price = parseFloat(job.Price_Cust_Total || "0") || 0;

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
