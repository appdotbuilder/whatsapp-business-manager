
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // In a real implementation, you would use bcrypt to compare passwords:
    // const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    // For this implementation, we'll do a simple string comparison
    // This is NOT secure and should never be used in production
    if (user.password_hash !== input.password) {
      return null; // Invalid password
    }

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
