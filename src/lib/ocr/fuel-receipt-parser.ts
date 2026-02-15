import Tesseract from 'tesseract.js';

export interface ParsedReceipt {
  date?: string;
  time?: string;
  totalAmount?: number;
  liters?: number;
  pricePerLiter?: number;
  stationName?: string;
}

export async function parseFuelReceipt(imageUrl: string): Promise<ParsedReceipt> {
  try {
    const result = await Tesseract.recognize(imageUrl, 'eng+tha', {
      logger: (m) => console.log(m), // Optional: log progress
    });

    const text = result.data.text;
    console.log('OCR Text:', text);

    return extractDataFromText(text);
  } catch (error) {
    console.error('OCR Error:', error);
    return {};
  }
}

function extractDataFromText(text: string): ParsedReceipt {
  const data: ParsedReceipt = {};
  const lines = text.split('\n');

  // Regex Patterns
  // Date: DD/MM/YYYY or DD-MM-YYYY
  const dateRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
  // Time: HH:MM:SS or HH:MM
  const timeRegex = /(\d{2}):(\d{2})/;
  // Amount: Look for numbers with 2 decimal places near keywords like "Total", "Baht", "Amount"
  const amountRegex = /(?:Total|Amount|Baht|Net)\s*[:.]?\s*([\d,]+\.\d{2})/i;
  // Liters: Look for numbers near "Liters", "Vol", "Qty"
  const literRegex = /(?:Liters|Vol|Qty|Volume)\s*[:.]?\s*([\d,]+\.\d{2,3})/i;
  // Price/L: Look for numbers near "Price", "Rate"
  const priceRegex = /(?:Price|Rate)\s*[:.]?\s*([\d,]+\.\d{2})/i;
  // Station: Look for common station names (PTT, Shell, Esso, Bangchak, Caltex)
  const stationRegex = /(PTT|Shell|Esso|Bangchak|Caltex|Susco|PT Station)/i;

  for (const line of lines) {
    // extract Date
    if (!data.date) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
         // Tesseract sometimes reads years as BE (2567). Convert to AD if > 2500
         let year = parseInt(dateMatch[3]);
         if (year > 2500) year -= 543;
         data.date = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    // extract Time
    if (!data.time) {
       const timeMatch = line.match(timeRegex);
       if (timeMatch) data.time = matchToTime(timeMatch);
    }

    // extract Total Amount
    if (!data.totalAmount) {
        const amountMatch = line.match(amountRegex);
        // Also try standalone number search if line contains "Total"
        if (amountMatch) {
            data.totalAmount = parseNumber(amountMatch[1]);
        } else if (line.toLowerCase().includes('total') || line.includes('รวมเงิน')) {
             // Fallback: look for the last number in the line
             const numbers = line.match(/([\d,]+\.\d{2})/g);
             if (numbers) {
                 data.totalAmount = parseNumber(numbers[numbers.length - 1]);
             }
        }
    }

    // extract Liters
    if (!data.liters) {
        const literMatch = line.match(literRegex);
        if (literMatch) {
            data.liters = parseNumber(literMatch[1]);
        } else if (line.toLowerCase().includes('volume') || line.toLowerCase().includes('lts') || line.includes('ปริมาณ')) {
             const numbers = line.match(/([\d,]+\.\d{2,3})/g);
             if (numbers) {
                 data.liters = parseNumber(numbers[0]); // Usually the first number if labeled volume
             }
        }
    }
    
    // extract Price/Liter
    if (!data.pricePerLiter) {
        const priceMatch = line.match(priceRegex);
        if (priceMatch) {
            data.pricePerLiter = parseNumber(priceMatch[1]);
        }
    }
    
    // extract Station
    if (!data.stationName) {
        const stationMatch = line.match(stationRegex);
        if (stationMatch) {
            data.stationName = stationMatch[1];
        }
    }
  }

  // Calculate Price/Liter if missing but we have Total and Liters
  if (!data.pricePerLiter && data.totalAmount && data.liters) {
      data.pricePerLiter = parseFloat((data.totalAmount / data.liters).toFixed(2));
  }

  return data;
}

function parseNumber(str: string): number {
    return parseFloat(str.replace(/,/g, ''));
}

function matchToTime(match: RegExpMatchArray): string {
    return `${match[1]}:${match[2]}:00`;
}
