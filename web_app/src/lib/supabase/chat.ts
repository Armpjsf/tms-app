import { createClient } from "@/utils/supabase/server";

export type ChatMessage = {
  id?: number;
  driver_id: string;
  driver_name: string;
  sender: string; // 'driver' | 'admin'
  message: string;
  created_at: string;
  read: boolean;
};

// ดึงข้อความทั้งหมดของคนขับ
export async function getMessagesByDriver(
  driverId: string,
): Promise<ChatMessage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", JSON.stringify(error));
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("Exception fetching messages:", e);
    return [];
  }
}

// ดึงรายชื่อคนขับที่มีข้อความ (contacts)
export async function getChatContacts(): Promise<
  {
    driver_id: string;
    driver_name: string;
    last_message: string;
    unread: number;
  }[]
> {
  try {
    const supabase = await createClient();

    // ดึงข้อความล่าสุดของแต่ละคนขับ
    const { data, error } = await supabase
      .from("chat_messages")
      .select("driver_id, driver_name, message, created_at, read")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chat contacts:", JSON.stringify(error));
      return [];
    }

    // Group by driver and get latest message
    const contactMap = new Map<
      string,
      {
        driver_id: string;
        driver_name: string;
        last_message: string;
        unread: number;
      }
    >();

    for (const msg of data || []) {
      if (!contactMap.has(msg.driver_id)) {
        contactMap.set(msg.driver_id, {
          driver_id: msg.driver_id,
          driver_name: msg.driver_name,
          last_message: msg.message,
          unread: msg.read ? 0 : 1,
        });
      } else if (!msg.read) {
        const existing = contactMap.get(msg.driver_id)!;
        existing.unread += 1;
      }
    }

    return Array.from(contactMap.values());
  } catch (e) {
    console.error("Exception fetching chat contacts:", e);
    return [];
  }
}

// ส่งข้อความใหม่
export async function sendMessage(
  driverId: string,
  driverName: string,
  message: string,
  sender: string = "admin",
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("chat_messages").insert({
      driver_id: driverId,
      driver_name: driverName,
      sender,
      message,
      created_at: new Date().toISOString(),
      read: false,
    });

    if (error) {
      console.error("Error sending message:", JSON.stringify(error));
      return false;
    }

    return true;
  } catch (e) {
    console.error("Exception sending message:", e);
    return false;
  }
}
