/**
 * Voice Action Parser for LINE Audio Messages
 * Transcribes audio and parses structured TMS actions using Gemini Multimodal Audio API.
 */

export interface ParsedVoiceAction {
  transcription: string
  intent: 
    | 'UPDATE_JOB_STATUS' 
    | 'REPORT_DELAY_OR_INCIDENT' 
    | 'ADD_EXPENSE' 
    | 'LOG_FUEL' 
    | 'REQUEST_LEAVE' 
    | 'REPORT_REPAIR' 
    | 'CREATE_JOB' 
    | 'GENERAL_QUERY' 
    | 'UNKNOWN'
  summaryText: string
  payload?: Record<string, unknown>
}

export async function parseVoiceMessage(
  audioBuffer: Buffer,
  userContext: {
    userName: string
    role: 'Admin' | 'Super Admin' | 'Driver' | 'Customer' | string
    branchId?: string
    activeJobId?: string
  }
): Promise<ParsedVoiceAction> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    return {
      transcription: '',
      intent: 'UNKNOWN',
      summaryText: '⚠️ ไม่พบการตั้งค่า Gemini API Key ในระบบ'
    }
  }

  const systemInstruction = `
คุณคือ AI ระบบสั่งงานด้วยเสียงอัจฉริยะของระบบบริหารการขนส่ง (TMS)
ผู้พูด: ${userContext.userName} | บทบาท: ${userContext.role} | สาขา: ${userContext.branchId || 'ทุกสาขา'} | งานปัจจุบัน: ${userContext.activeJobId || 'ไม่มี'}

หน้าที่ของคุณ:
1. ฟังเสียงและถอดความภาษาไทยอย่างถูกต้อง (รวมถึงคำศัพท์โลจิสติกส์, ทะเบียนรถ, ตัวเลข, สำเนียงท้องถิ่น)
2. จำแนกเจตนา (intent) และสกัดข้อมูลลงใน JSON ให้อยู่ในฟอร์แมตที่กำหนด:

รูปแบบผลลัพธ์ (ต้องตอบเป็น JSON ล้วนเท่านั้น):
{
  "transcription": "ข้อความที่ได้ยินทั้งหมด",
  "intent": "UPDATE_JOB_STATUS" | "REPORT_DELAY_OR_INCIDENT" | "ADD_EXPENSE" | "LOG_FUEL" | "REQUEST_LEAVE" | "REPORT_REPAIR" | "CREATE_JOB" | "GENERAL_QUERY" | "UNKNOWN",
  "summaryText": "ข้อความภาษาไทยสรุปสั้นๆ สวยงามสำหรับตอบกลับผู้ใช้",
  "payload": {
    // ฟิลด์ตามแต่ละ intent
    // สำหรับ UPDATE_JOB_STATUS: { "status": "Picked Up" | "In Transit" | "Arrived" | "Delivered" | "Completed", "cashCollected": number, "notes": string }
    // สำหรับ REPORT_DELAY_OR_INCIDENT: { "delayMinutes": number, "reason": string, "location": string, "waitCharge": number }
    // สำหรับ ADD_EXPENSE: { "amount": number, "expenseType": "tolls" | "tire" | "fuel" | "other", "notes": string }
    // สำหรับ LOG_FUEL: { "liters": number, "totalAmount": number, "odometer": number, "stationName": string, "plate": string }
    // สำหรับ REQUEST_LEAVE: { "leaveType": "Sick" | "Personal" | "Vacation", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": string }
    // สำหรับ REPORT_REPAIR: { "problemDescription": string, "urgency": "Normal" | "High" | "Emergency", "plate": string }
    // สำหรับ CREATE_JOB: { "customerName": string, "origin": string, "destination": string, "price": number, "driverName": string, "planDate": "YYYY-MM-DD" }
    // สำหรับ GENERAL_QUERY: { "answer": "คำตอบสำหรับคำถามของผู้ใช้" }
  }
}
`.trim()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'audio/m4a', data: audioBuffer.toString('base64') } },
          { text: 'กรุณาถอดเสียงและจำแนกเจตนาคำสั่งการทำงานนี้เป็น JSON ตามคำสั่ง' }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(25000)
    })

    if (!res.ok) {
      throw new Error(`Gemini Audio API HTTP ${res.status}`)
    }

    const data = await res.json()
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const parsed = JSON.parse(textOutput) as ParsedVoiceAction

    return {
      transcription: parsed.transcription || '',
      intent: parsed.intent || 'UNKNOWN',
      summaryText: parsed.summaryText || 'ประมวลผลเสียงเรียบร้อยครับ',
      payload: parsed.payload || {}
    }
  } catch (error) {
    console.error('[parseVoiceMessage Error]', error)
    return {
      transcription: '',
      intent: 'UNKNOWN',
      summaryText: '⚠️ ไม่สามารถถอดเสียงหรือประมวลผลไฟล์เสียงนี้ได้ กรุณาลองใหม่อีกครั้งครับ'
    }
  }
}
