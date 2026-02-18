"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Mail, Paperclip, Send, Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentList } from "./attachment-list"
import { sendBillingEmail } from "@/lib/actions/email-actions"
import { toast } from "sonner"
import { getAttachments } from "@/lib/actions/attachment-actions"

interface BillingActionsProps {
    billingNoteId: string;
    customerEmail?: string;
    customerName: string;
    trigger?: React.ReactNode;
    hidePrint?: boolean;
}

export function BillingActions({ billingNoteId, customerEmail = "", customerName, trigger, hidePrint = false }: BillingActionsProps) {
    const [isEmailOpen, setIsEmailOpen] = useState(false)
    const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false)
    
    // Email Form
    const [emailTo, setEmailTo] = useState(customerEmail)
    const [subject, setSubject] = useState(`ใบวางบิล / Billing Note #${billingNoteId}`)
    const [message, setMessage] = useState(`เรียน ${customerName},\n\nทางบริษัทขอส่งใบวางบิลเลขที่ ${billingNoteId} ดังแนบ\n\nขอบคุณครับ`)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        // Append link to message on client side to avoid hydration mismatch
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const link = `${appUrl}/billing/print/${billingNoteId}`
        
        setMessage(prev => {
            // Prevent duplicate appending
            if (prev.includes("สามารถดูเอกสารออนไลน์ได้ที่:")) return prev
            return `${prev}\n\nสามารถดูเอกสารออนไลน์ได้ที่: ${link}`
        })
    }, [billingNoteId])

    // Handle Print
    const handlePrint = () => {
        window.print()
    }

    // Handle Send Email
    const handleSendEmail = async () => {
        if (!emailTo) return toast.error("กรุณาระบุอีเมล")
        
        setSending(true)
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
            
            // 1. Fetch Billing Note HTML
            let billingHtml = ""
            try {
                // Fetch from current origin to avoid CORS, but use appUrl for links in the HTML
                const res = await fetch(`/billing/print/${billingNoteId}`)
                if (res.ok) {
                    const text = await res.text()
                    // Fix relative paths (css, js, images) to be absolute so they load in attachment
                    // Use the Public URL for these links so they work for the recipient
                    billingHtml = text
                        .replace(/href="\//g, `href="${appUrl}/`)
                        .replace(/src="\//g, `src="${appUrl}/`)
                }
            } catch (e) {
                console.error("Failed to fetch billing html", e)
            }

            // 2. Fetch current attachments
            const attachments = await getAttachments(billingNoteId)
            const emailAttachments: any[] = attachments?.map(a => ({
                filename: a.File_Name,
                path: `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1/object/public/billing-documents/${a.File_Path}`
            })) || []

            // 3. Add Billing Note As Attachment (Default)
            if (billingHtml) {
                emailAttachments.push({
                    filename: `BillingNote-${billingNoteId}.html`,
                    content: billingHtml // Pass content string
                })
            }

            const { success, error } = await sendBillingEmail({
                to: emailTo,
                subject: subject,
                html: message.replace(/\n/g, '<br/>'),
                attachments: emailAttachments
            })

            if (!success) throw new Error(error)
            
            toast.success("ส่งอีเมลเรียบร้อย")
            setIsEmailOpen(false)
        } catch (error: any) {
            console.error(error)
            toast.error("ส่งอีเมลไม่สำเร็จ: " + error.message)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)} className="border-slate-300">
                    <Paperclip className="w-4 h-4 mr-2" />
                    {isAttachmentsOpen ? "ซ่อนไฟล์แนบ" : "ไฟล์แนบ"}
                </Button>
                {trigger ? (
                    <div onClick={() => setIsEmailOpen(true)}>
                        {trigger}
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setIsEmailOpen(true)} className="border-slate-300">
                        <Mail className="w-4 h-4 mr-2" />
                        ส่งอีเมล
                    </Button>
                )}
                {!hidePrint && (
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        พิมพ์ / Print
                    </Button>
                )}
            </div>

            {/* Attachments Section (Collapsible) */}
            {isAttachmentsOpen && (
                <div className="print:hidden animate-in slide-in-from-top-2 fade-in">
                    <AttachmentList billingNoteId={billingNoteId} />
                </div>
            )}

            {/* Email Dialog */}
            <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>ส่งใบวางบิลทางอีเมล</DialogTitle>
                        <DialogDescription>
                            ส่งเอกสารและไฟล์แนบไปยังลูกค้า
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-slate-200">ถึง (Email)</Label>
                            <Input 
                                value={emailTo} 
                                onChange={e => setEmailTo(e.target.value)} 
                                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-200">หัวข้อ (Subject)</Label>
                            <Input 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)} 
                                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-200">ข้อความ</Label>
                            <Textarea 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                                rows={8}
                                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 min-h-[150px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEmailOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleSendEmail} disabled={sending}>
                            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Send className="w-4 h-4 mr-2" />
                            ส่งอีเมล
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
