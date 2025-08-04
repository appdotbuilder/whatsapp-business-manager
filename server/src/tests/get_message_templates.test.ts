
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messageTemplatesTable } from '../db/schema';
import { type CreateUserInput, type CreateMessageTemplateInput } from '../schema';
import { getMessageTemplates } from '../handlers/get_message_templates';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const testTemplate1: CreateMessageTemplateInput = {
  user_id: 1,
  name: 'Welcome Message',
  content: 'Hello {{name}}, welcome to our service!',
  variables: ['name']
};

const testTemplate2: CreateMessageTemplateInput = {
  user_id: 1,
  name: 'Reminder',
  content: 'Don\'t forget your appointment on {{date}} at {{time}}.',
  variables: ['date', 'time']
};

const testTemplate3: CreateMessageTemplateInput = {
  user_id: 2,
  name: 'Other User Template',
  content: 'This belongs to another user.',
  variables: null
};

describe('getMessageTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no templates', async () => {
    // Create user but no templates
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(0);
  });

  it('should return templates for specific user only', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          email: testUser.email,
          password_hash: 'hashed_password',
          first_name: testUser.first_name,
          last_name: testUser.last_name
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          first_name: 'Other',
          last_name: 'User'
        }
      ])
      .execute();

    // Create templates for both users
    await db.insert(messageTemplatesTable)
      .values([
        {
          user_id: testTemplate1.user_id,
          name: testTemplate1.name,
          content: testTemplate1.content,
          variables: JSON.stringify(testTemplate1.variables)
        },
        {
          user_id: testTemplate2.user_id,
          name: testTemplate2.name,
          content: testTemplate2.content,
          variables: JSON.stringify(testTemplate2.variables)
        },
        {
          user_id: testTemplate3.user_id,
          name: testTemplate3.name,
          content: testTemplate3.content,
          variables: testTemplate3.variables
        }
      ])
      .execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(2);
    expect(result.every(template => template.user_id === 1)).toBe(true);
    
    // Verify correct templates are returned
    const templateNames = result.map(t => t.name);
    expect(templateNames).toContain('Welcome Message');
    expect(templateNames).toContain('Reminder');
    expect(templateNames).not.toContain('Other User Template');
  });

  it('should return templates ordered by creation date descending', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    // Create templates with small delay to ensure different timestamps
    await db.insert(messageTemplatesTable)
      .values({
        user_id: testTemplate1.user_id,
        name: testTemplate1.name,
        content: testTemplate1.content,
        variables: JSON.stringify(testTemplate1.variables)
      })
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(messageTemplatesTable)
      .values({
        user_id: testTemplate2.user_id,
        name: testTemplate2.name,
        content: testTemplate2.content,
        variables: JSON.stringify(testTemplate2.variables)
      })
      .execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(2);
    
    // Should be ordered by created_at descending (newest first)
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[0].name).toBe('Reminder'); // Created second, should be first
    expect(result[1].name).toBe('Welcome Message'); // Created first, should be second
  });

  it('should correctly handle variables field', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    // Create templates with different variable configurations
    await db.insert(messageTemplatesTable)
      .values([
        {
          user_id: testTemplate1.user_id,
          name: testTemplate1.name,
          content: testTemplate1.content,
          variables: JSON.stringify(testTemplate1.variables) // Array of strings
        },
        {
          user_id: 1,
          name: 'No Variables Template',
          content: 'Simple message with no variables.',
          variables: null // Null variables
        }
      ])
      .execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(2);
    
    // Find templates by name
    const withVariables = result.find(t => t.name === 'Welcome Message');
    const withoutVariables = result.find(t => t.name === 'No Variables Template');

    expect(withVariables?.variables).toEqual(['name']);
    expect(withoutVariables?.variables).toBeNull();
  });

  it('should include all required fields', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    // Create template
    await db.insert(messageTemplatesTable)
      .values({
        user_id: testTemplate1.user_id,
        name: testTemplate1.name,
        content: testTemplate1.content,
        variables: JSON.stringify(testTemplate1.variables)
      })
      .execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(1);
    
    const template = result[0];
    expect(template.id).toBeDefined();
    expect(template.user_id).toBe(1);
    expect(template.name).toBe('Welcome Message');
    expect(template.content).toBe('Hello {{name}}, welcome to our service!');
    expect(template.variables).toEqual(['name']);
    expect(template.created_at).toBeInstanceOf(Date);
    expect(template.updated_at).toBeInstanceOf(Date);
  });
});
