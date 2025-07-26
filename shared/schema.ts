import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  microsoftId: text("microsoft_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  messageId: text("message_id").notNull(),
  subject: text("subject").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  body: text("body").notNull(),
  bodyPreview: text("body_preview").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  isRead: boolean("is_read").default(false),
  isImportant: boolean("is_important").default(false),
  isFlagged: boolean("is_flagged").default(false),
  category: text("category"), // urgent, meeting, task, follow-up, etc.
  priority: integer("priority").default(0), // 0-5 scale
  aiSummary: text("ai_summary"),
  aiContext: jsonb("ai_context"), // JSON with analysis results
  folder: text("folder").default("inbox"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant
  timestamp: timestamp("timestamp").defaultNow(),
});

export const emailAnalysis = pgTable("email_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull().references(() => emails.id),
  sentiment: text("sentiment"),
  urgency: integer("urgency"), // 1-5 scale
  actionRequired: boolean("action_required").default(false),
  suggestedActions: jsonb("suggested_actions"), // Array of suggested actions
  writingStyle: jsonb("writing_style"), // Extracted writing patterns
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertEmailAnalysisSchema = createInsertSchema(emailAnalysis).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type EmailAnalysis = typeof emailAnalysis.$inferSelect;
export type InsertEmailAnalysis = z.infer<typeof insertEmailAnalysisSchema>;
