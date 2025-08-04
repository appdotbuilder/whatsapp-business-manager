
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messagesTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

// Test input for creating a message
const testInput: CreateMessageInput = {
  user_id: 1,
  contact_id: 1,
  content: 'Hello, this is a test message!',
  is_outbound: true,
  whatsapp_message_id: 'whatsapp_msg_123'
};

describe('createMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a message', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe'
    }).execute();

    // Create prerequisite contact
    await db.insert(contactsTable).values({
      user_id: 1,
      phone_number: '+1234567890',
      first_name: 'Jane'
    }).execute();

    const result = await createMessage(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.contact_id).toEqual(1);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.is_outbound).toEqual(true);
    expect(result.whatsapp_message_id).toEqual('whatsapp_msg_123');
    expect(result.status).toEqual('sent'); // Default status
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe'
    }).execute();

    // Create prerequisite contact
    await db.insert(contactsTable).values({
      user_id: 1,
      phone_number: '+1234567890',
      first_name: 'Jane'
    }).execute();

    const result = await createMessage(testInput);

    // Query to verify message was saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].user_id).toEqual(1);
    expect(messages[0].contact_id).toEqual(1);
    expect(messages[0].content).toEqual('Hello, this is a test message!');
    expect(messages[0].is_outbound).toEqual(true);
    expect(messages[0].whatsapp_message_id).toEqual('whatsapp_msg_123');
    expect(messages[0].status).toEqual('sent');
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null whatsapp_message_id', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe'
    }).execute();

    // Create prerequisite contact
    await db.insert(contactsTable).values({
      user_id: 1,
      phone_number: '+1234567890',
      first_name: 'Jane'
    }).execute();

    const inputWithoutWhatsAppId: CreateMessageInput = {
      user_id: 1,
      contact_id: 1,
      content: 'Message without WhatsApp ID',
      is_outbound: false
    };

    const result = await createMessage(inputWithoutWhatsAppId);

    expect(result.whatsapp_message_id).toBeNull();
    expect(result.is_outbound).toEqual(false);
    expect(result.content).toEqual('Message without WhatsApp ID');
  });

  it('should fail with invalid foreign key constraints', async () => {
    // Try to create message without prerequisite user/contact
    await expect(createMessage(testInput))
      .rejects.toThrow(/violates foreign key constraint/i);
  });
});
