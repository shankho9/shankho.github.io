# Vercel Deployment Timeout Debugging Guide

## Common Causes of 45-Minute Timeout

### 1. **Prerendering Issues**
- `crawlLinks: true` can cause infinite crawling if pages link to each other
- Large number of routes being prerendered
- External API calls during prerender that hang

### 2. **Database Connection During Build**
- Database connections attempted during build/prerender
- Missing `DATABASE_URL` causing connection timeouts
- Connection pool not properly closed

### 3. **Module-Level Code Execution**
- `setInterval` or other timers running during build
- Synchronous operations blocking the build process
- Heavy computations during module initialization

### 4. **Build Output Size**
- Very large build output (>100MB can cause issues)
- Too many static assets
- Unoptimized images or files

### 5. **Missing Environment Variables**
- Required env vars missing causing API calls to hang
- External service timeouts (Google Maps, Analytics, etc.)

## Debugging Steps

### Step 1: Check Vercel Build Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Check the "Build Logs" tab
4. Look for:
   - Where the build stops (last successful log line)
   - Any error messages or warnings
   - Timeout messages
   - Database connection errors
   - API call failures

### Step 2: Test Build Locally
```bash
# Test production build locally
npm run build

# If build succeeds, test prerender
NODE_ENV=production npm run build
```

### Step 3: Check for Blocking Operations
- Look for `setInterval`, `setTimeout` in server code
- Check for database connections in module-level code
- Verify no infinite loops in build scripts

### Step 4: Verify Environment Variables
In Vercel Dashboard → Settings → Environment Variables, ensure:
- `DATABASE_URL` is set (if using database)
- `NUXT_PUBLIC_*` variables are set
- All required API keys are present

### Step 5: Check Prerender Configuration
- Disable `crawlLinks` temporarily
- Limit prerender routes
- Check if any routes are causing infinite loops

### Step 6: Monitor Build Output Size
```bash
# After build, check .output size
du -sh .output
```

If >100MB, investigate what's taking space.

## Quick Fixes to Try

### Fix 1: Disable Prerender Crawling
```typescript
// nuxt.config.ts
nitro: {
  prerender: {
    crawlLinks: false, // Disable to prevent infinite crawling
    routes: ['/', '/rss.xml'], // Only prerender specific routes
  },
}
```

### Fix 2: Ensure setInterval Only Runs in Runtime
The `setInterval` in `server/utils/adminAuth.ts` should only run in serverless function context, not during build.

### Fix 3: Add Build Timeout Configuration
Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "framework": "nuxtjs",
  "functions": {
    "server/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### Fix 4: Check for Database Calls During Build
Ensure no database connections are made during:
- Module initialization
- Build-time code execution
- Prerender phase

## Advanced Debugging

### Enable Verbose Logging
Add to `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  // ... existing config
  nitro: {
    logLevel: 4, // Verbose logging
  },
})
```

### Check Build Performance
```bash
# Build with timing
time npm run build
```

### Test Individual Routes
Temporarily disable routes one by one to identify the problematic route.

## Contact Vercel Support
If issues persist:
1. Collect build logs
2. Note the exact timeout time
3. Check Vercel status page for service issues
4. Contact Vercel support with:
   - Project name
   - Deployment URL
   - Build logs
   - Error messages

