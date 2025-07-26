import { Client } from '@microsoft/microsoft-graph-client';

export interface GraphEmail {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  body: {
    content: string;
    contentType: string;
  };
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  importance: string;
  flag: {
    flagStatus: string;
  };
}

export class MicrosoftGraphService {
  private client: Client;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  async getProfile() {
    try {
      const profile = await this.client.api('/me').get();
      return profile;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEmails(folder: string = 'inbox', top: number = 50): Promise<GraphEmail[]> {
    try {
      const response = await this.client
        .api(`/me/mailFolders/${folder}/messages`)
        .top(top)
        .orderby('receivedDateTime desc')
        .get();
      
      return response.value || [];
    } catch (error) {
      throw new Error(`Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSentEmails(top: number = 100): Promise<GraphEmail[]> {
    try {
      const response = await this.client
        .api('/me/mailFolders/sentitems/messages')
        .top(top)
        .orderby('sentDateTime desc')
        .get();
      
      return response.value || [];
    } catch (error) {
      throw new Error(`Failed to fetch sent emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${messageId}`)
        .patch({ isRead: true });
    } catch (error) {
      throw new Error(`Failed to mark email as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async flagEmail(messageId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${messageId}`)
        .patch({
          flag: {
            flagStatus: 'flagged'
          }
        });
    } catch (error) {
      throw new Error(`Failed to flag email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendReply(messageId: string, replyContent: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${messageId}/reply`)
        .post({
          comment: replyContent
        });
    } catch (error) {
      throw new Error(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.client
        .api('/me/sendMail')
        .post({
          message: {
            subject,
            body: {
              contentType: 'HTML',
              content: body
            },
            toRecipients: [{
              emailAddress: {
                address: to
              }
            }]
          }
        });
    } catch (error) {
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
