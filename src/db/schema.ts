import { pgTable, serial, varchar, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()),
});


export const refreshTokens = pgTable('refresh_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
});

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    workspaceId: integer('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    deadline: timestamp('deadline').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => new Date()),
});

export const workspaces = pgTable('workspaces', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    createdBy: integer('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const workspaceMembers = pgTable('workspace_members', {
    workspaceId: integer('workspace_id').notNull().references(() => workspaces.id),
    userId: integer('user_id').notNull().references(() => users.id),
    role: varchar('role', { length: 50 }).notNull(), // owner, admin, member, viewer
}, (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })]);
