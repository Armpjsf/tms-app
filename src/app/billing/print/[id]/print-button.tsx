"use client"

import { Printer } from "lucide-react"

export function PrintAction() {
    return (
        <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold flex items-center gap-2"
        >
            <Printer size={16} />
            Print / Save as PDF
        </button>
    )
}
