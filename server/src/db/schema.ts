
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Message status enum
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Contacts table
export const contactsTable = pgTable('contacts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  phone_number: text('phone_number').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  email: text('email'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Message templates table
export const messageTemplatesTable = pgTable('message_templates', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables'), // Store array of variable names as JSON
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  contact_id: integer('contact_id').references(() => contactsTable.id).notNull(),
  content: text('content').notNull(),
  is_outbound: boolean('is_outbound').notNull(),
  status: messageStatusEnum('status').default('sent').notNull(),
  whatsapp_message_id: text('whatsapp_message_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  contacts: many(contactsTable),
  messageTemplates: many(messageTemplatesTable),
  messages: many(messagesTable),
}));

export const contactsRelations = relations(contactsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [contactsTable.user_id],
    references: [usersTable.id],
  }),
  messages: many(messagesTable),
}));

export const messageTemplatesRelations = relations(messageTemplatesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [messageTemplatesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [messagesTable.user_id],
    references: [usersTable.id],
  }),
  contact: one(contactsTable, {
    fields: [messagesTable.contact_id],
    references: [contactsTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  contacts: contactsTable,
  messageTemplates: messageTemplatesTable,
  messages: messagesTable,
};
