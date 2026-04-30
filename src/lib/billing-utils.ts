
/**
 * Utility functions for Billing and Invoice modules.
 * Handles data aggregation, currency-to-text conversion, and date formatting.
 */

/**
 * Converts a number to Thai Baht text format.
 * Example: 123.45 -> "หนึ่งร้อยยี่สิบสามบาทสี่สิบห้าสตางค์"
 */
export function ArabicNumberToText(value: number): string {
    const numStr = value.toFixed(2);
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const fractionalPart = parts[1];

    const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function readNumber(num: string) {
        if (num === '0' || num === '00') return '';
        let result = '';
        const len = num.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(num.charAt(i), 10);
            const pos = (len - i - 1) % 6;
            const isMillion = (len - i - 1) >= 6 && pos === 0;
            
            if (digit !== 0) {
                if (pos === 1 && digit === 1) {
                    result += 'สิบ';
                } else if (pos === 1 && digit === 2) {
                    result += 'ยี่สิบ';
                } else if (pos === 0 && digit === 1 && len > 1 && num.charAt(len-2) !== '0') {
                    result += 'เอ็ด';
                } else {
                    result += numbers[digit] + positions[pos];
                }
            }
            if (isMillion) {
                result += 'ล้าน';
            }
        }
        return result;
    }

    let text = readNumber(integerPart);
    if (text === '') text = 'ศูนย์';
    text += 'บาท';
    if (fractionalPart === '00') {
        text += 'ถ้วน';
    } else {
        text += readNumber(fractionalPart) + 'สตางค์';
    }
    return text;
}

/**
 * Formats a date range into a Thai Buddhist Era (BE) string.
 * Example: 01/01/2567 or 01-05/01/2567
 */
export function formatBEDateRange(start: Date, end: Date): string {
    const sD = start.getDate()
    const eD = end.getDate()
    const sM = start.getMonth() + 1
    const sY = start.getFullYear() + 543
    
    if (sD === eD && start.getMonth() === end.getMonth()) {
        return `${sD}/${sM}/${sY}`
    }
    return `${sD}-${eD}/${sM}/${sY}`
}

export type AggregatedItem = {
    description: string;
    subDescription?: string;
    qty: number;
    unitPrice: number;
    totalBeforeTax: number;
    isExtra: boolean;
};

/**
 * Aggregates job costs into a structured format for printing.
 */
export function aggregateBillingJobs(jobs: any[], lang: 'th' | 'en' = 'th', customerName?: string): AggregatedItem[] {
    const aggregatedItems = new Map<string, AggregatedItem>();

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const EXPENSE_MAP: Record<string, string> = {
        'Price_Cust_Extra': 'เพิ่มจุดลงของ',
        'Charge_Labor': 'แรงงานยกของ',
        'Charge_Wait': 'รอลงเกินเวลา',
        'Price_Cust_Other': 'อื่นๆ'
    };

    jobs.forEach((job) => {
        // Track dates
        if (job.Plan_Date) {
            const jobDate = new Date(job.Plan_Date);
            if (!minDate || jobDate < minDate) minDate = jobDate;
            if (!maxDate || jobDate > maxDate) maxDate = jobDate;
        }

        // 1. Freight Cost
        const qty = Number(job.Weight_Kg || job.Volume_Cbm || job.Loaded_Qty || 1);
        let basePrice = Number(job.Price_Cust_Total || 0);
        let unitPrice = Number(job.Price_Per_Unit || 0);

        // Dynamic Unit Price Calculation: Total / Qty (as requested by user)
        if (basePrice > 0 && qty > 0) {
            unitPrice = basePrice / qty;
        } else if (basePrice <= 0 && unitPrice > 0) {
            // Fallback to calculation if total is missing
            basePrice = qty * unitPrice;
        }

        // Group by freight and unit price to separate different rates (e.g. 16 vs 17 baht)
        const freightKey = `FREIGHT-${unitPrice.toFixed(2)}`;
        const existingFreight = aggregatedItems.get(freightKey);
        if (existingFreight) {
            existingFreight.qty += qty; // Accumulate actual quantity (pieces)
            existingFreight.totalBeforeTax += basePrice;
        } else {
            aggregatedItems.set(freightKey, {
                description: lang === 'th' ? `ค่าขนส่งสินค้า (${job.Customer_ID || 'P00001'})` : `Freight Cost (${job.Customer_ID || 'P00001'})`,
                qty: qty,
                unitPrice: unitPrice,
                totalBeforeTax: basePrice,
                isExtra: false
            });
        }

        // 2. Standard Extra Expenses
        const standardExtras = ['Price_Cust_Extra', 'Charge_Labor', 'Charge_Wait', 'Price_Cust_Other'];
        standardExtras.forEach(col => {
            const val = Number(job[col] || 0);
            if (val > 0) {
                const key = `EXTRA-${col}`;
                const existing = aggregatedItems.get(key);
                if (existing) {
                    existing.qty += 1;
                    existing.totalBeforeTax += val;
                } else {
                    aggregatedItems.set(key, {
                        description: lang === 'th' ? EXPENSE_MAP[col] : col.replace(/_/g, ' '),
                        qty: 1,
                        unitPrice: 0,
                        totalBeforeTax: val,
                        isExtra: true
                    });
                }
            }
        });

        // 3. JSON Extra Costs
        if (job.extra_costs_json) {
            let costs = job.extra_costs_json;
            if (typeof costs === 'string') { 
                try { costs = JSON.parse(costs); } catch { costs = []; } 
            }
            if (Array.isArray(costs)) {
                costs.filter(e => Number(e.charge_cust) > 0).forEach((extra) => {
                    const val = Number(extra.charge_cust);
                    const typeLabel = extra.type || (lang === 'th' ? 'ค่าใช้จ่ายเพิ่มเติม' : 'Extra Cost');
                    const key = `JSON-${typeLabel}`;
                    const existing = aggregatedItems.get(key);
                    if (existing) {
                        existing.qty += 1;
                        existing.totalBeforeTax += val;
                    } else {
                        aggregatedItems.set(key, {
                            description: typeLabel === 'Pallet' ? (lang === 'th' ? 'ค่าพาเลท' : 'Pallet') : typeLabel,
                            qty: 1,
                            unitPrice: 0,
                            totalBeforeTax: val,
                            isExtra: true
                        });
                    }
                });
            }
        }
    });

    // Post-processing: Add sub-description to Freight
    const freightItem = aggregatedItems.get('FREIGHT');
    if (freightItem && minDate && maxDate) {
        const dateRange = formatBEDateRange(minDate, maxDate);
        freightItem.subDescription = lang === 'th' 
            ? `--ค่าขนส่งสินค้า วันที่ ${dateRange}`
            : `--Freight during ${dateRange}`;
    }

    // Convert Map to Array and calculate unit prices
    return Array.from(aggregatedItems.values()).map(item => ({
        ...item,
        unitPrice: item.qty > 0 ? (item.totalBeforeTax / item.qty) : 0
    }));
}
