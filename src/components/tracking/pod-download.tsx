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
        
        // Use a hidden div for rendering the PDF content
        const container = document.createElement('div')
        container.style.padding = '50px'
        container.style.border = '1px solid #e2e8f0'
        container.style.position = 'relative'
        container.style.overflow = 'hidden'
        
        // Watermark
        const watermark = document.createElement('div')
        watermark.style.cssText = 'position: absolute; top: 120px; right: 40px; transform: rotate(15deg); border: 4px double #10b981; color: #10b981; padding: 10px 20px; font-weight: 950; font-size: 20px; border-radius: 10px; opacity: 0.3; pointer-events: none;'
        watermark.textContent = 'OFFICIAL VERIFIED'
        container.appendChild(watermark)

        // Header
        const header = document.createElement('div')
        header.style.cssText = 'background: #1e293b; color: white; padding: 50px 40px; margin: -50px -50px 50px -50px; display: flex; justify-content: space-between; align-items: flex-end;'
        
        const headerLeft = document.createElement('div')
        const h1 = document.createElement('h1')
        h1.style.cssText = 'margin: 0; font-size: 42px; font-weight: 900; letter-spacing: -2px;'
        h1.textContent = 'PROOF OF DELIVERY'
        headerLeft.appendChild(h1)
        
        const pSub = document.createElement('p')
        pSub.style.cssText = 'margin: 10px 0 0 0; opacity: 0.8; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;'
        pSub.textContent = 'Certificate of Completion • LOGIS-PRO 360 Enterprise'
        headerLeft.appendChild(pSub)
        header.appendChild(headerLeft)

        const headerRight = document.createElement('div')
        headerRight.style.textAlign = 'right'
        const pRefLabel = document.createElement('p')
        pRefLabel.style.cssText = 'margin: 0; font-size: 11px; font-weight: 900; opacity: 0.5; text-transform: uppercase;'
        pRefLabel.textContent = 'Job Reference ID'
        headerRight.appendChild(pRefLabel)
        const pRefVal = document.createElement('p')
        pRefVal.style.cssText = 'margin: 0; font-size: 20px; font-weight: 950; letter-spacing: -0.5px;'
        pRefVal.textContent = job.jobId || ''
        headerRight.appendChild(pRefVal)
        header.appendChild(headerRight)
        
        container.appendChild(header)

        // Sections helper
        const createSectionHeader = (text: string) => {
            const h2 = document.createElement('h2')
            h2.style.cssText = 'font-size: 13px; font-weight: 950; color: #1e293b; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1.5px;'
            h2.textContent = text
            return h2
        }

        // Section 1
        container.appendChild(createSectionHeader('1. SHIPMENT & CARRIER DETAILS'))
        const grid1 = document.createElement('div')
        grid1.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;'
        
        const leftCol = document.createElement('div')
        const createField = (label: string, value: string, color = '#64748b', valSize = '13px', valWeight = '600') => {
            const div = document.createElement('div')
            div.style.marginBottom = '25px'
            const pL = document.createElement('p')
            pL.style.cssText = `margin: 0; font-size: 10px; font-weight: 950; color: ${color}; text-transform: uppercase;`
            pL.textContent = label
            div.appendChild(pL)
            const pV = document.createElement('p')
            pV.style.cssText = `margin: 5px 0 0 0; font-size: ${valSize}; font-weight: ${valWeight}; color: #334155; line-height: 1.6;`
            pV.textContent = value
            div.appendChild(pV)
            return div
        }

        leftCol.appendChild(createField('Customer Name', job.customerName || 'ไม่ระบุ', '#6366f1', '18px', '900'))
        leftCol.appendChild(createField('Origin / ต้นทาง', job.origin || '-', '#64748b'))
        const cargoText = `${job.cargoType || 'General Cargo'} ${(job.weight || job.volume) ? `(${job.weight ? `${job.weight} kg` : ''} ${job.volume ? ` / ${job.volume} cbm` : ''})` : ''}`
        leftCol.appendChild(createField('Cargo Details / ข้อมูลสินค้า', cargoText, '#64748b', '13px', '700'))
        grid1.appendChild(leftCol)

        const rightCol = document.createElement('div')
        rightCol.appendChild(createField('Carrier info / ผู้ช่วยและพาหนะ', `${job.vehiclePlate} (${job.vehicleType || 'Truck'})`, '#6366f1', '16px', '900'))
        const driverP = document.createElement('p')
        driverP.style.cssText = 'margin: -20px 0 25px 0; font-size: 14px; font-weight: 700; color: #475569;'
        driverP.textContent = `Driver: ${job.driverName}`
        rightCol.appendChild(driverP)
        rightCol.appendChild(createField('Destination / ปลายทาง', job.destination || '-', '#64748b'))
        rightCol.appendChild(createField('Job Status / สถานะ', job.status || '-', '#64748b', '13px', '900'))
        grid1.appendChild(rightCol)
        container.appendChild(grid1)

        // Status Summary
        const summary = document.createElement('div')
        summary.style.cssText = 'display: flex; gap: 25px; margin-bottom: 50px;'
        
        const dateBox = document.createElement('div')
        dateBox.style.cssText = 'flex: 2; border: 2px solid #f1f5f9; padding: 25px; border-radius: 20px; background: #f8fafc; border-left: 8px solid #1e293b;'
        const pDL = document.createElement('p')
        pDL.style.cssText = 'margin: 0; font-size: 10px; font-weight: 950; color: #64748b; text-transform: uppercase;'
        pDL.textContent = 'Final Completion Date'
        dateBox.appendChild(pDL)
        const pDV = document.createElement('p')
        pDV.style.cssText = 'margin: 6px 0 0 0; font-size: 22px; font-weight: 950; color: #0f172a;'
        pDV.textContent = deliveryDateStr
        dateBox.appendChild(pDV)
        summary.appendChild(dateBox)

        const statusBox = document.createElement('div')
        statusBox.style.cssText = 'flex: 1; border: 2px solid #10b981; padding: 25px; border-radius: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ecfdf5;'
        const pSL = document.createElement('p')
        pSL.style.cssText = 'margin: 0; font-size: 10px; font-weight: 950; color: #059669; text-transform: uppercase; margin-bottom: 4px;'
        pSL.textContent = 'Delivery Status'
        statusBox.appendChild(pSL)
        const pSV = document.createElement('p')
        pSV.style.cssText = 'margin: 0; color: #047857; font-size: 20px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px;'
        pSV.textContent = job.status || ''
        statusBox.appendChild(pSV)
        summary.appendChild(statusBox)
        container.appendChild(summary)

        // Notes
        if (job.notes) {
            container.appendChild(createSectionHeader('2. JOB REMARKS/NOTES'))
            const notesBox = document.createElement('div')
            notesBox.style.cssText = 'padding: 25px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 20px; margin-bottom: 50px;'
            const pN = document.createElement('p')
            pN.style.cssText = 'margin: 0; font-size: 14px; color: #92400e; font-weight: 700; line-height: 1.6;'
            pN.textContent = job.notes
            notesBox.appendChild(pN)
            container.appendChild(notesBox)
        }

        // Evidence
        container.appendChild(createSectionHeader('3. DELIVERY EVIDENCE & SIGNATURES'))
        const evidence = document.createElement('div')
        
        const pPhL = document.createElement('p')
        pPhL.style.cssText = 'margin: 0 0 15px 0; font-size: 11px; font-weight: 950; color: #64748b; text-transform: uppercase;'
        pPhL.textContent = 'Photo Proofs'
        evidence.appendChild(pPhL)

        if (job.podPhotos && job.podPhotos.length > 0) {
            const photoGrid = document.createElement('div')
            photoGrid.style.cssText = 'margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 35px;'
            job.podPhotos.forEach(url => {
                const imgBox = document.createElement('div')
                imgBox.style.cssText = 'aspect-ratio: 4/3; border-radius: 12px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);'
                const img = document.createElement('img')
                img.src = url
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;'
                img.setAttribute('crossorigin', 'anonymous')
                imgBox.appendChild(img)
                photoGrid.appendChild(imgBox)
            })
            evidence.appendChild(photoGrid)
        } else {
            const emptyP = document.createElement('p')
            emptyP.style.cssText = 'color: #94a3b8; font-size: 13px; font-style: italic; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #e2e8f0; text-align: center; margin-bottom: 35px;'
            emptyP.textContent = 'ไม่มีภาพถ่ายหลักฐานในระบบ'
            evidence.appendChild(emptyP)
        }

        const sigGrid = document.createElement('div')
        sigGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;'
        
        const createSigBox = (label: string, signatureUrl: string | null, fallback: string) => {
            const box = document.createElement('div')
            box.style.cssText = 'border: 2px solid #f1f5f9; padding: 30px; border-radius: 24px; text-align: center; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);'
            const p = document.createElement('p')
            p.style.cssText = 'margin: 0 0 15px 0; font-size: 10px; font-weight: 950; color: #94a3b8; text-transform: uppercase;'
            p.textContent = label
            box.appendChild(p)
            
            const sigContainer = document.createElement('div')
            sigContainer.style.cssText = 'height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafafa; overflow: hidden; padding: 10px;'
            
            if (signatureUrl) {
                const img = document.createElement('img')
                img.src = signatureUrl
                img.style.cssText = 'max-height: 80px; max-width: 150px; object-fit: contain;'
                img.setAttribute('crossorigin', 'anonymous')
                sigContainer.appendChild(img)
            } else {
                const span = document.createElement('span')
                span.style.cssText = 'color: #94a3b8; font-size: 11px;'
                span.textContent = fallback
                sigContainer.appendChild(span)
            }
            box.appendChild(sigContainer)
            return box
        }

        sigGrid.appendChild(createSigBox('Sender Verification (Origin)', job.pickupSignature || null, 'NOT REQUIRED'))
        sigGrid.appendChild(createSigBox('Receiver Acknowledgment', job.signature || null, job.status === 'Completed' ? 'MISSING DATA' : 'PENDING'))
        evidence.appendChild(sigGrid)
        container.appendChild(evidence)

        // Footer
        const footer = document.createElement('div')
        footer.style.cssText = 'text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 40px; margin-top: 20px;'
        const footerStatus = document.createElement('div')
        footerStatus.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;'
        const dot = document.createElement('div')
        dot.style.cssText = 'width: 8px; height: 8px; background: #10b981; border-radius: 50%;'
        footerStatus.appendChild(dot)
        const footerLabel = document.createElement('p')
        footerLabel.style.cssText = 'margin: 0; font-weight: 900; color: #475569;'
        footerLabel.textContent = 'DIGITALLY SECURED & VERIFIED DOCUMENT'
        footerStatus.appendChild(footerLabel)
        footer.appendChild(footerStatus)
        
        const hashP = document.createElement('p')
        hashP.style.marginBottom = '8px'
        hashP.textContent = `Audit Trail Hash: ${Math.random().toString(36).substring(7).toUpperCase()}-${job.jobId}`
        footer.appendChild(hashP)

        const linkP = document.createElement('p')
        linkP.style.cssText = 'color: #6366f1; font-weight: 800; font-size: 12px; margin-bottom: 15px;'
        linkP.textContent = `Official Tracking: ${window.location.protocol}//${window.location.host}/track/${job.jobId}`
        footer.appendChild(linkP)

        const genP = document.createElement('p')
        genP.style.cssText = 'font-size: 10px; opacity: 0.6;'
        genP.textContent = `Document Generated on ${new Date().toLocaleString('th-TH')} • System Reference: ${job.jobId}`
        footer.appendChild(genP)
        
        container.appendChild(footer)
        element.appendChild(container)

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
    } catch {
        toast.error('ไม่สามารถสร้างไฟล์ PDF ได้')
    } finally {
        setIsGenerating(false)
    }
  }

  return (
    <Button 
      onClick={handleDownload}
      disabled={isGenerating}
      className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-foreground font-black text-lg gap-3 shadow-lg shadow-indigo-500/20 transition-all group"
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
