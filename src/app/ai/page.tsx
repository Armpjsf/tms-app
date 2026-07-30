"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Bot, User, Send, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "วันนี้เป็นยังไงบ้าง",
  "กำไรเดือนนี้เท่าไหร่",
  "มีรถรอซ่อมกี่คัน",
  "สรุปภาพรวมให้หน่อย",
]

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || loading) return

    const history = messages
      .filter((m) => m.content)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { role: "user", content: message }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, stream: true }),
      })

      const contentType = res.headers.get("Content-Type") || ""

      // Streamed text/plain response (successful Gemini call)
      if (res.body && contentType.includes("text/plain")) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""
        let started = false
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          if (!started) {
            started = true
            setLoading(false)
            setMessages((prev) => [...prev, { role: "assistant", content: acc }])
          } else {
            setMessages((prev) => {
              const copy = [...prev]
              copy[copy.length - 1] = { role: "assistant", content: acc }
              return copy
            })
          }
        }
        if (!started) {
          setMessages((prev) => [...prev, { role: "assistant", content: "ระบบ AI ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง" }])
        }
      } else {
        // JSON fallback (SafeMode / errors)
        const data = await res.json().catch(() => ({}))
        const reply = data?.response || data?.error || "ระบบ AI ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง"
        setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "เชื่อมต่อระบบ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full gap-4 p-2 sm:p-4">
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary">
            <Bot size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              ผู้ช่วย AI <Sparkles size={16} className="text-primary" />
            </h1>
            <p className="text-xs font-bold text-muted-foreground">
              ถามข้อมูลงาน การเงิน รถ คนขับ ได้อย่างเป็นธรรมชาติ
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto rounded-3xl border border-border bg-background/40 p-4 space-y-4 custom-scrollbar"
        >
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-90">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Bot size={40} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-lg">สวัสดีครับ ผมคือผู้ช่วย AI ของระบบ</p>
                <p className="text-sm text-muted-foreground font-bold">ลองเลือกคำถามด้านล่าง หรือพิมพ์คำถามของคุณได้เลย</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-4 py-2 rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-sm font-bold transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div
                className={cn(
                  "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border",
                  m.role === "user"
                    ? "bg-primary text-white border-primary"
                    : "bg-muted text-primary border-border"
                )}
              >
                {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-muted/60 text-foreground rounded-tl-sm border border-border"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border bg-muted text-primary border-border">
                <Bot size={18} />
              </div>
              <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground font-bold">
                <Loader2 size={16} className="animate-spin" /> กำลังคิด...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="shrink-0 flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์คำถาม เช่น วันนี้มีงานกี่รายการ..."
            disabled={loading}
            className="flex-1 bg-transparent px-4 py-2 text-sm font-medium outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-primary text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
            aria-label="ส่งข้อความ"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
