import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

export const lineClient = new MessagingApiClient({
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
