
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteContact(contactId: number): Promise<boolean> {
  try {
    const result = await db.delete(contactsTable)
      .where(eq(contactsTable.id, contactId))
      .returning({ id: contactsTable.id })
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Contact deletion failed:', error);
    throw error;
  }
}
