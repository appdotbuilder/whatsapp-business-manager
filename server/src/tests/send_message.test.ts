
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messageTemplatesTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let contactId: number;
  let templateId: number;

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
    userId = userResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    contactId = contactResult[0].id;

    // Create test template
    const templateResult = await db.insert(messageTemplatesTable)
      .values({
        user_id: userId,
        name: 'Test Template',
        content: 'Hello from template!',
        variables: ['name']
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  it('should send a message with custom content', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'Hello, this is a test message!'
    };

    const result = await sendMessage(input);

    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.is_outbound).toBe(true);
    expect(result.status).toEqual('sent');
    expect(result.whatsapp_message_id).toBeDefined();
    expect(result.whatsapp_message_id).toMatch(/^wa_msg_/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should send a message using template content', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'This content should be replaced',
      template_id: templateId
    };

    const result = await sendMessage(input);

    expect(result.content).toEqual('Hello from template!');
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.is_outbound).toBe(true);
    expect(result.status).toEqual('sent');
  });

  it('should save message to database', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'Database test message'
    };

    const result = await sendMessage(input);

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Database test message');
    expect(messages[0].user_id).toEqual(userId);
    expect(messages[0].contact_id).toEqual(contactId);
    expect(messages[0].is_outbound).toBe(true);
    expect(messages[0].status).toEqual('sent');
  });

  it('should throw error for non-existent contact', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: 99999, // Non-existent contact
      content: 'Test message'
    };

    expect(sendMessage(input)).rejects.toThrow(/Contact not found/i);
  });

  it('should throw error when contact does not belong to user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Other',
        last_name: 'User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    const input: SendMessageInput = {
      user_id: otherUserId,
      contact_id: contactId, // Contact belongs to different user
      content: 'Test message'
    };

    expect(sendMessage(input)).rejects.toThrow(/Contact not found/i);
  });

  it('should throw error for non-existent template', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'Test message',
      template_id: 99999 // Non-existent template
    };

    expect(sendMessage(input)).rejects.toThrow(/Template not found/i);
  });

  it('should throw error when template does not belong to user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Other',
        last_name: 'User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create a contact for the other user
    const otherContactResult = await db.insert(contactsTable)
      .values({
        user_id: otherUserId,
        phone_number: '+9876543210',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com'
      })
      .returning()
      .execute();
    const otherContactId = otherContactResult[0].id;

    const input: SendMessageInput = {
      user_id: otherUserId,
      contact_id: otherContactId, // Contact belongs to other user
      content: 'Test message',
      template_id: templateId // Template belongs to different user
    };

    expect(sendMessage(input)).rejects.toThrow(/Template not found/i);
  });
});
