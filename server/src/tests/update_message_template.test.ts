
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messageTemplatesTable } from '../db/schema';
import { type UpdateMessageTemplateInput } from '../schema';
import { updateMessageTemplate } from '../handlers/update_message_template';
import { eq } from 'drizzle-orm';

describe('updateMessageTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTemplateId: number;

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

    // Create test message template
    const templateResult = await db.insert(messageTemplatesTable)
      .values({
        user_id: testUserId,
        name: 'Original Template',
        content: 'Hello {{name}}, welcome!',
        variables: ['name']
      })
      .returning()
      .execute();

    testTemplateId = templateResult[0].id;
  });

  it('should update template name', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      name: 'Updated Template Name'
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(testTemplateId);
    expect(result.name).toEqual('Updated Template Name');
    expect(result.content).toEqual('Hello {{name}}, welcome!'); // Should remain unchanged
    expect(result.variables).toEqual(['name']); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update template content', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      content: 'Hi {{firstName}}, thanks for joining us!'
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(testTemplateId);
    expect(result.name).toEqual('Original Template'); // Should remain unchanged
    expect(result.content).toEqual('Hi {{firstName}}, thanks for joining us!');
    expect(result.variables).toEqual(['name']); // Should remain unchanged
  });

  it('should update template variables', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      variables: ['firstName', 'lastName']
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(testTemplateId);
    expect(result.name).toEqual('Original Template'); // Should remain unchanged
    expect(result.content).toEqual('Hello {{name}}, welcome!'); // Should remain unchanged
    expect(result.variables).toEqual(['firstName', 'lastName']);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      name: 'Welcome Message',
      content: 'Welcome {{firstName}} {{lastName}}!',
      variables: ['firstName', 'lastName']
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(testTemplateId);
    expect(result.name).toEqual('Welcome Message');
    expect(result.content).toEqual('Welcome {{firstName}} {{lastName}}!');
    expect(result.variables).toEqual(['firstName', 'lastName']);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set variables to null', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      variables: null
    };

    const result = await updateMessageTemplate(input);

    expect(result.variables).toBeNull();
  });

  it('should save changes to database', async () => {
    const input: UpdateMessageTemplateInput = {
      id: testTemplateId,
      name: 'Database Test Template',
      content: 'Testing database persistence'
    };

    await updateMessageTemplate(input);

    // Verify changes were saved to database
    const templates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, testTemplateId))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Database Test Template');
    expect(templates[0].content).toEqual('Testing database persistence');
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent template', async () => {
    const input: UpdateMessageTemplateInput = {
      id: 99999,
      name: 'Non-existent Template'
    };

    expect(updateMessageTemplate(input)).rejects.toThrow(/not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const originalTemplate = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, testTemplateId))
      .execute();

    const input: UpdateMessageTemplateInput = {
      id: testTemplateId
    };

    const result = await updateMessageTemplate(input);

    expect(result.name).toEqual(originalTemplate[0].name);
    expect(result.content).toEqual(originalTemplate[0].content);
    expect(result.variables).toEqual(originalTemplate[0].variables as string[] | null);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalTemplate[0].updated_at).toBe(true);
  });
});
