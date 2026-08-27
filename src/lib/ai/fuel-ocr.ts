export interface ParsedFuelReceipt {
  amount?: number;
  liters?: number;
  stationName?: string;
  mileage?: number;
  plateNumber?: string;
  dateTime?: string;
}

/**
 * Gemini-powered Fuel Receipt OCR Service
 */
export async function parseFuelReceiptWithAI(base64Image: string, mimeType: string): Promise<ParsedFuelReceipt> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = `
You are a highly accurate Thai OCR and Document Extraction engine.
You are given a photo of a Thai fuel receipt / tax invoice (ใบเสร็จรับเงิน/ใบกำกับภาษี).
Note: The image may be rotated sideways.

Carefully read and extract every character:
1. "amount": Total price/amount paid in THB (number only).
2. "liters": Number of liters pumped (number only).
3. "stationName": EXACT full registered company name of the SELLER / ISSUER (ผู้ขาย/ผู้ออกใบกำกับ) at the TOP header of the receipt (e.g. บริษัท ขวัญเมือง ปิโตรเลียม ดีเซลออยล์ จำกัด). DO NOT confuse with customer info (ข้อมูลลูกค้า). Strictly transcribe verbatim.
4. "mileage": Odometer reading if visible on receipt (number only, or null).
5. "plateNumber": Vehicle registration plate (ทะเบียนรถ) printed on receipt (e.g. 3ฒว2502, or null).
6. "dateTime": Date and time in ISO format (YYYY-MM-DDTHH:mm:ss). Convert Buddhist year (e.g. 2569 -> 2026).

Provide JSON ONLY:
{
  "amount": 700.00,
  "liters": 18.088,
  "stationName": "บริษัท ขวัญเมือง ปิโตรเลียม ดีเซลออยล์ จำกัด",
  "mileage": 230361,
  "plateNumber": "3ฒว2502",
  "dateTime": "2026-08-25T18:22:13"
}
`.trim();

  const cleanBase64 = base64Image.split(',')[1] || base64Image;
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  for (const modelName of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (!res.ok) {
        console.warn(`[fuel-ocr] model ${modelName} returned status ${res.status}`);
        continue;
      }

      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr) as ParsedFuelReceipt;
      }
    } catch (error) {
      console.warn(`[fuel-ocr] error with model ${modelName}:`, error);
    }
  }

  throw new Error("Failed to parse fuel receipt with AI OCR");
}
