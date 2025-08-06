# Google OAuth Authentication Setup

This document provides instructions for setting up Google OAuth authentication and session management for MedPrep ET.

## Overview

The authentication system has been updated to:
- Use **Google OAuth only** (email/password authentication removed)
- Limit users to **2 concurrent active sessions** maximum
- Automatically end oldest sessions when limit is exceeded
- Track session activity and device information

## Database Setup

1. **Run the database migration** to create the `user_sessions` table:

```sql
-- Execute the contents of scripts/create-user-sessions-table.sql in your Supabase SQL editor
-- This creates the user_sessions table with proper indexes and RLS policies
```

2. **Verify the table was created** by checking your Supabase dashboard:
   - Navigate to Table Editor
   - Confirm `user_sessions` table exists with the following columns:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `is_active` (boolean)
     - `created_at` (timestamp)
     - `last_activity` (timestamp)
     - `ended_at` (timestamp, nullable)
     - `user_agent` (text, nullable)
     - `ip_address` (inet, nullable)

## Google OAuth Configuration

### 1. Google Cloud Console Setup

1. **Create a Google Cloud Project** (if not already done):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless you have a Google Workspace)
   - Fill in required fields:
     - App name: "MedPrep ET"
     - User support email: Your email
     - Developer contact information: Your email
   - Add scopes: `email`, `profile`, `openid`

4. **Create OAuth Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Set name: "MedPrep ET Web Client"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://yourdomain.com/auth/callback` (for production)

5. **Copy credentials**:
   - Note down the Client ID and Client Secret

### 2. Supabase Configuration

1. **Configure Google Provider in Supabase**:
   - Go to your Supabase project dashboard
   - Navigate to "Authentication" > "Providers"
   - Enable "Google" provider
   - Enter your Google OAuth Client ID and Client Secret
   - Set redirect URL to: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Update Site URL**:
   - In "Authentication" > "Settings"
   - Set Site URL to your application URL (e.g., `http://localhost:3000` for dev)

### 3. Environment Variables

Add the following to your `.env.local` file:

```bash
# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# No additional environment variables needed for Google OAuth
# Configuration is handled through Supabase dashboard
```

## Session Management Features

### Automatic Session Limiting
- Users are limited to 2 active sessions simultaneously
- When a user logs in from a 3rd device, the oldest session is automatically ended
- Session tracking includes device type, browser, IP address, and activity timestamps

### Session Management Component
- Users can view their active sessions in the UI
- The `ActiveSessions` component shows:
  - Device type and browser information
  - Login time and last activity
  - IP address (if available)
  - Option to manually end other sessions

### Usage Example

To add the session management component to a user profile or settings page:

```tsx
import { ActiveSessions } from "@/components/auth/active-sessions"

export function UserProfilePage() {
  return (
    <div className="space-y-6">
      {/* Other profile components */}
      <ActiveSessions />
    </div>
  )
}
```

## Testing the Setup

1. **Test Google OAuth Login**:
   - Start your development server: `npm run dev`
   - Navigate to `/login`
   - Click "Continue with Google"
   - Verify successful authentication and redirect

2. **Test Session Limiting**:
   - Log in from one browser/device
   - Log in from a second browser/device
   - Log in from a third browser/device
   - Verify that the first session was automatically ended

3. **Test Session Management**:
   - Add the `ActiveSessions` component to a page
   - Verify you can see active sessions
   - Test ending a session manually

## Security Considerations

1. **Row Level Security**: The `user_sessions` table has RLS enabled with appropriate policies
2. **Session Cleanup**: Old inactive sessions are automatically cleaned up after 30 days
3. **IP Tracking**: IP addresses are logged for security auditing (respects privacy)
4. **Secure Headers**: Session data includes user agent for device identification

## Troubleshooting

### Common Issues

1. **"OAuth Error: redirect_uri_mismatch"**
   - Verify redirect URIs in Google Cloud Console match your Supabase callback URL
   - Check both development and production URLs

2. **"Provider not enabled"**
   - Ensure Google provider is enabled in Supabase Authentication settings
   - Verify Client ID and Secret are correctly entered

3. **Session table errors**
   - Run the database migration script in Supabase SQL editor
   - Check that RLS policies are properly configured

4. **Redirect issues after login**
   - Verify Site URL is correctly set in Supabase Authentication settings
   - Check that your auth callback route is properly implemented

### Debug Mode

To enable debug logging for authentication:

```typescript
// Add to your auth callback or components
console.log('Auth debug:', { user, session, error })
```

## Migration Notes

### Existing Users
- Existing email/password users will need to sign up again using Google OAuth
- User profiles will be automatically created/updated during Google OAuth login
- Previous authentication data is preserved in the `profiles` table

### Data Cleanup
If you want to remove old email/password authentication data:

```sql
-- Optional: Clean up old auth methods (run with caution)
-- This will remove users who haven't migrated to Google OAuth
-- Make sure to backup your data first
```

## Support

For additional help:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth
2. Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
3. Review the implementation in the codebase for specific details