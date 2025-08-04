
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable } from '../db/schema';
import { getContacts } from '../handlers/get_contacts';

describe('getContacts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return contacts for a user', async () => {
    // Create user first
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

    // Create contacts for the user (first contact)
    await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        notes: 'Important client'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second contact
    await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+0987654321',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        notes: null
      })
      .execute();

    const contacts = await getContacts(userId);

    expect(contacts).toHaveLength(2);
    
    // Verify first contact (most recent - Jane)
    expect(contacts[0].user_id).toEqual(userId);
    expect(contacts[0].phone_number).toEqual('+0987654321');
    expect(contacts[0].first_name).toEqual('Jane');
    expect(contacts[0].last_name).toEqual('Smith');
    expect(contacts[0].email).toEqual('jane@example.com');
    expect(contacts[0].notes).toBeNull();
    expect(contacts[0].id).toBeDefined();
    expect(contacts[0].created_at).toBeInstanceOf(Date);
    expect(contacts[0].updated_at).toBeInstanceOf(Date);

    // Verify second contact (older - John)
    expect(contacts[1].user_id).toEqual(userId);
    expect(contacts[1].phone_number).toEqual('+1234567890');
    expect(contacts[1].first_name).toEqual('John');
    expect(contacts[1].last_name).toEqual('Doe');
    expect(contacts[1].email).toEqual('john@example.com');
    expect(contacts[1].notes).toEqual('Important client');
  });

  it('should return empty array for user with no contacts', async () => {
    // Create user without contacts
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

    const contacts = await getContacts(userId);

    expect(contacts).toHaveLength(0);
    expect(contacts).toEqual([]);
  });

  it('should only return contacts for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create contacts for both users
    await db.insert(contactsTable)
      .values([
        {
          user_id: user1Id,
          phone_number: '+1111111111',
          first_name: 'User1',
          last_name: 'Contact',
          email: 'user1contact@example.com',
          notes: null
        },
        {
          user_id: user2Id,
          phone_number: '+2222222222',
          first_name: 'User2',
          last_name: 'Contact',
          email: 'user2contact@example.com',
          notes: null
        }
      ])
      .execute();

    const user1Contacts = await getContacts(user1Id);
    const user2Contacts = await getContacts(user2Id);

    expect(user1Contacts).toHaveLength(1);
    expect(user1Contacts[0].user_id).toEqual(user1Id);
    expect(user1Contacts[0].first_name).toEqual('User1');

    expect(user2Contacts).toHaveLength(1);
    expect(user2Contacts[0].user_id).toEqual(user2Id);
    expect(user2Contacts[0].first_name).toEqual('User2');
  });

  it('should order contacts by creation date descending', async () => {
    // Create user
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

    // Create contacts with slight delay to ensure different timestamps
    const contact1Result = await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1111111111',
        first_name: 'First',
        last_name: 'Contact',
        email: null,
        notes: null
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const contact2Result = await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+2222222222',
        first_name: 'Second',
        last_name: 'Contact',
        email: null,
        notes: null
      })
      .returning()
      .execute();

    const contacts = await getContacts(userId);

    expect(contacts).toHaveLength(2);
    // Most recent contact should be first
    expect(contacts[0].first_name).toEqual('Second');
    expect(contacts[1].first_name).toEqual('First');
    expect(contacts[0].created_at >= contacts[1].created_at).toBe(true);
  });
});
