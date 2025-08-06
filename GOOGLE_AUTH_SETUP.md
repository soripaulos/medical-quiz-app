# Google OAuth Authentication Setup

This document provides instructions for setting up Google OAuth authentication and session management for MedPrep ET.

## Overview

The authentication system has been updated to:
- Use **Google OAuth only** (email/password authentication removed)
- Limit users to **2 concurrent active sessions** maximum
- Automatically end oldest sessions when limit is exceeded
- Track session activity and device information

## Database Setup

**Uses existing schema!** The session management system uses the existing `logged_in_number` column in the `profiles` table to track concurrent sessions. No additional database changes are required.

### Required Column
The system expects a `logged_in_number` column in your `profiles` table:
- **Column name**: `logged_in_number`
- **Type**: `integer`
- **Default**: `0` or `NULL`
- **Purpose**: Tracks the number of active sessions for each user

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

### Server-Side Session Limiting
- Users are limited to 2 active sessions simultaneously using database tracking
- When a user tries to log in from a 3rd device, the login is **blocked** with an error message
- Session count is stored in the `profiles.logged_in_number` column
- Sessions are automatically decremented when users sign out

### Session Enforcement
- **Login blocking**: New logins are prevented when limit is reached
- **Real-time tracking**: Session count is updated immediately on login/logout
- **Error feedback**: Users see clear messages when session limit is exceeded
- **Manual reset**: Users can force end all other sessions

### Session Management Components
- `SessionStatus`: Full session management card with status and controls
- `SessionStatusBadge`: Compact session indicator for headers/status bars  
- `useSessionStatus`: Hook for accessing session data and management functions

### API Endpoints
- `POST /api/auth/reset-sessions`: Reset user's session count to 1 (end all other sessions)

### Usage Examples

To show full session management in a profile page:

```tsx
import { SessionStatus } from "@/components/auth/session-status"

export function UserProfilePage() {
  return (
    <div className="space-y-6">
      <SessionStatus />
      {/* Other profile components */}
    </div>
  )
}
```

To show compact session status:

```tsx
import { SessionStatusBadge } from "@/components/auth/session-status"

export function Header() {
  return (
    <div className="flex items-center gap-4">
      <SessionStatusBadge />
      {/* Other header items */}
    </div>
  )
}
```

To access session data programmatically:

```tsx
import { useSessionStatus } from "@/hooks/use-session-status"

export function MyComponent() {
  const { 
    sessionCount, 
    loading, 
    error, 
    refreshSessionCount,
    resetOtherSessions,
    isAtLimit 
  } = useSessionStatus()

  // Use session data...
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

1. **Database Storage**: Session counts are stored securely in the database with proper access controls
2. **Server-Side Enforcement**: Session limits are enforced server-side, preventing client-side bypass
3. **Immediate Updates**: Session counts are updated atomically during login/logout operations
4. **Row Level Security**: Uses existing RLS policies on the profiles table
5. **Reliable Tracking**: No dependency on client-side storage that can be cleared or manipulated

## Troubleshooting

### Common Issues

1. **"OAuth Error: redirect_uri_mismatch"**
   - Verify redirect URIs in Google Cloud Console match your Supabase callback URL
   - Check both development and production URLs

2. **"Provider not enabled"**
   - Ensure Google provider is enabled in Supabase Authentication settings
   - Verify Client ID and Secret are correctly entered

3. **Session limiting not working**
   - Check that the `logged_in_number` column exists in your `profiles` table
   - Verify the column is of type `integer` and allows updates

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