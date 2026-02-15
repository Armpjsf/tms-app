"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Paperclip, Trash2, Download, Loader2, FileText, Upload } from "lucide-react"
import { getAttachments, saveAttachment, deleteAttachment, Attachment } from "@/lib/actions/attachment-actions"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

interface AttachmentListProps {
    billingNoteId: string;
    readonly?: boolean;
}

export function AttachmentList({ billingNoteId, readonly = false }: AttachmentListProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        loadAttachments()
    }, [billingNoteId])

    const loadAttachments = async () => {
        setLoading(true)
        const data = await getAttachments(billingNoteId)
        setAttachments(data)
        setLoading(false)
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return
        
        const file = event.target.files[0]
        setUploading(true)

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${billingNoteId}/${Date.now()}.${fileExt}`
            const filePath = fileName // Path in bucket

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('billing-documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Save to DB
            const { success, error } = await saveAttachment({
                Billing_Note_ID: billingNoteId,
                File_Name: file.name,
                File_Path: filePath,
                File_Type: file.type || 'application/octet-stream',
            })

            if (!success) throw new Error(error)

            toast.success("อัปโหลดไฟล์เรียบร้อย")
            loadAttachments()
        } catch (error: any) {
            console.error("Upload failed:", error)
            toast.error("อัปโหลดล้มเหลว: " + error.message)
        } finally {
            setUploading(false)
            // Reset input
            event.target.value = ''
        }
    }

    const handleDelete = async (attachment: Attachment) => {
        if (!confirm("ต้องการลบไฟล์นี้หรือไม่?")) return

        try {
            const { success, error } = await deleteAttachment(attachment.Attachment_ID, attachment.File_Path)
            if (!success) throw new Error(error)
            
            toast.success("ลบไฟล์เรียบร้อย")
            loadAttachments()
        } catch (error: any) {
            toast.error("ลบไฟล์ล้มเหลว")
        }
    }

    const handleDownload = async (path: string) => {
        const supabase = createClient()
        const { data } = supabase.storage.from('billing-documents').getPublicUrl(path)
        window.open(data.publicUrl, '_blank')
    }

    return (
        <Card className="mt-6 bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-indigo-400" />
                    เอกสารแนบ (Attachments)
                </CardTitle>
                {!readonly && (
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <Button disabled={uploading} variant="outline" className="border-slate-700 hover:bg-slate-800">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                            {uploading ? "กำลังอัปโหลด..." : "เพิ่มไฟล์แนบ"}
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-4 text-slate-500">Loading...</div>
                ) : attachments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        ไม่มีเอกสารแนบ
                    </div>
                ) : (
                    <div className="space-y-2">
                        {attachments.map((file) => (
                            <div key={file.Attachment_ID} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg group hover:bg-slate-800/80 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-slate-700 rounded text-slate-300">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-md">{file.File_Name}</p>
                                        <p className="text-xs text-slate-400">{new Date(file.Uploaded_At).toLocaleString('th-TH')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="icon" variant="ghost" onClick={() => handleDownload(file.File_Path)} className="text-slate-400 hover:text-white">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    {!readonly && (
                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(file)} className="text-slate-400 hover:text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
