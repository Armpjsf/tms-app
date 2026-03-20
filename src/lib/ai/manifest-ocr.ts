import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedManifest {
  jobId?: string;
  customerName?: string;
  deliveryAddress?: string;
  items?: Array<{ name: string; quantity: string }>;
  rawText?: string;
}

/**
 * Gemini-powered Manifest OCR Service
 */
export async function parseManifestWithAI(base64Image: string, mimeType: string): Promise<ParsedManifest> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this delivery note/manifest image and extract the following information in JSON format:
    - jobId: The order or reference number
    - customerName: Who is the delivery for
    - deliveryAddress: The destination address
    - items: A list of items with their names and quantities
    
    If any field is not found, leave it as null. 
    Respond only with the JSON object.
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
    
    // Clean JSON response (sometimes AI adds markdown blocks)
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as ParsedManifest;
  } catch (error) {
    console.error("AI OCR Error:", error);
    throw error;
  }
}
