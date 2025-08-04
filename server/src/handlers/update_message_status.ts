
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type UpdateMessageStatusInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMessageStatus = async (input: UpdateMessageStatusInput): Promise<Message> => {
  try {
    // Update message status and return the updated record
    const result = await db.update(messagesTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(messagesTable.id, input.id))
      .returning()
      .execute();

    if (!result || result.length === 0) {
      throw new Error(`Message with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Message status update failed:', error);
    throw error;
  }
};
