
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contactsTable, messagesTable } from '../db/schema';
import { type UpdateMessageStatusInput } from '../schema';
import { updateMessageStatus } from '../handlers/update_message_status';
import { eq } from 'drizzle-orm';

describe('updateMessageStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let contactId: number;
  let messageId: number;

  beforeEach(async () => {
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
    userId = userResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: userId,
        phone_number: '+1234567890',
        first_name: 'Test',
        last_name: 'Contact',
        email: 'contact@example.com'
      })
      .returning()
      .execute();
    contactId = contactResult[0].id;

    // Create test message
    const messageResult = await db.insert(messagesTable)
      .values({
        user_id: userId,
        contact_id: contactId,
        content: 'Test message',
        is_outbound: true,
        status: 'sent',
        whatsapp_message_id: 'wa_msg_123'
      })
      .returning()
      .execute();
    messageId = messageResult[0].id;
  });

  it('should update message status', async () => {
    const input: UpdateMessageStatusInput = {
      id: messageId,
      status: 'delivered'
    };

    const result = await updateMessageStatus(input);

    expect(result.id).toEqual(messageId);
    expect(result.status).toEqual('delivered');
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.content).toEqual('Test message');
    expect(result.is_outbound).toEqual(true);
    expect(result.whatsapp_message_id).toEqual('wa_msg_123');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const input: UpdateMessageStatusInput = {
      id: messageId,
      status: 'read'
    };

    await updateMessageStatus(input);

    // Verify the status was updated in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].status).toEqual('read');
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent message', async () => {
    const input: UpdateMessageStatusInput = {
      id: 99999,
      status: 'delivered'
    };

    expect(updateMessageStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should update status to failed', async () => {
    const input: UpdateMessageStatusInput = {
      id: messageId,
      status: 'failed'
    };

    const result = await updateMessageStatus(input);

    expect(result.status).toEqual('failed');
    expect(result.id).toEqual(messageId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve other message fields when updating status', async () => {
    const input: UpdateMessageStatusInput = {
      id: messageId,
      status: 'delivered'
    };

    const result = await updateMessageStatus(input);

    // Verify all original fields are preserved
    expect(result.user_id).toEqual(userId);
    expect(result.contact_id).toEqual(contactId);
    expect(result.content).toEqual('Test message');
    expect(result.is_outbound).toEqual(true);
    expect(result.whatsapp_message_id).toEqual('wa_msg_123');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});
