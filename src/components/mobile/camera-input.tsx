"use client"

import { useState, useRef } from "react"
import { Camera, RefreshCw, Image as ImageIcon } from "lucide-react"

type Props = {
  onImageCapture: (file: File) => void
}

export function CameraInput({ onImageCapture }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      onImageCapture(file)
    }
  }

  const triggerCamera = () => {
    // Reset value to allow re-selecting the same file
    if (inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.click()
    }
  }

  return (
    <div className="space-y-3">
      {/* Visually hidden but accessible input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only" 
        ref={inputRef}
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-900">
          <img src={preview} alt="Captured" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={triggerCamera}
            className="absolute bottom-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerCamera}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors active:bg-slate-800"
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            <Camera size={24} />
          </div>
          <span className="text-sm font-medium">ถ่ายรูปสินค้า</span>
        </button>
      )}
    </div>
  )
}
