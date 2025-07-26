import { PublicClientApplication, AuthenticationResult } from '@azure/msal-node';
import axios from 'axios';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
  },
  system: {
    loggerOptions: {
      loggerCallback(level: any, message: string, containsPii: boolean) {
        if (containsPii) {
          return;
        }
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 3, // LogLevel.Info
    },
  },
};

export class AuthService {
  private pca: PublicClientApplication;

  constructor() {
    this.pca = new PublicClientApplication(msalConfig);
  }

  async getAuthUrl(): Promise<string> {
    const scopes = (process.env.GRAPH_SCOPES || 'User.Read,Mail.Read,Mail.Send,Mail.ReadWrite').split(',');
    const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/auth/callback';
    
    const authCodeUrlParameters = {
      scopes,
      redirectUri,
      responseMode: 'query' as const,
    };

    return await this.pca.getAuthCodeUrl(authCodeUrlParameters);
  }

  async exchangeCodeForTokens(code: string): Promise<AuthenticationResult> {
    const scopes = (process.env.GRAPH_SCOPES || 'User.Read,Mail.Read,Mail.Send,Mail.ReadWrite').split(',');
    const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/auth/callback';

    const tokenRequest = {
      code,
      scopes,
      redirectUri,
    };

    try {
      const response = await this.pca.acquireTokenByCode(tokenRequest);
      return response;
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthenticationResult> {
    const scopes = (process.env.GRAPH_SCOPES || 'User.Read,Mail.Read,Mail.Send,Mail.ReadWrite').split(',');

    const refreshTokenRequest = {
      refreshToken,
      scopes,
    };

    try {
      const response = await this.pca.acquireTokenByRefreshToken(refreshTokenRequest);
      if (!response) {
        throw new Error('No response received from token refresh');
      }
      return response;
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}