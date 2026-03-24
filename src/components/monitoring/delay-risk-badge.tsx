"use client";

import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { DelayRisk } from "@/services/ai-prediction";

interface DelayRiskBadgeProps {
  risk: DelayRisk;
  reason?: string;
  className?: string;
}

export function DelayRiskBadge({ risk, reason, className }: DelayRiskBadgeProps) {
  const config = {
    low: {
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <ShieldCheck size={12} />,
      label: "On Track"
    },
    medium: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <AlertCircle size={12} />,
      label: "Slight Delay"
    },
    high: {
      color: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse",
      icon: <AlertTriangle size={12} />,
      label: "High Risk"
    },
    critical: {
      color: "bg-rose-50 text-rose-700 border-rose-200 animate-bounce",
      icon: <Flame size={12} />,
      label: "Critical"
    }
  };

  const { color, icon, label } = config[risk];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-base font-bold font-black uppercase tracking-widest w-fit", color)}>
        {icon}
        {label}
      </div>
      {reason && risk !== 'low' && (
        <span className="text-base font-bold font-bold text-gray-400 ml-1 italic">{reason}</span>
      )}
    </div>
  );
}

