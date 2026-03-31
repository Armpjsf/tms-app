"use server"

import { Resend } from 'resend';

// Initialize Resend conditionally or lazily
const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); // Default dummy key to prevent crash on init, but check before send

export interface EmailAttachment {
    filename: string;
    path?: string; // URL
    content?: string; // Base64 string or HTML content
}

interface SendBillingEmailProps {
    from?: string;
    to: string;
    cc?: string; // Comma separated or single email
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

export async function sendBillingEmail({ from, to, cc, subject, html, attachments }: SendBillingEmailProps) {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    try {
        // RESEND SECURITY RULE: 'from' must be a VERIFIED domain in your Resend account.
        // We use a verified fallback for delivery, and set the user's input as 'reply_to'
        // so that the customer can still reply directly to the person who sent it.
        const deliverySender = 'Logis-Pro <onboarding@resend.dev>'; 
        const replyToAddress = from || '';

        // Handle CC: split by comma if it's a string
        const ccList = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined;

        const { data, error } = await resend.emails.send({
            from: deliverySender, 
            to: [to],
            cc: ccList,
            replyTo: replyToAddress,
            subject: subject,
            html: html,
            attachments: attachments
        });

        if (error) {
            // Log full error for debugging but return safe message
            console.error("[Email Action Error]", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: message };
    }
}
