"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Bot, User, Send, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type VizSpec =
  | { kind: "bar"; title: string; items: { label: string; value: number }[]; unit?: string }
  | { kind: "table"; title: string; columns: string[]; rows: (string | number)[][] }

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  viz?: VizSpec[]
}

type PendingAction = { name: string; args: Record<string, unknown>; summary: string }
const ACTION_SENTINEL = "@@ACTION@@"
const VIZ_SENTINEL = "@@VIZ@@"

// Split a streamed assistant chunk into display text + any deterministic
// visuals the server appended after the @@VIZ@@ marker.
function splitViz(acc: string): { text: string; viz?: VizSpec[] } {
  const i = acc.indexOf(VIZ_SENTINEL)
  if (i === -1) return { text: acc }
  const text = acc.slice(0, i)
  try {
    return { text, viz: JSON.parse(acc.slice(i + VIZ_SENTINEL.length)) as VizSpec[] }
  } catch {
    return { text } // JSON not fully streamed yet
  }
}

const SUGGESTIONS = [
  "วันนี้เป็นยังไงบ้าง",
  "กำไรเดือนนี้เท่าไหร่",
  "มีรถรอซ่อมกี่คัน",
  "สรุปภาพรวมให้หน่อย",
]

// Renders the deterministic charts/tables the assistant attached to an answer.
function VizBlock({ viz }: { viz: VizSpec[] }) {
  const fmt = (n: number) => n.toLocaleString()
  return (
    <div className="mt-2 space-y-3">
      {viz.map((v, i) => {
        if (v.kind === "bar") {
          const max = Math.max(1, ...v.items.map((it) => it.value))
          return (
            <div key={i} className="rounded-2xl border border-border bg-background/60 p-3">
              <p className="text-xs font-black text-primary mb-2">{v.title}</p>
              <div className="space-y-1.5">
                {v.items.map((it, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-[11px] font-bold text-muted-foreground" title={it.label}>{it.label}</span>
                    <div className="flex-1 h-4 rounded-md bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-md bg-primary/70" style={{ width: `${(it.value / max) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[11px] font-black tabular-nums">{v.unit === "฿" ? "฿" : ""}{fmt(it.value)}{v.unit && v.unit !== "฿" ? " " + v.unit : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return (
          <div key={i} className="rounded-2xl border border-border bg-background/60 p-3 overflow-x-auto">
            <p className="text-xs font-black text-primary mb-2">{v.title}</p>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-left text-muted-foreground">
                  {v.columns.map((c, j) => <th key={j} className="font-bold px-2 py-1 border-b border-border whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {v.rows.map((row, r) => (
                  <tr key={r} className="hover:bg-muted/30">
                    {row.map((cell, c) => <td key={c} className="px-2 py-1 border-b border-border/50 font-semibold whitespace-nowrap">{String(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
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
        let isAction = false
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          // A function-call turn arrives as a single "@@ACTION@@{json}" chunk —
          // don't render it as text; hold until done then show a confirm card.
          if (!isAction && acc.startsWith(ACTION_SENTINEL)) isAction = true
          if (isAction || acc.length < ACTION_SENTINEL.length) continue
          const { text, viz } = splitViz(acc)
          if (!started) {
            started = true
            setLoading(false)
            setMessages((prev) => [...prev, { role: "assistant", content: text, viz }])
          } else {
            setMessages((prev) => {
              const copy = [...prev]
              copy[copy.length - 1] = { role: "assistant", content: text, viz }
              return copy
            })
          }
        }
        if (isAction) {
          try {
            setPendingAction(JSON.parse(acc.slice(ACTION_SENTINEL.length)) as PendingAction)
          } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: "ไม่สามารถอ่านคำสั่งได้ กรุณาลองใหม่" }])
          }
        } else if (!started) {
          setMessages((prev) => [...prev, { role: "assistant", content: acc || "ระบบ AI ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง" }])
        }
      } else {
        // JSON fallback (SafeMode / errors / pendingAction)
        const data = await res.json().catch(() => ({}))
        if (data?.pendingAction) {
          setPendingAction(data.pendingAction as PendingAction)
        } else {
          const reply = data?.response || data?.error || "ระบบ AI ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง"
          setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }])
        }
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

  const confirmAction = async () => {
    if (!pendingAction || loading) return
    const action = pendingAction
    setPendingAction(null)
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "confirm", confirm: { name: action.name, args: action.args } }),
      })
      const data = await res.json().catch(() => ({}))
      setMessages((prev) => [...prev, { role: "assistant", content: String(data?.response || "ดำเนินการเสร็จสิ้น") }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" }])
    } finally {
      setLoading(false)
    }
  }

  const cancelAction = () => {
    setPendingAction(null)
    setMessages((prev) => [...prev, { role: "assistant", content: "ยกเลิกแล้วครับ ไม่ได้สร้างงาน" }])
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
              <div className={cn("max-w-[80%] min-w-0", m.role === "user" ? "" : "flex flex-col")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-medium whitespace-pre-wrap leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm border border-border"
                  )}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.viz && m.viz.length > 0 && <VizBlock viz={m.viz} />}
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

          {pendingAction && (
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border bg-primary/10 text-primary border-primary/30">
                <Sparkles size={18} />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-primary/30 bg-primary/5 px-4 py-3 space-y-3">
                <p className="text-sm font-black text-primary">ยืนยันการสร้างงานใหม่?</p>
                <pre className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground font-sans">{pendingAction.summary}</pre>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={confirmAction}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    ✅ ยืนยันสร้างงาน
                  </button>
                  <button
                    onClick={cancelAction}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-bold hover:bg-muted/60 active:scale-95 transition-all disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                </div>
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
