"use client";

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

import { useIdle } from '@/components/providers/idle-provider';

export function useRealtime(table: string, callback: (payload: any) => void) {
  const { isIdle } = useIdle();

  useEffect(() => {
    if (isIdle) return; // Stop listening if idle

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, and DELETE
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`Real-time update for ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, isIdle]);
}
