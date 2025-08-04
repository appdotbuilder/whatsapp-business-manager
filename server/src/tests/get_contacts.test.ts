
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getContacts } from '../handlers/get_contacts';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe'
};

describe('getContacts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no contacts', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = users[0].id;

    const result = await getContacts(userId);

    expect(result).toEqual([]);
  });

  it('should return all contacts for a user', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create contacts
    await db.insert(contactsTable)
      .values([
        {
          user_id: userId,
          phone_number: '+1234567890',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          notes: 'Customer service contact'
        },
        {
          user_id: userId,
          phone_number: '+0987654321',
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com',
          notes: 'Sales lead'
        }
      ])
      .execute();

    const result = await getContacts(userId);

    expect(result).toHaveLength(2);
    
    // Verify contacts are ordered by first_name (Alice comes before Bob)
    expect(result[0].first_name).toEqual('Alice');
    expect(result[1].first_name).toEqual('Bob');
    
    // Verify all fields are returned correctly
    expect(result[0].phone_number).toEqual('+1234567890');
    expect(result[0].last_name).toEqual('Smith');
    expect(result[0].email).toEqual('alice@example.com');
    expect(result[0].notes).toEqual('Customer service contact');
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return contacts for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: testUser.email,
          password_hash: 'hashed_password',
          first_name: testUser.first_name,
          last_name: testUser.last_name
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          first_name: 'Jane',
          last_name: 'Smith'
        }
      ])
      .returning()
      .execute();

    const userId1 = users[0].id;
    const userId2 = users[1].id;

    // Create contacts for both users
    await db.insert(contactsTable)
      .values([
        {
          user_id: userId1,
          phone_number: '+1234567890',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          notes: 'Customer service contact'
        },
        {
          user_id: userId2,
          phone_number: '+0987654321',
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com',
          notes: 'Sales lead'
        }
      ])
      .execute();

    const result = await getContacts(userId1);

    expect(result).toHaveLength(1);
    expect(result[0].first_name).toEqual('Alice');
    expect(result[0].user_id).toEqual(userId1);
  });

  it('should handle contacts with nullable fields', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create contact with minimal required fields
    await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1234567890',
        first_name: 'Charlie',
        last_name: null,
        email: null,
        notes: null
      })
      .execute();

    const result = await getContacts(userId);

    expect(result).toHaveLength(1);
    expect(result[0].first_name).toEqual('Charlie');
    expect(result[0].last_name).toBeNull();
    expect(result[0].email).toBeNull();
    expect(result[0].notes).toBeNull();
  });
});
