
import { db } from '../db';
import { messageTemplatesTable } from '../db/schema';
import { type CreateMessageTemplateInput, type MessageTemplate } from '../schema';

export const createMessageTemplate = async (input: CreateMessageTemplateInput): Promise<MessageTemplate> => {
  try {
    // Insert message template record
    const result = await db.insert(messageTemplatesTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        content: input.content,
        variables: input.variables || null
      })
      .returning()
      .execute();

    const messageTemplate = result[0];
    return {
      ...messageTemplate,
      variables: messageTemplate.variables as string[] | null // Type assertion for JSONB field
    };
  } catch (error) {
    console.error('Message template creation failed:', error);
    throw error;
  }
};
