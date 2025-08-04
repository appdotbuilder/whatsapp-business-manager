
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetChatMessagesInput, type Message } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getChatMessages(input: GetChatMessagesInput): Promise<Message[]> {
  try {
    // Build the complete query in one chain
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    const results = await db.select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.user_id, input.user_id),
        eq(messagesTable.contact_id, input.contact_id)
      ))
      .orderBy(desc(messagesTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Return messages with proper types
    return results.map(message => ({
      ...message,
      created_at: message.created_at,
      updated_at: message.updated_at
    }));
  } catch (error) {
    console.error('Get chat messages failed:', error);
    throw error;
  }
}
