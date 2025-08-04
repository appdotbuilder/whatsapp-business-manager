
import { db } from '../db';
import { contactsTable, usersTable } from '../db/schema';
import { type CreateContactInput, type Contact } from '../schema';
import { eq } from 'drizzle-orm';

export async function createContact(input: CreateContactInput): Promise<Contact> {
  try {
    // Verify that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert contact record
    const result = await db.insert(contactsTable)
      .values({
        user_id: input.user_id,
        phone_number: input.phone_number,
        first_name: input.first_name,
        last_name: input.last_name || null,
        email: input.email || null,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Contact creation failed:', error);
    throw error;
  }
}
