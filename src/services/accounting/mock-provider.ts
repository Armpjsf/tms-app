import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";

export class MockAccountingProvider implements AccountingProvider {
    name = "Mock Provider (Console Log)";

    async isConnected(): Promise<{ connected: boolean; message?: string }> {
        return { connected: true, message: "Mock Connection Active" };
    }

    async findContact(name: string): Promise<{ id: string | number | null; type?: string }> {
        return { id: "mock-contact-123", type: "customer" };
    }

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            externalId: `mock-inv-${Date.now()}`,
            message: "Invoice created successfully (Mock)"
        };
    }

    async createBill(bill: AccountingBill): Promise<{ success: boolean; externalId?: string; message?: string }> {
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            externalId: `mock-bill-${Date.now()}`,
            message: "Bill created successfully (Mock)"
        };
    }

    async getPaymentStatus(externalId: string, type: 'invoice' | 'bill'): Promise<{ status: string }> {
        return { status: "paid" };
    }
}
