"use client"

import { useCallback, useRef } from "react"

type NotificationType = "chat" | "new_job" | "sos" | "marketplace" | "status_update" | "general"

/**
 * Hook: Play in-app notification sound + vibration.
 * Used when the app is in foreground and OS push sound won't trigger.
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((type: NotificationType = "general") => {
    // ── Vibration patterns (mobile) ──
    const vibratePatterns: Record<NotificationType, number[]> = {
      sos:           [0, 500, 100, 500, 100, 800],
      chat:          [0, 200, 100, 200],
      new_job:       [0, 300, 100, 300, 100, 400],
      status_update: [0, 150, 100, 150],
      marketplace:   [0, 250, 100, 250],
      general:       [0, 200, 100, 300],
    }

    // ── Trigger vibration (works on Android, silently fails on iOS/Desktop) ──
    if ("vibrate" in navigator) {
      navigator.vibrate(vibratePatterns[type] || vibratePatterns.general)
    }

    // ── Play notification sound ──
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/notification.mp3")
        audioRef.current.volume = 0.8
      }
      // Reset and play
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Autoplay blocked — user hasn't interacted yet, silently ignore
      })
    } catch {
      // Audio not available
    }
  }, [])

  return { playNotification: play }
}
