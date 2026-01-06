# Authorization System Documentation

## Overview

This document describes the unified authentication and authorization system implemented for Sid's Blog. The system provides secure, standardized authentication with support for email/password (with MFA) and Google OAuth, along with session management, device tracking, and utility passcode protection for developer tools.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication Methods](#authentication-methods)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Session Management](#session-management)
6. [Security Features](#security-features)
7. [Implementation Details](#implementation-details)
8. [Usage Examples](#usage-examples)
9. [Future Enhancements](#future-enhancements)

## Architecture

### Design Principles

- **Unified Authentication**: Single authentication system supporting multiple providers
- **Session-Based**: Database-backed sessions with automatic refresh
- **Device Tracking**: Track and manage user devices for security
- **Layered Security**: Multiple authentication layers (main auth + utility passcode)
- **Standard Compliance**: Follows industry best practices for security

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/Mobile)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  useAuth Composable (Unified Auth Interface)           │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ HTTP Requests
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Server API Layer                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  /api/auth/* - Authentication Endpoints               │  │
│  │  /api/admin/* - Admin Utilities (Protected)         │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ Database Queries
                            │
┌───────────────────────────▼───────────────────────────────────┐
│              Authentication Utilities                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  server/utils/auth.ts - Core Auth Functions           │  │
│  │  - User Management                                     │  │
│  │  - Session Management                                  │  │
│  │  - Device Tracking                                     │  │
│  │  - Utility Passcode Management                        │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ PostgreSQL
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Database Schema                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  users   │  │ sessions │  │ devices  │  │utility_      │  │
│  │          │  │          │  │          │  │ passcodes    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## User Interface

### Login Modal

The main header includes a "Login" button that opens a modal dialog with authentication options:

- **Google OAuth**: One-click sign-in with Google account
- **Email Login**: Redirects to `/auth/login` for email/password authentication
- **Registration Link**: Quick access to create a new account

The modal is accessible from any page via the header and provides a consistent, user-friendly authentication experience.

### Settings Access

After login, users can access their account settings through:

- **User Dropdown Menu**: Click on user profile in header → Settings
- **Direct Link**: `/auth/settings`

Settings page allows users to:

- View account information
- Change password (for email-based accounts)
- Enable/disable MFA
- Set up utility passcode (required for dev tools)

## Authentication Methods

### 1. Email/Password Authentication

Users can register and login with email and password. Passwords are hashed using bcrypt (12 rounds).

**Features:**

- Password strength validation (minimum 8 characters)
- Optional Multi-Factor Authentication (MFA) using TOTP
- Email verification support
- Password change functionality

**Registration Flow:**

1. User provides email, password, and optional name
2. Server validates input and checks for existing user
3. Password is hashed with bcrypt
4. User record is created in database
5. Session is created and device is tracked
6. Email notification sent to admin
7. User is automatically logged in

**Login Flow:**

1. User provides email and password
2. Server verifies password hash
3. If MFA is enabled, user must provide TOTP code
4. Session is created/refreshed
5. Device is tracked (new device triggers notification)
6. User is authenticated

### 2. Google OAuth Authentication

Users can sign in using their Google account via OAuth 2.0.

**Features:**

- One-click sign-in
- Automatic account linking (if email already exists)
- Pre-verified email addresses
- Profile picture and name sync

**OAuth Flow:**

1. User clicks "Login" button in header → Opens login modal
2. User selects "Continue with Google" option
3. Google Identity Services handles authentication
4. Client receives ID token
5. Server verifies token with Google
6. User is created or updated in database
7. Session is created
8. Device is tracked

## Database Schema

### Users Table

Stores user account information.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  picture TEXT,
  password_hash VARCHAR(255),              -- NULL for OAuth-only users
  mfa_secret VARCHAR(255),                 -- TOTP secret for MFA
  mfa_enabled BOOLEAN DEFAULT false,
  auth_provider VARCHAR(50) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
  google_sub VARCHAR(255) UNIQUE,          -- Google user ID
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);
```

**Key Fields:**

- `password_hash`: bcrypt hash (NULL for Google-only users)
- `mfa_secret`: TOTP secret (stored when MFA is enabled)
- `auth_provider`: 'email' or 'google'
- `google_sub`: Google user identifier for OAuth users

### Sessions Table

Manages user sessions with device tracking.

```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT false
);
```

**Session Duration:** 30 days
**Auto-Refresh:** Sessions refresh automatically when accessed if less than 7 days remain

### Devices Table

Tracks user devices for security and analytics.

```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),                 -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(255),
  os VARCHAR(255),
  ip_address VARCHAR(45),
  is_trusted BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_fingerprint)
);
```

**Device Fingerprinting:**

- Based on user agent and IP address (SHA-256 hash)
- Unique per user-device combination
- Used for device recognition and security alerts

### Utility Passcodes Table

Stores passcodes for developer utilities (planner, location manager).

```sql
CREATE TABLE utility_passcodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passcode_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,           -- 3 months from creation/update
  UNIQUE(user_id)
);
```

**Passcode Requirements:**

- Minimum 6 characters
- Hashed with bcrypt
- Must be rotated every 3 months
- Separate from main authentication password

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/register`

Register a new user with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "auth_provider": "email",
    "mfa_enabled": false
  }
}
```

#### `POST /api/auth/login`

Login with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "mfaCode": "123456" // optional, required if MFA enabled
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "auth_provider": "email",
    "mfa_enabled": true
  }
}
```

**Error Response (MFA Required):**

```json
{
  "success": false,
  "error": "MFA code required",
  "requiresMFA": true
}
```

#### `POST /api/auth/google`

Authenticate with Google OAuth.

**Request:**

```json
{
  "token": "google_id_token_here"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://...",
    "auth_provider": "google",
    "mfa_enabled": false
  }
}
```

#### `POST /api/auth/logout`

Logout and revoke current session.

**Response:**

```json
{
  "success": true
}
```

#### `GET /api/auth/me`

Get current authenticated user.

**Response:**

```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "auth_provider": "email",
    "mfa_enabled": true
  }
}
```

### MFA Endpoints

#### `POST /api/auth/mfa/setup`

Setup or manage MFA.

**Generate QR Code:**

```json
{
  "action": "generate"
}
```

**Response:**

```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "message": "Scan the QR code..."
}
```

**Verify and Enable:**

```json
{
  "action": "verify",
  "secret": "JBSWY3DPEHPK3PXP",
  "code": "123456"
}
```

**Disable MFA:**

```json
{
  "action": "disable"
}
```

### Password Management

#### `POST /api/auth/password/change`

Change user password (requires current password).

**Request:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### Utility Passcode Endpoints

#### `POST /api/auth/utility-passcode/verify`

Verify utility passcode for dev tools access.

**Request:**

```json
{
  "passcode": "mypasscode123"
}
```

#### `POST /api/auth/utility-passcode/set`

Set or update utility passcode.

**Request:**

```json
{
  "passcode": "newpasscode123"
}
```

#### `GET /api/auth/utility-passcode/status`

Check utility passcode status and expiry.

**Response:**

```json
{
  "authenticated": true,
  "needsRotation": false,
  "expiresAt": "2024-06-15T00:00:00.000Z"
}
```

## Session Management

### Session Lifecycle

1. **Creation**: Session created on successful login
   - Token: 32-byte random hex string
   - Duration: 30 days
   - Stored in database and HTTP-only cookie

2. **Validation**: Every request checks session validity
   - Token verified against database
   - Expiry checked
   - Revoked status checked

3. **Auto-Refresh**: Sessions automatically refresh when:
   - Accessed and less than 7 days remain
   - New expiry: current time + 30 days

4. **Revocation**: Sessions can be revoked:
   - User logout
   - Admin action
   - Security incident

### Session Storage

- **Server**: Database table with expiry tracking
- **Client**: HTTP-only cookie (not accessible via JavaScript)
- **Cookie Settings**:
  - `httpOnly: true` - Prevents XSS attacks
  - `secure: true` (production) - HTTPS only
  - `sameSite: 'lax'` - CSRF protection
  - `path: '/'` - Available site-wide

### Device Tracking

- **Fingerprinting**: SHA-256 hash of user agent + IP
- **Device Info**: Parsed from user agent (browser, OS, device type)
- **New Device Detection**: Triggers email notification
- **Device History**: Tracked per user for security auditing

## Security Features

### Password Security

- **Hashing**: bcrypt with 12 rounds (cost factor)
- **Validation**: Minimum 8 characters
- **Storage**: Never stored in plain text
- **Change**: Requires current password verification

### MFA (Multi-Factor Authentication)

- **Method**: TOTP (Time-based One-Time Password)
- **Standard**: RFC 6238 compliant
- **Apps**: Works with Google Authenticator, Microsoft Authenticator, etc.
- **Window**: ±1 time step tolerance
- **Setup**: QR code generation for easy setup

### Session Security

- **Token Generation**: Cryptographically secure random bytes
- **Expiry**: 30-day sessions with auto-refresh
- **Revocation**: Immediate session invalidation
- **Database Storage**: Centralized session management
- **Cookie Security**: HTTP-only, secure, same-site protection

### Utility Passcode Security

- **Separate Layer**: Additional security for dev tools
- **Rotation**: Forced every 3 months
- **Hashing**: bcrypt (same as passwords)
- **Expiry Tracking**: Automatic rotation reminders

### Email Notifications

- **New User Registration**: Admin notification
- **New Device Login**: Security alert
- **Login Tracking**: Analytics and security monitoring

## Implementation Details

### Server Utilities (`server/utils/auth.ts`)

Core authentication functions:

- `getCurrentUser(event)` - Get authenticated user from session
- `createUser(data)` - Create new user account
- `getUserByEmail(email)` - Find user by email
- `getUserByGoogleSub(sub)` - Find user by Google ID
- `createSession(userId, event, deviceId?)` - Create new session
- `getSession(token)` - Validate and refresh session
- `revokeSession(token)` - Revoke a session
- `hashPassword(password)` - Hash password with bcrypt
- `verifyPassword(password, hash)` - Verify password
- `generateMFASecret(email)` - Generate TOTP secret
- `verifyMFACode(secret, code)` - Verify TOTP code
- `getOrCreateDevice(...)` - Track user device
- `setUtilityPasscode(userId, passcode)` - Set utility passcode
- `verifyUtilityPasscode(userId, passcode)` - Verify utility passcode

### Client Composable (`composables/useAuth.ts`)

Unified authentication interface:

```typescript
const {
  user, // Current user (ref)
  isAuthenticated, // Authentication status (computed)
  isLoading, // Loading state (ref)
  isChecking, // Auth check in progress (ref)
  checkAuth, // Check authentication status
  register, // Register new user
  login, // Login with email/password
  loginWithGoogle, // Login with Google OAuth
  signOut, // Logout
  verifyUtilityPasscode, // Verify utility passcode
  checkUtilityPasscodeStatus, // Check passcode status
} = useAuth()
```

### Middleware

#### `middleware/auth-planner.ts`

Protects dev utilities (planner, locations) with:

1. User authentication check
2. Utility passcode verification
3. Passcode rotation enforcement

**Flow:**

1. Check if user is authenticated
2. Check utility passcode status
3. If passcode needs rotation, redirect to settings
4. If passcode not verified in session, redirect to verification page
5. Allow access if all checks pass

## Usage Examples

### Register New User

```vue
<script setup>
import { useAuth } from '~/composables/useAuth'

const { register } = useAuth()

const handleRegister = async () => {
  const result = await register('user@example.com', 'securepassword123', 'John Doe')

  if (result.success) {
    // User registered and logged in
    navigateTo('/')
  } else {
    // Handle error
    console.error(result.error)
  }
}
</script>
```

### Login with Email/Password

```vue
<script setup>
import { useAuth } from '~/composables/useAuth'

const { login } = useAuth()

const handleLogin = async () => {
  const result = await login(
    'user@example.com',
    'securepassword123',
    '123456', // MFA code if enabled
  )

  if (result.success) {
    navigateTo('/')
  } else if (result.requiresMFA) {
    // Show MFA input
  } else {
    console.error(result.error)
  }
}
</script>
```

### Login with Google (via Modal)

The header includes a login modal that provides Google OAuth and email login options:

```vue
<!-- Header automatically includes LoginModal component -->
<!-- Users click "Login" button → Modal opens with options -->
```

**Manual Implementation:**

```vue
<script setup>
import { useAuth } from '~/composables/useAuth'

const { initializeGoogleSignIn, handleGoogleCredential, signIn } = useAuth()

onMounted(() => {
  initializeGoogleSignIn()

  // Option 1: Use signIn() to prompt user
  signIn() // Opens Google sign-in prompt

  // Option 2: Handle credential response manually
  if (window.google) {
    window.google.accounts.id.initialize({
      client_id: useRuntimeConfig().public.googleClientId,
      callback: async (response) => {
        const result = await handleGoogleCredential(response)
        if (result.success) {
          navigateTo('/')
        }
      },
    })
  }
})
</script>
```

### Protect a Page

```vue
<script setup>
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  middleware: 'auth', // Custom middleware
})

const { isAuthenticated, checkAuth } = useAuth()

onMounted(async () => {
  await checkAuth()
  if (!isAuthenticated.value) {
    navigateTo('/auth/login')
  }
})
</script>
```

### Access Dev Utilities

```vue
<script setup>
import { useAuth } from '~/composables/useAuth'

const { verifyUtilityPasscode } = useAuth()

const accessPlanner = async () => {
  // Middleware will check utility passcode
  // Or manually verify:
  const result = await verifyUtilityPasscode('mypasscode')
  if (result.success) {
    sessionStorage.setItem('utility_passcode_verified', 'true')
    navigateTo('/dev/planner')
  }
}
</script>
```

## Quick Reference

### Authentication Flow Diagram

```
User Registration/Login
    │
    ├─→ Email/Password ──→ Verify Password ──→ [MFA?] ──→ Create Session
    │                                                      │
    └─→ Google OAuth ──→ Verify Token ──→ Create/Update User ──→ Create Session
                                                                    │
                                                                    ▼
                                                              Set Cookie
                                                              Track Device
                                                              Send Notification
```

### Utility Passcode Flow

The utility passcode is an additional security layer required for accessing developer utilities (Location Manager and Planner). It must be set up once per user account and rotated every 3 months.

```
Access Dev Utility (Location Manager / Planner)
    │
    ├─→ Check User Auth ──→ [Not Auth] ──→ Redirect to Login Modal
    │
    ├─→ Check Passcode Status ──→ [Not Set] ──→ Redirect to Settings
    │                                          (User must set passcode first)
    │
    ├─→ Check Passcode Status ──→ [Needs Rotation] ──→ Redirect to Settings
    │                                                  (Passcode expired, must rotate)
    │
    └─→ Check Passcode Verification ──→ [Not Verified] ──→ Show Passcode Form
          (in current session)                              │
                                                            ▼
                                                       Verify Passcode
                                                       Store in Session
                                                       Allow Access
```

**Setup Flow:**

1. User logs in (via Google OAuth or email/password)
2. User navigates to Settings (`/auth/settings`)
3. User sets utility passcode (minimum 6 characters)
4. Passcode is hashed and stored with 3-month expiry
5. User can now access dev utilities after verifying passcode

**Verification Flow:**

1. User attempts to access dev utility (planner or location manager)
2. If passcode not verified in current session, redirect to verification page
3. User enters passcode
4. Passcode is verified against stored hash
5. Verification status stored in sessionStorage
6. User gains access to dev utility

### Common Tasks

**Check if user is authenticated:**

```typescript
const { isAuthenticated, checkAuth } = useAuth()
await checkAuth()
if (isAuthenticated.value) {
  // User is logged in
}
```

**Get current user:**

```typescript
const { user } = useAuth()
console.log(user.value?.email)
```

**Protect a route:**

```typescript
definePageMeta({
  middleware: 'auth-planner', // or custom middleware
})
```

**Verify utility passcode:**

```typescript
const { verifyUtilityPasscode } = useAuth()
const result = await verifyUtilityPasscode('passcode123')
```

## Future Enhancements

### High Priority

1. **Password Reset Flow**
   - Email-based password reset
   - Secure token generation and validation
   - Token expiry (e.g., 1 hour)
   - Implementation: `/api/auth/password/reset` endpoint

2. **Email Verification**
   - Send verification email on registration
   - Verify email link with token
   - Prevent unverified accounts from certain actions
   - Implementation: Add `email_verification_token` to users table

3. **Session Management UI**
   - View active sessions
   - Revoke specific sessions
   - Device management interface
   - Implementation: `/api/auth/sessions` endpoint + UI component

4. **Rate Limiting**
   - Prevent brute force attacks
   - Limit login attempts per IP/email
   - Exponential backoff on failures
   - Implementation: Redis-based rate limiting

5. **Account Lockout**
   - Lock account after N failed attempts
   - Temporary lockout (e.g., 15 minutes)
   - Admin unlock capability
   - Implementation: Add `locked_until` to users table

### Medium Priority

6. **Social Login Expansion**
   - Add GitHub OAuth
   - Add Microsoft OAuth
   - Unified OAuth provider interface
   - Implementation: Extend `auth_provider` enum

7. **Two-Factor Backup Codes**
   - Generate backup codes when enabling MFA
   - One-time use codes for account recovery
   - Secure storage (hashed)
   - Implementation: New `mfa_backup_codes` table

8. **Password Strength Meter**
   - Real-time password strength feedback
   - Enforce stronger passwords for admin accounts
   - Implementation: Client-side validation + server rules

9. **Security Audit Log**
   - Log all authentication events
   - Track password changes, MFA changes
   - Admin security dashboard
   - Implementation: New `security_audit_log` table

10. **Remember Me Functionality**
    - Long-lived sessions (e.g., 90 days)
    - Separate from regular sessions
    - Clear indication in UI
    - Implementation: Add `remember_me` flag to sessions

### Low Priority

11. **Biometric Authentication**
    - WebAuthn/FIDO2 support
    - Fingerprint/face recognition
    - Hardware security keys
    - Implementation: WebAuthn API integration

12. **OAuth Token Refresh**
    - Automatic Google token refresh
    - Store refresh tokens securely
    - Handle token expiration gracefully
    - Implementation: OAuth refresh token flow

13. **Account Deletion**
    - User-initiated account deletion
    - Data retention policies
    - Soft delete option
    - Implementation: Add `deleted_at` timestamp

14. **Multi-Account Support**
    - Link multiple auth providers to one account
    - Switch between accounts
    - Account merging
    - Implementation: Account linking system

15. **Advanced Device Management**
    - Device naming
    - Trust device option
    - Device-specific permissions
    - Implementation: Enhanced device UI

### Security Enhancements

16. **IP Whitelisting**
    - Restrict access from specific IPs
    - Geographic restrictions
    - VPN detection
    - Implementation: IP validation middleware

17. **Anomaly Detection**
    - Detect unusual login patterns
    - Geographic anomalies
    - Device changes
    - Implementation: ML-based detection or rule-based

18. **Security Headers**
    - Content Security Policy
    - X-Frame-Options
    - HSTS
    - Implementation: Nuxt security headers module

19. **Encrypted Session Storage**
    - Encrypt sensitive session data
    - Key rotation
    - Implementation: AES encryption for session payload

20. **Password History**
    - Prevent password reuse
    - Store last N password hashes
    - Implementation: `password_history` table

### Developer Experience

21. **API Documentation**
    - OpenAPI/Swagger documentation
    - Interactive API explorer
    - Implementation: Swagger UI integration

22. **Testing Utilities**
    - Auth testing helpers
    - Mock authentication
    - Test user fixtures
    - Implementation: Test utilities module

23. **Migration Tools**
    - User migration scripts
    - Data export/import
    - Implementation: CLI tools

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Google OAuth
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Email Notifications (Optional)
RESEND_API_KEY=your_resend_api_key
NOTIFICATION_EMAIL=admin@example.com
```

## Migration Guide

### Running Migrations

```bash
# Development
npm run migrate:auth

# Production
npm run migrate:auth:prod
```

### Migration Scripts

- `scripts/migrations/run-auth-migration.js` - Creates auth tables
- `server/db/migrations/create_auth_tables.sql` - SQL schema

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check cookie settings (httpOnly, secure, sameSite)
   - Verify database connection
   - Check session expiry

2. **MFA Not Working**
   - Verify system clock synchronization
   - Check TOTP secret storage
   - Ensure authenticator app is configured correctly

3. **Utility Passcode Issues**
   - Check passcode expiry
   - Verify passcode hash in database
   - Ensure sessionStorage is enabled

4. **Google OAuth Fails**
   - Verify Google Client ID configuration
   - Check OAuth consent screen settings
   - Verify redirect URIs

## Security Best Practices

1. **Never log sensitive data** (passwords, tokens, passcodes)
2. **Use HTTPS in production** (required for secure cookies)
3. **Regular security audits** of authentication code
4. **Keep dependencies updated** (bcrypt, otplib, etc.)
5. **Monitor failed login attempts** for security threats
6. **Implement rate limiting** to prevent brute force
7. **Use environment variables** for secrets (never commit)
8. **Regular database backups** including auth tables
9. **Review session logs** for suspicious activity
10. **Keep documentation updated** with security changes

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Nuxt 3 Authentication](https://nuxt.com/docs/guide/directory-structure/middleware)

## Changelog

### Version 2.1.0 (Current)

- **Login Modal**: Header shows "Login" button that opens modal with Google OAuth and email login options
- **Settings Integration**: Settings link added to user dropdown menu (both desktop and mobile)
- **Utility Passcode Setup**: Passcode can be set up from Settings page after login
- **Code Cleanup**: Removed old Google sign-in code from header, unified all auth through `useAuth`
- **Component**: New `AuthLoginModal` component for consistent login experience

### Version 2.0.0

- Unified authentication system
- Email/password + MFA support
- Google OAuth integration
- Database-backed sessions
- Device tracking
- Utility passcode system
- Email notifications

### Migration from v1.0

- Old admin auth system removed
- `useAdminAuth` → `useAuth`
- `useGoogleAuth` → `useAuth` (fully migrated)
- Session management moved to database
- Utility passcode replaces admin password for dev tools
