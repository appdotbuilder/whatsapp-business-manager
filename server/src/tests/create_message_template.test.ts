
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messageTemplatesTable } from '../db/schema';
import { type CreateMessageTemplateInput } from '../schema';
import { createMessageTemplate } from '../handlers/create_message_template';
import { eq } from 'drizzle-orm';

// Test user for foreign key constraints
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User'
};

// Simple test input without variables
const testInput: CreateMessageTemplateInput = {
  user_id: 1, // Will be set after user creation
  name: 'Welcome Template',
  content: 'Welcome to our service! How can we help you today?'
};

// Test input with variables
const testInputWithVariables: CreateMessageTemplateInput = {
  user_id: 1, // Will be set after user creation
  name: 'Personalized Welcome',
  content: 'Hello {{firstName}}, welcome to {{serviceName}}!',
  variables: ['firstName', 'serviceName']
};

describe('createMessageTemplate', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user for foreign key constraint
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    testInput.user_id = userId;
    testInputWithVariables.user_id = userId;
  });

  afterEach(resetDB);

  it('should create a message template without variables', async () => {
    const result = await createMessageTemplate(testInput);

    // Basic field validation
    expect(result.name).toEqual('Welcome Template');
    expect(result.content).toEqual('Welcome to our service! How can we help you today?');
    expect(result.user_id).toEqual(testInput.user_id);
    expect(result.variables).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a message template with variables', async () => {
    const result = await createMessageTemplate(testInputWithVariables);

    // Basic field validation
    expect(result.name).toEqual('Personalized Welcome');
    expect(result.content).toEqual('Hello {{firstName}}, welcome to {{serviceName}}!');
    expect(result.user_id).toEqual(testInputWithVariables.user_id);
    expect(result.variables).toEqual(['firstName', 'serviceName']);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message template to database', async () => {
    const result = await createMessageTemplate(testInput);

    // Query using proper drizzle syntax
    const messageTemplates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, result.id))
      .execute();

    expect(messageTemplates).toHaveLength(1);
    expect(messageTemplates[0].name).toEqual('Welcome Template');
    expect(messageTemplates[0].content).toEqual(testInput.content);
    expect(messageTemplates[0].user_id).toEqual(testInput.user_id);
    expect(messageTemplates[0].variables).toBeNull();
    expect(messageTemplates[0].created_at).toBeInstanceOf(Date);
    expect(messageTemplates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save message template with variables to database', async () => {
    const result = await createMessageTemplate(testInputWithVariables);

    // Query the database
    const messageTemplates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, result.id))
      .execute();

    expect(messageTemplates).toHaveLength(1);
    expect(messageTemplates[0].name).toEqual('Personalized Welcome');
    expect(messageTemplates[0].content).toEqual(testInputWithVariables.content);
    expect(messageTemplates[0].user_id).toEqual(testInputWithVariables.user_id);
    expect(messageTemplates[0].variables).toEqual(['firstName', 'serviceName']);
  });

  it('should handle null variables when none provided', async () => {
    const inputWithoutVariables = {
      user_id: testInput.user_id,
      name: 'Simple Template',
      content: 'This is a simple message without variables'
    };

    const result = await createMessageTemplate(inputWithoutVariables);

    expect(result.variables).toBeNull();

    // Verify in database
    const messageTemplates = await db.select()
      .from(messageTemplatesTable)
      .where(eq(messageTemplatesTable.id, result.id))
      .execute();

    expect(messageTemplates[0].variables).toBeNull();
  });

  it('should throw error for non-existent user_id', async () => {
    const invalidInput = {
      ...testInput,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createMessageTemplate(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
