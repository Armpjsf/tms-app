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

export interface AccountingBill {
    referenceId: string; // Internal Payment ID
    issueDate: string; // YYYY-MM-DD
    dueDate?: string; // YYYY-MM-DD
    contactName: string; // Vendor/Driver name
    items: AccountingInvoiceItem[];
    subtotal: number;
    totalAmount: number;
    notes?: string;
}

export interface AccountingProvider {
    name: string;
    isConnected(): Promise<boolean>;
    findContact(name: string): Promise<{ id: string | number | null; type?: string }>;
    createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }>;
    createBill(bill: AccountingBill): Promise<{ success: boolean; externalId?: string; message?: string }>;
    getPaymentStatus(externalId: string, type: 'invoice' | 'bill'): Promise<{ status: string }>;
}
