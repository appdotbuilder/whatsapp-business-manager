
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messageTemplatesTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User'
};

const testContact = {
  phone_number: '+1234567890',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  notes: 'Test contact'
};

const testTemplate = {
  name: 'Welcome Template',
  content: 'Welcome to our service!',
  variables: ['name']
};

describe('sendMessage', () => {
  let userId: number;
  let contactId: number;
  let templateId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        user_id: userId
      })
      .returning()
      .execute();
    contactId = contactResult[0].id;

    // Create test template
    const templateResult = await db.insert(messageTemplatesTable)
      .values({
        ...testTemplate,
        user_id: userId
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  afterEach(resetDB);

  it('should send a message successfully', async () => {
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

  it('should use template content when template_id is provided', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'This should be ignored',
      template_id: templateId
    };

    const result = await sendMessage(input);

    expect(result.content).toEqual('Welcome to our service!');
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
  });

  it('should throw error for non-existent contact', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: 99999,
      content: 'Test message'
    };

    expect(sendMessage(input)).rejects.toThrow(/contact not found/i);
  });

  it('should throw error for contact belonging to different user', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Another',
        last_name: 'User'
      })
      .returning()
      .execute();

    const input: SendMessageInput = {
      user_id: anotherUserResult[0].id,
      contact_id: contactId, // This contact belongs to the first user
      content: 'Test message'
    };

    expect(sendMessage(input)).rejects.toThrow(/contact not found/i);
  });

  it('should throw error for non-existent template', async () => {
    const input: SendMessageInput = {
      user_id: userId,
      contact_id: contactId,
      content: 'Test message',
      template_id: 99999
    };

    expect(sendMessage(input)).rejects.toThrow(/template not found/i);
  });

  it('should throw error for template belonging to different user', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Another',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create a contact for the second user
    const anotherContactResult = await db.insert(contactsTable)
      .values({
        phone_number: '+9876543210',
        first_name: 'Jane',
        last_name: 'Smith',
        user_id: anotherUserResult[0].id
      })
      .returning()
      .execute();

    const input: SendMessageInput = {
      user_id: anotherUserResult[0].id,
      contact_id: anotherContactResult[0].id,
      content: 'Test message',
      template_id: templateId // This template belongs to the first user
    };

    expect(sendMessage(input)).rejects.toThrow(/template not found/i);
  });
});
