
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messageTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteMessageTemplate } from '../handlers/delete_message_template';

describe('deleteMessageTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing message template', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create a test message template
    const templateResult = await db.insert(messageTemplatesTable)
      .values({
        user_id: userId,
        name: 'Test Template',
        content: 'Hello {name}!',
        variables: ['name']
      })
      .returning()
      .execute();
    const templateId = templateResult[0].id;

    const result = await deleteMessageTemplate(templateId);

    expect(result).toBe(true);

    // Verify template was deleted from database
    const templates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, templateId))
      .execute();

    expect(templates).toHaveLength(0);
  });

  it('should return false when deleting a non-existent template', async () => {
    const result = await deleteMessageTemplate(999);

    expect(result).toBe(false);
  });

  it('should not affect other templates when deleting one', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two test message templates
    const template1Result = await db.insert(messageTemplatesTable)
      .values({
        user_id: userId,
        name: 'Template 1',
        content: 'Hello {name}!',
        variables: ['name']
      })
      .returning()
      .execute();

    const template2Result = await db.insert(messageTemplatesTable)
      .values({
        user_id: userId,
        name: 'Template 2',
        content: 'Goodbye {name}!',
        variables: ['name']
      })
      .returning()
      .execute();

    const template1Id = template1Result[0].id;
    const template2Id = template2Result[0].id;

    // Delete first template
    const result = await deleteMessageTemplate(template1Id);
    expect(result).toBe(true);

    // Verify first template was deleted
    const deletedTemplates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, template1Id))
      .execute();
    expect(deletedTemplates).toHaveLength(0);

    // Verify second template still exists
    const remainingTemplates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, template2Id))
      .execute();
    expect(remainingTemplates).toHaveLength(1);
    expect(remainingTemplates[0].name).toBe('Template 2');
  });
});
