import { AccountingProvider, AccountingInvoice, AccountingBill } from "@/types/accounting";

export class AkauntingProvider implements AccountingProvider {
    name = "Akaunting";
    private apiKey: string;
    private baseUrl: string;
    private companyId: string;
    private userEmail: string;

    constructor(apiKey: string, companyId: string = '1', userEmail: string = '') {
        this.apiKey = apiKey;
        this.baseUrl = "https://app.akaunting.com/api";
        this.companyId = companyId;
        this.userEmail = userEmail;
    }

    private getHeaders(authType: 'Bearer' | 'Basic' = 'Bearer') {
        let authHeader = `Bearer ${this.apiKey}`;
        if (authType === 'Basic') {
            // Akaunting Cloud v3 often requires Email as username
            const username = this.userEmail || this.apiKey;
            const password = this.userEmail ? this.apiKey : "";
            authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        }

        return {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Company-Id": this.companyId
        };
    }

    private async safeJson(response: Response, url: string) {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error(`Akaunting non-JSON response from ${url}:`, text.substring(0, 100));
            throw new Error(`Expected JSON but got ${contentType || 'unknown'}. (Possible redirect)`);
        }
        return response.json();
    }

    async isConnected(): Promise<{ connected: boolean; message?: string }> {
        if (!this.apiKey) return { connected: false, message: "API Key is missing" };
        
        const baseUrl = "https://app.akaunting.com/api";
        const endpoints = [
            "/contacts",
            "/invoices",
            "/accounts",
            "/auth/user",
            "/me"
        ];

        const authStrats = [
            { name: 'Bearer', headers: { "Authorization": `Bearer ${this.apiKey}` } },
            { name: 'Basic (Email:Token)', headers: { "Authorization": `Basic ${Buffer.from(`${this.userEmail}:${this.apiKey}`).toString('base64')}` } },
            { name: 'X-API-KEY', headers: { "X-API-KEY": this.apiKey } }
        ];

        const results: { path: string; strat: string; status: number; body?: string }[] = [];

        for (const path of endpoints) {
            for (const auth of authStrats) {
                const url = `${baseUrl}${path}?company_id=${this.companyId}&limit=1`;
                try {
                    const res = await fetch(url, {
                        headers: {
                            ...auth.headers,
                            "Accept": "application/json",
                            "X-Company-ID": this.companyId
                        },
                        redirect: 'manual'
                    });

                    let body = "";
                    if (res.status !== 200 && res.status !== 404) {
                        body = await res.text().catch(() => "");
                    }

                    results.push({ path, strat: auth.name, status: res.status, body: body.substring(0, 50) });

                    if (res.status === 200) return { connected: true };
                } catch (e) {
                    results.push({ path, strat: auth.name, status: 0 });
                }
            }
        }

        const best = results.find(r => r.status === 401 || r.status === 403) || results[0];
        const statusSummary = results
            .filter(r => r.status > 0)
            .map(r => `${r.path}@${r.status}`)
            .join(' | ');

        return { 
            connected: false, 
            message: `FAILED. Lead: [${best.strat}] on ${best.path} -> ${best.status}. Msg: ${best.body || 'N/A'}. Patterns: ${statusSummary.substring(0, 100)}...`
        };
    }

    async findContact(name: string): Promise<{ id: string | number | null; type?: string }> {
        const url = `${this.baseUrl}/contacts?company_id=${this.companyId}&search=name:${encodeURIComponent(name)}`;
        try {
            const response = await fetch(url, { headers: this.getHeaders() });
            
            if (!response.ok) {
                const text = await response.text().catch(() => "N/A");
                console.error(`findContact failed (${response.status}) for ${name}:`, text.substring(0, 100));
                return { id: null };
            }

            const data = await this.safeJson(response, url);
            if (data.data && data.data.length > 0) {
                return { id: data.data[0].id, type: data.data[0].type };
            }
            return { id: null };
        } catch (error) {
            console.error(`Akaunting findContact exception for ${name}:`, error);
            return { id: null };
        }
    }

    async createInvoice(invoice: AccountingInvoice): Promise<{ success: boolean; externalId?: string; message?: string }> {
        try {
            const contact = await this.findContact(invoice.customer.name);
            const contactId = contact.id || 1;

            const payload = {
                company_id: this.companyId,
                contact_id: contactId,
                type: 'invoice',
                document_number: invoice.referenceId,
                issued_at: invoice.issueDate,
                due_at: invoice.dueDate || invoice.issueDate,
                currency_code: "THB",
                category_id: 1, // Default category
                status: 'draft',
                items: invoice.items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    tax_id: item.vatRate ? 1 : null
                }))
            };

            const url = `${this.baseUrl}/documents?company_id=${this.companyId}`;
            const response = await fetch(url, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `Akaunting Error ${response.status}: ${data.message || response.statusText}`
                };
            }

            const data = await this.safeJson(response, url);
            return {
                success: true,
                externalId: data.data?.id,
                message: "Invoice created in Akaunting"
            };

        } catch (error) {
            return { success: false, message: `Sync Error: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    async createBill(bill: AccountingBill): Promise<{ success: boolean; externalId?: string; message?: string }> {
        try {
            const contact = await this.findContact(bill.contactName);
            const contactId = contact.id || 1;

            const payload = {
                company_id: this.companyId,
                contact_id: contactId,
                type: 'bill',
                document_number: bill.referenceId,
                issued_at: bill.issueDate,
                due_at: bill.dueDate || bill.issueDate,
                currency_code: "THB",
                category_id: 2, // Default expense category
                status: 'received',
                items: bill.items.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    tax_id: null
                }))
            };

            const url = `${this.baseUrl}/documents?company_id=${this.companyId}`;
            const response = await fetch(url, {
                method: "POST",
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `Akaunting Error ${response.status}: ${data.message || response.statusText}`
                };
            }

            const data = await this.safeJson(response, url);
            return {
                success: true,
                externalId: data.data?.id,
                message: "Bill created in Akaunting"
            };
        } catch (error) {
            return { success: false, message: `Sync Error: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    async getPaymentStatus(externalId: string): Promise<{ status: string }> {
        const url = `${this.baseUrl}/documents/${externalId}?company_id=${this.companyId}`;
        try {
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            const data = await this.safeJson(response, url);
            return { status: data.data?.status || 'unknown' };
        } catch (error) {
            console.error(`Akaunting getPaymentStatus failed for ${externalId}:`, error);
            return { status: 'error' };
        }
    }
}
