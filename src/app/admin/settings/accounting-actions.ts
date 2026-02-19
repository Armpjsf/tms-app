"use server"

import { accountingService } from "@/services/accounting"
import { getBillingNoteByIdWithJobs, getDriverPaymentByIdWithJobs } from "@/lib/supabase/billing"

export async function checkAccountingConnection() {
    try {
        const connected = await accountingService.isConnected();
        return { success: true, connected };
    } catch (error) {
        console.error("Accounting connection check failed:", error);
        return { success: false, connected: false };
    }
}

export async function manualSyncInvoice(noteId: string) {
    try {
        // 1. Get full data for the billing note
        const data = await getBillingNoteByIdWithJobs(noteId);
        if (!data) return { success: false, message: "Billing note not found" };

        // 2. Trigger sync
        const result = await accountingService.syncBillingNoteToInvoice(data.note, data.jobs);
        return result;
    } catch (error) {
        console.error("Manual invoice sync failed:", error);
        return { success: false, message: "Internal error during manual sync" };
    }
}

export async function manualSyncBill(paymentId: string) {
    try {
        // 1. Get full data for the driver payment
        const data = await getDriverPaymentByIdWithJobs(paymentId);
        if (!data) return { success: false, message: "Driver payment not found" };

        // 2. Trigger sync
        const result = await accountingService.syncDriverPaymentToBill(data.payment, data.jobs);
        return result;
    } catch (error) {
        console.error("Manual bill sync failed:", error);
        return { success: false, message: "Internal error during manual sync" };
    }
}
