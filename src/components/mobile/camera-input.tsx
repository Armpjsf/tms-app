"use client"

import { useState, useRef } from "react"
import { Camera, X, Plus } from "lucide-react"
import { compressImage } from "@/lib/utils/image-compression"

type Props = {
  onImagesChange: (files: File[]) => void
  maxImages?: number
}

export function CameraInput({ onImagesChange, maxImages = 5 }: Props) {
  const [previews, setPreviews] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || [])
    if (rawFiles.length === 0) return

    // Limit selection
    const allowedCount = maxImages - files.length
    const toProcess = rawFiles.slice(0, allowedCount)

    // Process all files using centralized compression utility
    const compressedFiles = await Promise.all(toProcess.map(async (file) => {
        try {
            const blob = await compressImage(file, 1280, 1280, 0.7)
            return new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            })
        } catch (err) {
            console.error("Compression failed for file:", file.name, err)
            return file // Fallback to original
        }
    }))

    const updatedFiles = [...files, ...compressedFiles]
    setFiles(updatedFiles)
    
    // Create previews from new files
    const newPreviews = compressedFiles.map(file => URL.createObjectURL(file))
    setPreviews(prev => [...prev, ...newPreviews])
    
    onImagesChange(updatedFiles)
  }

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    
    setFiles(newFiles)
    setPreviews(newPreviews)
    onImagesChange(newFiles)
  }

  const triggerCamera = () => {
    if (files.length >= maxImages) return
    if (inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.click()
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        capture="environment" // Prefer rear camera
        multiple
        className="hidden" 
        ref={inputRef}
        onChange={handleFileChange}
      />

      {/* Image Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
            {previews.map((src, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-900 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Captured ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full backdrop-blur-md active:scale-95 transition-transform"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            
            {/* Add More Button */}
            {previews.length < maxImages && (
                <button
                    type="button"
                    onClick={triggerCamera}
                    className="aspect-video rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors active:bg-slate-800"
                >
                    <Plus size={24} />
                    <span className="text-xs">เพิ่มรูป</span>
                </button>
            )}
        </div>
      )}

      {/* Initial Empty State */}
      {previews.length === 0 && (
        <button
          type="button"
          onClick={triggerCamera}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors active:bg-slate-800"
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
            <Camera size={24} />
          </div>
          <span className="text-sm font-medium">ถ่ายรูปสินค้า ({files.length}/{maxImages})</span>
        </button>
      )}
    </div>
  )
}
