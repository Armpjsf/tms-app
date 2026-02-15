"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

type Props = {
  onSave: (blob: Blob | null) => void
}

export function SignaturePad({ onSave }: Props) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
    onSave(null) // Notify parent it's cleared
  }

  const save = async () => {
    if (sigCanvas.current) {
        if (sigCanvas.current.isEmpty()) {
            onSave(null)
            setIsEmpty(true)
        } else {
            // Use getCanvas() instead of trimmed for reliability
            // Convert to Base64 then Blob to ensure compatibility
            try {
                const dataURL = sigCanvas.current.getCanvas().toDataURL("image/png")
                const blob = await (await fetch(dataURL)).blob()
                onSave(blob)
                setIsEmpty(false)
            } catch (e) {
                console.error("Signature save error:", e)
            }
        }
    }
  }

  const handleEnd = () => {
      // Short timeout to ensure canvas updates
      setTimeout(() => save(), 100) 
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-slate-700 rounded-xl bg-slate-900 overflow-hidden touch-none relative">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="white"
          backgroundColor="transparent"
          canvasProps={{
            className: "w-full h-48 cursor-crosshair block",
          }}
          onBegin={() => setIsEmpty(false)}
          onEnd={handleEnd}
        />
        {isEmpty && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600">
              เซ็นชื่อที่นี่
           </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button 
            type="button" 
            variant="outline" 
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={clear}
        >
          <Eraser size={16} className="mr-2" /> ล้าง
        </Button>
      </div>
    </div>
  )
}
