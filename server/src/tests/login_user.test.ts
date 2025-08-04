
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when credentials are valid', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password, // In real app, this would be hashed
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    const result = await loginUser({
      email: 'nonexistent@example.com',
      password: 'anypassword'
    });

    expect(result).toBeNull();
  });

  it('should return null when password is incorrect', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    expect(result).toBeNull();
  });

  it('should return null when email exists but password is empty', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: ''
    });

    expect(result).toBeNull();
  });
});
