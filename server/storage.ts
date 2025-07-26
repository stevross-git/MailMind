import { 
  type User, 
  type InsertUser, 
  type Email, 
  type InsertEmail,
  type ChatMessage,
  type InsertChatMessage,
  type EmailAnalysis,
  type InsertEmailAnalysis
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Email methods
  getEmails(userId: string, folder?: string): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined>;
  deleteEmail(id: string): Promise<boolean>;

  // Chat methods
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Email analysis methods
  getEmailAnalysis(emailId: string): Promise<EmailAnalysis | undefined>;
  createEmailAnalysis(analysis: InsertEmailAnalysis): Promise<EmailAnalysis>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emails: Map<string, Email>;
  private chatMessages: Map<string, ChatMessage>;
  private emailAnalyses: Map<string, EmailAnalysis>;

  constructor() {
    this.users = new Map();
    this.emails = new Map();
    this.chatMessages = new Map();
    this.emailAnalyses = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.microsoftId === microsoftId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      accessToken: insertUser.accessToken || null,
      refreshToken: insertUser.refreshToken || null,
      microsoftId: insertUser.microsoftId || null,
      id,
      createdAt: new Date(),
      tokenExpiresAt: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Email methods
  async getEmails(userId: string, folder?: string): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.userId === userId && (!folder || email.folder === folder))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  async getEmail(id: string): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const email: Email = {
      ...insertEmail,
      isRead: insertEmail.isRead || false,
      isImportant: insertEmail.isImportant || false,
      isFlagged: insertEmail.isFlagged || false,
      category: insertEmail.category || null,
      priority: insertEmail.priority || 0,
      aiSummary: insertEmail.aiSummary || null,
      aiContext: insertEmail.aiContext || null,
      folder: insertEmail.folder || "inbox",
      createdAt: new Date()
    };
    this.emails.set(email.id, email);
    return email;
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const updatedEmail = { ...email, ...updates };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteEmail(id: string): Promise<boolean> {
    return this.emails.delete(id);
  }

  // Chat methods
  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // Email analysis methods
  async getEmailAnalysis(emailId: string): Promise<EmailAnalysis | undefined> {
    return Array.from(this.emailAnalyses.values()).find(analysis => analysis.emailId === emailId);
  }

  async createEmailAnalysis(insertAnalysis: InsertEmailAnalysis): Promise<EmailAnalysis> {
    const id = randomUUID();
    const analysis: EmailAnalysis = {
      ...insertAnalysis,
      sentiment: insertAnalysis.sentiment || null,
      urgency: insertAnalysis.urgency || null,
      actionRequired: insertAnalysis.actionRequired || false,
      suggestedActions: insertAnalysis.suggestedActions || null,
      writingStyle: insertAnalysis.writingStyle || null,
      id,
      createdAt: new Date()
    };
    this.emailAnalyses.set(id, analysis);
    return analysis;
  }
}

export const storage = new MemStorage();
