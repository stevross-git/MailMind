# AI Email Organizer for Office 365

## Overview

This is a web-based AI-powered email assistant that integrates with Office 365 via Microsoft Graph API. The application analyzes, organizes, and helps users manage their emails through intelligent categorization and a conversational chat interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent Microsoft-inspired design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **External APIs**: Microsoft Graph API for Office 365 integration, OpenAI API for AI analysis

## Key Components

### Authentication System
- Microsoft OAuth 2.0 integration for Office 365 accounts
- Session management with token refresh capabilities
- User profile storage with Microsoft ID mapping

### Email Management
- **Fetching**: Retrieves emails from Office 365 mailboxes (inbox, sent items, custom folders)
- **Storage**: Local email caching with PostgreSQL for improved performance
- **Analysis**: AI-powered categorization (urgent, meeting, task, follow-up) and sentiment analysis
- **Organization**: Smart folder management and priority scoring

### AI Features
- **Email Classification**: Identifies email types, urgency levels, and required actions
- **Writing Style Learning**: Analyzes sent emails to understand user's communication patterns
- **Chat Assistant**: Conversational interface for email queries and management
- **Smart Suggestions**: AI-generated reply drafts and action recommendations

### User Interface
- **Dashboard**: Main email management interface with sidebar navigation
- **Email List**: Sortable and filterable email display with category badges
- **Chat Interface**: Real-time conversation with AI assistant
- **Authentication Modal**: Microsoft login integration

## Data Flow

1. **Authentication**: User authenticates via Microsoft OAuth, tokens stored securely
2. **Email Sync**: Background sync process fetches new emails from Office 365
3. **AI Analysis**: Each email is processed for categorization, sentiment, and urgency
4. **Storage**: Emails and analysis results stored in PostgreSQL database
5. **User Interaction**: Frontend queries processed emails with real-time updates
6. **Chat Processing**: User queries sent to AI service for intelligent responses

## External Dependencies

### Core Services
- **Microsoft Graph API**: Office 365 integration for email access and user authentication
- **OpenAI API**: GPT-4 model for email analysis and chat functionality
- **Neon Database**: PostgreSQL hosting for data persistence

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **Vite**: Frontend build tool with hot reload
- **ESBuild**: Server-side bundling for production

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library

## Deployment Strategy

### Development Environment
- Local development with Vite dev server
- TypeScript compilation with strict type checking
- Database migrations via Drizzle Kit

### Production Build
- Frontend built with Vite and served as static assets
- Backend bundled with ESBuild for Node.js runtime
- Single-process deployment serving both frontend and API

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- API keys managed through environment variables
- Microsoft Graph permissions pre-configured in Azure AD

### Key Features for Production
- Session-based authentication with secure token storage
- Real-time email synchronization
- Scalable AI processing with OpenAI integration
- Responsive design with Microsoft Office aesthetic