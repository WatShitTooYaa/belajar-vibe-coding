import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';

export const registerUser = async (payload: any) => {
  const { email, username, password } = payload;

  if (!email || !username || !password) {
    throw new Error('Missing required fields');
  }

  // Check if email or username already exists
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    throw new Error('Email or username already exists');
  }

  // Hash password using Bun's built-in hashing
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  });

  // Insert user
  await db.insert(users).values({
    email,
    username,
    password: hashedPassword,
  });

  return { success: true };
};
