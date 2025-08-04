
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createContactInputSchema,
  updateContactInputSchema,
  createMessageTemplateInputSchema,
  updateMessageTemplateInputSchema,
  sendMessageInputSchema,
  getChatMessagesInputSchema,
  createMessageInputSchema,
  updateMessageStatusInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createContact } from './handlers/create_contact';
import { getContacts } from './handlers/get_contacts';
import { updateContact } from './handlers/update_contact';
import { deleteContact } from './handlers/delete_contact';
import { createMessageTemplate } from './handlers/create_message_template';
import { getMessageTemplates } from './handlers/get_message_templates';
import { updateMessageTemplate } from './handlers/update_message_template';
import { deleteMessageTemplate } from './handlers/delete_message_template';
import { sendMessage } from './handlers/send_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { createMessage } from './handlers/create_message';
import { updateMessageStatus } from './handlers/update_message_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Contact management routes
  createContact: publicProcedure
    .input(createContactInputSchema)
    .mutation(({ input }) => createContact(input)),

  getContacts: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getContacts(input.userId)),

  updateContact: publicProcedure
    .input(updateContactInputSchema)
    .mutation(({ input }) => updateContact(input)),

  deleteContact: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(({ input }) => deleteContact(input.contactId)),

  // Message template routes
  createMessageTemplate: publicProcedure
    .input(createMessageTemplateInputSchema)
    .mutation(({ input }) => createMessageTemplate(input)),

  getMessageTemplates: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getMessageTemplates(input.userId)),

  updateMessageTemplate: publicProcedure
    .input(updateMessageTemplateInputSchema)
    .mutation(({ input }) => updateMessageTemplate(input)),

  deleteMessageTemplate: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(({ input }) => deleteMessageTemplate(input.templateId)),

  // Chat and messaging routes
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),

  getChatMessages: publicProcedure
    .input(getChatMessagesInputSchema)
    .query(({ input }) => getChatMessages(input)),

  createMessage: publicProcedure
    .input(createMessageInputSchema)
    .mutation(({ input }) => createMessage(input)),

  updateMessageStatus: publicProcedure
    .input(updateMessageStatusInputSchema)
    .mutation(({ input }) => updateMessageStatus(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`WhatsApp Business Management TRPC server listening at port: ${port}`);
}

start();
