export interface AccountingCustomer {
    id: string;
    name: string;
    taxId?: string;
    address?: string;
    email?: string;
    phone?: string;
}

export interface AccountingInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    vatRate?: number; // 7% = 7
}

export interface AccountingInvoice {
    referenceId: string; // Internal Job ID
    issueDate: string; // YYYY-MM-DD
    dueDate?: string; // YYYY-MM-DD
    customer: AccountingCustomer;
    items: AccountingInvoiceItem[];
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
    notes?: string;
}

export interface AccountingProvider {
    name: string;
    isConnected(): Promise<boolean>;
    createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }>;
}
