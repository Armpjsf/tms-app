"use client";

import React from 'react';
import { Star, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafetyMetrics } from "@/services/safety-scoring";

interface SafetyScoreBadgeProps {
  metrics: SafetyMetrics;
  className?: string;
}

export function SafetyScoreBadge({ metrics, className }: SafetyScoreBadgeProps) {
  const config = {
    excellent: {
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      icon: <Star size={12} className="fill-emerald-500" />,
      label: "Excellent"
    },
    good: {
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: <CheckCircle size={12} />,
      label: "Good"
    },
    fair: {
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: <AlertTriangle size={12} />,
      label: "Fair"
    },
    poor: {
      color: "text-rose-600 bg-rose-50 border-rose-200",
      icon: <XCircle size={12} />,
      label: "Poor"
    }
  };

  const { color, icon, label } = config[metrics.status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-tighter",
        color
      )}>
        {icon}
        {metrics.score} pts
      </div>
      {metrics.status === 'excellent' && (
        <span className="text-[8px] font-black text-emerald-500 animate-pulse">TOP TIER</span>
      )}
    </div>
  );
}
