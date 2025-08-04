
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
  name: 'Welcome Template',
  content: 'Hello {{name}}, welcome to our service!',
  variables: ['name']
};

const testTemplate2: CreateMessageTemplateInput = {
  user_id: 1,
  name: 'Reminder Template',
  content: 'Hi {{name}}, this is a reminder about {{event}} on {{date}}.',
  variables: ['name', 'event', 'date']
};

describe('getMessageTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no templates', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: 'hashed_password',
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    const result = await getMessageTemplates(1);

    expect(result).toEqual([]);
  });

  it('should return all templates for a user ordered by creation date', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: 'hashed_password',
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create templates with slight delay to ensure different timestamps
    await db.insert(messageTemplatesTable).values({
      user_id: testTemplate1.user_id,
      name: testTemplate1.name,
      content: testTemplate1.content,
      variables: testTemplate1.variables
    }).execute();

    // Add delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(messageTemplatesTable).values({
      user_id: testTemplate2.user_id,
      name: testTemplate2.name,
      content: testTemplate2.content,
      variables: testTemplate2.variables
    }).execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(2);
    
    // Verify templates are ordered by creation date (newest first)
    expect(result[0].name).toBe('Reminder Template');
    expect(result[1].name).toBe('Welcome Template');
    
    // Verify first template
    expect(result[0].content).toBe('Hi {{name}}, this is a reminder about {{event}} on {{date}}.');
    expect(result[0].variables).toEqual(['name', 'event', 'date']);
    expect(result[0].user_id).toBe(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second template
    expect(result[1].content).toBe('Hello {{name}}, welcome to our service!');
    expect(result[1].variables).toEqual(['name']);
    expect(result[1].user_id).toBe(1);
  });

  it('should only return templates for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      {
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      },
      {
        email: 'user2@example.com',
        password_hash: 'hashed_password2',
        first_name: 'User',
        last_name: 'Two'
      }
    ]).execute();

    // Create templates for both users
    await db.insert(messageTemplatesTable).values([
      {
        user_id: 1,
        name: 'User 1 Template',
        content: 'Template for user 1',
        variables: null
      },
      {
        user_id: 2,
        name: 'User 2 Template',
        content: 'Template for user 2',
        variables: null
      }
    ]).execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('User 1 Template');
    expect(result[0].user_id).toBe(1);
  });

  it('should handle templates with null variables', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: 'hashed_password',
      first_name: testUser.first_name,
      last_name: testUser.last_name
    }).execute();

    // Create template with null variables
    await db.insert(messageTemplatesTable).values({
      user_id: 1,
      name: 'Simple Template',
      content: 'This is a simple message with no variables.',
      variables: null
    }).execute();

    const result = await getMessageTemplates(1);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Simple Template');
    expect(result[0].variables).toBeNull();
  });
});
