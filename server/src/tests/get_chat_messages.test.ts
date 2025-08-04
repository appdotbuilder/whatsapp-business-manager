
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messagesTable } from '../db/schema';
import { type GetChatMessagesInput, type CreateUserInput, type CreateContactInput, type CreateMessageInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

// Test data setup
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe'
};

const testContact: CreateContactInput = {
  user_id: 1, // Will be set after user creation
  phone_number: '+1234567890',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  notes: 'Test contact'
};

const createTestMessage = (userId: number, contactId: number, content: string, isOutbound: boolean): CreateMessageInput => ({
  user_id: userId,
  contact_id: contactId,
  content,
  is_outbound: isOutbound,
  whatsapp_message_id: `test_${Date.now()}_${Math.random()}`
});

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no messages exist', async () => {
    // Create user and contact first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: GetChatMessagesInput = {
      user_id: userResult[0].id,
      contact_id: contactResult[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toEqual([]);
  });

  it('should return messages for specific user and contact', async () => {
    // Create user and contact
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create test messages with explicit timestamps to ensure ordering
    const message1 = createTestMessage(userResult[0].id, contactResult[0].id, 'Hello there!', true);
    
    // Insert first message
    await db.insert(messagesTable)
      .values({
        user_id: message1.user_id,
        contact_id: message1.contact_id,
        content: message1.content,
        is_outbound: message1.is_outbound,
        status: 'sent',
        whatsapp_message_id: message1.whatsapp_message_id
      })
      .execute();

    // Add small delay to ensure different timestamps
    await delay(10);

    const message2 = createTestMessage(userResult[0].id, contactResult[0].id, 'How are you?', false);
    
    // Insert second message
    await db.insert(messagesTable)
      .values({
        user_id: message2.user_id,
        contact_id: message2.contact_id,
        content: message2.content,
        is_outbound: message2.is_outbound,
        status: 'delivered',
        whatsapp_message_id: message2.whatsapp_message_id
      })
      .execute();

    const input: GetChatMessagesInput = {
      user_id: userResult[0].id,
      contact_id: contactResult[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('How are you?'); // Newest first due to desc order
    expect(result[0].is_outbound).toEqual(false);
    expect(result[0].status).toEqual('delivered');
    expect(result[1].content).toEqual('Hello there!');
    expect(result[1].is_outbound).toEqual(true);
    expect(result[1].status).toEqual('sent');

    // Verify all fields are present
    result.forEach(message => {
      expect(message.id).toBeDefined();
      expect(message.user_id).toEqual(userResult[0].id);
      expect(message.contact_id).toEqual(contactResult[0].id);
      expect(message.created_at).toBeInstanceOf(Date);
      expect(message.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter messages by user and contact correctly', async () => {
    // Create two users and contacts
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'password123',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'password123',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const contact1Result = await db.insert(contactsTable)
      .values({
        user_id: user1Result[0].id,
        phone_number: '+1111111111',
        first_name: 'Contact',
        last_name: 'One'
      })
      .returning()
      .execute();

    const contact2Result = await db.insert(contactsTable)
      .values({
        user_id: user2Result[0].id,
        phone_number: '+2222222222',
        first_name: 'Contact',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create messages for different user-contact pairs
    await db.insert(messagesTable)
      .values([
        {
          user_id: user1Result[0].id,
          contact_id: contact1Result[0].id,
          content: 'Message for user1-contact1',
          is_outbound: true,
          status: 'sent'
        },
        {
          user_id: user2Result[0].id,
          contact_id: contact2Result[0].id,
          content: 'Message for user2-contact2',
          is_outbound: true,
          status: 'sent'
        }
      ])
      .execute();

    // Query messages for user1-contact1
    const input: GetChatMessagesInput = {
      user_id: user1Result[0].id,
      contact_id: contact1Result[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message for user1-contact1');
    expect(result[0].user_id).toEqual(user1Result[0].id);
    expect(result[0].contact_id).toEqual(contact1Result[0].id);
  });

  it('should apply pagination correctly', async () => {
    // Create user and contact
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create 5 test messages with small delays to ensure ordering
    for (let i = 1; i <= 5; i++) {
      await db.insert(messagesTable)
        .values({
          user_id: userResult[0].id,
          contact_id: contactResult[0].id,
          content: `Message ${i}`,
          is_outbound: i % 2 === 0,
          status: 'sent'
        })
        .execute();
      
      // Small delay to ensure different timestamps
      if (i < 5) await delay(5);
    }

    // Test limit
    const limitInput: GetChatMessagesInput = {
      user_id: userResult[0].id,
      contact_id: contactResult[0].id,
      limit: 3
    };

    const limitResult = await getChatMessages(limitInput);
    expect(limitResult).toHaveLength(3);

    // Test offset
    const offsetInput: GetChatMessagesInput = {
      user_id: userResult[0].id,
      contact_id: contactResult[0].id,
      limit: 2,
      offset: 2
    };

    const offsetResult = await getChatMessages(offsetInput);
    expect(offsetResult).toHaveLength(2);

    // Verify no overlap between paginated results
    const firstPageIds = limitResult.slice(0, 2).map(m => m.id);
    const secondPageIds = offsetResult.map(m => m.id);
    
    firstPageIds.forEach(id => {
      expect(secondPageIds).not.toContain(id);
    });
  });

  it('should order messages by created_at descending', async () => {
    // Create user and contact
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create first message
    await db.insert(messagesTable)
      .values({
        user_id: userResult[0].id,
        contact_id: contactResult[0].id,
        content: 'First message',
        is_outbound: true,
        status: 'sent'
      })
      .execute();

    // Add delay to ensure different timestamp
    await delay(10);

    // Create second message
    await db.insert(messagesTable)
      .values({
        user_id: userResult[0].id,
        contact_id: contactResult[0].id,
        content: 'Second message',
        is_outbound: false,
        status: 'delivered'
      })
      .execute();

    const input: GetChatMessagesInput = {
      user_id: userResult[0].id,
      contact_id: contactResult[0].id
    };

    const result = await getChatMessages(input);

    expect(result).toHaveLength(2);
    
    // Verify descending order - newer messages first
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].content).toEqual('Second message'); // Second message should be first due to desc order
    expect(result[1].content).toEqual('First message');
  });
});
