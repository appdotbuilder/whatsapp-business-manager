
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type Contact } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getContacts(userId: number): Promise<Contact[]> {
  try {
    const results = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.user_id, userId))
      .orderBy(desc(contactsTable.created_at))
      .execute();

    // Convert results to match Contact schema
    return results.map(contact => ({
      id: contact.id,
      user_id: contact.user_id,
      phone_number: contact.phone_number,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at
    }));
  } catch (error) {
    console.error('Failed to get contacts:', error);
    throw error;
  }
}
