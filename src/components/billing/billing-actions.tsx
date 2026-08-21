"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Mail, Paperclip, Send, Loader2, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentList } from "./attachment-list"
import { sendBillingEmail, type EmailAttachment } from "@/lib/actions/email-actions"
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
    const [emailFrom, setEmailFrom] = useState("")
    const [emailTo, setEmailTo] = useState(customerEmail)
    const [emailCC, setEmailCC] = useState("")
    const [subject, setSubject] = useState(`ใบวางบิล / Billing Note #${billingNoteId}`)
    const [message, setMessage] = useState(`เรียน ${customerName},\n\nทางบริษัทขอส่งใบวางบิลเลขที่ ${billingNoteId} ดังแนบ\n\nขอบคุณครับ`)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        // Load default sender email from company profile if available
        const loadDefaultSender = async () => {
             try {
                 const res = await fetch('/api/settings/company')
                 if (res.ok) {
                     const data = await res.json()
                     if (data?.email) setEmailFrom(data.email)
                 }
             } catch { /* ignore */ }
        }
        loadDefaultSender()

        // Append link to message on client side to avoid hydration mismatch
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        const link = `${appUrl}/billing/print/${billingNoteId}`
        
        setMessage(prev => {
            // Prevent duplicate appending
            if (prev.includes("สามารถดูเอกสารออนไลน์ได้ที่:")) return prev
            return `${prev}\n\nสามารถดูเอกสารออนไลน์ได้ที่: ${link}`
        })
    }, [billingNoteId])

    // Update emailTo if prop changes
    useEffect(() => {
        if (customerEmail) {
            setEmailTo(customerEmail)
        }
    }, [customerEmail])

    // Dynamic Gmail Web Compose Link (Direct HTML Link to bypass browser popup blockers)
    const ccParam = emailCC ? `&cc=${encodeURIComponent(emailCC)}` : ''
    const gmailWebUrl = emailTo 
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}${ccParam}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` 
        : '#'

    // Handle Print
    const handlePrint = () => {
        window.print()
    }

    // Handle Open in Local Mail Client (Outlook / Mail App)
    const handleOpenMailApp = () => {
        if (!emailTo) return toast.error("กรุณาระบุอีเมลผู้รับ")
        
        const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}${ccParam}&body=${encodeURIComponent(message)}`
        
        try {
            const a = document.createElement('a')
            a.href = mailtoUrl
            a.target = '_self'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            toast.success("สั่งเปิดโปรแกรมอีเมลในเครื่องเรียบร้อยแล้ว (หากโปรแกรมไม่เปิด กรุณาใช้ปุ่ม 'เปิดใน Gmail Web')")
        } catch {
            window.location.href = mailtoUrl
        }
    }

    // Handle Send Email (Via Server Action / Custom SMTP or Resend API)
    const handleSendEmail = async () => {
        if (!emailTo) return toast.error("กรุณาระบุอีเมลผู้รับ")
        
        setSending(true)
        const toastId = toast.loading("กำลังเตรียมเอกสารและส่งอีเมล...")
        
        try {
            // 1. Fetch current attachments (manually uploaded ones)
            const attachments = await getAttachments(billingNoteId)
            const emailAttachments: EmailAttachment[] = attachments?.map(a => ({
                filename: a.File_Name,
                path: `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1/object/public/billing-documents/${a.File_Path}`
            })) || []

            // 2. Send via Server Action
            const { success, error } = await sendBillingEmail({
                from: emailFrom,
                to: emailTo,
                cc: emailCC,
                subject: subject,
                html: message.replace(/\n/g, '<br/>'),
                attachments: emailAttachments
            })

            if (!success) throw new Error(error)
            
            toast.success("ส่งอีเมลเรียบร้อยแล้ว", { id: toastId })
            setIsEmailOpen(false)
        } catch (error) {
            toast.error("ส่งอีเมลไม่สำเร็จ: " + ((error as Error)?.message || " Unknown error"), { id: toastId })
            console.error("Send Email Error:", error)
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
                    <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-blue-700 text-white">
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
                <DialogContent className="max-w-lg max-h-[95vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 flex-shrink-0">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            ส่งใบวางบิลทางอีเมล
                        </DialogTitle>
                        <DialogDescription>
                            เลือกส่งผ่าน Gmail Web Direct / แอปในเครื่อง หรือส่งอัตโนมัติผ่านระบบเซิร์ฟเวอร์
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 custom-scrollbar">
                        <div className="space-y-1.5">
                            <Label className="text-gray-800 font-bold text-sm">อีเมลผู้ส่ง (Sender / From)</Label>
                            <Input 
                                value={emailFrom} 
                                onChange={e => setEmailFrom(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="billing@yourcompany.com"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                * อีเมลผู้ส่ง/แผนกบัญชีสำหรับระบุเป็นผู้ส่ง
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-800 font-bold text-sm">ส่งถึงผู้รับ (To Email)</Label>
                            <Input 
                                value={emailTo} 
                                onChange={e => setEmailTo(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="customer@company.com"
                            />
                            <p className="text-[11px] text-emerald-600 font-semibold italic">
                                * ระบุอีเมลปลายทางของลูกค้าที่ต้องการส่งใบวางบิลได้โดยตรง
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-800 font-bold text-sm">สำเนาถึง (CC Email)</Label>
                            <Input 
                                value={emailCC} 
                                onChange={e => setEmailCC(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="account@company.com, manager@company.com"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                * คั่นด้วยเครื่องหมายจุลภาค (,) หากมีหลายอีเมล
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-800 font-bold text-sm">หัวข้อ (Subject)</Label>
                            <Input 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)}
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-gray-800 font-bold text-sm">ข้อความ (Message)</Label>
                            <Textarea 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                                rows={5}
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400 min-h-[110px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-muted/30 border-t flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 w-full justify-between items-center">
                            <div className="flex gap-2">
                                <a 
                                    href={gmailWebUrl}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        if (!emailTo) {
                                            e.preventDefault()
                                            toast.error("กรุณาระบุอีเมลผู้รับ")
                                        } else {
                                            toast.success("เปิดหน้าเขียนอีเมลใน Gmail Web เรียบร้อยแล้ว")
                                        }
                                    }}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors border border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-9 px-3 py-2 cursor-pointer"
                                >
                                    <ExternalLink className="w-4 h-4 mr-1.5" />
                                    เปิดใน Gmail Web
                                </a>
                                <Button variant="outline" onClick={handleOpenMailApp} type="button" className="border-sky-500/40 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30">
                                    <ExternalLink className="w-4 h-4 mr-1.5" />
                                    แอปในเครื่อง (Outlook)
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsEmailOpen(false)}>ยกเลิก</Button>
                                <Button onClick={handleSendEmail} disabled={sending} className="bg-primary text-primary-foreground">
                                    {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <Send className="w-4 h-4 mr-2" />
                                    ส่งผ่านระบบ
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
