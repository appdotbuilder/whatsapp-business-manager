
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messageTemplatesTable } from '../db/schema';
import { type CreateMessageTemplateInput } from '../schema';
import { createMessageTemplate } from '../handlers/create_message_template';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User'
};

// Test input with variables
const testInputWithVariables: CreateMessageTemplateInput = {
  user_id: 1,
  name: 'Welcome Template',
  content: 'Hello {{name}}, welcome to our service! Your account {{account_id}} is now active.',
  variables: ['name', 'account_id']
};

// Test input without variables
const testInputWithoutVariables: CreateMessageTemplateInput = {
  user_id: 1,
  name: 'Simple Template',
  content: 'Thank you for your purchase!'
};

describe('createMessageTemplate', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  afterEach(resetDB);

  it('should create a message template with variables', async () => {
    const result = await createMessageTemplate(testInputWithVariables);

    // Basic field validation
    expect(result.name).toEqual('Welcome Template');
    expect(result.content).toEqual(testInputWithVariables.content);
    expect(result.variables).toEqual(['name', 'account_id']);
    expect(result.user_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a message template without variables', async () => {
    const result = await createMessageTemplate(testInputWithoutVariables);

    // Basic field validation
    expect(result.name).toEqual('Simple Template');
    expect(result.content).toEqual('Thank you for your purchase!');
    expect(result.variables).toBeNull();
    expect(result.user_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message template to database', async () => {
    const result = await createMessageTemplate(testInputWithVariables);

    // Query using proper drizzle syntax
    const templates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Welcome Template');
    expect(templates[0].content).toEqual(testInputWithVariables.content);
    expect(templates[0].variables).toEqual(['name', 'account_id']);
    expect(templates[0].user_id).toEqual(1);
    expect(templates[0].created_at).toBeInstanceOf(Date);
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty variables array', async () => {
    const inputWithEmptyVariables: CreateMessageTemplateInput = {
      user_id: 1,
      name: 'Empty Variables Template',
      content: 'Static message content',
      variables: []
    };

    const result = await createMessageTemplate(inputWithEmptyVariables);

    expect(result.variables).toEqual([]);
    expect(result.name).toEqual('Empty Variables Template');
    expect(result.content).toEqual('Static message content');
  });

  it('should fail when user does not exist', async () => {
    const inputWithInvalidUser: CreateMessageTemplateInput = {
      user_id: 999, // Non-existent user
      name: 'Test Template',
      content: 'Test content'
    };

    await expect(createMessageTemplate(inputWithInvalidUser))
      .rejects.toThrow(/violates foreign key constraint/i);
  });
});
