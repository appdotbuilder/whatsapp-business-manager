
import { db } from '../db';
import { messagesTable, contactsTable, messageTemplatesTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  try {
    // Verify contact exists and belongs to user
    const contacts = await db.select()
      .from(contactsTable)
      .where(and(
        eq(contactsTable.id, input.contact_id),
        eq(contactsTable.user_id, input.user_id)
      ))
      .execute();

    if (contacts.length === 0) {
      throw new Error('Contact not found or does not belong to user');
    }

    let messageContent = input.content;

    // If template_id is provided, fetch and use the template
    if (input.template_id) {
      const templates = await db.select()
        .from(messageTemplatesTable)
        .where(and(
          eq(messageTemplatesTable.id, input.template_id),
          eq(messageTemplatesTable.user_id, input.user_id)
        ))
        .execute();

      if (templates.length === 0) {
        throw new Error('Template not found or does not belong to user');
      }

      messageContent = templates[0].content;
    }

    // Store message in database
    const result = await db.insert(messagesTable)
      .values({
        user_id: input.user_id,
        contact_id: input.contact_id,
        content: messageContent,
        is_outbound: true,
        status: 'sent',
        whatsapp_message_id: `wa_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
}
