
import { db } from '../db';
import { messageTemplatesTable } from '../db/schema';
import { type UpdateMessageTemplateInput, type MessageTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMessageTemplate = async (input: UpdateMessageTemplateInput): Promise<MessageTemplate> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    
    if (input.variables !== undefined) {
      updateData.variables = input.variables;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the message template
    const result = await db.update(messageTemplatesTable)
      .set(updateData)
      .where(eq(messageTemplatesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Message template with id ${input.id} not found`);
    }

    // Return with proper type casting for variables field
    const template = result[0];
    return {
      ...template,
      variables: template.variables as string[] | null
    };
  } catch (error) {
    console.error('Message template update failed:', error);
    throw error;
  }
};
