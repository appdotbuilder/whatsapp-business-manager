
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type Contact } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getContacts(userId: number): Promise<Contact[]> {
  try {
    const results = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.user_id, userId))
      .orderBy(asc(contactsTable.first_name))
      .execute();

    return results;
  } catch (error) {
    console.error('Get contacts failed:', error);
    throw error;
  }
}
