
import { db } from '../db';
import { messageTemplatesTable } from '../db/schema';
import { type MessageTemplate } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getMessageTemplates(userId: number): Promise<MessageTemplate[]> {
  try {
    const results = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.user_id, userId))
      .orderBy(desc(messageTemplatesTable.created_at))
      .execute();

    return results.map(template => ({
      ...template,
      variables: template.variables as string[] | null // Cast jsonb to proper type
    }));
  } catch (error) {
    console.error('Failed to fetch message templates:', error);
    throw error;
  }
}
