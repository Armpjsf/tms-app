import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";

export class AkauntingProvider implements AccountingProvider {
    name = "Akaunting";
    private apiKey: string;
    private baseUrl: string;
    private companyId: string;

    constructor(apiKey: string, companyId: string = '1') {
        this.apiKey = apiKey;
        this.baseUrl = "https://app.akaunting.com/api";
        this.companyId = companyId;
    }

    private getHeaders() {
        return {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    async isConnected(): Promise<boolean> {
        if (!this.apiKey) return false;
        try {
            const response = await fetch(`${this.baseUrl}/companies`, {
                headers: this.getHeaders()
            });
            return response.ok;
        } catch (error) {
            console.error("Akaunting Connection Check Failed", error);
            return false;
        }
    }

    async findContact(name: string): Promise<{ id: string | number | null; type?: string }> {
        try {
            const url = `${this.baseUrl}/contacts?search=name:${encodeURIComponent(name)}`;
            const response = await fetch(url, { headers: this.getHeaders() });
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                return { id: data.data[0].id, type: data.data[0].type };
            }
            return { id: null };
        } catch (error) {
            console.error(`Akaunting findContact failed for ${name}:`, error);
            return { id: null };
        }
    }

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        try {
            // 1. Try to find the contact first
            const contact = await this.findContact(invoice.customer.name);
            const contactId = contact.id || 1; // Fallback to 1 if not found

            // 2. Payload for Akaunting
            const payload = {
                company_id: this.companyId,
                contact_id: contactId,
                invoice_number: invoice.referenceId,
                invoiced_at: invoice.issueDate,
                due_at: invoice.dueDate || invoice.issueDate,
                currency_code: "THB",
                items: invoice.items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    tax_id: item.vatRate ? 1 : null
                }))
            };

            const response = await fetch(`${this.baseUrl}/invoices`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    externalId: data.data?.id,
                    message: "Invoice created in Akaunting"
                };
            } else {
                return {
                    success: false,
                    message: `Akaunting Error: ${data.message || response.statusText}`
                };
            }

        } catch (error) {
            return { success: false, message: `Network/Internal Error: ${error}` };
        }
    }

    async createBill(bill: AccountingBill): Promise<{ success: boolean; externalId?: string; message?: string }> {
        try {
            // 1. Try to find the vendor (contact)
            const contact = await this.findContact(bill.contactName);
            const contactId = contact.id || 1; // Default vendor

            // 2. Payload for Akaunting Bill
            const payload = {
                company_id: this.companyId,
                contact_id: contactId,
                bill_number: bill.referenceId,
                billed_at: bill.issueDate,
                due_at: bill.dueDate || bill.issueDate,
                currency_code: "THB",
                items: bill.items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    tax_id: null // Usually no VAT for driver cost as individuals
                }))
            };

            const response = await fetch(`${this.baseUrl}/bills`, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    externalId: data.data?.id,
                    message: "Bill (Payout) created in Akaunting"
                };
            } else {
                return {
                    success: false,
                    message: `Akaunting Error: ${data.message || response.statusText}`
                };
            }
        } catch (error) {
            return { success: false, message: `Network/Internal Error: ${error}` };
        }
    }

    async getPaymentStatus(externalId: string, type: 'invoice' | 'bill'): Promise<{ status: string }> {
        try {
            const endpoint = type === 'invoice' ? 'invoices' : 'bills';
            const response = await fetch(`${this.baseUrl}/${endpoint}/${externalId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            return { status: data.data?.status || 'unknown' };
        } catch (error) {
            console.error(`Akaunting getPaymentStatus failed for ${externalId}:`, error);
            return { status: 'error' };
        }
    }
}
