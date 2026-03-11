'use server';

// A simple in-memory rate limiter for server actions
// In a serverless environment (Vercel), this works per-instance.
// For multi-instance global rate limiting, Redis would be required.

const storage = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const record = storage.get(identifier);

  if (!record || now > record.expiresAt) {
    const newRecord = { count: 1, expiresAt: now + windowMs };
    storage.set(identifier, newRecord);
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}

// Cleanup expired items periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of storage.entries()) {
      if (now > record.expiresAt) {
        storage.delete(key);
      }
    }
  }, 300000); // Every 5 minutes
}
