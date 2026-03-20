"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface RealtimeIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function RealtimeIndicator({ isLive, className }: RealtimeIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 w-fit", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isLive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-300"
      )} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {isLive ? "System Live" : "Offline"}
      </span>
    </div>
  );
}
