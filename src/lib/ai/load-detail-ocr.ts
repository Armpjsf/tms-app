import { GoogleGenerativeAI } from "@google/generative-ai";

// One delivery stop parsed from a PCG "ใบจัดสาย / Load Detail" sheet.
export interface LoadDetailDrop {
  orderNo?: string;        // เลขที่ Order
  customerCode?: string;   // รหัสลูกค้า (stable key, e.g. 300766000)
  customerName?: string;   // ชื่อลูกค้า
  shipTo?: string;         // ที่อยู่ปลายทาง (Ship to)
  tambon?: string;         // ตำบล
  amphoe?: string;         // อำเภอ
  province?: string;       // จังหวัด
}

export interface ParsedLoadDetail {
  dispatchNo?: string;     // เลขที่ใบจัดสาย
  route?: string;          // สายส่ง (เช่น "SR1 ท่าแซะ,ทุ่งตะโก,...")
  driverName?: string;     // พนักงานขับรถ
  vehiclePlate?: string;   // ทะเบียนรถ
  deliveryDate?: string;   // Delivery Date
  drops: LoadDetailDrop[];
  rawText?: string;
}

/**
 * Gemini-powered OCR for a PCG dispatch sheet (ใบจัดสาย / Load Detail).
 * Unlike a single-shop invoice, one sheet lists MANY orders/customers — each
 * becomes one drop in a multi-drop job. The stable `customerCode` lets us match
 * to a saved location without fuzzy Thai-name matching.
 */
export async function parseLoadDetailWithAI(base64Image: string, mimeType: string): Promise<ParsedLoadDetail> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
คุณคือระบบอ่านเอกสาร "ใบจัดสาย / Load Detail" ของบริษัทขนส่ง (ภาษาไทย)
เอกสารนี้ 1 ใบมีหลายออเดอร์/ลูกค้า (หลายจุดส่ง) โปรดดึงข้อมูลออกมาเป็น JSON เท่านั้น:

{
  "dispatchNo": "เลขที่ใบจัดสาย",
  "route": "สายส่ง (ข้อความหลัง 'สายส่ง' เช่น SR1 ท่าแซะ,ทุ่งตะโก,...)",
  "driverName": "พนักงานขับรถ",
  "vehiclePlate": "ทะเบียนรถ",
  "deliveryDate": "Delivery Date (YYYY-MM-DD ถ้าอ่านได้)",
  "drops": [
    {
      "orderNo": "เลขที่ Order",
      "customerCode": "รหัสลูกค้า (ตัวเลขที่อยู่หน้าชื่อลูกค้า เช่น 300766000)",
      "customerName": "ชื่อลูกค้า",
      "shipTo": "ที่อยู่เต็มหลัง 'Ship to'",
      "tambon": "ตำบล (ต.)",
      "amphoe": "อำเภอ (อ.)",
      "province": "จังหวัด (จ.)"
    }
  ]
}

กติกา:
- ทุก block ที่มี 'เลขที่ Order' + 'ลูกค้า' = 1 drop (อย่าข้าม แม้ข้อมูลซ้ำ)
- customerCode คือเลขล้วนหน้าชื่อลูกค้า อย่าใส่ชื่อปน
- แยก ต./อ./จ. จาก Ship to ให้ด้วยถ้ามี
- ถ้าฟิลด์ไหนไม่พบให้ใส่ null
- ตอบเป็น JSON object เดียวเท่านั้น ห้ามมีข้อความอื่น
`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Image.split(",")[1] || base64Image, mimeType } },
  ]);
  const text = (await result.response).text();
  const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr) as ParsedLoadDetail;
    if (!Array.isArray(parsed.drops)) parsed.drops = [];
    // Normalise the customer code to digits only.
    parsed.drops = parsed.drops.map((d) => ({
      ...d,
      customerCode: d.customerCode ? String(d.customerCode).replace(/[^0-9]/g, "") : undefined,
    }));
    return parsed;
  } catch (err) {
    console.error("[LoadDetail OCR] JSON parse failed:", err, jsonStr.slice(0, 400));
    return { drops: [], rawText: text };
  }
}
