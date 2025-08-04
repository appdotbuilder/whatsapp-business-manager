
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messagesTable } from '../db/schema';
import { type GetChatMessagesInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get chat messages between user and contact', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test contact
    const contact = await db.insert(contactsTable)
      .values({
        user_id: user[0].id,
        phone_number: '+1234567890',
        first_name: 'Contact',
        last_name: 'Person',
        email: 'contact@example.com'
      })
      .returning()
      .execute();

    // Create test messages
    const message1 = await db.insert(messagesTable)
      .values({
        user_id: user[0].id,
        contact_id: contact[0].id,
        content: 'Hello there!',
        is_outbound: true,
        status: 'sent'
      })
      .returning()
      .execute();

    const message2 = await db.insert(messagesTable)
      .values({
        user_id: user[0].id,
        contact_id: contact[0].id,
        content: 'Hi back!',
        is_outbound: false,
        status: 'delivered'
      })
      .returning()
      .execute();

    const input: GetChatMessagesInput = {
      user_id: user[0].id,
      contact_id: contact[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    
    // Check messages are ordered by creation date (newest first)
    expect(result[0].content).toEqual('Hi back!');
    expect(result[1].content).toEqual('Hello there!');
    
    // Validate message properties
    expect(result[0].user_id).toEqual(user[0].id);
    expect(result[0].contact_id).toEqual(contact[0].id);
    expect(result[0].is_outbound).toEqual(false);
    expect(result[0].status).toEqual('delivered');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no messages exist', async () => {
    // Create test user and contact without messages
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        user_id: user[0].id,
        phone_number: '+1234567890',
        first_name: 'Contact',
        last_name: 'Person'
      })
      .returning()
      .execute();

    const input: GetChatMessagesInput = {
      user_id: user[0].id,
      contact_id: contact[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should respect pagination limits', async () => {
    // Create test user and contact
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        user_id: user[0].id,
        phone_number: '+1234567890',
        first_name: 'Contact',
        last_name: 'Person'
      })
      .returning()
      .execute();

    // Create multiple messages
    for (let i = 1; i <= 5; i++) {
      await db.insert(messagesTable)
        .values({
          user_id: user[0].id,
          contact_id: contact[0].id,
          content: `Message ${i}`,
          is_outbound: true,
          status: 'sent'
        })
        .execute();
    }

    const input: GetChatMessagesInput = {
      user_id: user[0].id,
      contact_id: contact[0].id,
      limit: 2,
      offset: 1
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    // Should skip the first (newest) message and return the next 2
    expect(result[0].content).toEqual('Message 4');
    expect(result[1].content).toEqual('Message 3');
  });

  it('should only return messages for specified user and contact', async () => {
    // Create test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create contacts for both users
    const contact1 = await db.insert(contactsTable)
      .values({
        user_id: user1[0].id,
        phone_number: '+1234567890',
        first_name: 'Contact',
        last_name: 'One'
      })
      .returning()
      .execute();

    const contact2 = await db.insert(contactsTable)
      .values({
        user_id: user2[0].id,
        phone_number: '+0987654321',
        first_name: 'Contact',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create messages for both conversations
    await db.insert(messagesTable)
      .values({
        user_id: user1[0].id,
        contact_id: contact1[0].id,
        content: 'Message for user1-contact1',
        is_outbound: true,
        status: 'sent'
      })
      .execute();

    await db.insert(messagesTable)
      .values({
        user_id: user2[0].id,
        contact_id: contact2[0].id,
        content: 'Message for user2-contact2',
        is_outbound: true,
        status: 'sent'
      })
      .execute();

    const input: GetChatMessagesInput = {
      user_id: user1[0].id,
      contact_id: contact1[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message for user1-contact1');
    expect(result[0].user_id).toEqual(user1[0].id);
    expect(result[0].contact_id).toEqual(contact1[0].id);
  });
});
