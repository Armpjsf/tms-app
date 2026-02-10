"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
  bucket?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  disabled,
  bucket = 'images' // Default bucket
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      onChange(data.publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    onChange("")
  }

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleUpload}
        disabled={disabled || loading}
      />
      
      {value ? (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-700">
           <Image
            src={value}
            alt="Upload"
            fill
            className="object-cover"
          />
          <button
            onClick={handleRemove}
            type="button"
            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg hover:bg-red-600 transition"
            disabled={disabled}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-24 h-24 border-dashed border-2 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-slate-400 bg-transparent"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
        >
          {loading ? (
             <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
             <ImagePlus className="h-6 w-6" />
          )}
          <span className="text-xs">รูปภาพ</span>
        </Button>
      )}
    </div>
  )
}
