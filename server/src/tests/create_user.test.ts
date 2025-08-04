
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Verify password is hashed and not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);
    
    // Verify the hash can be verified against original password
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate/i);
  });

  it('should create users with different emails', async () => {
    const firstUser = await createUser(testInput);
    
    const secondInput: CreateUserInput = {
      email: 'jane@example.com',
      password: 'different123',
      first_name: 'Jane',
      last_name: 'Smith'
    };
    
    const secondUser = await createUser(secondInput);

    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.email).not.toEqual(secondUser.email);
    expect(firstUser.password_hash).not.toEqual(secondUser.password_hash);
  });
});
