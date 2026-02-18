"use server"

import { Resend } from 'resend';

// Initialize Resend conditionally or lazily
const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); // Default dummy key to prevent crash on init, but check before send

interface EmailAttachment {
    filename: string;
    path?: string; // URL
    content?: Buffer | string;
}

interface SendBillingEmailProps {
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

export async function sendBillingEmail({ to, subject, html, attachments }: SendBillingEmailProps) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing in environment variables");
        return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Billing <billing@resend.dev>', // Change this to your verify domain if available
            to: [to],
            // cc: 'billing@mycompany.com', // Optional: Auto CC yourself
            subject: subject,
            html: html,
            attachments: attachments
        });

        if (error) {
            console.error("Resend Error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e: any) {
        console.error("Sending Email Failed:", e);
        return { success: false, error: e.message };
    }
}
