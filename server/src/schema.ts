
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Contact schemas
export const contactSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  email: z.string().email().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Contact = z.infer<typeof contactSchema>;

export const createContactInputSchema = z.object({
  user_id: z.number(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/), // Basic international phone format
  first_name: z.string().min(1),
  last_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  id: z.number(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// Message Template schemas
export const messageTemplateSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  content: z.string(),
  variables: z.array(z.string()).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const createMessageTemplateInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  content: z.string().min(1),
  variables: z.array(z.string()).nullable().optional()
});

export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateInputSchema>;

export const updateMessageTemplateInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  variables: z.array(z.string()).nullable().optional()
});

export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateInputSchema>;

// Message schemas
export const messageStatusEnum = z.enum(['sent', 'delivered', 'read', 'failed']);

export const messageSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  contact_id: z.number(),
  content: z.string(),
  is_outbound: z.boolean(),
  status: messageStatusEnum,
  whatsapp_message_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;
export type MessageStatus = z.infer<typeof messageStatusEnum>;

export const createMessageInputSchema = z.object({
  user_id: z.number(),
  contact_id: z.number(),
  content: z.string().min(1),
  is_outbound: z.boolean(),
  whatsapp_message_id: z.string().nullable().optional()
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const updateMessageStatusInputSchema = z.object({
  id: z.number(),
  status: messageStatusEnum
});

export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusInputSchema>;

// Chat conversation schemas
export const getChatMessagesInputSchema = z.object({
  user_id: z.number(),
  contact_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetChatMessagesInput = z.infer<typeof getChatMessagesInputSchema>;

export const sendMessageInputSchema = z.object({
  user_id: z.number(),
  contact_id: z.number(),
  content: z.string().min(1),
  template_id: z.number().optional()
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
