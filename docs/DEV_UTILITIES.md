# Dev Utilities Documentation

## Overview

The Dev Utilities page (`/dev`) provides a centralized dashboard for development tools and analytics. It requires admin authentication and exposes various utilities as projects.

## Setup

### Environment Variables

Add the following to your `.env` or `.env.production` file:

```bash
# Hashed admin password (use setup script to generate)
ADMIN_PASSWORD_HASH=$2b$12$...your-hashed-password...

# Optional: 2FA secret for Microsoft Authenticator
ADMIN_2FA_SECRET=your-2fa-secret-here
```

**Important:**

- Use the password hashing script to generate `ADMIN_PASSWORD_HASH` (see [Admin Setup Guide](./ADMIN_SETUP.md))
- Never store plain text passwords
- Enable 2FA for production environments

## Authentication

The dev utilities page uses encrypted password authentication with optional 2FA (Two-Factor Authentication) and token-based sessions:

1. Navigate to `/dev`
2. Enter the admin password (hashed and stored securely)
3. If 2FA is enabled, enter the 6-digit code from Microsoft Authenticator
4. A secure httpOnly cookie is set for 24 hours
5. All API endpoints verify the token before returning data

**Security Features:**

- Passwords are hashed using bcrypt (12 salt rounds)
- Optional 2FA with Microsoft Authenticator (TOTP)
- Tokens expire after 24 hours
- httpOnly cookies prevent XSS attacks
- Secure flag enabled in production (HTTPS only)

## Available Utilities

### 1. Visitor Analytics

**Purpose:** View unique visitors signing in to various pages with detailed analytics.

**Features:**

- Page visits statistics (unique visitors, total visits, last visit)
- Login statistics by page (unique users, total logins)
- Unique users table with login history and pages visited
- Summary cards with key metrics

**Data Sources:**

- `page_visits` table - tracks page visits
- `user_logins` table - tracks user authentication events

### 2. Location Manager

**Purpose:** Web interface to add and manage locations on the travel map.

**Features:**

- Form to add new locations with validation
- Interactive map preview showing the location
- Support for home and trip types
- Optional year visited, description, and blog slug

**API Endpoint:** `/api/travel/places` (POST)

### 3. Database Statistics

**Purpose:** View database table statistics and row counts.

**Features:**

- Table-by-table row counts
- Summary cards with key statistics
- Detailed table view

**Security:** Only accessible to authenticated admins.

### 4. API Health Check

**Purpose:** Check API endpoints and database connectivity status.

**Features:**

- Database connection test
- Admin authentication endpoint check
- Travel places API check
- Gallery API check
- Response time measurements
- Visual status indicators (healthy/degraded/unhealthy)

### 5. Email Logs

**Purpose:** View email alert history and new user notifications.

**Features:**

- List of all new users (first login per user)
- Summary statistics (total, recent, this month)
- User details (email, name, location, country, first login date)

**Note:** Detailed email logs are stored in the email service provider (Resend). This utility shows new user alerts based on login tracking.

### 6. Content Manager

**Purpose:** Quick links to manage blog posts, gallery items, and resources.

**Features:**

- Quick links to:
  - Manage Places (`/dev/locations`)
  - Gallery (`/gallery`)
  - Blog Posts (`/blogs`)
  - Resources (`/resources`)
  - Personal Space (`/personalSpace`)
- Future: SQL query interface

### 7. Cache Management

**Purpose:** Clear application cache and manage cache settings.

**Features:**

- Clear Nuxt/Nitro server cache
- Browser cache instructions
- Cache status information
- Last cleared timestamp

**Use Cases:**

- After deploying new content
- When experiencing stale data issues
- To force fresh data loading

## API Endpoints

All admin endpoints are prefixed with `/api/admin/`:

- `POST /api/admin/auth` - Authenticate with password
- `GET /api/admin/auth` - Check authentication status
- `POST /api/admin/logout` - Clear authentication token
- `GET /api/admin/visitors` - Get visitor analytics data
- `GET /api/admin/database-stats` - Get database statistics
- `GET /api/admin/new-users` - Get new user alerts
- `POST /api/admin/cache` - Clear application cache

## Security Considerations

1. **Password Storage:** Passwords are hashed using bcrypt and stored in environment variables, never in code
2. **2FA Support:** Optional two-factor authentication using Microsoft Authenticator (TOTP)
3. **Token Security:** Tokens are stored in httpOnly cookies to prevent XSS attacks
4. **HTTPS:** In production, cookies are set with `secure: true` flag
5. **Token Expiry:** Tokens expire after 24 hours
6. **Authorization:** All admin endpoints verify the token before returning data
7. **Password Hashing:** Uses bcrypt with 12 salt rounds for secure password storage

## Future Enhancements

Potential utilities to add:

1. **SQL Query Interface** - Direct database query execution (with safety limits)
2. **Cache Management** - Clear and manage application cache
3. **Log Viewer** - View application logs in real-time
4. **Performance Metrics** - API response times, database query performance
5. **User Management** - View and manage user accounts
6. **Content Moderation** - Moderate comments and user-generated content
7. **Backup Management** - Database backup and restore utilities
8. **Environment Config** - View and manage environment variables (read-only)

## Troubleshooting

### Authentication Issues

- **Password not working:**
  - Verify `ADMIN_PASSWORD_HASH` is set correctly (not plain password)
  - Use the password hashing script to generate the hash
  - See [Admin Setup Guide](./ADMIN_SETUP.md) for details
- **2FA code not working:**
  - Ensure device time is synchronized
  - Verify `ADMIN_2FA_SECRET` is set correctly
  - Check code is entered within the 30-second window
- **Token expired:** Log out and log back in (tokens expire after 24 hours)
- **Cookie issues:** Check browser settings allow cookies for the domain

### Data Not Loading

- **Database connection:** Check `DATABASE_URL` is configured
- **API errors:** Check browser console and server logs
- **CORS issues:** Verify API endpoints are accessible

### Map Not Showing

- **Google Maps API:** Verify `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- **API key restrictions:** Check Google Cloud Console for API key restrictions

## Access Control

The dev utilities page is intended for development and administrative purposes only. In production:

1. Consider restricting access by IP address
2. Use strong, unique passwords
3. Monitor access logs
4. Consider adding rate limiting to authentication endpoints
5. Implement additional security measures as needed
