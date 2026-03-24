import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient, MessagingApiBlobClient } = messagingApi;

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

export const lineClient = new MessagingApiClient({
  channelAccessToken
});

export const lineBlobClient = new MessagingApiBlobClient({
  channelAccessToken
});

/**
 * Validates the signature of an incoming LINE webhook request.
 */
export function verifyLineSignature(body: string, signature: string): boolean {
  if (!channelSecret) {
    console.error('LINE_CHANNEL_SECRET is not set');
    return false;
  }
  return validateSignature(body, channelSecret, signature);
}

/**
 * Fetches binary content (audio, image, etc.) from LINE servers.
 */
export async function getMessageContent(messageId: string): Promise<Buffer> {
  const response = await lineBlobClient.getMessageContent(messageId);
  const chunks = [];
  // response is a stream-like object in node-fetch or similar
  // In @line/bot-sdk v10, it's a Fetch response with a body that is a stream.
  const reader = response.body;
  if (!reader) throw new Error('Empty message content body');
  
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Sends a reply message to a LINE user.
 */
export async function replyToUser(replyToken: string, text: string) {
  try {
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
        return { success: false, error: 'Token missing' };
    }
    
    await lineClient.replyMessage({
      replyToken,
      messages: [{ type: 'text', text }]
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending LINE reply:', error);
    return { success: false, error };
  }
}

/**
 * Sends a push message to a LINE user.
 */
export async function pushToUser(to: string, text: string) {
  try {
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
        return { success: false, error: 'Token missing' };
    }
    
    await lineClient.pushMessage({
      to,
      messages: [{ type: 'text', text }]
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending LINE push:', error);
    return { success: false, error };
  }
}
