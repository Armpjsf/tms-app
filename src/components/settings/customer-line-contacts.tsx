"use client"

/**
 * CustomerLineContacts — manage the team of LINE recipients for one customer.
 * Two ways to receive job-completion alerts:
 *   • A LINE GROUP  → one push reaches the whole team (cheapest on quota).
 *   • Individual members → private push to each person (one message each).
 *
 * The easiest way to add a recipient is from LINE itself: the person (or the
 * group) types  BIND <Customer_ID> <phone>  to the bot, which registers them
 * automatically. This panel lists what's registered and lets an admin toggle /
 * remove them, or paste a raw U.../C... id by hand.
 */

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Users, UsersRound, User, Trash2, Plus, Loader2, Power } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getCustomerLineContacts,
  addCustomerLineContact,
  deleteCustomerLineContact,
  setCustomerLineContactActive,
  type LineContact,
} from "@/lib/actions/line-contact-actions"

export function CustomerLineContacts({ customerId }: { customerId: string }) {
  const [contacts, setContacts] = useState<LineContact[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  // New-contact form
  const [newId, setNewId] = useState("")
  const [newType, setNewType] = useState<"user" | "group">("user")
  const [newBot, setNewBot] = useState<1 | 2>(1)
  const [newName, setNewName] = useState("")

  const load = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setContacts(await getCustomerLineContacts(customerId))
    setLoading(false)
  }, [customerId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    setAdding(true)
    const res = await addCustomerLineContact({
      customerId,
      lineTargetId: newId,
      targetType: newType,
      botIndex: newBot,
      contactName: newName,
    })
    setAdding(false)
    if (res.success) {
      toast.success("เพิ่มผู้รับแจ้งเตือนแล้ว")
      setNewId(""); setNewName("")
      load()
    } else {
      toast.error(res.error || "เพิ่มไม่สำเร็จ")
    }
  }

  const handleToggle = async (c: LineContact) => {
    const res = await setCustomerLineContactActive(c.id, !c.Active)
    if (res.success) {
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, Active: !c.Active } : x))
    } else {
      toast.error(res.error || "อัปเดตไม่สำเร็จ")
    }
  }

  const handleDelete = async (c: LineContact) => {
    const res = await deleteCustomerLineContact(c.id)
    if (res.success) {
      setContacts(prev => prev.filter(x => x.id !== c.id))
      toast.success("ลบแล้ว")
    } else {
      toast.error(res.error || "ลบไม่สำเร็จ")
    }
  }

  const groups = contacts.filter(c => c.Target_Type === "group")
  const members = contacts.filter(c => c.Target_Type !== "group")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-black uppercase tracking-[0.1em] text-emerald-500 ml-2 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ผู้รับแจ้งเตือน LINE (ทีมลูกค้า)
        </Label>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <p className="text-xs text-muted-foreground font-medium ml-2 leading-relaxed">
        💡 วิธีง่ายสุด: ให้ทีมลูกค้า (หรือกลุ่มไลน์) พิมพ์ <span className="font-mono font-bold text-foreground">BIND {customerId || "<รหัสลูกค้า>"} &lt;เบอร์โทร&gt;</span> คุยกับบอท ระบบจะเพิ่มให้อัตโนมัติ ·
        <span className="text-emerald-600 font-bold"> กลุ่ม = 1 ข้อความถึงทุกคน (ประหยัดโควต้า)</span>
      </p>

      {/* Registered recipients */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          {[...groups, ...members].map(c => (
            <div
              key={c.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                c.Active ? "bg-muted/30 border-border" : "bg-muted/10 border-border/40 opacity-60"
              )}
            >
              {c.Target_Type === "group"
                ? <UsersRound className="w-5 h-5 text-emerald-500 shrink-0" />
                : <User className="w-5 h-5 text-primary shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  {c.Contact_Name || (c.Target_Type === "group" ? "กลุ่มไลน์" : "สมาชิก")}
                  <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                    {c.Target_Type === "group" ? "GROUP" : "USER"} · BOT{c.Bot_Index}
                  </span>
                </p>
                <p className="text-[11px] font-mono text-muted-foreground truncate">{c.Line_Target_ID}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(c)}
                title={c.Active ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  c.Active ? "text-emerald-600 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Power className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(c)}
                title="ลบ"
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {contacts.length === 0 && !loading && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          <Users className="w-4 h-4" /> ยังไม่มีผู้รับแจ้งเตือนเพิ่มเติม (นอกเหนือจาก LINE ID หลักด้านบน)
        </div>
      )}

      {/* Manual add */}
      <div className="p-3 rounded-xl border border-border/60 bg-background/40 space-y-3">
        <p className="text-xs font-bold text-muted-foreground">เพิ่มด้วยตนเอง (วาง U.../C... id)</p>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button type="button" onClick={() => setNewType("user")}
              className={cn("px-3 py-2 text-xs font-bold", newType === "user" ? "bg-primary text-white" : "bg-muted/40")}>รายคน</button>
            <button type="button" onClick={() => setNewType("group")}
              className={cn("px-3 py-2 text-xs font-bold", newType === "group" ? "bg-emerald-500 text-white" : "bg-muted/40")}>กลุ่ม</button>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button type="button" onClick={() => setNewBot(1)}
              className={cn("px-3 py-2 text-xs font-bold", newBot === 1 ? "bg-foreground text-background" : "bg-muted/40")}>บอท 1</button>
            <button type="button" onClick={() => setNewBot(2)}
              className={cn("px-3 py-2 text-xs font-bold", newBot === 2 ? "bg-foreground text-background" : "bg-muted/40")}>บอท 2</button>
          </div>
        </div>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ชื่อ (ไม่บังคับ) เช่น คุณสมชาย ฝ่ายคลัง" className="h-11" />
        <div className="flex gap-2">
          <Input value={newId} onChange={e => setNewId(e.target.value)} placeholder={newType === "group" ? "Group ID (C...)" : "User ID (U...)"} className="h-11 font-mono flex-1" />
          <Button type="button" onClick={handleAdd} disabled={adding || !newId.trim()} className="h-11 gap-1.5 shrink-0">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่ม
          </Button>
        </div>
      </div>
    </div>
  )
}
