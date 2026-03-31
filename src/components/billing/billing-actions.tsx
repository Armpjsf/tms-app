"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Mail, Paperclip, Send, Loader2 } from "lucide-react"
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
        // Load default sender email from company profile
        const loadDefaultSender = async () => {
             const res = await fetch('/api/settings/company') // Assuming this exists or using a direct lib call
             if (res.ok) {
                 const data = await res.json()
                 if (data?.email) setEmailFrom(data.email)
             }
        }
        loadDefaultSender()

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

    // Handle Send Email (Via Resend API - Automated Flow)
    const handleSendEmail = async () => {
        if (!emailTo) return toast.error("กรุณาระบุอีเมลผู้รับ")
        
        setSending(true)
        const toastId = toast.loading("กำลังเตรียมเอกสาร PDF และส่งอีเมล...")
        
        try {
            // 1. Fetch current attachments (manually uploaded ones)
            const attachments = await getAttachments(billingNoteId)
            const emailAttachments: EmailAttachment[] = attachments?.map(a => ({
                filename: a.File_Name,
                path: `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1/object/public/billing-documents/${a.File_Path}`
            })) || []

            // 2. Send via Server Action (Resend)
            const { success, error } = await sendBillingEmail({
                from: emailFrom,
                to: emailTo,
                cc: emailCC,
                subject: subject,
                html: message.replace(/\n/g, '<br/>'),
                attachments: emailAttachments
            })

            if (!success) throw new Error(error)
            
            toast.success("ส่งอีเมลเรียบร้อย (เช็คได้จากโปรแกรมเมล/Resend Dashboard)", { id: toastId })
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
                <DialogContent className="max-w-md max-h-[95vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-4 flex-shrink-0">
                        <DialogTitle>ส่งใบวางบิลทางอีเมล</DialogTitle>
                        <DialogDescription>
                            ส่งเอกสารและไฟล์แนบไปยังลูกค้า
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
                        <div className="space-y-2">
                            <Label className="text-gray-800">อีเมลสำหรับตอบกลับ (Reply-To Email)</Label>
                            <Input 
                                value={emailFrom} 
                                onChange={e => setEmailFrom(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="sender@company.com"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                * ระบบจะใช้ชื่อโดเมนบริษัทเป็นผู้ส่ง และใช้เมลนี้เมื่อลูกค้ากด &apos;ตอบกลับ&apos;
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-800">ส่งถึง (To Email)</Label>
                            <Input 
                                value={emailTo} 
                                onChange={e => setEmailTo(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="ของคุณเองในช่วงเทส"
                            />
                            <p className="text-[11px] text-rose-500 font-bold italic">
                                * ในช่วงทดสอบ (ยังไม่ยืนยันโดเมน) ส่งเข้าเมลตัวเองที่สมัคร Resend เท่านั้น
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-800">สำเนาถึง (CC Email)</Label>
                            <Input 
                                value={emailCC} 
                                onChange={e => setEmailCC(e.target.value)} 
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                                placeholder="boss@company.com, account@company.com"
                            />
                            <p className="text-[11px] text-muted-foreground italic">
                                * ส่งแบบ CC ได้สูงสุด 50 อีเมลต่อฉบับ (ต้องยืนยันโดเมนก่อนถ้าจะส่งหาคนอื่น)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-800">หัวข้อ (Subject)</Label>
                            <Input 
                                value={subject} 
                                onChange={setSubject ? (e => setSubject(e.target.value)) : undefined}
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-800">ข้อความ</Label>
                            <Textarea 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                                rows={8}
                                className="bg-background border-gray-200 text-gray-900 placeholder:text-gray-400 min-h-[150px]"
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
