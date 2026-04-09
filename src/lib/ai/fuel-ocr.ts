import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedFuelReceipt {
  amount?: number;
  liters?: number;
  stationName?: string;
  mileage?: number;
  plateNumber?: string;
}

/**
 * Gemini-powered Fuel Receipt OCR Service
 */
export async function parseFuelReceiptWithAI(base64Image: string, mimeType: string): Promise<ParsedFuelReceipt> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this gas/fuel station receipt image and extract the following information in JSON format:
    - amount: Total price/amount paid (number only)
    - liters: Number of liters pumped (number only)
    - stationName: Name of the gas station (e.g. PTT, Shell, Bangchak)
    - mileage: Odometer reading if visible on receipt (number only, or null)
    - plateNumber: Vehicle plate number if written on receipt (text, or null)
    
    IMPORTANT: Provide numbers as decimals. Respond only with the JSON object.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image.split(',')[1] || base64Image,
          mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as ParsedFuelReceipt;
  } catch (error) {
    console.error("Fuel AI OCR Error:", error);
    throw error;
  }
}
