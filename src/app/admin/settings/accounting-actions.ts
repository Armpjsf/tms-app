"use server"

import { accountingService } from "@/services/accounting"
import { getBillingNoteByIdWithJobs, getDriverPaymentByIdWithJobs } from "@/lib/supabase/billing"

export async function checkAccountingConnection() {
    try {
        const result = await accountingService.isConnected();
        return { 
            success: true, 
            connected: result.connected, 
            message: result.message 
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Accounting connection check failed:", error);
        return { success: false, connected: false, message };
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

import { saveServerSetting } from "@/lib/supabase/system_settings_server";
import { Job } from "@/types/database";

export async function saveAccountingSettings(apiKey: string, companyId: string, userEmail: string = '') {
    try {
        await saveServerSetting('akaunting_api_key', apiKey, 'Akaunting API Key');
        await saveServerSetting('akaunting_company_id', companyId, 'Akaunting Company ID');
        await saveServerSetting('akaunting_user_email', userEmail, 'Akaunting User Email');
        return { success: true, message: "Settings saved successfully" };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to save accounting settings:", error);
        return { success: false, message };
    }
}

export async function syncJobToAccounting(job: Job) {
    try {
        const result = await accountingService.syncJobToInvoice(job);
        return result;
    } catch (error) {
        console.error("Sync job to accounting failed:", error);
        return { success: false, message: "Internal error during job sync" };
    }
}
