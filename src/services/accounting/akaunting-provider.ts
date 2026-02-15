import { AccountingProvider, AccountingInvoice } from "@/types/accounting";

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
        // Akaunting often uses Basic Auth or Bearer. 
        // Based on user input "api key", we'll try Basic Auth username: api_key, password: (empty) or formatted.
        // Or Bearer. 
        // For now, let's assume the user string IS the auth header value or token.
        // User gave: "api c0c2..." 
        // Let's try sending it as Bearer first, or X-API-Key.
        // Documentation says "Basic Auth".
        // Let's assume the input is the token.
        
        return {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    async isConnected(): Promise<boolean> {
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

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        try {
            // 1. We need a customer ID. In a real scenario, we'd search for the customer first.
            // For now, we'll try to find or create, or use a default if fail.
            // This is a simplified implementation.
            
            // Payload for Akaunting
            const payload = {
                company_id: this.companyId,
                contact_id: 1, // Default contact for testing/MVP. Real logic needs lookup.
                invoice_number: invoice.referenceId,
                invoiced_at: invoice.issueDate,
                due_at: invoice.dueDate || invoice.issueDate,
                currency_code: "THB",
                items: invoice.items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    tax_id: item.vatRate ? 1 : null // Simplification
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
            return {
                success: false,
                message: `Network/Internal Error: ${error}`
            };
        }
    }
}
