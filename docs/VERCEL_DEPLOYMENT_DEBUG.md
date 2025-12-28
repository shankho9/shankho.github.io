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

### 6. **Font Module Network Timeouts**

- `@nuxt/fonts` trying to fetch fonts during build
- Network connectivity issues during build phase
- Font service (Google Fonts, etc.) unavailable during build

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

### Fix 5: Disable Font Module Auto-Discovery

If `@nuxt/fonts` is causing network timeouts during build:

**Option A: Disable and use Google Fonts link tag**
```typescript
// nuxt.config.ts
modules: [
  // '@nuxt/fonts', // Comment out or remove
  // ... other modules
],
app: {
  head: {
    link: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
      },
    ],
  },
}
```

**Option B: Configure with explicit fonts**
```typescript
// nuxt.config.ts
modules: [
  [
    '@nuxt/fonts',
    {
      defaults: {
        weights: [400, 500, 600, 700],
        styles: ['normal'],
        subsets: ['latin'],
      },
    },
  ],
]
```

## Advanced Debugging

### Enable Verbose Logging

**Option 1: Via nuxt.config.ts (Already configured)**
```typescript
export default defineNuxtConfig({
  // ... existing config
  nitro: {
    logLevel: 4, // Verbose logging (0=silent, 1=error, 2=warn, 3=info, 4=verbose)
  },
})
```

**Option 2: Via Environment Variables**
```bash
# In vercel.json or Vercel Dashboard
NITRO_LOG_LEVEL=4
DEBUG=nuxt:*
```

**Option 3: Post-Build Diagnostics**
The build script now automatically runs diagnostics after build:
```bash
npm run build
# This will show:
# - Output directory sizes
# - Number of serverless functions
# - Large files (>10MB)
# - Native dependencies
```

### Check Build Performance

```bash
# Build with timing
time npm run build
```

### Test Individual Routes

Temporarily disable routes one by one to identify the problematic route.

## Deployment Phase Hanging (After Build Completes)

If the build completes but deployment hangs at "Deploying outputs...":

### Common Causes:
1. **Native Dependencies**: `better-sqlite3` or other native modules causing packaging issues
2. **Large Number of Serverless Functions**: Too many API routes being packaged
3. **Output Directory Issues**: Problems with `.output` directory structure
4. **Network Issues**: Slow upload of deployment artifacts

### Solutions:

#### Solution 1: Exclude Unused Native Dependencies
If `better-sqlite3` is not used in production (you use PostgreSQL), exclude it:
```typescript
// nuxt.config.ts
nitro: {
  noExternals: false,
  treeshake: true,
}
```

#### Solution 2: Check Build Output Size
```bash
# Check .output size
du -sh .output
du -sh .output/server
```

If serverless functions are >50MB, consider:
- Splitting large functions
- Removing unused dependencies
- Optimizing imports

#### Solution 3: Enable Vercel Build Logs
In Vercel Dashboard → Settings → General → Build & Development Settings:
- Enable "Debug Logs" to see detailed deployment progress

#### Solution 4: Try Prebuilt Deployment (RECOMMENDED)
If build succeeds locally (which it does!), deploy the prebuilt output:
```bash
# Build locally first
npm run build

# Deploy prebuilt output to Vercel
npx vercel deploy --prebuilt

# Or if you have Vercel CLI installed:
vercel deploy --prebuilt
```

This bypasses the build phase on Vercel and only uploads the `.output` directory, which is much faster and avoids build-timeout issues.

#### Solution 5: Check for Circular Dependencies
```bash
# Check for circular dependencies
npm run build 2>&1 | grep -i "circular\|dependency"
```

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
   - `.output` directory size
