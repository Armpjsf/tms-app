"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

type Props = {
  onSave: (blob: Blob) => void
}

export function SignaturePad({ onSave }: Props) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
  }

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      sigCanvas.current.getTrimmedCanvas().toBlob((blob) => {
        if (blob) onSave(blob);
      });
    }
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
