"use client"

import { useState, useRef } from "react"
import { Camera, X, Plus } from "lucide-react"

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

    // Helper to compress image
    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const MAX_WIDTH = 1000 // Resize to reasonable max width
                    const scale = MAX_WIDTH / img.width
                    
                    if (scale < 1) {
                        canvas.width = MAX_WIDTH
                        canvas.height = img.height * scale
                    } else {
                        canvas.width = img.width
                        canvas.height = img.height
                    }

                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(newFile)
                        } else {
                            resolve(file) // Fallback
                        }
                    }, 'image/jpeg', 0.7) // 70% quality JPEG
                }
            }
        })
    }

    // Process all files
    const compressedFiles = await Promise.all(toProcess.map(compressImage))

    const updatedFiles = [...files, ...compressedFiles]
    setFiles(updatedFiles)
    
    // Create previews from compressed files
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
