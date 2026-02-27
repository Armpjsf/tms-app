"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, User, Bot, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client" // Client side supabase for realtime
import { getChatHistory, sendChatMessage, ChatMessage } from "@/lib/actions/chat-actions"
import { getDriverSession } from "@/lib/actions/auth-actions"

export default function MobileChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [driverId, setDriverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 1. Init Session & Load History
  useEffect(() => {
    const init = async () => {
        const session = await getDriverSession()
        if (!session) {
            router.push('/mobile/login')
            return
        }
        setDriverId(session.driverId)
        
        const history = await getChatHistory(session.driverId)
        setMessages(history)
        setLoading(false)
    }
    init()
  }, [router])

  // 2. Realtime Subscription
  useEffect(() => {
    if (!driverId) return

    const channel = supabase
        .channel('chat_room')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'Chat_Messages',
                filter: `receiver_id=eq.${driverId}`
            },
            (payload) => {
                const newMsg = payload.new as ChatMessage
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.find(m => m.id === newMsg.id)) return prev
                    return [...prev, newMsg]
                })
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
  }, [driverId, supabase])

  // 3. Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async () => {
    if (!inputText.trim() || !driverId || sending) return

    const text = inputText
    setInputText("") // Optimistic clear
    setSending(true)

    // Optimistic UI Update
    const optimisticMsg: ChatMessage = {
        id: Date.now(),
        sender_id: driverId,
        receiver_id: 'admin',
        message: text,
        created_at: new Date().toISOString(),
        is_read: false
    }
    setMessages(prev => [...prev, optimisticMsg])
    
    // Server Action
    await sendChatMessage(driverId, text)

    // Optional: refresh to get official data/ids
    const history = await getChatHistory(driverId)
    setMessages(history)
    
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950">
      <MobileHeader title="แชทกับเจ้าหน้าที่" showBack />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-16 pb-20" ref={scrollRef}>
        {loading ? (
            <div className="flex justify-center pt-10">
                <Loader2 className="animate-spin text-slate-500" />
            </div>
        ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
                <p>ยังไม่มีข้อความ</p>
                <p className="text-xs">พิมพ์ข้อความเพื่อเริ่มการสนทนา</p>
            </div>
        ) : (
                    messages.map((msg) => {
                const isMe = msg.sender_id === driverId
                return (
                    <div 
                        key={msg.id} 
                        className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-indigo-600" : "bg-slate-700"}`}>
                            {isMe ? <User size={16} className="text-white" /> : <Bot size={16} className="text-blue-400" />}
                        </div>
                        
                        <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                            isMe 
                                ? "bg-indigo-600 text-white rounded-tr-none" 
                                : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                        }`}>
                            <p>{msg.message}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMe ? "text-indigo-200" : "text-slate-500"}`}>
                                {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                )
            })
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="flex gap-2">
            <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="พิมพ์ข้อความ..."
                className="bg-slate-950 border-slate-700 text-white focus-visible:ring-indigo-500"
                disabled={sending}
            />
            <Button 
                onClick={handleSend}
                size="icon" 
                className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                disabled={sending || !inputText.trim()}
            >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </Button>
        </div>
      </div>
    </div>
  )
}
