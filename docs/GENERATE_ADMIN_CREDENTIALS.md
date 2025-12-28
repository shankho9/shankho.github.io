# Generate Admin Credentials for Production

Quick guide to generate new admin password hash and 2FA secret for Vercel production.

## Step 1: Generate Password Hash

Run this command with your desired password:

```bash
node scripts/admin/setup-admin-password.js "your-production-password"
```

**Example:**

```bash
node scripts/admin/setup-admin-password.js "MySecurePassword123!"
```

**Output:**

```
✅ Password hashed successfully!

Add this to your .env file:
ADMIN_PASSWORD_HASH=$2b$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUV

⚠️  Keep your plain password secure and do not commit it to version control.
```

## Step 2: Generate 2FA Secret

Run this command:

```bash
node scripts/admin/setup-2fa.js
```

**Output:**

```
✅ 2FA Secret Generated!

📱 Add this to your .env file:
ADMIN_2FA_SECRET=ABCDEFGHIJKLMNOPQRSTUVWXYZ234567

📱 Scan this QR code with Microsoft Authenticator:
[QR code displayed in terminal]

⚠️  Keep this secret secure and do not commit it to version control.
```

## Step 3: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

### For Production:

**Variable 1:**

- **Name:** `ADMIN_PASSWORD_HASH`
- **Value:** (The hash from Step 1, e.g., `$2b$12$...`)
- **Environment:** Production

**Variable 2:**

- **Name:** `ADMIN_2FA_SECRET`
- **Value:** (The secret from Step 2, e.g., `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`)
- **Environment:** Production

### Important Notes:

- ✅ **Copy the ENTIRE hash** including the `$2b$12$` prefix
- ✅ **Copy the ENTIRE secret** from the script output
- ✅ Set both variables to **Production** environment
- ✅ **Scan the QR code** with Microsoft Authenticator before deploying
- ⚠️ **Never commit** these values to git
- ⚠️ **Keep your plain password** secure (you'll need it to log in)

## Step 4: Redeploy

After adding the environment variables:

1. Go to **Deployments** tab in Vercel
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger a new deployment

## Step 5: Test Login

1. Go to your production site: `https://shankho-blogsite.vercel.app/dev`
2. Enter your **plain password** (not the hash!)
3. Enter the **6-digit code** from Microsoft Authenticator
4. You should be logged in successfully

## Troubleshooting

### Password Not Working

- ✅ Make sure you copied the **entire hash** including `$2b$12$`
- ✅ Verify the hash in Vercel matches exactly what the script generated
- ✅ Make sure you're entering the **plain password**, not the hash
- ✅ Check that the variable is set for **Production** environment

### 2FA Code Not Working

- ✅ Make sure you **scanned the QR code** with Microsoft Authenticator
- ✅ Verify the secret in Vercel matches exactly what the script generated
- ✅ Check that your device time is synchronized
- ✅ Try generating a new 2FA secret if the old one doesn't work

### Still Not Working?

1. **Verify environment variables are set:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Confirm both `ADMIN_PASSWORD_HASH` and `ADMIN_2FA_SECRET` are present
   - Make sure they're set for **Production** environment

2. **Check deployment logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on the latest deployment
   - Check for any errors related to authentication

3. **Regenerate credentials:**
   - Run the scripts again to generate new values
   - Update the environment variables in Vercel
   - Redeploy

## Quick Reference

```bash
# Generate password hash
node scripts/admin/setup-admin-password.js "your-password"

# Generate 2FA secret
node scripts/admin/setup-2fa.js
```

## Security Reminders

- 🔒 Use a **strong password** (12+ characters, mixed case, numbers, symbols)
- 🔒 **Enable 2FA** for production (always recommended)
- 🔒 **Never share** your plain password or 2FA secret
- 🔒 **Rotate credentials** periodically (every 90 days recommended)
- 🔒 **Use different passwords** for development and production
