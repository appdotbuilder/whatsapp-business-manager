
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteContact(contactId: number): Promise<boolean> {
  try {
    const result = await db.delete(contactsTable)
      .where(eq(contactsTable.id, contactId))
      .execute();

    // PostgreSQL delete returns an array with affected row count
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Contact deletion failed:', error);
    throw error;
  }
}
