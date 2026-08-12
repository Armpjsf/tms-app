"use client";

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

// A single delivery drop point. `weight` is optional (defaults to 1) in case a
// caller wants to emphasise some points; density comes from how many points
// overlap, not from any per-point value.
export interface ProfitPoint {
    lat: number;
    lng: number;
    weight?: number;
}

interface DensityHeatmapProps {
    data: ProfitPoint[];
}

/**
 * Delivery-density heatmap.
 * Each drop contributes a small amount of heat; where many drops overlap the
 * area glows hotter, so the map answers "ย่านไหนมีงานส่งเยอะที่สุด".
 *   น้อย  → ฟ้า/เขียว
 *   มาก   → ส้ม/แดง
 */
export function ProfitabilityHeatmap({ data }: DensityHeatmapProps) {
    const map = useMap();

    useEffect(() => {
        if (!map || !data || data.length === 0) return;

        // Low per-point weight so a lone drop stays "cool" and only genuine
        // clusters light up — that is what makes this read as density.
        const heatPoints = data.map(p => [p.lat, p.lng, (p.weight ?? 1) * 0.4] as [number, number, number]);

        const heatLayer = L.heatLayer(heatPoints, {
            radius: 40,
            blur: 28,
            maxZoom: 13,
            max: 1.0,
            minOpacity: 0.35,
            gradient: {
                0.2: '#3b82f6', // Blue — few
                0.4: '#22d3ee', // Cyan
                0.6: '#84cc16', // Lime
                0.8: '#f59e0b', // Amber
                1.0: '#ef4444', // Red — many
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, data]);

    return null;
}
