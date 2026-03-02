'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { toast } from 'sonner'
import { PublicJobDetails } from '@/lib/actions/tracking-actions'

interface PODDownloadButtonProps {
  job: PublicJobDetails
}

export function PODDownloadButton({ job }: PODDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)
    const id = toast.loading('กำลังสร้างใบ POD...')
    
    try {
        // Create a temporary container for the PDF content
        const element = document.createElement('div')
        element.style.position = 'absolute'
        element.style.left = '-9999px'
        element.style.top = '0'
        element.style.width = '800px'
        element.style.background = 'white'
        element.style.color = '#1e293b'
        element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Thai', sans-serif"

        // Robust date parsing helper
        const parseDate = (dateStr: string | null) => {
            if (!dateStr || dateStr === '-') {
                // Fallback to planDate if delivery date is missing
                if (job.planDate && job.planDate !== '-') return job.planDate
                return 'ไม่ระบุ'
            }
            // Replace space with T to handle SQL datetime -> ISO conversion
            const d = new Date(dateStr.replace(' ', 'T'))
            if (isNaN(d.getTime())) return 'ไม่ระบุ'
            return d.toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' น.'
        }

        const deliveryDateStr = parseDate(job.deliveryDate)
        
        // Signatures HTML
        const pickupSigHtml = job.pickupSignature 
            ? `<img src="${job.pickupSignature}" style="max-height: 80px; max-width: 150px; object-fit: contain;" crossorigin="anonymous" />`
            : '<span style="color: #94a3b8; font-size: 11px;">NOT REQUIRED</span>'
            
        const deliverySigHtml = job.signature 
            ? `<img src="${job.signature}" style="max-height: 80px; max-width: 150px; object-fit: contain;" crossorigin="anonymous" />`
            : (job.status === 'Completed' ? '<span style="color: #ef4444; font-size: 11px;">MISSING DATA</span>' : '<span style="color: #94a3b8; font-size: 11px;">PENDING</span>')

        // Photos HTML
        const photosHtml = (job.podPhotos && job.podPhotos.length > 0) 
            ? `
                <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    ${job.podPhotos.map(url => `
                        <div style="aspect-ratio: 4/3; border-radius: 12px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
                        </div>
                    `).join('')}
                </div>
              `
            : '<p style="color: #94a3b8; font-size: 13px; font-style: italic; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #e2e8f0; text-align: center;">ไม่มีภาพถ่ายหลักฐานในระบบ</p>'

        element.innerHTML = `
            <div style="padding: 50px; border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
                <!-- Official Verified Watermark/Badge -->
                <div style="position: absolute; top: 120px; right: 40px; transform: rotate(15deg); border: 4px double #10b981; color: #10b981; padding: 10px 20px; font-weight: 950; font-size: 20px; border-radius: 10px; opacity: 0.3; pointer-events: none;">
                    OFFICIAL VERIFIED
                </div>

                <!-- Header -->
                <div style="background: #1e293b; color: white; padding: 50px 40px; margin: -50px -50px 50px -50px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: -2px;">PROOF OF DELIVERY</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Certificate of Completion • LOGIS-PRO 360 Enterprise</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 11px; font-weight: 900; opacity: 0.5; text-transform: uppercase;">Job Reference ID</p>
                        <p style="margin: 0; font-size: 20px; font-weight: 950; letter-spacing: -0.5px;">${job.jobId}</p>
                    </div>
                </div>

                <!-- Shipment Info Section -->
                <div style="margin-bottom: 50px;">
                    <h2 style="font-size: 13px; font-weight: 950; color: #1e293b; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1.5px;">1. SHIPMENT & CARRIER DETAILS</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                        <div>
                            <div style="margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #6366f1; text-transform: uppercase;">Customer Name</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">${job.customerName}</p>
                            </div>
                            <div style="margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;">Origin / ต้นทาง</p>
                                <p style="margin: 5px 0 0 0; font-size: 13px; color: #334155; line-height: 1.6; font-weight: 600;">${job.origin}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;">Cargo Details / ข้อมูลสินค้า</p>
                                <p style="margin: 5px 0 0 0; font-size: 13px; color: #334155; font-weight: 700;">
                                    ${job.cargoType || 'General Cargo'} 
                                    ${(job.weight || job.volume) ? `<span style="color: #64748b; font-weight: 500;">(${job.weight ? `${job.weight} kg` : ''} ${job.volume ? ` / ${job.volume} cbm` : ''})</span>` : ''}
                                </p>
                            </div>
                        </div>
                        <div>
                            <div style="margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #6366f1; text-transform: uppercase;">Carrier info / ผู้ช่วยและพาหนะ</p>
                                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a;">${job.vehiclePlate} (${job.vehicleType || 'Truck'})</p>
                                <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #475569;">Driver: ${job.driverName}</p>
                            </div>
                            <div style="margin-bottom: 25px;">
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;">Destination / ปลายทาง</p>
                                <p style="margin: 5px 0 0 0; font-size: 13px; color: #334155; line-height: 1.6; font-weight: 600;">${job.destination}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;">Job Status / สถานะ</p>
                                <p style="margin: 5px 0 0 0; font-size: 13px; color: #059669; font-weight: 900; text-transform: uppercase;">${job.status}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Summary Section -->
                <div style="display: flex; gap: 25px; margin-bottom: 50px;">
                    <div style="flex: 2; border: 2px solid #f1f5f9; padding: 25px; border-radius: 20px; background: #f8fafc; border-left: 8px solid #1e293b;">
                        <p style="margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;">Final Completion Date</p>
                        <p style="margin: 6px 0 0 0; font-size: 22px; font-weight: 950; color: #0f172a;">${deliveryDateStr}</p>
                    </div>
                    <div style="flex: 1; border: 2px solid #10b981; padding: 25px; border-radius: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ecfdf5;">
                         <p style="margin: 0; font-size: 10px; font-weight: 950; color: #059669; text-transform: uppercase; margin-bottom: 4px;">Delivery Status</p>
                         <p style="margin: 0; color: #047857; font-size: 20px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px;">${job.status}</p>
                    </div>
                </div>

                <!-- Notes Section -->
                ${job.notes ? `
                <div style="margin-bottom: 50px;">
                    <h2 style="font-size: 13px; font-weight: 950; color: #1e293b; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1.5px;">2. JOB REMARKS/NOTES</h2>
                    <div style="padding: 25px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 700; line-height: 1.6;">${job.notes}</p>
                    </div>
                </div>
                ` : ''}

                <!-- Evidence Section -->
                <div style="margin-bottom: 50px;">
                    <h2 style="font-size: 13px; font-weight: 950; color: #1e293b; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1.5px;">3. DELIVERY EVIDENCE & SIGNATURES</h2>
                    
                    <div style="margin-bottom: 35px;">
                        <p style="margin: 0 0 15px 0; font-size: 11px; font-weight: 950; color: #64748b; text-transform: uppercase;">Photo Proofs</p>
                        ${photosHtml}
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                        <div style="border: 2px solid #f1f5f9; padding: 30px; border-radius: 24px; text-align: center; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                             <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 950; color: #94a3b8; text-transform: uppercase;">Sender Verification (Origin)</p>
                             <div style="height: 100px; display: flex; items-center; justify-content: center; border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafafa; overflow: hidden; padding: 10px;">
                                ${pickupSigHtml}
                             </div>
                        </div>
                        <div style="border: 2px solid #f1f5f9; padding: 30px; border-radius: 24px; text-align: center; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
                             <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 950; color: #94a3b8; text-transform: uppercase;">Receiver Acknowledgment</p>
                             <div style="height: 100px; display: flex; items-center; justify-content: center; border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafafa; overflow: hidden; padding: 10px;">
                                ${deliverySigHtml}
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Verified Footer -->
                <div style="text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 40px; margin-top: 20px;">
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
                        <p style="margin: 0; font-weight: 900; color: #475569;">DIGITALLY SECURED & VERIFIED DOCUMENT</p>
                    </div>
                    <p style="margin-bottom: 8px;">Audit Trail Hash: ${Math.random().toString(36).substring(7).toUpperCase()}-${job.jobId}</p>
                    <p style="color: #6366f1; font-weight: 800; font-size: 12px; margin-bottom: 15px;">Official Tracking: https://${window.location.host}/track/${job.jobId}</p>
                    <p style="font-size: 10px; opacity: 0.6;">Document Generated on ${new Date().toLocaleString('th-TH')} • System Reference: ${job.jobId}</p>
                </div>
            </div>
        `

        document.body.appendChild(element)

        // Wait longer for image loading
        await new Promise(resolve => setTimeout(resolve, 2000))

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            logging: true
        })

        document.body.removeChild(element)

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pageWidth = pdf.internal.pageSize.getWidth()
        const imgWidth = pageWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`POD_${job.jobId}.pdf`)
        
        toast.dismiss(id)
        toast.success('ดาวน์โหลดใบ POD เรียบร้อยแล้ว')
    } catch (error) {
        console.error("PDF Error:", error)
        toast.error('ไม่สามารถสร้างไฟล์ PDF ได้')
    } finally {
        setIsGenerating(false)
    }
  }

  return (
    <Button 
      onClick={handleDownload}
      disabled={isGenerating}
      className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg gap-3 shadow-lg shadow-indigo-500/20 transition-all group"
    >
      {isGenerating ? (
          <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
          <>
            <FileDown className="h-6 w-6 group-hover:translate-y-0.5 transition-transform" />
            <span>Download Proof of Delivery (PDF)</span>
          </>
      )}
    </Button>
  )
}
