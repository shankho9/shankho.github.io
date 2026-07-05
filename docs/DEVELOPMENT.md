# Development Guide

Single reference for setup, migrations, utilities, and integrations.

---

## Database Migrations

**Consolidated runner** runs all migrations in order. Use for fresh installs or incremental updates.

```bash
# Run all migrations (incremental; skips already-applied)
npm run migrate
# Production:
npm run migrate:prod
```

**Recreate entire database** (destructive: drops `public` schema, then runs all migrations):

```bash
npm run migrate:recreate
# Production:
npm run migrate:recreate:prod
```

Requires `DATABASE_URL` in `.env` or `.env.production`. Migrations live in `server/db/migrations/`. Order and skip logic are in `scripts/migrations/run-all-migrations.cjs`.

---

## Admin Setup

- Hash password: `node scripts/admin/setup-admin-password.js "your-password"`
- 2FA secret: `node scripts/admin/setup-2fa.js`
- Add to `.env` / `.env.production`:
  - `ADMIN_PASSWORD_HASH=...` (required)
  - `ADMIN_2FA_SECRET=...` (optional)
- Never commit plain passwords or 2FA secrets.

---

## Utilities (`/dev`)

Admin-only dashboard: calculators, analytics, content tools, and site settings.

**Access:** `users.role = admin` in the database, sign-in, then **admin passcode** (set in Account Settings). Utilities link appears in the nav only for admins.

**Admin Users utility** (`/dev/utilities/admin-users`): promote/demote users (`visitor` | `admin`). Each role change requires a 6-digit OTP emailed to **all current admin accounts** via Resend. Any signed-in admin can enter the code to confirm.

**Bootstrap first admin:** run user-role migration or `UPDATE users SET role = 'admin' WHERE email = 'your@email.com'`. Further admins are added via Admin Users.

**Removed:** visitor utility passcode (no longer used). All `/dev` routes use `auth-admin` middleware only.

---

## Site access matrix

| Area                        | Who can access                            |
| --------------------------- | ----------------------------------------- |
| Blogs (read)                | Everyone                                  |
| Blog comments / reactions   | Signed-in users (server-verified session) |
| Library, LifeLines, Gallery | Signed-in users (`auth-login` middleware) |
| Utilities (`/dev`)          | Admins only + admin passcode              |

Nav links for LifeLines, Library, and Gallery are visible to everyone; opening those pages redirects to login if needed.

---

## Codebase

- **`server/api/`** – API by feature (auth, blog, travel, dev, etc.)
- **`server/utils/`** – `auth`, `db`, `email`, `notion`, `r2`, `apps`, `getClientIP`
- **`composables/`** – `useAuth`, `useUtilityAccess`, etc.
- **`scripts/migrations/`** – DB migration scripts

---

## Auth

Unified auth: email/password (with MFA) and Google OAuth. Sessions in DB; httpOnly cookies.

- **Visitors** (`role = visitor`): Library, LifeLines, Gallery after login; can comment on public blogs.
- **Admins** (`role = admin`): same as visitors plus `/dev` utilities after admin passcode.
- Role changes: **Admin Users** utility with email OTP (not env allowlist).

---

## Email (Resend)

Transactional and alert emails use [Resend](https://resend.com). Branding is **Nomadic Notions**; public contact is `blogsite@nomadic-notions.co.in` (see `siteBrand` in `data/index.ts`).

Add to `.env` / Vercel:

```env
RESEND_API_KEY=re_...
FROM_EMAIL="Nomadic Notions <blogsite@nomadic-notions.co.in>"
NOTIFICATION_EMAIL=blogsite@nomadic-notions.co.in
ALERT_EMAIL=blogsite@nomadic-notions.co.in
```

**Production:** Verify `nomadic-notions.co.in` in Resend and add SPF/DKIM DNS records (Cloudflare) so `blogsite@nomadic-notions.co.in` can send. Without domain verification, password-reset and notification emails will fail or go to spam.

---

## Notion (Library Resources & Apps)

- Create integration at notion.so/my-integrations; share DB with it.
- Env: `NOTION_API_KEY`, `NOTION_DATABASE_ID`
- **Resources tab:** Books, Tools, Learning Resources (`Type` select).
- **Apps tab:** Same database; rows with `Type = App` (see schema below).

### Notion schema for Apps

Extend the existing Resources database. Add **`App`** to the **Type** select. For app rows, set these properties:

| Property       | Type         | Notes                          |
| -------------- | ------------ | ------------------------------ |
| Title          | title        | App name                       |
| Description    | rich_text    | Short blurb                    |
| Published      | checkbox     | Must be checked to appear      |
| Type           | select       | **`App`**                      |
| Image          | files        | App icon (optional)            |
| Category       | select/text  | Optional grouping              |
| Version        | text         | e.g. `1.2.0`                   |
| Platforms      | multi_select | e.g. `Android`, `Windows`      |
| Play Store URL | url          | Google Play link (optional)    |
| Apk Key        | text         | R2 object key (not a full URL) |
| Msix Key       | text         | R2 object key (optional)       |

**Publish workflow:** Upload binary to R2 → paste object key into Notion → set Type = App → check Published.

---

## Cloudflare R2 (Library Apps)

App binaries (APK, MSIX) are stored in a **private** Cloudflare R2 bucket. The site generates short-lived presigned download URLs for signed-in users only. ImageKit remains for photos and videos.

### One-time setup

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → Create bucket (e.g. `nomadic-notions-apps`). Keep it **private** (no public access).
2. R2 → Manage R2 API Tokens → Create token with **Object Read** (and **Object Write** for uploads).
3. Note: Account ID, Access Key ID, Secret Access Key, Bucket name.

### Environment variables

Add to `.env` (local) and Vercel (production):

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=nomadic-notions-apps
R2_APPS_PREFIX=apps/
```

### Object key convention

Store these keys in Notion **Apk Key** / **Msix Key** fields (not full URLs):

```
apps/{slug}/{version}/app.apk
apps/{slug}/{version}/app.msix
```

Example: `apps/travel-planner/1.0.0/app.apk`

### Upload binaries

Using [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI:

```bash
wrangler r2 object put nomadic-notions-apps/apps/my-app/1.0.0/app.apk --file=./release.apk
wrangler r2 object put nomadic-notions-apps/apps/my-app/1.0.0/app.msix --file=./release.msix
```

Or upload via the Cloudflare R2 dashboard. Then paste the object key into the matching Notion property.

### Vercel checklist

1. Add all `R2_*` env vars in Vercel project settings.
2. Redeploy after adding variables.
3. Create a test app row in Notion (Type = App, Published = true) with a valid Apk Key.
4. Sign in on `/library` → Apps tab → verify list and download redirect.

---

## ImageKit (Photos / Videos)

- Env: `IMAGEKIT_PRIVATE_KEY` (required), `IMAGEKIT_URL_ENDPOINT`, optional folder overrides.
- Use Private API Key (starts with `private_`). Photos and videos load from configured folders. **Not used for app binaries.**

---

## SEO

- **`data/index.ts`** – `siteBrand` (author, publisher, contact email), `seoData` (title, description, `mySite`, `image`, etc.)
- **`nuxt.config`** – sitemap, robots, `NUXT_PUBLIC_SITE_URL`
- **Pages** – `useHead({ title, meta })` per page.

---

## Security

- Report vulnerabilities per your security policy.
- Use strong passwords, 2FA in production, and never commit secrets.

---

## Resources (Library)

- **Notion:** Books, Tools, Learning Resources, and Apps from the same Notion DB (see Notion section).
- **R2:** App binaries (APK/MSIX) via presigned URLs for signed-in users.
- **ImageKit:** Photos and videos.
- **Static:** `data/index.ts` → `resourcesPage` fallback data.
