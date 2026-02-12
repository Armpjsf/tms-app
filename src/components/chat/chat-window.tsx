'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Phone, MoreVertical, MessageSquare } from "lucide-react"
import { ChatMessage } from '@/lib/supabase/chat'

interface ChatWindowProps {
  initialContacts: any[] // Should be typed properly, using any for quick iteration
  initialDrivers: any[]
}

export function ChatWindow({ initialContacts, initialDrivers }: ChatWindowProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [contacts, setContacts] = useState(initialContacts)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // Find active driver details
  const activeDriver = selectedDriverId 
    ? (contacts.find(c => c.driver_id === selectedDriverId) || initialDrivers.find(d => d.Driver_ID === selectedDriverId))
    : null

  // Helper functions defined before useEffect to avoid "use before declare"
  const fetchMessages = async (driverId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      setMessages(data)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedDriverId) return

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        driver_id: selectedDriverId,
        sender: 'admin',
        message: inputMessage,
        read: false,
        created_at: new Date().toISOString(),
        driver_name: activeDriver?.driver_name || activeDriver?.Driver_Name || 'Unknown' 
      })

    if (!error) {
      setInputMessage('')
    }
  }

  const markMessageAsRead = async (msgId: number) => {
    await supabase.from('chat_messages').update({ read: true }).eq('id', msgId)
  }

  const updateContactList = (newMsg: ChatMessage) => {
    setContacts(prev => {
      const existing = prev.find(c => c.driver_id === newMsg.driver_id)
      if (existing) {
        return prev.map(c => c.driver_id === newMsg.driver_id ? {
          ...c,
          last_message: newMsg.message,
          unread: (newMsg.sender === 'driver' && newMsg.driver_id !== selectedDriverId) ? c.unread + 1 : c.unread,
          updated_at: newMsg.created_at
        } : c).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      } else {
        // New contact from driver list (or unknown)
         return [{
           driver_id: newMsg.driver_id,
           driver_name: newMsg.driver_name,
           last_message: newMsg.message,
           unread: 1,
           updated_at: newMsg.created_at
         }, ...prev]
      }
    })
  }

  // 1. Subscribe to new messages (Global or Per Driver)
  useEffect(() => {
    const channel = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          
          // If viewing this driver, append message
          if (newMsg.driver_id === selectedDriverId) {
            setMessages(prev => [...prev, newMsg])
            // Mark as read immediately if it's from driver
            if (newMsg.sender === 'driver') {
              markMessageAsRead(newMsg.id)
            }
          }
          
          // Update contact list (last message & unread)
          updateContactList(newMsg)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId]) 

  // 2. Fetch messages when driver selected
  useEffect(() => {
    if (selectedDriverId) {
      fetchMessages(selectedDriverId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
      {/* Contacts List */}
      <div className="lg:col-span-1 border border-white/10 rounded-xl bg-slate-900/50 overflow-hidden flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-white/10">
            <Input placeholder="ค้นหาคนขับ..." className="bg-slate-800 border-none" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 && initialDrivers.length > 0 ? (
                 // Show all drivers if no history
                 initialDrivers.map(d => (
                    <div 
                        key={d.Driver_ID}
                        onClick={() => setSelectedDriverId(d.Driver_ID)}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 ${selectedDriverId === d.Driver_ID ? 'bg-blue-900/20' : ''}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white">{d.Driver_Name?.charAt(0)}</div>
                        <div>
                            <p className="text-white font-medium">{d.Driver_Name}</p>
                            <p className="text-xs text-slate-500">เริ่มแชทเลย</p>
                        </div>
                    </div>
                 ))
            ) : (
                contacts.map(c => (
                    <div 
                        key={c.driver_id}
                        onClick={() => setSelectedDriverId(c.driver_id)}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 ${selectedDriverId === c.driver_id ? 'bg-blue-900/20' : ''}`}
                    >
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {c.driver_name?.charAt(0)}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <p className="text-white font-medium truncate">{c.driver_name}</p>
                                {c.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">{c.unread}</span>}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
                         </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-2 border border-white/10 rounded-xl bg-slate-900/50 overflow-hidden flex flex-col">
         {selectedDriverId ? (
             <>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {activeDriver?.driver_name?.charAt(0) || activeDriver?.Driver_Name?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-white font-bold">{activeDriver?.driver_name || activeDriver?.Driver_Name}</h3>
                            <p className="text-xs text-emerald-400 flex items-center gap-1">● ออนไลน์</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost"><Phone size={18} /></Button>
                        <Button size="icon" variant="ghost"><MoreVertical size={18} /></Button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl p-3 px-4 ${
                                msg.sender === 'admin' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-slate-700 text-white rounded-bl-none'
                            }`}>
                                <p>{msg.message}</p>
                                <p className="text-[10px] opacity-70 mt-1 text-right">
                                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 bg-slate-800/30">
                    <div className="flex gap-2">
                        <Input 
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="พิมพ์ข้อความ..." 
                            className="bg-slate-900 border-slate-700" 
                        />
                        <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-500">
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
             </>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                 <MessageSquare size={48} className="mb-4 opacity-50" />
                 <p>เลือกคนขับเพื่อเริ่มสนทนา</p>
             </div>
         )}
      </div>
    </div>
  )
}
