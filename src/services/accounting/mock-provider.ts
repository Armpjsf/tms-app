import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";

export class MockAccountingProvider implements AccountingProvider {
    name = "Mock Provider (Console Log)";

    async isConnected(): Promise<boolean> {
        return true;
    }

    async findContact(name: string): Promise<{ id: string | number | null; type?: string }> {
        console.log(`[MOCK] Finding contact: ${name}`);
        return { id: "mock-contact-123", type: "customer" };
    }

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        console.log("----------------------------------------");
        console.log("MOCK ACCOUNTING: Creating Invoice");
        console.log("----------------------------------------");
        console.log("Ref:", invoice.referenceId);
        console.log("Customer:", invoice.customer.name);
        console.log("Total:", invoice.totalAmount);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            externalId: `mock-inv-${Date.now()}`,
            message: "Invoice created successfully (Mock)"
        };
    }

    async createBill(bill: AccountingBill): Promise<{ success: boolean; externalId?: string; message?: string }> {
        console.log("----------------------------------------");
        console.log("MOCK ACCOUNTING: Creating Bill (Payout)");
        console.log("----------------------------------------");
        console.log("Ref:", bill.referenceId);
        console.log("Vendor:", bill.contactName);
        console.log("Total:", bill.totalAmount);

        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            externalId: `mock-bill-${Date.now()}`,
            message: "Bill created successfully (Mock)"
        };
    }

    async getPaymentStatus(externalId: string, type: 'invoice' | 'bill'): Promise<{ status: string }> {
        console.log(`[MOCK] Checking status for ${type}: ${externalId}`);
        return { status: "paid" };
    }
}
