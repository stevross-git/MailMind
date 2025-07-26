import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MicrosoftGraphService } from "./services/microsoftGraph";
import { OpenAIService } from "./services/openai";
import { AuthService } from "./services/auth";
import { insertChatMessageSchema } from "@shared/schema";

const openaiService = new OpenAIService();
const authService = new AuthService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get Microsoft auth URL
  app.get("/api/auth/microsoft/url", async (req, res) => {
    try {
      const authUrl = await authService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Auth URL error:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  // Handle OAuth callback
  app.get("/auth/callback", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).send("Authorization code is required");
      }

      const tokenResponse = await authService.exchangeCodeForTokens(code);
      const profile = await authService.getUserProfile(tokenResponse.accessToken);

      let user = await storage.getUserByMicrosoftId(profile.id);
      
      if (!user) {
        user = await storage.createUser({
          username: profile.displayName || profile.mail,
          email: profile.mail,
          microsoftId: profile.id,
          accessToken: tokenResponse.accessToken,
          refreshToken: null, // MSAL handles refresh tokens internally
        });
      } else {
        user = await storage.updateUser(user.id, {
          accessToken: tokenResponse.accessToken,
          refreshToken: null, // MSAL handles refresh tokens internally
          tokenExpiresAt: new Date(Date.now() + (tokenResponse.expiresOn?.getTime() || 3600000)),
        });
      }

      // For popup flow, create a simple HTML page that communicates back to parent
      const userData = { id: user!.id, email: user!.email, username: user!.username };
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Success</title>
        </head>
        <body>
          <script>
            // Store user data in localStorage for popup communication
            localStorage.setItem('user', JSON.stringify(${JSON.stringify(userData)}));
            
            // Send message to parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', user: ${JSON.stringify(userData)} }, window.location.origin);
              setTimeout(() => window.close(), 500);
            } else {
              // Fallback for direct navigation
              const userQueryParam = encodeURIComponent(JSON.stringify(${JSON.stringify(userData)}));
              window.location.href = \`/?user=\${userQueryParam}\`;
            }
          </script>
          <p>Authentication successful! This window will close automatically...</p>
        </body>
        </html>
      `;
      
      res.send(htmlResponse);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Legacy authentication endpoint (for backward compatibility)
  app.post("/api/auth/microsoft", async (req, res) => {
    try {
      const { accessToken, refreshToken, profile } = req.body;
      
      if (!accessToken || !profile) {
        return res.status(400).json({ message: "Missing required authentication data" });
      }

      let user = await storage.getUserByMicrosoftId(profile.id);
      
      if (!user) {
        user = await storage.createUser({
          username: profile.displayName || profile.mail,
          email: profile.mail,
          microsoftId: profile.id,
          accessToken,
          refreshToken,
        });
      } else {
        user = await storage.updateUser(user.id, {
          accessToken,
          refreshToken,
          tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour
        });
      }

      res.json({ user: { id: user!.id, email: user!.email, username: user!.username } });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get user profile
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Sync emails from Microsoft Graph
  app.post("/api/emails/sync/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user || !user.accessToken) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const graphService = new MicrosoftGraphService(user.accessToken);
      const graphEmails = await graphService.getEmails();

      let syncedCount = 0;
      for (const graphEmail of graphEmails) {
        const existingEmail = await storage.getEmail(graphEmail.id);
        if (!existingEmail) {
          const email = await storage.createEmail({
            id: graphEmail.id,
            userId: user.id,
            messageId: graphEmail.id,
            subject: graphEmail.subject || "",
            from: graphEmail.from?.emailAddress?.address || "",
            to: graphEmail.toRecipients?.[0]?.emailAddress?.address || "",
            body: graphEmail.body?.content || "",
            bodyPreview: graphEmail.bodyPreview || "",
            receivedAt: new Date(graphEmail.receivedDateTime),
            isRead: graphEmail.isRead,
            isImportant: graphEmail.importance === "high",
            isFlagged: graphEmail.flag?.flagStatus === "flagged",
            folder: "inbox"
          });

          // Analyze email with AI
          try {
            const analysis = await openaiService.analyzeEmail(
              email.subject,
              email.body,
              email.from
            );

            await storage.updateEmail(email.id, {
              category: analysis.category,
              priority: analysis.priority,
              aiSummary: analysis.summary,
              aiContext: analysis.context
            });

            await storage.createEmailAnalysis({
              emailId: email.id,
              sentiment: analysis.sentiment,
              urgency: analysis.urgency,
              actionRequired: analysis.actionRequired,
              suggestedActions: analysis.suggestedActions
            });
          } catch (aiError) {
            console.error("AI analysis failed:", aiError);
          }

          syncedCount++;
        }
      }

      res.json({ message: `Synced ${syncedCount} new emails` });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync emails" });
    }
  });

  // Get emails
  app.get("/api/emails/:userId", async (req, res) => {
    try {
      const { folder = "inbox" } = req.query;
      const emails = await storage.getEmails(req.params.userId, folder as string);
      res.json(emails);
    } catch (error) {
      console.error("Get emails error:", error);
      res.status(500).json({ message: "Failed to get emails" });
    }
  });

  // Update email
  app.patch("/api/emails/:emailId", async (req, res) => {
    try {
      const { isRead, isFlagged, category, folder } = req.body;
      const updatedEmail = await storage.updateEmail(req.params.emailId, {
        isRead,
        isFlagged,
        category,
        folder
      });

      if (!updatedEmail) {
        return res.status(404).json({ message: "Email not found" });
      }

      res.json(updatedEmail);
    } catch (error) {
      console.error("Update email error:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  // Generate reply
  app.post("/api/emails/:emailId/reply", async (req, res) => {
    try {
      const { context } = req.body;
      const email = await storage.getEmail(req.params.emailId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      const user = await storage.getUser(email.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's writing style from sent emails
      const sentEmails = await storage.getEmails(user.id, "sent");
      const writingStyle = await openaiService.analyzeWritingStyle(
        sentEmails.slice(0, 20).map(e => ({ subject: e.subject, body: e.body }))
      );

      const replyContent = await openaiService.generateReply(
        {
          subject: email.subject,
          body: email.body,
          from: email.from
        },
        writingStyle,
        context || "Please generate an appropriate reply"
      );

      res.json({ reply: replyContent });
    } catch (error) {
      console.error("Generate reply error:", error);
      res.status(500).json({ message: "Failed to generate reply" });
    }
  });

  // Chat with AI
  app.post("/api/chat/:userId", async (req, res) => {
    try {
      const { content } = req.body;
      const validation = insertChatMessageSchema.safeParse({
        userId: req.params.userId,
        content,
        role: "user"
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid message format" });
      }

      // Save user message
      await storage.createChatMessage(validation.data);

      // Get recent emails for context
      const recentEmails = await storage.getEmails(req.params.userId);
      const emailContext = recentEmails.slice(0, 10).map(email => ({
        subject: email.subject,
        from: email.from,
        category: email.category,
        priority: email.priority,
        summary: email.aiSummary
      }));

      // Get chat history
      const chatHistory = await storage.getChatMessages(req.params.userId, 20);
      const formattedHistory = chatHistory.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate AI response
      const aiResponse = await openaiService.processChatQuery(content, emailContext, formattedHistory);

      // Save AI response
      await storage.createChatMessage({
        userId: req.params.userId,
        content: aiResponse,
        role: "assistant"
      });

      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.userId);
      res.json(messages.reverse());
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
