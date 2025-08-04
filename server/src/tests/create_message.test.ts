
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messagesTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

// Test input with required WhatsApp message ID
const testInputWithWhatsApp: CreateMessageInput = {
  user_id: 1,
  contact_id: 1,
  content: 'Hello from WhatsApp!',
  is_outbound: false,
  whatsapp_message_id: 'wamid.123456789'
};

// Test input without WhatsApp message ID (internal message)
const testInputInternal: CreateMessageInput = {
  user_id: 1,
  contact_id: 1,
  content: 'Internal message',
  is_outbound: true,
  whatsapp_message_id: null
};

describe('createMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create prerequisite test data
  const createTestData = async () => {
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

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: userResult[0].id,
        phone_number: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    return {
      userId: userResult[0].id,
      contactId: contactResult[0].id
    };
  };

  it('should create a message with WhatsApp ID', async () => {
    const { userId, contactId } = await createTestData();
    
    const input = {
      ...testInputWithWhatsApp,
      user_id: userId,
      contact_id: contactId
    };

    const result = await createMessage(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.content).toEqual('Hello from WhatsApp!');
    expect(result.is_outbound).toEqual(false);
    expect(result.status).toEqual('sent');
    expect(result.whatsapp_message_id).toEqual('wamid.123456789');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a message without WhatsApp ID', async () => {
    const { userId, contactId } = await createTestData();
    
    const input = {
      ...testInputInternal,
      user_id: userId,
      contact_id: contactId
    };

    const result = await createMessage(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.content).toEqual('Internal message');
    expect(result.is_outbound).toEqual(true);
    expect(result.status).toEqual('sent');
    expect(result.whatsapp_message_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const { userId, contactId } = await createTestData();
    
    const input = {
      ...testInputWithWhatsApp,
      user_id: userId,
      contact_id: contactId
    };

    const result = await createMessage(input);

    // Query using proper drizzle syntax
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].user_id).toEqual(userId);
    expect(messages[0].contact_id).toEqual(contactId);
    expect(messages[0].content).toEqual('Hello from WhatsApp!');
    expect(messages[0].is_outbound).toEqual(false);
    expect(messages[0].status).toEqual('sent');
    expect(messages[0].whatsapp_message_id).toEqual('wamid.123456789');
    expect(messages[0].created_at).toBeInstanceOf(Date);
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const { contactId } = await createTestData();
    
    const input = {
      ...testInputWithWhatsApp,
      user_id: 999, // Non-existent user ID
      contact_id: contactId
    };

    await expect(createMessage(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for non-existent contact', async () => {
    const { userId } = await createTestData();
    
    const input = {
      ...testInputWithWhatsApp,
      user_id: userId,
      contact_id: 999 // Non-existent contact ID
    };

    await expect(createMessage(input)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
