
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contactsTable, usersTable } from '../db/schema';
import { type CreateContactInput, type CreateUserInput } from '../schema';
import { createContact } from '../handlers/create_contact';
import { eq } from 'drizzle-orm';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

// Test contact data
const testContactInput: CreateContactInput = {
  user_id: 1, // Will be updated after user creation
  phone_number: '+1234567890',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  notes: 'Test contact notes'
};

describe('createContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a contact with all fields', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const contactInput = { ...testContactInput, user_id: userId };

    const result = await createContact(contactInput);

    // Verify returned contact data
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.notes).toEqual('Test contact notes');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a contact with minimal fields', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const minimalContactInput: CreateContactInput = {
      user_id: userId,
      phone_number: '+9876543210',
      first_name: 'Jane'
    };

    const result = await createContact(minimalContactInput);

    // Verify returned contact data
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.phone_number).toEqual('+9876543210');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual(null);
    expect(result.email).toEqual(null);
    expect(result.notes).toEqual(null);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save contact to database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const contactInput = { ...testContactInput, user_id: userId };

    const result = await createContact(contactInput);

    // Query database to verify contact was saved
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, result.id))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].user_id).toEqual(userId);
    expect(contacts[0].phone_number).toEqual('+1234567890');
    expect(contacts[0].first_name).toEqual('John');
    expect(contacts[0].last_name).toEqual('Doe');
    expect(contacts[0].email).toEqual('john.doe@example.com');
    expect(contacts[0].notes).toEqual('Test contact notes');
    expect(contacts[0].created_at).toBeInstanceOf(Date);
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;
    const contactInput = { ...testContactInput, user_id: nonExistentUserId };

    expect(async () => {
      await createContact(contactInput);
    }).toThrow(/User with id 999 not found/i);
  });

  it('should handle phone number validation', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        first_name: testUserInput.first_name,
        last_name: testUserInput.last_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const contactInput = {
      ...testContactInput,
      user_id: userId,
      phone_number: '+447911123456' // UK format
    };

    const result = await createContact(contactInput);

    expect(result.phone_number).toEqual('+447911123456');
    expect(result.user_id).toEqual(userId);
    expect(result.first_name).toEqual('John');
  });
});
