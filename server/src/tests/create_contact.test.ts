
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contactsTable, usersTable } from '../db/schema';
import { type CreateContactInput } from '../schema';
import { createContact } from '../handlers/create_contact';
import { eq } from 'drizzle-orm';

describe('createContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  const testInput: CreateContactInput = {
    user_id: 0, // Will be set to testUserId in tests
    phone_number: '+1234567890',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    notes: 'Test contact for business'
  };

  it('should create a contact with all fields', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createContact(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.notes).toEqual('Test contact for business');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a contact with optional fields as null', async () => {
    const input: CreateContactInput = {
      user_id: testUserId,
      phone_number: '+1987654321',
      first_name: 'Bob'
    };

    const result = await createContact(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.phone_number).toEqual('+1987654321');
    expect(result.first_name).toEqual('Bob');
    expect(result.last_name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save contact to database', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createContact(input);

    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, result.id))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].user_id).toEqual(testUserId);
    expect(contacts[0].phone_number).toEqual('+1234567890');
    expect(contacts[0].first_name).toEqual('Jane');
    expect(contacts[0].last_name).toEqual('Smith');
    expect(contacts[0].email).toEqual('jane.smith@example.com');
    expect(contacts[0].notes).toEqual('Test contact for business');
    expect(contacts[0].created_at).toBeInstanceOf(Date);
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, user_id: 99999 }; // Non-existent user ID

    await expect(createContact(input)).rejects.toThrow(/user with id 99999 does not exist/i);
  });

  it('should handle explicitly null optional fields', async () => {
    const input: CreateContactInput = {
      user_id: testUserId,
      phone_number: '+1555666777',
      first_name: 'Alice',
      last_name: null,
      email: null,
      notes: null
    };

    const result = await createContact(input);

    expect(result.first_name).toEqual('Alice');
    expect(result.last_name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.notes).toBeNull();
  });
});
