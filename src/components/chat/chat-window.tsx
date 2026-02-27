'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Search, MessageSquare, Check, CheckCheck } from "lucide-react"
import { ChatMessage } from '@/lib/supabase/chat'

interface ChatWindowProps {
  initialContacts: any[]
  initialDrivers: any[]
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

export function ChatWindow({ initialContacts, initialDrivers }: ChatWindowProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [contacts, setContacts] = useState(initialContacts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // Sync contacts with props when branch changes (server refresh)
  useEffect(() => {
    setContacts(initialContacts)
  }, [initialContacts])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, 50)
  }, [])

  // Filtered contacts with search
  const filteredContacts = useMemo(() => {
    const all = contacts.length > 0 ? contacts : initialDrivers.map(d => ({
      driver_id: d.Driver_ID,
      driver_name: d.Driver_Name || 'Unknown',
      last_message: 'เริ่มแชทเลย',
      unread: 0,
      updated_at: new Date().toISOString()
    }))
    
    if (!searchQuery.trim()) return all
    const q = searchQuery.toLowerCase()
    return all.filter((c: any) => 
      (c.driver_name || c.Driver_Name || '').toLowerCase().includes(q) ||
      (c.driver_id || c.Driver_ID || '').toLowerCase().includes(q)
    )
  }, [contacts, initialDrivers, searchQuery])

  // Active driver info
  const activeDriver = selectedDriverId 
    ? (contacts.find(c => c.driver_id === selectedDriverId) || initialDrivers.find(d => d.Driver_ID === selectedDriverId))
    : null

  // Fetch messages
  const fetchMessages = useCallback(async (driverId: string) => {
    const { data, error } = await supabase
      .from('Chat_Messages')
      .select('*')
      .or(`sender_id.eq.${driverId},receiver_id.eq.${driverId}`)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      setMessages(data)
      scrollToBottom('instant')
    }
  }, [supabase, scrollToBottom])

  // Send message  
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedDriverId || isSending) return
    
    const messageText = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    // Optimistic update
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

    const { error } = await supabase
      .from('Chat_Messages')
      .insert({
        sender_id: 'admin',
        receiver_id: selectedDriverId,
        message: messageText,
        is_read: false,
        created_at: new Date().toISOString()
      })

    if (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setInputMessage(messageText) // Restore input
    }
    setIsSending(false)
  }, [inputMessage, selectedDriverId, isSending, supabase, scrollToBottom])

  // Mark messages as read
  const markAllAsRead = useCallback(async (driverId: string) => {
    await supabase.from('Chat_Messages')
      .update({ is_read: true })
      .eq('receiver_id', 'admin')
      .eq('sender_id', driverId)
      .eq('is_read', false)
    
    // Update unread count in contacts
    setContacts(prev => prev.map(c => 
      c.driver_id === driverId ? { ...c, unread: 0 } : c
    ))
  }, [supabase])

  // Update contact list on new message
  const updateContactList = useCallback((newMsg: ChatMessage) => {
    setContacts(prev => {
      const driverId = newMsg.sender_id === 'admin' ? newMsg.receiver_id : newMsg.sender_id
      const existing = prev.find(c => c.driver_id === driverId)
      
      if (existing) {
        return prev.map(c => c.driver_id === driverId ? {
          ...c,
          last_message: newMsg.sender_id === 'admin' ? `คุณ: ${newMsg.message}` : newMsg.message,
          unread: (newMsg.sender_id !== 'admin' && driverId !== selectedDriverId) ? c.unread + 1 : c.unread,
          updated_at: newMsg.created_at
        } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      } else {
        return [{
          driver_id: driverId,
          driver_name: newMsg.driver_name || 'Driver',
          last_message: newMsg.message,
          unread: newMsg.sender_id !== 'admin' ? 1 : 0,
          updated_at: newMsg.created_at
        }, ...prev]
      }
    })
  }, [selectedDriverId])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Chat_Messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          const relevantDriverId = newMsg.sender_id === 'admin' ? newMsg.receiver_id : newMsg.sender_id
          
          if (relevantDriverId === selectedDriverId) {
            // Only add if not optimistic (check by comparing message text and sender)
            setMessages(prev => {
              const isDuplicate = prev.some(m => 
                m.sender_id === newMsg.sender_id && m.message === newMsg.message && 
                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000
              )
              return isDuplicate ? prev.map(m => 
                (m.sender_id === newMsg.sender_id && m.message === newMsg.message && m.id !== newMsg.id) ? newMsg : m
              ) : [...prev, newMsg]
            })
            scrollToBottom()
            
            if (newMsg.sender_id !== 'admin') {
              supabase.from('Chat_Messages').update({ is_read: true }).eq('id', newMsg.id)
            }
          }
          
          updateContactList(newMsg)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId])

  // On driver select
  useEffect(() => {
    if (selectedDriverId) {
      fetchMessages(selectedDriverId)
      markAllAsRead(selectedDriverId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId])

  // Message groups
  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])

  // Total unread
  const totalUnread = useMemo(() => contacts.reduce((s, c) => s + (c.unread || 0), 0), [contacts])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-220px)] border border-white/10 rounded-xl overflow-hidden">
      {/* Contacts Sidebar */}
      <div className="lg:col-span-1 bg-slate-900/70 border-r border-white/10 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">รายชื่อ</h3>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-[10px] text-white font-medium">
                {totalUnread} ใหม่
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคนขับ..." 
              className="bg-slate-800/50 border-slate-700 pl-9 h-9 text-sm" 
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">ไม่พบผลลัพธ์</div>
          ) : (
            filteredContacts.map((c: any) => {
              const id = c.driver_id || c.Driver_ID
              const name = c.driver_name || c.Driver_Name || 'Unknown'
              const isSelected = selectedDriverId === id
              return (
                <div 
                  key={id}
                  onClick={() => setSelectedDriverId(id)}
                  className={`flex items-center gap-3 p-3.5 px-4 cursor-pointer transition-all border-b border-white/5 ${
                    isSelected 
                      ? 'bg-blue-600/15 border-l-2 border-l-blue-500' 
                      : 'hover:bg-white/5 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-700'
                    }`}>
                      {name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>{name}</p>
                      {c.updated_at && (
                        <span className="text-[10px] text-slate-600 shrink-0 ml-2">
                          {formatTime(c.updated_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs text-slate-500 truncate pr-2">{c.last_message || 'เริ่มแชทเลย'}</p>
                      {(c.unread || 0) > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white font-medium px-1 shrink-0">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-2 bg-slate-950/50 flex flex-col">
        {selectedDriverId && activeDriver ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {(activeDriver.driver_name || activeDriver.Driver_Name || '?').charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{activeDriver.driver_name || activeDriver.Driver_Name}</h3>
                  <p className="text-[10px] text-slate-500">ID: {selectedDriverId}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">เริ่มสนทนากับ {activeDriver.driver_name || activeDriver.Driver_Name}</p>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 rounded-full bg-slate-800/80 text-[10px] text-slate-500">
                        {formatDate(group.date)}
                      </span>
                    </div>
                    
                    {/* Messages in this date */}
                    <div className="space-y-1.5">
                      {group.messages.map((msg, mi) => {
                        const isAdmin = msg.sender_id === 'admin'
                        const showAvatar = !isAdmin && (mi === 0 || group.messages[mi-1]?.sender_id === 'admin')
                        
                        return (
                          <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {!isAdmin && (
                              <div className="w-6 h-6 shrink-0">
                                {showAvatar && (
                                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                                    {(activeDriver.driver_name || activeDriver.Driver_Name || '?').charAt(0)}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`max-w-[65%] rounded-2xl py-2 px-3.5 ${
                              isAdmin 
                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                            }`}>
                              <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                              <div className={`flex items-center gap-1 mt-0.5 ${isAdmin ? 'justify-end' : ''}`}>
                                <span className="text-[10px] opacity-50">
                                  {formatTime(msg.created_at)}
                                </span>
                                {isAdmin && (
                                  msg.is_read 
                                    ? <CheckCheck size={12} className="opacity-70 text-cyan-300" />
                                    : <Check size={12} className="opacity-40" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-white/10 bg-slate-900/30">
              <div className="flex gap-2">
                <Input 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="พิมพ์ข้อความ..." 
                  className="bg-slate-800/50 border-slate-700/50 focus:border-blue-500/50 h-10" 
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputMessage.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 h-10 w-10 p-0 shrink-0"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="opacity-40" />
            </div>
            <p className="text-sm font-medium">เลือกคนขับเพื่อเริ่มสนทนา</p>
            <p className="text-xs mt-1 opacity-50">{filteredContacts.length} คนขับ</p>
          </div>
        )}
      </div>
    </div>
  )
}
