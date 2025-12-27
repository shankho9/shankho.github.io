# Admin Authentication Setup Guide

## Overview

The admin authentication system uses encrypted password storage and optional 2FA (Two-Factor Authentication) with Microsoft Authenticator (TOTP).

## Initial Setup

### 1. Hash Your Admin Password

Never store plain text passwords. Use the provided script to hash your password:

```bash
node scripts/admin/setup-admin-password.js "your-plain-password"
```

This will output a hashed password. Add it to your `.env` or `.env.production` file:

```bash
ADMIN_PASSWORD_HASH=$2b$12$...your-hashed-password...
```

**Important:**

- Keep your plain password secure and never commit it to version control
- The hash uses bcrypt with 12 salt rounds
- Store only the hash in environment variables

### 2. Setup 2FA (Optional but Recommended)

Generate a 2FA secret for Microsoft Authenticator:

```bash
node scripts/admin/setup-2fa.js
```

This will:

1. Generate a secret key
2. Display a QR code (in terminal) for easy setup
3. Provide the secret to add to your `.env` file

Add the secret to your `.env` or `.env.production` file:

```bash
ADMIN_2FA_SECRET=your-2fa-secret-here
```

**To add to Microsoft Authenticator:**

1. Open Microsoft Authenticator app
2. Tap the "+" button
3. Select "Work or school account" or "Personal account"
4. Scan the QR code displayed by the script
5. Or manually enter the secret if QR code scanning fails

**Note:** If `ADMIN_2FA_SECRET` is not set, 2FA will be disabled and only password is required.

## Environment Variables

Add these to your `.env` or `.env.production` file:

```bash
# Required: Hashed admin password
ADMIN_PASSWORD_HASH=$2b$12$...your-hashed-password...

# Optional: 2FA secret (if not set, 2FA is disabled)
ADMIN_2FA_SECRET=your-2fa-secret-here
```

## Authentication Flow

### Without 2FA:

1. User enters password
2. System verifies password hash
3. Token is issued (valid for 24 hours)
4. User is authenticated

### With 2FA:

1. User enters password
2. System verifies password hash
3. If password is correct, 2FA code is required
4. User enters 6-digit code from Microsoft Authenticator
5. System verifies TOTP code
6. Token is issued (valid for 24 hours)
7. User is authenticated

## Token Management

- **Token Expiry:** 24 hours
- **Storage:** httpOnly cookie (prevents XSS attacks)
- **Security:** Secure flag enabled in production (HTTPS only)
- **SameSite:** Strict (prevents CSRF attacks)

## Security Best Practices

1. **Use Strong Passwords:** Minimum 12 characters, mix of letters, numbers, and symbols
2. **Enable 2FA:** Always enable 2FA in production environments
3. **Rotate Secrets:** Periodically rotate your 2FA secret
4. **Secure Storage:** Never commit passwords or secrets to version control
5. **Environment Separation:** Use different passwords for development and production
6. **Monitor Access:** Review access logs regularly
7. **Token Expiry:** Tokens expire after 24 hours - users must re-authenticate

## Troubleshooting

### Password Not Working

- Verify `ADMIN_PASSWORD_HASH` is set correctly
- Ensure you're using the hashed password, not the plain password
- Re-run the password hashing script if needed

### 2FA Code Not Working

- Ensure your device time is synchronized
- Check that `ADMIN_2FA_SECRET` is set correctly
- Verify the code is entered within the time window (30 seconds)
- Try generating a new 2FA secret if issues persist

### Token Expired

- Tokens expire after 24 hours
- Simply log in again to get a new token
- The system will automatically prompt for re-authentication

### Can't Access Dev Utilities

- Verify environment variables are loaded correctly
- Check server logs for authentication errors
- Ensure cookies are enabled in your browser
- Try clearing browser cookies and logging in again

## Migration from Plain Password

If you were previously using `ADMIN_PASSWORD` (plain text):

1. Run the password hashing script with your current password
2. Replace `ADMIN_PASSWORD` with `ADMIN_PASSWORD_HASH` in your `.env` file
3. Remove the old `ADMIN_PASSWORD` variable
4. Restart your application

## Google Authentication

Google authentication tokens are also valid for 24 hours. Users start signed out by default on page load for security.

## Additional Resources

- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [otplib Documentation](https://github.com/yeojz/otplib)
- [Microsoft Authenticator](https://www.microsoft.com/en-us/security/mobile-authenticator-app)
