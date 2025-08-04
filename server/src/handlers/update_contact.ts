
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type UpdateContactInput, type Contact } from '../schema';
import { eq } from 'drizzle-orm';

export const updateContact = async (input: UpdateContactInput): Promise<Contact> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.phone_number !== undefined) {
      updateData.phone_number = input.phone_number;
    }
    
    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }
    
    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }
    
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update contact record
    const result = await db.update(contactsTable)
      .set(updateData)
      .where(eq(contactsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Contact with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Contact update failed:', error);
    throw error;
  }
};
