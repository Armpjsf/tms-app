"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Mail, Paperclip, Send, Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentList } from "./attachment-list"
import { sendBillingEmail } from "@/lib/actions/email-actions"
import { toast } from "sonner"
import { Attachment, getAttachments } from "@/lib/actions/attachment-actions"

interface BillingActionsProps {
    billingNoteId: string;
    customerEmail?: string;
    customerName: string;
}

export function BillingActions({ billingNoteId, customerEmail = "", customerName }: BillingActionsProps) {
    const [isEmailOpen, setIsEmailOpen] = useState(false)
    const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false)
    
    // Email Form
    const [emailTo, setEmailTo] = useState(customerEmail)
    const [subject, setSubject] = useState(`ใบวางบิล / Billing Note #${billingNoteId}`)
    const [message, setMessage] = useState(`เรียน ${customerName},\n\nทางบริษัทขอส่งใบวางบิลเลขที่ ${billingNoteId} ดังแนบ\n\nขอบคุณครับ`)
    const [sending, setSending] = useState(false)

    // Handle Print
    const handlePrint = () => {
        window.print()
    }

    // Handle Send Email
    const handleSendEmail = async () => {
        if (!emailTo) return toast.error("กรุณาระบุอีเมล")
        
        setSending(true)
        try {
            // Fetch current attachments to send
            // Note: In a real app, you might want to let user select which files to send.
            // Here we just send the links or just a notification.
            // For Resend with Attachments, we need public URLs.
            // Let's first just send the text.
            
            const attachments = await getAttachments(billingNoteId)
            const emailAttachments = attachments?.map(a => ({
                filename: a.File_Name,
                path: `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1/object/public/billing-documents/${a.File_Path}`
            }))

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
                <Button variant="outline" onClick={() => setIsEmailOpen(true)} className="border-slate-300">
                    <Mail className="w-4 h-4 mr-2" />
                    ส่งอีเมล
                </Button>
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Printer className="w-4 h-4 mr-2" />
                    พิมพ์ / Print
                </Button>
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
                            <Label>ถึง (Email)</Label>
                            <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>หัวข้อ (Subject)</Label>
                            <Input value={subject} onChange={e => setSubject(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>ข้อความ</Label>
                            <Textarea 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                                rows={5}
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
