
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type CreateMessageInput, type Message } from '../schema';

export const createMessage = async (input: CreateMessageInput): Promise<Message> => {
  try {
    // Insert message record
    const result = await db.insert(messagesTable)
      .values({
        user_id: input.user_id,
        contact_id: input.contact_id,
        content: input.content,
        is_outbound: input.is_outbound,
        whatsapp_message_id: input.whatsapp_message_id || null
      })
      .returning()
      .execute();

    const message = result[0];
    return message;
  } catch (error) {
    console.error('Message creation failed:', error);
    throw error;
  }
};
