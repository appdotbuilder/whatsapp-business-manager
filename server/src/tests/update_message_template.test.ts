
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

  let userId: number;
  let templateId: number;

  beforeEach(async () => {
    // Create a user first
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

    // Create a message template
    const templateResult = await db.insert(messageTemplatesTable)
      .values({
        user_id: userId,
        name: 'Original Template',
        content: 'Original content with {name}',
        variables: ['name']
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  it('should update message template name', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      name: 'Updated Template Name'
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(templateId);
    expect(result.name).toEqual('Updated Template Name');
    expect(result.content).toEqual('Original content with {name}');
    expect(result.variables).toEqual(['name']);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update message template content', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      content: 'Updated content with {first_name} and {last_name}'
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(templateId);
    expect(result.name).toEqual('Original Template');
    expect(result.content).toEqual('Updated content with {first_name} and {last_name}');
    expect(result.variables).toEqual(['name']);
  });

  it('should update message template variables', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      variables: ['first_name', 'last_name', 'company']
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(templateId);
    expect(result.name).toEqual('Original Template');
    expect(result.content).toEqual('Original content with {name}');
    expect(result.variables).toEqual(['first_name', 'last_name', 'company']);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      name: 'Completely Updated Template',
      content: 'New content with {customer_name}',
      variables: ['customer_name']
    };

    const result = await updateMessageTemplate(input);

    expect(result.id).toEqual(templateId);
    expect(result.name).toEqual('Completely Updated Template');
    expect(result.content).toEqual('New content with {customer_name}');
    expect(result.variables).toEqual(['customer_name']);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set variables to null', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      variables: null
    };

    const result = await updateMessageTemplate(input);

    expect(result.variables).toBeNull();
  });

  it('should save updates to database', async () => {
    const input: UpdateMessageTemplateInput = {
      id: templateId,
      name: 'Database Test Template',
      content: 'Database test content'
    };

    await updateMessageTemplate(input);

    const templates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, templateId))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Database Test Template');
    expect(templates[0].content).toEqual('Database test content');
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent template', async () => {
    const input: UpdateMessageTemplateInput = {
      id: 99999,
      name: 'Non-existent Template'
    };

    expect(updateMessageTemplate(input)).rejects.toThrow(/not found/i);
  });

  it('should update timestamp on every update', async () => {
    const originalTemplate = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, templateId))
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateMessageTemplateInput = {
      id: templateId,
      name: 'Timestamp Test'
    };

    const result = await updateMessageTemplate(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalTemplate[0].updated_at.getTime());
  });
});
