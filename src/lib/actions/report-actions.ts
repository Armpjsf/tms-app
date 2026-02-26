"use server"

import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { createClient } from "@/utils/supabase/server"
import { uploadFileToDrive } from "@/lib/google-drive"

export async function generateJobPDF(jobId: string) {
    console.log(`Generating PDF for Job: ${jobId}...`)
    
    try {
        const supabase = await createClient()
        
        // 1. Fetch comprehensive job data
        const { data: job, error } = await supabase
            .from('Jobs_Main')
            .select('*')
            .eq('Job_ID', jobId)
            .single()
            
        if (error || !job) throw new Error("Job not found")

        // 2. Initialize PDF
        const doc = new jsPDF()
        const primaryColor = [30, 41, 59] // Slate 800
        const accentColor = [79, 70, 229] // Indigo 600

        // Header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, 210, 40, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.text("DELIVERY SUMMARY REPORT", 15, 20)
        
        doc.setFontSize(10)
        doc.text(`Job ID: ${job.Job_ID}`, 15, 30)
        doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 15, 35)

        // Job Details Table
        const detailsData = [
            ["Customer", job.Customer_Name || "-"],
            ["Origin", job.Location_Origin_Name || job.Origin_Location || "-"],
            ["Destination", job.Location_Destination_Name || job.Dest_Location || "-"],
            ["Vehicle", job.Vehicle_Plate || "-"],
            ["Driver", job.Driver_Name || "-"],
            ["Status", job.Job_Status || "-"],
            ["Plan Date", job.Plan_Date || "-"],
            ["Pickup Time", job.Actual_Pickup_Time || "-"],
            ["Delivery Time", job.Actual_Delivery_Time || "-"],
        ]

        ;(doc as any).autoTable({
            startY: 50,
            head: [['Field', 'Value']],
            body: detailsData,
            theme: 'striped',
            headStyles: { fillStyle: accentColor },
            styles: { fontSize: 10, cellPadding: 3 }
        })

        // Photos Section (Basic implementation - embedding images in PDF requires base64)
        // Since fetching and converting all images might be heavy, for now we will 
        // provide links in metadata but let's try to embed at least the signature.
        
        let finalY = (doc as any).lastAutoTable.finalY + 20

        // Signatures
        if (job.Signature_Url || job.Pickup_Signature_Url) {
            doc.setFontSize(12)
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
            doc.text("SIGNATURES", 15, finalY)
            finalY += 10

            // Helper to get image as base64 (Simplified for logic)
            // Note: In real server environment, we'd use fetch + buffer -> base64
            // Since we can't easily fetch external images right now, we'll add links
            doc.setFontSize(8)
            if (job.Pickup_Signature_Url) {
                doc.text("Pickup Signature:", 15, finalY)
                doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
                doc.text("(View Signature Link)", 15, finalY + 5)
                doc.setTextColor(0, 0, 0)
            }
            if (job.Signature_Url) {
                doc.text("POD Signature:", 100, finalY)
                doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
                doc.text("(View Signature Link)", 100, finalY + 5)
                doc.setTextColor(0, 0, 0)
            }
        }

        // 3. Convert to Buffer
        const pdfArrayBuffer = doc.output('arraybuffer')
        const pdfBuffer = Buffer.from(pdfArrayBuffer)

        // 4. Upload to Google Drive
        const fileName = `Report_${jobId}_${Date.now()}.pdf`
        const uploadResult = await uploadFileToDrive(pdfBuffer, fileName, 'application/pdf', 'POD_Reports')

        console.log(`PDF Generated & Uploaded: ${uploadResult.directLink}`)

        // 5. Update Job with PDF Link
        await supabase
            .from('Jobs_Main')
            .update({ Photo_Proof_Url: job.Photo_Proof_Url ? `${job.Photo_Proof_Url},${uploadResult.directLink}` : uploadResult.directLink })
            .eq('Job_ID', jobId)

        // 6. Log the export
        const { logActivity } = await import('@/lib/supabase/logs')
        await logActivity({
            module: 'Reports',
            action_type: 'EXPORT',
            target_id: jobId,
            details: {
                report_type: 'Delivery Summary',
                file_name: fileName,
                url: uploadResult.directLink
            }
        })

        return { success: true, url: uploadResult.directLink }

    } catch (e) {
        console.error("PDF Generation Failed:", e)
        return { success: false, error: String(e) }
    }
}
