
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteContact } from '../handlers/delete_contact';

describe('deleteContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing contact and return true', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        notes: 'Test contact'
      })
      .returning()
      .execute();

    const contactId = contactResult[0].id;

    // Delete the contact
    const result = await deleteContact(contactId);

    expect(result).toBe(true);

    // Verify contact is deleted from database
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contactId))
      .execute();

    expect(contacts).toHaveLength(0);
  });

  it('should return false when contact does not exist', async () => {
    const nonExistentId = 999999;

    const result = await deleteContact(nonExistentId);

    expect(result).toBe(false);
  });

  it('should not affect other contacts when deleting one', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two contacts
    const contactResults = await db.insert(contactsTable)
      .values([
        {
          user_id: userId,
          phone_number: '+1234567890',
          first_name: 'John',
          last_name: 'Doe'
        },
        {
          user_id: userId,
          phone_number: '+0987654321',
          first_name: 'Jane',
          last_name: 'Smith'
        }
      ])
      .returning()
      .execute();

    const contact1Id = contactResults[0].id;
    const contact2Id = contactResults[1].id;

    // Delete first contact
    const result = await deleteContact(contact1Id);

    expect(result).toBe(true);

    // Verify first contact is deleted
    const deletedContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contact1Id))
      .execute();

    expect(deletedContact).toHaveLength(0);

    // Verify second contact still exists
    const remainingContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contact2Id))
      .execute();

    expect(remainingContact).toHaveLength(1);
    expect(remainingContact[0].first_name).toBe('Jane');
  });
});
