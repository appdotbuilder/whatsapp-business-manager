
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

  let testUserId: number;
  let testContactId: number;
  let testMessageId: number;

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
    
    testUserId = userResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        user_id: testUserId,
        phone_number: '+1234567890',
        first_name: 'Test',
        last_name: 'Contact'
      })
      .returning()
      .execute();
    
    testContactId = contactResult[0].id;

    // Create test message
    const messageResult = await db.insert(messagesTable)
      .values({
        user_id: testUserId,
        contact_id: testContactId,
        content: 'Test message',
        is_outbound: true,
        status: 'sent',
        whatsapp_message_id: 'wa_msg_123'
      })
      .returning()
      .execute();
    
    testMessageId = messageResult[0].id;
  });

  it('should update message status', async () => {
    const input: UpdateMessageStatusInput = {
      id: testMessageId,
      status: 'delivered'
    };

    const result = await updateMessageStatus(input);

    expect(result.id).toEqual(testMessageId);
    expect(result.status).toEqual('delivered');
    expect(result.user_id).toEqual(testUserId);
    expect(result.contact_id).toEqual(testContactId);
    expect(result.content).toEqual('Test message');
    expect(result.is_outbound).toEqual(true);
    expect(result.whatsapp_message_id).toEqual('wa_msg_123');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const input: UpdateMessageStatusInput = {
      id: testMessageId,
      status: 'read'
    };

    await updateMessageStatus(input);

    // Verify the status was updated in the database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, testMessageId))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].status).toEqual('read');
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update timestamp when status changes', async () => {
    // Get original timestamp
    const originalMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, testMessageId))
      .execute();

    const originalUpdatedAt = originalMessage[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateMessageStatusInput = {
      id: testMessageId,
      status: 'failed'
    };

    const result = await updateMessageStatus(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent message', async () => {
    const input: UpdateMessageStatusInput = {
      id: 99999,
      status: 'delivered'
    };

    await expect(updateMessageStatus(input)).rejects.toThrow(/Message with id 99999 not found/i);
  });

  it('should handle all valid status values', async () => {
    const statuses = ['sent', 'delivered', 'read', 'failed'] as const;

    for (const status of statuses) {
      const input: UpdateMessageStatusInput = {
        id: testMessageId,
        status
      };

      const result = await updateMessageStatus(input);
      expect(result.status).toEqual(status);
    }
  });
});
