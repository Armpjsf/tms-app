"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
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

  const resetTimer = useCallback(() => {
    setIsIdle(prev => {
      if (prev) return false
      return prev
    })
    if (timerRef.current) clearTimeout(timerRef.current)
    
    timerRef.current = setTimeout(() => {
      setIsIdle(true)
    }, IDLE_TIMEOUT)
  }, [])

  useEffect(() => {
    // Add event listeners for activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]

    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    // Initial timer
    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  return (
    <IdleContext.Provider value={{ isIdle }}>
      {children}
    </IdleContext.Provider>
  )
}
