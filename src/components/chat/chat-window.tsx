"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Search, MessageSquare, Check, CheckCheck, Loader2, Image as ImageIcon, User, ShieldCheck, Activity, Target, CheckCircle2 } from "lucide-react"
import { ChatMessage } from '@/lib/actions/chat-actions'
import { uploadImageToDrive } from '@/lib/actions/upload-actions'
import Image from 'next/image'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/components/providers/language-provider"

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
  
  if (d.toDateString() === today.toDateString()) return 'วันนี้'
  if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
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
  const { t } = useLanguage()
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
    // Merge contacts (history) and initialDrivers (currently active)
    const contactMap = new Map<string, Contact>()
    
    // 1. Start with initial active drivers
    initialDrivers.forEach(d => {
      contactMap.set(d.Driver_ID, {
        driver_id: d.Driver_ID,
        driver_name: d.Driver_Name || `พนักงานขับรถ (${d.Driver_ID})`,
        last_message: 'เริ่มการสนทนา',
        unread: 0,
        updated_at: new Date().toISOString()
      })
    })

    // 2. Overlay with actual chat contacts (to get last message and unread counts)
    contacts.forEach(c => {
      contactMap.set(c.driver_id, c)
    })
    
    const all = Array.from(contactMap.values())
    
    if (!searchQuery.trim()) return all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    const q = searchQuery.toLowerCase()
    return all.filter((c: Contact) => 
      (c.driver_name || '').toLowerCase().includes(q) ||
      (c.driver_id || '').toLowerCase().includes(q)
    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [contacts, initialDrivers, searchQuery])

  const activeDriver = useMemo(() => {
    if (!selectedDriverId) return null
    const contact = contacts.find(c => c.driver_id === selectedDriverId)
    if (contact) return contact
    
    const initial = initialDrivers.find(d => d.Driver_ID === selectedDriverId)
    if (initial) return {
        driver_id: initial.Driver_ID,
        driver_name: initial.Driver_Name || `พนักงานขับรถ (${initial.Driver_ID})`,
        last_message: '',
        unread: 0,
        updated_at: new Date().toISOString()
    }

    // Fallback for cases where driver ID exists but not in current lists (e.g. from a notification)
    return {
        driver_id: selectedDriverId,
        driver_name: `พนักงานขับรถ (${selectedDriverId})`,
        last_message: '',
        unread: 0,
        updated_at: new Date().toISOString()
    }
  }, [selectedDriverId, contacts, initialDrivers])

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
            toast.error('อัปโหลดล้มเหลว')
        }
    } catch {
        toast.error('เกิดข้อผิดพลาดของระบบ')
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
            ? (newMsg.sender_id === 'admin' ? 'คุณ: 📷 ส่งรูปภาพ' : '📷 ส่งรูปภาพ')
            : (newMsg.sender_id === 'admin' ? `คุณ: ${newMsg.message}` : newMsg.message),
          unread: (newMsg.sender_id !== 'admin' && driverId !== selectedDriverId) ? (c.unread || 0) + 1 : c.unread,
          updated_at: newMsg.created_at
        } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      } else {
        return [{
          driver_id: driverId,
          driver_name: newMsg.driver_name || 'พนักงานขับรถ',
          last_message: newMsg.message.startsWith('[IMAGE] ') ? '📷 ส่งรูปภาพ' : newMsg.message,
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
         const driverName = contacts.find(c => c.driver_id === newMsg.sender_id)?.driver_name || 'พนักงานขับรถ'
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
    <div className="flex flex-col gap-8 h-full">
      {/* Communication Center Header */}
      <div className="bg-background p-10 rounded-br-[5rem] rounded-tl-[3rem] border border-border/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                  <div className="p-4 bg-blue-500/20 rounded-[2rem] border-2 border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)] text-blue-500 group-hover:scale-110 transition-all duration-500">
                      <MessageSquare size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                      <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3 uppercase leading-none mb-2">
                          {t('navigation.chat')}
                      </h1>
                      <p className="text-base font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-80">
                          ระบบแชทติดต่อสื่อสารกับพนักงานขับรถเรียลไทม์
                      </p>
                  </div>
              </div>
              <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{t('dashboard.live_status')}</span>
                  </div>
                  <div className="w-px h-6 bg-muted/80" />
                  <div className="flex items-center gap-3">
                      <ShieldCheck size={14} className="text-blue-500" />
                      <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{t('common.integrity')}</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 flex-1 min-h-0 border border-border/10 rounded-[2rem] overflow-hidden bg-background shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-primary/5 pointer-events-none" />
      
      {/* Contacts Sidebar */}
      <div className="lg:col-span-1 bg-muted/20 border-r border-border/10 flex flex-col relative z-20">
        <div className="p-6 border-b border-border/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">{t('drivers.subtitle')}</h3>
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-xs font-bold text-white shadow-lg">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายชื่อ..." 
              className="bg-background border-border/10 pl-11 h-12 rounded-xl text-base focus:ring-primary/20 transition-all shadow-sm" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm font-medium italic">ไม่พบรายชื่อผู้ติดต่อ</div>
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
                    "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 mb-2 relative group",
                    isSelected 
                      ? 'bg-primary/10 border-primary/20 shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-muted/50'
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-foreground font-bold text-lg border-2 transition-all duration-300",
                      isSelected ? 'bg-primary border-primary text-white' : 'bg-background border-border/10 text-muted-foreground'
                    )}>
                      {(name || '?').toString().charAt(0)}
                    </div>
                    {(c.unread || 0) > 0 && (
                       <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-background">
                          {c.unread}
                       </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={cn("font-bold text-base truncate", isSelected ? 'text-foreground' : 'text-muted-foreground')}>{name}</p>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0 ml-2">
                        {formatTime(c.updated_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate pr-2 opacity-70 font-medium">{(c.last_message || 'ไม่มีข้อความ')}</p>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 bg-background/50 flex flex-col relative z-20">
        <AnimatePresence mode="wait">
          {selectedDriverId && activeDriver ? (
            <motion.div 
              key={selectedDriverId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-border/10 bg-background/80 backdrop-blur-md flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {(activeDriver.driver_name || activeDriver.Driver_Name || '?').toString().charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-none mb-1">{activeDriver.driver_name || activeDriver.Driver_Name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/10 tracking-tight">ID: {selectedDriverId}</span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> เชื่อมต่อแล้ว
                        </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5">
                      <Target size={18} />
                   </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={32} className="text-muted-foreground/30" />
                    </div>
                    <p className="text-base font-bold text-muted-foreground">เริ่มการสนทนากับพนักงานขับรถ</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">ส่งข้อความเพื่อประสานงานหรือสอบถามสถานะ</p>
                  </div>
                ) : (
                  messageGroups.map((group, gi) => (
                    <div key={gi} className="space-y-6">
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-px bg-border/50 flex-1" />
                        <span className="px-3 py-1 rounded-full bg-background border border-border/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shadow-sm">
                          {formatDate(group.date)}
                        </span>
                        <div className="h-px bg-border/50 flex-1" />
                      </div>
                      
                      <div className="space-y-4">
                        {group.messages.map((msg, mi) => {
                          const isAdmin = msg.sender_id === 'admin'
                          return (
                            <motion.div 
                              key={msg.id} 
                              initial={{ opacity: 0, scale: 0.98, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className={cn(
                                "flex items-end gap-2",
                                isAdmin ? 'flex-row-reverse' : 'flex-row'
                              )}
                            >
                              {!isAdmin && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 border border-indigo-200">
                                    {(activeDriver.driver_name || activeDriver.Driver_Name || '?').charAt(0)}
                                </div>
                              )}
                              <div className={cn(
                                "max-w-[75%] space-y-1",
                                isAdmin ? 'items-end' : 'items-start'
                              )}>
                                <div className={cn(
                                  "rounded-2xl px-4 py-3 shadow-sm relative group/msg transition-all duration-200",
                                  isAdmin 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white border border-border/10 text-foreground rounded-bl-none shadow-md'
                                )}>
                                  {msg.message.startsWith('[IMAGE] ') ? (
                                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-xl overflow-hidden bg-black shadow-inner group cursor-pointer">
                                        <Image src={msg.message.replace('[IMAGE] ', '')} alt="Chat image" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                           <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">ขยายรูปภาพ</span>
                                        </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium leading-relaxed break-words">{msg.message}</p>
                                  )}
                                  
                                  <div className={cn(
                                    "flex items-center gap-1.5 mt-1.5 opacity-60",
                                    isAdmin ? 'justify-end text-white/80' : 'justify-start text-muted-foreground'
                                  )}>
                                    <span className="text-[9px] font-medium tracking-tight">
                                      {formatTime(msg.created_at)}
                                    </span>
                                    {isAdmin && (
                                      msg.is_read 
                                        ? <CheckCheck size={10} className="text-blue-200" />
                                        : <Check size={10} className="text-white/40" />
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
              <div className="p-6 border-t border-border/10 bg-background/80 backdrop-blur-md">
                <div className="flex gap-3 items-center bg-muted/30 border border-border/10 p-2 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/30">
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
                      className="text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0 h-10 w-10 p-0 rounded-xl transition-all"
                  >
                      {uploadingImage ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={20} />}
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
                    placeholder="พิมพ์ข้อความที่นี่..." 
                    className="bg-transparent border-none focus-visible:ring-0 h-10 text-foreground text-sm font-medium placeholder:text-muted-foreground/60" 
                    disabled={isSending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 text-white shadow-md h-10 w-10 p-0 shrink-0 rounded-xl transition-all active:scale-95"
                  >
                    <Send size={18} />
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
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-4 relative">
                 <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse" />
                 <MessageSquare size={48} className="text-primary/20 relative z-10" />
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-bold text-foreground">ยินดีต้อนรับสู่ระบบแชท</h3>
                <p className="text-muted-foreground text-base max-w-xs mx-auto">เลือกพนักงานขับรถจากรายการทางด้านซ้ายเพื่อเริ่มต้นการสนทนา</p>
              </div>
              <div className="pt-8 flex flex-wrap justify-center gap-3 relative z-10">
                 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/5 shadow-sm">
                    <User size={12} className="text-primary" /> มีคนขับ {filteredContacts.length} คนในรายการ
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/5 shadow-sm">
                    <CheckCircle2 size={12} className="text-emerald-500" /> ระบบเชื่อมต่อปลอดภัย
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  )
}

