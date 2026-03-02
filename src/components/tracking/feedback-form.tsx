'use client'

import { useState } from 'react'
import { Star, Send, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitJobFeedback } from '@/lib/actions/tracking-actions'
import { toast } from 'sonner'

interface FeedbackFormProps {
  jobId: string
}

export function FeedbackForm({ jobId }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('กรุณาเลือกคะแนนความพึงพอใจ')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitJobFeedback(jobId, rating, comment)
      if (result.success) {
        setIsSubmitted(true)
        toast.success('ขอบคุณสำหรับคำแนะนำครับ!')
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center space-y-4"
      >
        <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <CheckCircle2 size={32} />
        </div>
        <div>
            <h3 className="text-xl font-bold text-white">ส่งคำแนะนำเรียบร้อย</h3>
            <p className="text-emerald-400 text-sm">ขอบคุณที่เลือกใช้บริการของเราครับ</p>
        </div>
      </motion.div>
    )
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-2 text-white font-bold border-l-4 border-amber-500 pl-3">
        <Star size={18} className="text-amber-400" />
        <span>ความพึงพอใจในการบริการ</span>
      </div>

      <div className="space-y-8">
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="relative p-1"
            >
              <Star 
                size={36} 
                className={`transition-all duration-300 ${
                  (hover || rating) >= star 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                  : 'text-slate-700'
                }`}
              />
              {rating === star && (
                <motion.div 
                    layoutId="activeStar"
                    className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        <div className="space-y-4">
          <Textarea 
            placeholder="เขียนคำแนะนำเพิ่มเติม (ไม่บังคับ)..."
            className="bg-slate-950 border-slate-800 rounded-2xl resize-none focus:ring-amber-500 min-h-[100px] text-white"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:text-slate-900 font-black text-lg gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:grayscale transition-all"
          >
            {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
            ) : (
                <>
                    <Send size={20} />
                    <span>ส่งฟีดแบ็ค</span>
                </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
