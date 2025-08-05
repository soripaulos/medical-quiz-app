# Years Issue Debugging Guide

## Problem
Only 2023, 2024, 2025 are showing in the years filter despite more years existing in the database.

## Debugging Steps Added

### 1. Frontend Debugging
Added console logging to all components that fetch years:

- `components/test/enhanced-create-test-interface.tsx`
- `components/test/create-test-interface.tsx` 
- `components/admin/question-management.tsx`

### 2. API Debugging
Added console logging to the years API endpoint:
- `app/api/questions/years/route.ts`

### 3. Debug Components Created
- `components/debug/years-debug.tsx` - Interactive years API tester
- `app/debug/years/page.tsx` - Debug page accessible at `/debug/years`

### 4. Database Testing Script
- `scripts/test-years-db.js` - Direct database testing script

## How to Debug

### Step 1: Check the Debug Page
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/debug/years`
3. Check the API response and console logs

### Step 2: Check Browser Console
1. Open your main app page
2. Open browser developer tools (F12)
3. Check the Console tab for debugging messages:
   - Look for "Years API response:"
   - Look for "Years before sorting:" and "Years after sorting:"
   - Look for any error messages

### Step 3: Check Server Console
1. Look at your terminal where `npm run dev` is running
2. Check for server-side console logs:
   - "Raw questions data:"
   - "Unique years found:"
   - "Sorted years:"

### Step 4: Test Database Directly
```bash
# Make sure your environment variables are set
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-key"

# Run the database test
node scripts/test-years-db.js
```

### Step 5: Check Network Tab
1. Open browser developer tools
2. Go to Network tab
3. Reload the page
4. Look for the request to `/api/questions/years`
5. Check the response body

## Possible Issues and Solutions

### Issue 1: Database Data Problem
**Symptoms**: Database test shows limited years or wrong data types
**Solution**: Check your database directly in Supabase dashboard
```sql
SELECT DISTINCT year, COUNT(*) as count 
FROM questions 
WHERE year IS NOT NULL 
GROUP BY year 
ORDER BY year DESC;
```

### Issue 2: API Not Returning Data
**Symptoms**: API returns empty array or error
**Solutions**:
- Check if the RPC function `get_distinct_years` exists
- Apply the database migration: `scripts/15-optimize-queries.sql`
- Check Supabase permissions and RLS policies

### Issue 3: Frontend Not Processing Data
**Symptoms**: API returns correct data but UI shows limited years
**Solutions**:
- Clear browser cache and localStorage
- Check if there's any filtering happening in the frontend code
- Look for any hardcoded year arrays

### Issue 4: Caching Issues
**Solutions**:
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Restart development server
- Check if there's any service worker caching

### Issue 5: Environment Variables
**Symptoms**: API calls fail or return errors
**Solutions**:
- Verify Supabase URL and key are correctly set
- Check if environment variables are accessible in both client and server

## Quick Fixes to Try

### Fix 1: Force Refresh API Data
Add a cache-busting parameter to API calls:
```javascript
const yearsRes = await fetch(`/api/questions/years?t=${Date.now()}`)
```

### Fix 2: Clear All Filters
Reset all filters and state:
```javascript
// In browser console
localStorage.clear()
location.reload()
```

### Fix 3: Bypass RPC Function
Temporarily force the fallback method by commenting out the RPC call in `app/api/questions/years/route.ts`.

## Expected Debug Output

### Healthy Output
```
Years API response: { years: [2025, 2024, 2023, 2022, 2021, 2020, ...] }
Years before sorting: [2023, 2025, 2021, 2024, 2022, 2020, ...]
Years after sorting: [2025, 2024, 2023, 2022, 2021, 2020, ...]
Debug: 15 years loaded: [2025, 2024, 2023, 2022, 2021, 2020, ...]
```

### Problem Output
```
Years API response: { years: [2025, 2024, 2023] }
Years before sorting: [2025, 2024, 2023]
Years after sorting: [2025, 2024, 2023]
Debug: 3 years loaded: [2025, 2024, 2023]
```

## Removing Debug Code
Once the issue is fixed, remove the debug code by:
1. Remove console.log statements from all components
2. Remove the debug display from the UI
3. Delete the debug components and pages
4. Remove the database test script if not needed

## Next Steps
1. Run through the debugging steps above
2. Share the console output to identify the exact issue
3. Apply the appropriate fix based on the findings
4. Clean up debug code after fixing