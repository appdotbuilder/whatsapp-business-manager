
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetChatMessagesInput, type Message } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getChatMessages(input: GetChatMessagesInput): Promise<Message[]> {
  try {
    const whereConditions = and(
      eq(messagesTable.user_id, input.user_id),
      eq(messagesTable.contact_id, input.contact_id)
    );

    // Handle different pagination scenarios separately to avoid TypeScript issues
    let results: Message[];

    if (input.limit !== undefined && input.offset !== undefined) {
      // Both limit and offset provided
      results = await db.select()
        .from(messagesTable)
        .where(whereConditions)
        .orderBy(desc(messagesTable.created_at))
        .limit(input.limit)
        .offset(input.offset)
        .execute();
    } else if (input.limit !== undefined) {
      // Only limit provided
      results = await db.select()
        .from(messagesTable)
        .where(whereConditions)
        .orderBy(desc(messagesTable.created_at))
        .limit(input.limit)
        .execute();
    } else if (input.offset !== undefined) {
      // Only offset provided
      results = await db.select()
        .from(messagesTable)
        .where(whereConditions)
        .orderBy(desc(messagesTable.created_at))
        .offset(input.offset)
        .execute();
    } else {
      // No pagination
      results = await db.select()
        .from(messagesTable)
        .where(whereConditions)
        .orderBy(desc(messagesTable.created_at))
        .execute();
    }

    return results;
  } catch (error) {
    console.error('Get chat messages failed:', error);
    throw error;
  }
}
