
"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()} 
      variant="outline"
      className="gap-2 print-hidden bg-white text-black hover:bg-slate-100"
    >
      <Printer size={16} />
      พิมพ์ใบกำกับภาษี (Print)
    </Button>
  )
}
