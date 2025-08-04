
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { type UpdateContactInput } from '../schema';
import { updateContact } from '../handlers/update_contact';
import { eq } from 'drizzle-orm';

describe('updateContact', () => {
  let testUserId: number;
  let testContactId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
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

  afterEach(resetDB);

  it('should update contact with all fields', async () => {
    const updateInput: UpdateContactInput = {
      id: testContactId,
      phone_number: '+9876543210',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      notes: 'Updated notes'
    };

    const result = await updateContact(updateInput);

    expect(result.id).toEqual(testContactId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.phone_number).toEqual('+9876543210');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane@example.com');
    expect(result.notes).toEqual('Updated notes');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateContactInput = {
      id: testContactId,
      first_name: 'Jane',
      notes: 'New notes only'
    };

    const result = await updateContact(updateInput);

    expect(result.first_name).toEqual('Jane');
    expect(result.notes).toEqual('New notes only');
    // Other fields should remain unchanged
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('john@example.com');
  });

  it('should set nullable fields to null', async () => {
    const updateInput: UpdateContactInput = {
      id: testContactId,
      last_name: null,
      email: null,
      notes: null
    };

    const result = await updateContact(updateInput);

    expect(result.last_name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.notes).toBeNull();
    // Non-nullable fields should remain unchanged
    expect(result.first_name).toEqual('John');
    expect(result.phone_number).toEqual('+1234567890');
  });

  it('should save updated contact to database', async () => {
    const updateInput: UpdateContactInput = {
      id: testContactId,
      first_name: 'Updated Name',
      phone_number: '+5555555555'
    };

    await updateContact(updateInput);

    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, testContactId))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].first_name).toEqual('Updated Name');
    expect(contacts[0].phone_number).toEqual('+5555555555');
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, testContactId))
      .execute();
    const originalUpdatedAt = originalContact[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateContactInput = {
      id: testContactId,
      notes: 'Timestamp test'
    };

    const result = await updateContact(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when contact not found', async () => {
    const updateInput: UpdateContactInput = {
      id: 99999,
      first_name: 'Non-existent'
    };

    await expect(updateContact(updateInput)).rejects.toThrow(/Contact with id 99999 not found/i);
  });
});
