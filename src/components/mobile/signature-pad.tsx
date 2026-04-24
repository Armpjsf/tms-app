"use client"

import React, { useRef, useState, useEffect, memo } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

type Props = {
  onSave: (blob: Blob | null) => void
}

export const SignaturePad = memo(({ onSave }: Props) => {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastSignatureRef = useRef<string | null>(null)

  // Handle resizing - Restore from saved data URL
  useEffect(() => {
    const handleResize = () => {
      if (lastSignatureRef.current && sigCanvas.current) {
        sigCanvas.current.fromDataURL(lastSignatureRef.current)
        setIsEmpty(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const clear = () => {
    sigCanvas.current?.clear()
    lastSignatureRef.current = null
    setIsEmpty(true)
    onSave(null)
  }

  const save = async () => {
    if (sigCanvas.current) {
        if (sigCanvas.current.isEmpty()) {
            if (!lastSignatureRef.current) {
                onSave(null)
                setIsEmpty(true)
            }
        } else {
            try {
                const dataURL = sigCanvas.current.getCanvas().toDataURL("image/png")
                lastSignatureRef.current = dataURL // Save for restore on resize
                const blob = await (await fetch(dataURL)).blob()
                onSave(blob)
                setIsEmpty(false)
            } catch {
                // Continue without logging
            }
        }
    }
  }

  const handleEnd = () => {
      setTimeout(() => save(), 50) 
  }

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="border-4 border-slate-700 rounded-3xl bg-white overflow-hidden touch-none relative min-h-[14rem] shadow-2xl ring-1 ring-white/10">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          backgroundColor="white"
          canvasProps={{
            className: "w-full h-56 cursor-crosshair block",
            style: { width: '100%', height: '224px' }
          }}
          onBegin={() => setIsEmpty(false)}
          onEnd={handleEnd}
        />
        {isEmpty && !lastSignatureRef.current && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 font-bold italic uppercase tracking-widest text-xs">
              กรุณาลงลายเซ็นที่นี่
           </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button 
            type="button" 
            variant="outline" 
            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-100"
            onClick={clear}
        >
          <Eraser size={16} className="mr-2" /> ล้าง
        </Button>
      </div>
    </div>
  )
}
