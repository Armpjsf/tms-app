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
    from?: string;
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
}

export async function sendBillingEmail({ from, to, subject, html, attachments }: SendBillingEmailProps) {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    try {
        let senderEmail = from || 'Billing <billing@resend.dev>';

        // If 'from' is not provided, try to fetch from branch settings
        if (!from) {
            try {
                const { createClient } = await import('@/utils/supabase/server');
                const { getUserBranchId } = await import('@/lib/permissions');
                const supabase = await createClient();
                const branchId = await getUserBranchId();

                if (branchId) {
                    const { data: branch } = await supabase
                        .from('Master_Branches')
                        .select('Email, Sender_Name')
                        .eq('Branch_ID', branchId)
                        .single();

                    if (branch?.Email) {
                        senderEmail = branch.Sender_Name 
                            ? `${branch.Sender_Name} <${branch.Email}>`
                            : branch.Email;
                    }
                }
            } catch {
                // Failed to fetch branch email settings
            }
        }

        const { data, error } = await resend.emails.send({
            from: senderEmail, 
            to: [to],
            // cc: 'billing@mycompany.com', // Optional: Auto CC yourself
            subject: subject,
            html: html,
            attachments: attachments
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: message };
    }
}
