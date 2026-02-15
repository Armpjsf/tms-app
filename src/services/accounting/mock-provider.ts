import { AccountingProvider, AccountingInvoice } from "@/types/accounting";

export class MockAccountingProvider implements AccountingProvider {
    name = "Mock Provider (Console Log)";

    async isConnected(): Promise<boolean> {
        return true;
    }

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        console.log("----------------------------------------");
        console.log("MOCK ACCOUNTING: Creating Invoice");
        console.log("----------------------------------------");
        console.log("Customer:", invoice.customer);
        console.log("Items:", invoice.items);
        console.log("Total:", invoice.totalAmount);
        console.log("----------------------------------------");
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            externalId: `mock-inv-${Date.now()}`,
            message: "Invoice created successfully (Mock)"
        };
    }
}
