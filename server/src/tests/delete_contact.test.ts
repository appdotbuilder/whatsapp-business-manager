
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { deleteContact } from '../handlers/delete_contact';
import { eq } from 'drizzle-orm';

describe('deleteContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing contact', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test contact
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

    // Verify contact was deleted
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contactId))
      .execute();

    expect(contacts).toHaveLength(0);
  });

  it('should return false for non-existent contact', async () => {
    const result = await deleteContact(999);

    expect(result).toBe(false);
  });

  it('should not affect other contacts when deleting one', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two test contacts
    const contactsResult = await db.insert(contactsTable)
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

    const [contact1, contact2] = contactsResult;

    // Delete the first contact
    const result = await deleteContact(contact1.id);

    expect(result).toBe(true);

    // Verify first contact was deleted
    const deletedContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contact1.id))
      .execute();

    expect(deletedContact).toHaveLength(0);

    // Verify second contact still exists
    const remainingContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contact2.id))
      .execute();

    expect(remainingContact).toHaveLength(1);
    expect(remainingContact[0].first_name).toBe('Jane');
  });
});
