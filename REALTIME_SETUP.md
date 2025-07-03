# Supabase Realtime Setup Guide

## Overview
This implementation provides real-time session synchronization across devices with automatic fallback to polling when Realtime is not available.

## Setup Instructions

### 1. Database Migration
Run the following scripts in your Supabase SQL editor:

```sql
-- First, run the active session tracking migration:
-- Copy and paste contents of: scripts/12-add-active-session-tracking.sql

-- Then, enable realtime for the tables:
-- Copy and paste contents of: scripts/13-enable-realtime.sql
```

### 2. Supabase Dashboard Settings
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Ensure **Realtime** is enabled (should be by default)
4. No additional configuration needed!

### 3. Deploy to Vercel
Your code is ready for deployment. The implementation includes:

✅ **Automatic fallback**: If Realtime fails, it falls back to polling every 10 seconds  
✅ **Error handling**: Graceful degradation when Realtime is unavailable  
✅ **Cross-device sync**: Sessions work across multiple devices/tabs  
✅ **Optimistic updates**: UI responds immediately to user actions  

## How It Works

### Real-time Mode (Preferred)
- Uses Supabase Realtime subscriptions
- Instant updates across all devices
- Minimal server load

### Polling Mode (Fallback)
- Automatically activated if Realtime fails
- Polls for updates every 10 seconds
- Ensures functionality even without Realtime

## Testing
1. Start a test session on one device
2. Open the same session URL on another device/tab
3. Answer questions and see real-time updates
4. Check browser console for connection status:
   - `"Successfully subscribed to answers channel"` = Realtime working
   - `"Polling for session updates..."` = Fallback mode active

## Features Enabled
- **Active Session Tracking**: Users can resume their last test
- **Cross-Device Continuity**: Start on phone, continue on laptop
- **Real-time Collaboration**: Multiple tabs stay in sync
- **Persistent State**: Survives page refreshes and browser restarts
- **Resume Banner**: Easy access to active sessions

## Cost Impact
- **Realtime**: Minimal cost (within free tier for most apps)
- **Polling Fallback**: Standard API requests (also minimal cost)
- **Total**: Negligible cost increase for most applications

## Troubleshooting

### If Realtime doesn't work:
1. Check Supabase dashboard → Settings → API → Realtime is enabled
2. Verify the realtime SQL script was executed successfully
3. The app will automatically fall back to polling mode

### If polling seems slow:
- Normal behavior: 10-second intervals prevent excessive API calls
- For testing: You can temporarily reduce the interval in `hooks/use-session-store.ts`

## Production Ready ✅
This implementation is production-ready and includes all necessary error handling and fallbacks. 