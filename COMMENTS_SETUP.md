# Comments System Setup Guide

This guide will help you set up the Google OAuth comments system for your blog.

## Prerequisites

1. PostgreSQL database (already configured)
2. Google Cloud Console account

## Step 1: Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or Google Identity Services)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application** as the application type
6. Add your authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
7. Copy the **Client ID**

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Step 3: Create Database Table

Run the SQL migration to create the comments table:

### Option A: Using npm script (Recommended)

**For Development (uses `.env`):**
```bash
npm run migrate
```

**For Production (uses `.env.production`):**
```bash
npm run migrate:prod
```

### Option B: Using psql directly

**Development:**
```bash
# Load .env and run migration
source .env
psql $DATABASE_URL -f server/db/migrations/create_comments_table.sql
```

**Production:**
```bash
# Load .env.production and run migration
source .env.production
psql $DATABASE_URL -f server/db/migrations/create_comments_table.sql
```

### Option C: Manual execution

Manually execute the SQL from `server/db/migrations/create_comments_table.sql` in your database.

## Step 4: Verify Setup

1. Start your development server: `npm run dev`
2. Navigate to any blog post
3. You should see the comments section at the bottom
4. Click "Sign in with Google" to test authentication
5. Try posting a comment

## Features

- ✅ Google OAuth authentication
- ✅ Comment posting and display
- ✅ User profile pictures and names
- ✅ Timestamp display
- ✅ Responsive design with dark mode support
- ✅ Character limit (5000 characters)
- ✅ Soft delete support (deleted_at column)

## Troubleshooting

### Google Sign-In button not appearing
- Check that `NUXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- Verify the Google script is loading (check browser console)
- Ensure your domain is added to authorized origins in Google Cloud Console

### Comments not saving
- Check database connection (`DATABASE_URL` environment variable)
- Verify the comments table exists
- Check server logs for errors

### Authentication fails
- Verify the Google Client ID is correct
- Check that Google+ API is enabled in Google Cloud Console
- Ensure your domain matches the authorized origins





