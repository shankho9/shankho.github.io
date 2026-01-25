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

Requires `DATABASE_URL` in `.env` or `.env.production`. Migrations live in `server/db/migrations/`. Order and skip logic are in `scripts/migrations/run-all-migrations.js`.

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

Dashboard at `/dev` for tools, analytics, calculators. Role-based access (visitor/admin); some utilities require a passcode (set in Access Control).

**Sections:** Analytics & Insights (admin), Site Settings (admin), Data & Infrastructure, Content & Data Managers, Calculators, Planning.

**Access:** Sign in → Utilities. Admins manage access and passcodes via **Utility Access Control**.

---

## Codebase

- **`server/api/`** – API by feature (auth, blog, travel, dev, etc.)
- **`server/utils/`** – `auth`, `db`, `email`, `getClientIP`
- **`composables/`** – `useAuth`, `useUtilityAccess`, etc.
- **`scripts/migrations/`** – DB migration scripts

---

## Auth

Unified auth: email/password (with MFA) and Google OAuth. Sessions in DB; httpOnly cookies. Utilities use optional passcodes (utilities vs admin) configured per utility.

---

## Planner

Task planner at `/dev/planner`. Eisenhower-style quadrants, MIT flag, planned dates. Uses `tasks` and `weekly_reviews` tables.

---

## Notion (Library Resources)

- Create integration at notion.so/my-integrations; share DB with it.
- Env: `NOTION_API_KEY`, `NOTION_DATABASE_ID`
- Use `NotionResources` in Library Resources tab.

---

## ImageKit (Photos / Resources)

- Env: `IMAGEKIT_PRIVATE_KEY` (required), `IMAGEKIT_URL_ENDPOINT`, optional folder overrides.
- Use Private API Key (starts with `private_`). Photos load from configured folders.

---

## SEO

- **`data/index.ts`** – `seoData` (title, description, `mySite`, `image`, etc.)
- **`nuxt.config`** – sitemap, robots, `NUXT_PUBLIC_SITE_URL`
- **Pages** – `useHead({ title, meta })` per page.

---

## Security

- Report vulnerabilities per your security policy.
- Use strong passwords, 2FA in production, and never commit secrets.

---

## Resources (Library)

- **Notion:** See Notion section; resources can come from Notion DB.
- **Static:** `data/index.ts` → `resourcesPage` (images, videos, etc.). Images via ImageKit URLs.
