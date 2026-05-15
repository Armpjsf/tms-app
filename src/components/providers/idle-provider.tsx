"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Zap } from "lucide-react"

interface IdleContextType {
  isIdle: boolean
}

const IdleContext = createContext<IdleContextType>({ isIdle: false })

export const useIdle = () => useContext(IdleContext)

// 15 minutes of inactivity
const IDLE_TIMEOUT = 15 * 60 * 1000 

export function IdleProvider({ children }: { children: React.ReactNode }) {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (isIdle) setIsIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    
    timerRef.current = setTimeout(() => {
      setIsIdle(true)
    }, IDLE_TIMEOUT)
  }

  useEffect(() => {
    // Add event listeners for activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    
    const handleActivity = () => resetTimer()

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initial timer
    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isIdle])

  return (
    <IdleContext.Provider value={{ isIdle }}>
      {children}
      
      <AnimatePresence>
        {isIdle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="p-12 rounded-[3rem] bg-white/5 border border-white/10 shadow-2xl flex flex-col items-center gap-6 max-w-md text-center"
            >
              <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Moon size={48} className="text-amber-500 animate-pulse" />
              </div>
              
              <h2 className="text-3xl font-black text-white tracking-tight">
                System Sleep Mode
              </h2>
              
              <p className="text-white/60 leading-relaxed">
                ระบบเข้าสู่โหมดประหยัดพลังงานเพื่อลดการใช้งานโควตา Vercel 
                เนื่องจากไม่มีการเคลื่อนไหวมาระยะหนึ่ง
              </p>

              <button
                onClick={() => setIsIdle(false)}
                className="mt-6 h-14 px-10 rounded-2xl bg-primary text-white font-bold flex items-center gap-3 hover:scale-105 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <Zap size={20} className="fill-white" />
                Wake Up System
              </button>
              
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                Protecting your Vercel Quota
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </IdleContext.Provider>
  )
}
