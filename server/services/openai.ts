import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface EmailAnalysisResult {
  category: string;
  priority: number;
  urgency: number;
  sentiment: string;
  actionRequired: boolean;
  suggestedActions: string[];
  summary: string;
  context: {
    type: string;
    intent: string;
    tone: string;
  };
}

export interface WritingStyleAnalysis {
  tone: string;
  formality: string;
  commonPhrases: string[];
  greetingStyle: string;
  closingStyle: string;
  averageLength: number;
}

export class OpenAIService {
  async analyzeEmail(subject: string, body: string, from: string): Promise<EmailAnalysisResult> {
    try {
      const prompt = `Analyze this email and provide a JSON response with the following structure:
{
  "category": "urgent|meeting|task|follow-up|informational|spam",
  "priority": 1-5,
  "urgency": 1-5,
  "sentiment": "positive|negative|neutral",
  "actionRequired": boolean,
  "suggestedActions": ["array of suggested actions"],
  "summary": "brief summary in 1-2 sentences",
  "context": {
    "type": "work|meeting|request|reminder|notification",
    "intent": "follow-up|rsvp|complaint|opportunity|information",
    "tone": "formal|informal|urgent|friendly|professional"
  }
}

Email Details:
From: ${from}
Subject: ${subject}
Body: ${body}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert email analyst. Analyze emails and provide structured insights in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as EmailAnalysisResult;
    } catch (error) {
      throw new Error(`Failed to analyze email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeWritingStyle(emails: Array<{ subject: string; body: string }>): Promise<WritingStyleAnalysis> {
    try {
      const emailTexts = emails.map(e => `Subject: ${e.subject}\nBody: ${e.body}`).join('\n\n---\n\n');
      
      const prompt = `Analyze the writing style from these sent emails and provide a JSON response:
{
  "tone": "formal|informal|professional|casual",
  "formality": "very formal|formal|neutral|informal|very informal",
  "commonPhrases": ["array of frequently used phrases"],
  "greetingStyle": "typical greeting pattern",
  "closingStyle": "typical closing pattern",
  "averageLength": average_word_count
}

Emails to analyze:
${emailTexts}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in writing style analysis. Analyze email patterns and extract writing characteristics."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as WritingStyleAnalysis;
    } catch (error) {
      throw new Error(`Failed to analyze writing style: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateReply(originalEmail: { subject: string; body: string; from: string }, userStyle: WritingStyleAnalysis, context: string): Promise<string> {
    try {
      const prompt = `Generate a reply to this email using the user's writing style:

Original Email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

User's Writing Style:
- Tone: ${userStyle.tone}
- Formality: ${userStyle.formality}
- Typical greeting: ${userStyle.greetingStyle}
- Typical closing: ${userStyle.closingStyle}
- Common phrases: ${userStyle.commonPhrases.join(', ')}

Context: ${context}

Generate a professional reply that matches the user's writing style and appropriately responds to the original email.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert email writer. Generate replies that match the user's writing style and appropriately respond to the context."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`Failed to generate reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processChatQuery(query: string, emailContext: any[], chatHistory: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const emailSummary = emailContext.length > 0 
        ? `Recent emails context: ${JSON.stringify(emailContext.slice(0, 10))}`
        : "No recent email context available.";

      const messages = [
        {
          role: "system",
          content: `You are an AI email assistant. Help users manage their emails, answer questions about their inbox, and provide email-related assistance. 
          
Current email context: ${emailSummary}

Be helpful, concise, and professional. If asked to perform actions, explain what would be done but note that the user needs to confirm the action.`
        },
        ...chatHistory.slice(-10), // Keep last 10 messages for context
        {
          role: "user",
          content: query
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content || "I'm sorry, I couldn't process your request.";
    } catch (error) {
      throw new Error(`Failed to process chat query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
