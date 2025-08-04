
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { type UpdateContactInput } from '../schema';
import { updateContact } from '../handlers/update_contact';
import { eq } from 'drizzle-orm';

describe('updateContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testContactId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: testUserId,
        phone_number: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        notes: 'Original notes'
      })
      .returning()
      .execute();
    testContactId = contactResult[0].id;
  });

  it('should update contact phone number', async () => {
    const input: UpdateContactInput = {
      id: testContactId,
      phone_number: '+9876543210'
    };

    const result = await updateContact(input);

    expect(result.id).toEqual(testContactId);
    expect(result.phone_number).toEqual('+9876543210');
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.email).toEqual('john@example.com'); // Unchanged
    expect(result.notes).toEqual('Original notes'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update contact first name', async () => {
    const input: UpdateContactInput = {
      id: testContactId,
      first_name: 'Jane'
    };

    const result = await updateContact(input);

    expect(result.first_name).toEqual('Jane');
    expect(result.phone_number).toEqual('+1234567890'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateContactInput = {
      id: testContactId,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      notes: 'Updated notes'
    };

    const result = await updateContact(input);

    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.notes).toEqual('Updated notes');
    expect(result.phone_number).toEqual('+1234567890'); // Unchanged
  });

  it('should set nullable fields to null', async () => {
    const input: UpdateContactInput = {
      id: testContactId,
      last_name: null,
      email: null,
      notes: null
    };

    const result = await updateContact(input);

    expect(result.last_name).toBeNull();
    expect(result.email).toBeNull(); 
    expect(result.notes).toBeNull();
    expect(result.first_name).toEqual('John'); // Unchanged
  });

  it('should save changes to database', async () => {
    const input: UpdateContactInput = {
      id: testContactId,
      first_name: 'Updated Name',
      notes: 'Updated notes'
    };

    await updateContact(input);

    // Verify changes in database
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, testContactId))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].first_name).toEqual('Updated Name');
    expect(contacts[0].notes).toEqual('Updated notes');
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent contact', async () => {
    const input: UpdateContactInput = {
      id: 999999,
      first_name: 'Jane'
    };

    expect(updateContact(input)).rejects.toThrow(/not found/i);
  });

  it('should update timestamp when making changes', async () => {
    // Get original timestamp
    const originalContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, testContactId))
      .execute();
    const originalTimestamp = originalContact[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateContactInput = {
      id: testContactId,
      first_name: 'Updated'
    };

    const result = await updateContact(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalTimestamp).toBe(true);
  });
});
