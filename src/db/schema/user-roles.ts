import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { auth_user } from './auth';

export const user_roles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => auth_user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'moderator', 'admin', 'owner'
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type UserRole = typeof user_roles.$inferSelect;
export type NewUserRole = typeof user_roles.$inferInsert;
