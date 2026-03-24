"use client";

import React from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import { cn } from '@/lib/utils';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-1 bg-[#050110]/50 p-1 rounded-xl border border-white/5", className)}>
      <button
        onClick={() => setLanguage('th')}
        className={cn(
          "px-3 py-1.5 rounded-lg text-base font-bold font-black transition-all",
          language === 'th' 
            ? "bg-primary text-white shadow-[0_0_15px_rgba(255,30,133,0.3)]" 
            : "text-slate-500 hover:text-slate-300"
        )}
      >
        TH
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-3 py-1.5 rounded-lg text-base font-bold font-black transition-all",
          language === 'en' 
            ? "bg-primary text-white shadow-[0_0_15px_rgba(255,30,133,0.3)]" 
            : "text-slate-500 hover:text-slate-300"
        )}
      >
        EN
      </button>
    </div>
  );
}

