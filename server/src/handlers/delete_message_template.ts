
import { db } from '../db';
import { messageTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteMessageTemplate(templateId: number): Promise<boolean> {
  try {
    const result = await db.delete(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, templateId))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Message template deletion failed:', error);
    throw error;
  }
}
