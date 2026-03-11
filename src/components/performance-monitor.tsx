'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import Logger from '@/lib/utils/logger';

export function PerformanceMonitor() {
  useEffect(() => {
    const reportMetric = (metric: Metric) => {
      // Log performance metrics
      // In a real production app, this would send to an analytics endpoint
      Logger.debug(`[Performance] ${metric.name}:`, {
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
      });

      // Report to console or external service if needed
      if ((metric.name === 'LCP' || metric.name === 'INP') && metric.value > 2500) {
        Logger.warn(`High ${metric.name} detected:`, metric.value);
      }
    };

    onCLS(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
  }, []);

  return null; // This component doesn't render anything
}
