"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Search, MessageSquare, Check, CheckCheck, Loader2, Image as ImageIcon, User, ShieldCheck, Activity, Target } from "lucide-react"
import { ChatMessage } from '@/lib/actions/chat-actions'
import { uploadImageToDrive } from '@/lib/actions/upload-actions'
import Image from 'next/image'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Contact {
  driver_id: string
  driver_name: string
  last_message: string
  unread: number
  updated_at: string
}

interface ChatWindowProps {
  initialContacts: Contact[]
  initialDrivers: { Driver_ID: string; Driver_Name?: string }[]
  forcedDriverId?: string | null
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === today.toDateString()) return 'TODAY'
  if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const date = new Date(msg.created_at).toDateString()
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date: msg.created_at, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

export function ChatWindow({ initialContacts, initialDrivers, forcedDriverId }: ChatWindowProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
    setContacts(initialContacts)
  }, [initialContacts])

  useEffect(() => {
    if (forcedDriverId) {
      setSelectedDriverId(forcedDriverId)
    }
  }, [forcedDriverId])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, 50)
  }, [])

  const filteredContacts = useMemo(() => {
    const all = contacts.length > 0 ? contacts : initialDrivers.map(d => ({
      driver_id: d.Driver_ID,
      driver_name: d.Driver_Name || 'Unknown',
      last_message: 'INITIATE_CONTACT',
      unread: 0,
      updated_at: new Date().toISOString()
    }))
    
    if (!searchQuery.trim()) return all
    const q = searchQuery.toLowerCase()
    return all.filter((c: Contact) => 
      c.driver_name.toLowerCase().includes(q) ||
      c.driver_id.toLowerCase().includes(q)
    )
  }, [contacts, initialDrivers, searchQuery])

  const activeDriver = selectedDriverId 
    ? (contacts.find(c => c.driver_id === selectedDriverId) || initialDrivers.find(d => d.Driver_ID === selectedDriverId))
    : null

  const fetchMessages = useCallback(async (driverId: string) => {
    const { getChatHistory } = await import('@/lib/actions/chat-actions')
    const history = await getChatHistory(driverId)
    if (history) {
      setMessages(history)
      scrollToBottom('instant')
    }
  }, [scrollToBottom])

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedDriverId || isSending) return
    const messageText = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      sender_id: 'admin',
      receiver_id: selectedDriverId,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
    }
    setMessages(prev => [...prev, optimisticMsg])
    scrollToBottom()

    const { sendChatMessage } = await import('@/lib/actions/chat-actions')
    const result = await sendChatMessage('admin', messageText, selectedDriverId)
    if (!result.success) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setInputMessage(messageText)
    }
    setIsSending(false)
  }, [inputMessage, selectedDriverId, isSending, scrollToBottom])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDriverId) return
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'Chat_Images')
    try {
        const uploadResult = await uploadImageToDrive(formData)
        if (uploadResult.success && uploadResult.directLink) {
            const imageUrlMessage = `[IMAGE] ${uploadResult.directLink}`
            const { sendChatMessage } = await import('@/lib/actions/chat-actions')
            await sendChatMessage('admin', imageUrlMessage, selectedDriverId)
        } else {
            toast.error('UPLOAD_FAILURE')
        }
    } catch {
        toast.error('SYSTEM_ERROR')
    } finally {
        setUploadingImage(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [selectedDriverId])

  const markAllAsRead = useCallback(async (driverId: string) => {
    const { markAsReadAction } = await import('@/lib/actions/chat-actions')
    await markAsReadAction(driverId)
    setContacts(prev => prev.map(c => 
      c.driver_id === driverId ? { ...c, unread: 0 } : c
    ))
  }, [])

  const updateContactList = useCallback((newMsg: ChatMessage) => {
    setContacts(prev => {
      const driverId = newMsg.sender_id === 'admin' ? newMsg.receiver_id : newMsg.sender_id
      const existing = prev.find(c => c.driver_id === driverId)
      if (existing) {
        return prev.map(c => c.driver_id === driverId ? {
          ...c,
          last_message: newMsg.message.startsWith('[IMAGE] ') 
            ? (newMsg.sender_id === 'admin' ? 'SYSTEM: 📷 ARTIFACT_SENT' : '📷 ARTIFACT_RECEIVED')
            : (newMsg.sender_id === 'admin' ? `SYSTEM: ${newMsg.message}` : newMsg.message),
          unread: (newMsg.sender_id !== 'admin' && driverId !== selectedDriverId) ? (c.unread || 0) + 1 : c.unread,
          updated_at: newMsg.created_at
        } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      } else {
        return [{
          driver_id: driverId,
          driver_name: newMsg.driver_name || 'Driver',
          last_message: newMsg.message.startsWith('[IMAGE] ') ? '📷 ARTIFACT_RECEIVED' : newMsg.message,
          unread: newMsg.sender_id !== 'admin' ? 1 : 0,
          updated_at: newMsg.created_at
        }, ...prev]
      }
    })
  }, [selectedDriverId])

  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Chat_Messages' }, (p) => handleRealtimeInsert(p))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (p) => handleRealtimeInsert(p))
      .subscribe()

    const handleRealtimeInsert = (payload: any) => {
      const raw = payload.new
      const newMsg: ChatMessage = {
        id: raw.id || raw.Id,
        sender_id: raw.sender_id || raw.Sender_ID,
        receiver_id: raw.receiver_id || raw.Receiver_ID,
        message: raw.message || raw.Message,
        is_read: raw.is_read || raw.Is_Read,
        created_at: raw.created_at || raw.Created_At
      }
      const relevantDriverId = newMsg.sender_id === 'admin' ? newMsg.receiver_id : newMsg.sender_id
      if (relevantDriverId === selectedDriverId) {
        setMessages(prev => {
          const isDuplicate = prev.some(m => m.sender_id === newMsg.sender_id && m.message === newMsg.message && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
          return isDuplicate ? prev.map(m => (m.sender_id === newMsg.sender_id && m.message === newMsg.message && m.id !== newMsg.id) ? newMsg : m) : [...prev, newMsg]
        })
        scrollToBottom()
        if (newMsg.sender_id !== 'admin') {
          import('@/lib/actions/chat-actions').then(({ markAsReadAction }) => markAsReadAction(relevantDriverId))
          try { new Audio('/sounds/notification.mp3').play().catch(() => {}) } catch {}
        }
      } else if (newMsg.sender_id !== 'admin') {
         // Show visual notification when message is from a driver and not the selected one
         const driverName = contacts.find(c => c.driver_id === newMsg.sender_id)?.driver_name || 'Driver'
         toast.info(`ข้อความใหม่จาก ${driverName}`, {
             description: newMsg.message.startsWith('[IMAGE]') ? '📷 ส่งรูปภาพ' : newMsg.message,
             action: {
                 label: 'เปิดแชท',
                 onClick: () => setSelectedDriverId(newMsg.sender_id)
             }
         })
         try { new Audio('/sounds/notification.mp3').play().catch(() => {}) } catch {}
      }
      updateContactList(newMsg)
    }
    return () => { supabase.removeChannel(channel) }
  }, [selectedDriverId, scrollToBottom, updateContactList])

  useEffect(() => {
    if (selectedDriverId) {
      fetchMessages(selectedDriverId)
      markAllAsRead(selectedDriverId)
    }
  }, [selectedDriverId, fetchMessages, markAllAsRead])

  useEffect(() => {
    if (!selectedDriverId) return
    const poll = setInterval(() => { fetchMessages(selectedDriverId) }, 8000)
    return () => clearInterval(poll)
  }, [selectedDriverId, fetchMessages])

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])
  const totalUnread = useMemo(() => contacts.reduce((s, c) => s + (c.unread || 0), 0), [contacts])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-[calc(100vh-280px)] min-h-[550px] border border-border/5 rounded-[3rem] overflow-hidden bg-background shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
      
      {/* Contacts Sidebar */}
      <div className="lg:col-span-1 bg-black/40 border-r border-border/5 flex flex-col relative z-20">
        <div className="p-8 border-b border-border/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] italic leading-none">Fleet Nodes</h3>
            {totalUnread > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary text-base font-bold text-foreground font-black italic shadow-[0_0_15px_rgba(255,30,133,0.4)]">
                {totalUnread} SIGNAL
              </span>
            )}
          </div>
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="LINK_PROTOCOL Search..." 
              className="bg-black/60 border-2 border-border/5 pl-12 h-14 rounded-2xl text-lg font-bold font-black text-foreground placeholder:text-muted-foreground focus:border-primary/40 transition-all font-mono" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground font-black uppercase tracking-widest text-lg font-bold italic">Sector Void</div>
          ) : (
            filteredContacts.map((c: Contact) => {
              const id = c.driver_id
              const name = c.driver_name
              const isSelected = selectedDriverId === id
              return (
                <motion.div 
                  key={id}
                  layout
                  onClick={() => setSelectedDriverId(id)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-[2rem] cursor-pointer transition-all border-2 mb-2 relative group",
                    isSelected 
                      ? 'bg-primary/10 border-primary/30 shadow-[0_15px_30px_rgba(255,30,133,0.1)]' 
                      : 'bg-transparent border-transparent hover:bg-muted/50'
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-foreground font-black text-xl border-2 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                      isSelected ? 'bg-primary border-primary shadow-[0_0_20px_rgba(255,30,133,0.3)]' : 'bg-background border-border/10 text-muted-foreground'
                    )}>
                      {name.charAt(0)}
                    </div>
                    {(c.unread || 0) > 0 && (
                       <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-base font-bold text-foreground flex items-center justify-center rounded-full font-black animate-bounce border-2 border-background">
                          {c.unread}
                       </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className={cn("font-black text-lg font-bold tracking-widest uppercase truncate italic", isSelected ? 'text-foreground' : 'text-muted-foreground')}>{name}</p>
                      <span className="text-base font-bold text-muted-foreground font-black shrink-0 ml-2 italic">
                        {formatTime(c.updated_at)}
                      </span>
                    </div>
                    <p className="text-base font-bold text-muted-foreground font-black truncate pr-2 uppercase tracking-tighter opacity-60">{(c.last_message || 'NOMINAL').toUpperCase()}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <ShieldCheck size={14} className="text-primary/50" />
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 bg-black/60 flex flex-col relative z-20">
        <AnimatePresence mode="wait">
          {selectedDriverId && activeDriver ? (
            <motion.div 
              key={selectedDriverId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-8 border-b border-border/5 bg-black/40 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-foreground font-black text-lg shadow-[0_0_20px_rgba(255,30,133,0.2)] border-2 border-border/10">
                      {(activeDriver.driver_name || activeDriver.Driver_Name || '?').charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-background shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground italic tracking-[0.2em] uppercase leading-none mb-2">{activeDriver.driver_name || activeDriver.Driver_Name}</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-base font-bold font-black text-primary uppercase tracking-[0.3em] font-mono bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">TARGET_ID: {selectedDriverId}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-800" />
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic flex items-center gap-1.5">
                           <Activity size={10} className="text-emerald-500" /> ENCRYPTED_LINK_ESTABLISHED
                        </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="p-3 bg-muted/50 rounded-xl border border-border/10 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer transition-all">
                      <Target size={20} />
                   </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center py-20">
                    <MessageSquare size={48} className="mx-auto mb-4 text-foreground/[0.03] animate-pulse" />
                    <p className="text-lg font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic mb-1">Establish Protocol with Operator</p>
                    <p className="text-base font-bold text-muted-foreground font-mono">INIT_SESSION_WAITING_FOR_DATA_PACKETS</p>
                  </div>
                ) : (
                  messageGroups.map((group, gi) => (
                    <div key={gi} className="space-y-6">
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-px bg-muted/50 flex-1" />
                        <span className="px-4 py-1.5 rounded-full bg-muted/50 border border-border/10 text-base font-bold text-muted-foreground font-black italic tracking-widest">
                          {formatDate(group.date)}
                        </span>
                        <div className="h-px bg-muted/50 flex-1" />
                      </div>
                      
                      <div className="space-y-4">
                        {group.messages.map((msg, mi) => {
                          const isAdmin = msg.sender_id === 'admin'
                          return (
                            <motion.div 
                              key={msg.id} 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className={cn(
                                "flex items-end gap-3",
                                isAdmin ? 'flex-row-reverse' : 'flex-row'
                              )}
                            >
                              <div className={cn(
                                "max-w-[70%] space-y-2",
                                isAdmin ? 'items-end' : 'items-start'
                              )}>
                                <div className={cn(
                                  "rounded-[2rem] p-6 shadow-2xl relative group/msg transition-all duration-300",
                                  isAdmin 
                                    ? 'bg-primary border-2 border-primary/20 text-foreground rounded-br-sm' 
                                    : 'bg-background border-2 border-border/5 text-muted-foreground rounded-bl-sm'
                                )}>
                                  {msg.message.startsWith('[IMAGE] ') ? (
                                    <div className="relative w-48 h-48 sm:w-80 sm:h-80 rounded-[1.5rem] overflow-hidden border-2 border-border/10 bg-black shadow-2xl group cursor-pointer">
                                        <Image src={msg.message.replace('[IMAGE] ', '')} alt="Chat image" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                           <span className="text-base font-bold font-black text-foreground italic tracking-widest border border-border/20 p-2 rounded-lg">PROTO_EXPAND</span>
                                        </div>
                                    </div>
                                  ) : (
                                    <p className="text-xl font-black italic tracking-tight uppercase leading-relaxed break-words">{msg.message}</p>
                                  )}
                                  
                                  <div className={cn(
                                    "flex items-center gap-2 mt-3 opacity-0 group-hover/msg:opacity-100 transition-opacity",
                                    isAdmin ? 'justify-end' : 'justify-start'
                                  )}>
                                    <span className="text-base font-bold font-black italic tracking-widest text-foreground/40">
                                      {formatTime(msg.created_at)}
                                    </span>
                                    {isAdmin && (
                                      msg.is_read 
                                        ? <CheckCheck size={12} className="text-cyan-400" />
                                        : <Check size={12} className="text-foreground/30" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Container */}
              <div className="p-8 border-t border-border/5 bg-black/40 backdrop-blur-2xl">
                <div className="flex gap-4 items-center bg-background border-2 border-border/5 p-3 rounded-[2.5rem] shadow-3xl group-focus-within:border-primary/40 transition-all">
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                  />
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending || uploadingImage}
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 h-14 w-14 p-0 rounded-2xl transition-all"
                  >
                      {uploadingImage ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={24} />}
                  </Button>
                  <Input 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Link Data Packet to Operator..." 
                    className="bg-transparent border-none focus-visible:ring-0 h-14 text-foreground text-lg font-bold font-black italic tracking-widest uppercase placeholder:text-muted-foreground" 
                    disabled={isSending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-foreground shadow-[0_5px_15px_rgba(255,30,133,0.3)] h-14 w-14 p-0 shrink-0 rounded-2xl group/send"
                  >
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6"
            >
              <div className="relative">
                 <div className="w-24 h-24 rounded-[2rem] bg-muted/50 border-2 border-border/5 flex items-center justify-center mb-6 relative z-10">
                    <MessageSquare size={40} className="text-foreground/10" />
                 </div>
                 <div className="absolute inset-x-0 -bottom-10 h-20 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-foreground italic tracking-[0.4em] uppercase">Communication Offline</p>
                <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em] font-mono italic">Select active Fleet Node to synchronize data stream</p>
              </div>
              <div className="pt-10 flex items-center gap-4">
                 <div className="flex items-center gap-2 text-base font-bold font-black text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-full border border-border/5">
                    <User size={12} /> {filteredContacts.length} OPERATORS_AVAIL
                 </div>
                 <div className="flex items-center gap-2 text-base font-bold font-black text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-full border border-border/5">
                    <Activity size={12} /> SECURE_ID_MAPPING
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

