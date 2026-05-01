import { mysqlTable, serial, varchar, timestamp, bigint, int, datetime, boolean } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});


export const refreshTokens = mysqlTable('refresh_tokens', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.id),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: datetime('expires_at').notNull(),
});

export const tasks = mysqlTable('tasks', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    deadline: datetime('deadline').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});