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

**Removed:** per-utility login gates and utility access control UI. Admin passcode at `/dev` entry is the only extra gate; individual utilities open directly.

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
- **`server/utils/`** – `auth`, `db`, `email`, `r2`, `apps`, `getClientIP`
- **`composables/`** – `useAuth`, `useAdminAccessGuard`, etc.
- **`scripts/migrations/`** – DB migration scripts

---

## Canonical domain redirect

Production domain is **`https://www.nomadic-notions.co.in`**. The old Vercel host `shankho-blogsite.vercel.app` permanently redirects (308 / Vercel permanent) to the new domain with path and query preserved (so OAuth callbacks and deep links keep working).

- Edge: [`vercel.json`](../vercel.json) host-based redirect
- App fallback: [`server/middleware/canonical-host.ts`](../server/middleware/canonical-host.ts)

Ensure Google / GitHub / Outlook OAuth authorized redirect URIs use `https://www.nomadic-notions.co.in` (not the old Vercel URL).

### Taskora privacy policy (static, no nav)

Hosted for Google Play / in-app links only — **not** linked from site navigation:

- Primary: `https://www.nomadic-notions.co.in/taskora/privacy`
- Also: `https://www.nomadic-notions.co.in/taskora/privacy.html`
- Files: [`public/taskora/privacy.html`](../public/taskora/privacy.html) and [`public/taskora/privacy/index.html`](../public/taskora/privacy/index.html)
- Public HTTPS, no login wall; page includes `noindex`; `robots.txt` Disallow `/taskora/`

---

## GitHub CI

Workflow: [`.github/workflows/build.yml`](../.github/workflows/build.yml)

1. Lint, format, and `npm run build` (validation only — production still deploys via Vercel Git).
2. On **push to `main`**, if Tina content was auto-formatted, a new commit may be pushed (`[skip ci]`). `wait-vercel` polls for **that HEAD SHA** (not the original workflow SHA), until Vercel reports `READY`.
3. Team projects: set `VERCEL_TEAM_ID` (or the script resolves `accountId` from the project). Missing team id used to return an empty deploy list and time out — it now fails fast with a clear error.

### Secrets for `wait-vercel`

| Secret              | Required      | Where to get it                                                |
| ------------------- | ------------- | -------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Yes           | [Vercel → Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_PROJECT_ID` | Yes           | Project → Settings → General → Project ID                      |
| `VERCEL_TEAM_ID`    | Team projects | Team Settings → Team ID (required if project is under a team)  |

Add them under GitHub → repo **Settings → Secrets and variables → Actions**.

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
# Plain email is safest on Vercel (no spaces or angle brackets in the value)
FROM_EMAIL=blogsite@nomadic-notions.co.in

# Optional display name format also works if the whole value is quoted in .env locally:
# FROM_EMAIL="Nomadic Notions <blogsite@nomadic-notions.co.in>"

NOTIFICATION_EMAIL=blogsite@nomadic-notions.co.in
ALERT_EMAIL=blogsite@nomadic-notions.co.in
```

On **Vercel → Environment Variables**, set `FROM_EMAIL` to `blogsite@nomadic-notions.co.in` only — do **not** include surrounding quotes in the dashboard field.

**Production:** Verify `nomadic-notions.co.in` in Resend and add SPF/DKIM DNS records (Cloudflare) so `blogsite@nomadic-notions.co.in` can send. Without domain verification, password-reset and notification emails will fail or go to spam.

---

## Library Resources & Apps (Tina CMS + Nuxt Content)

**Resources** (Books, Tools, Learning) and **Apps** use **Tina Cloud** (Git-backed MDX) and **Nuxt Content** — same pattern as Musical Notes.

### How it works

1. Resources live in `content/resources/*.mdx`; apps in `content/apps/*.mdx`.
2. **Admins** edit via Tina at `/admin` (site `role = admin` + Tina Cloud login).
3. Tina commits to GitHub → Vercel redeploys → signed-in users see updates on **Library**.
4. App APK/MSIX binaries stay in **private Cloudflare R2**; content stores R2 object keys only.

### Resources frontmatter schema

| Field         | Type    | Notes                                             |
| ------------- | ------- | ------------------------------------------------- |
| title         | string  | Resource name                                     |
| resourceType  | select  | `book`, `tool`, or `learning`                     |
| description   | string  | Card blurb                                        |
| link          | string  | External URL                                      |
| category      | string  | e.g. Programming, Leadership                      |
| author        | string  | Books — optional                                  |
| publisher     | string  | Optional                                          |
| year          | string  | Optional                                          |
| status        | string  | Optional                                          |
| rating        | string  | Optional                                          |
| tags          | list    | Optional                                          |
| icon          | string  | MDI icon for tools/learning (e.g. `mdi:tools`)    |
| coverImageUrl | string  | R2, ImageKit, or any HTTPS URL (not Tina `image`) |
| published     | boolean | Must be `true` to appear in the library           |

### Apps frontmatter schema

| Field       | Type    | Notes                                    |
| ----------- | ------- | ---------------------------------------- |
| title       | string  | App name (one row per product)           |
| description | string  | Short blurb — shown on the app card      |
| details     | string  | Longer text — shown in the detail modal  |
| categories  | list    | e.g. `Android`, `Web`                    |
| version     | string  | e.g. `1.0.0`                             |
| webUrl      | string  | Web/PWA link (optional)                  |
| storeUrl    | string  | App store link (Play / Microsoft / etc.) |
| iconUrl     | string  | R2 public URL or any HTTPS icon URL      |
| apkKey      | string  | R2 object key (not a full URL)           |
| msixKey     | string  | R2 object key (optional)                 |
| published   | boolean | Must be `true` to appear in the library  |

**Publish workflow:** Upload binary to R2 → paste object key into Tina `apkKey` / `msixKey` → set `published: true` → save in Tina.

#### Example apps (seed content)

**Taskora**

| Field       | Value                                                   |
| ----------- | ------------------------------------------------------- |
| title       | Taskora                                                 |
| description | Capture tasks fast and stay organized on mobile or web. |
| categories  | `Android`, `Web`                                        |
| version     | `1.0.0`                                                 |
| apkKey      | `Android/Taskora_Android_v1.0.0.apk`                    |

**Walking Challenge** / **Arthos** — set `apkKey` / `msixKey` to the real R2 object key under `Android/`, `Desktop/`, or `iOS/` when binaries are uploaded.

Books (_Range_, _Dare to Lead_, etc.) use `resourceType: book` — they appear under **Resources → Books**, not Apps.

---

## Musical Notes (Tina CMS + Nuxt Content)

The **Musical Notes** tab uses **Tina Cloud Free** (Git-backed MDX) and **Nuxt Content** — not Notion or ImageKit.

### How it works

1. Content lives in `content/music/*.mdx` in this repo.
2. **Admins** edit via Tina at `/admin` (site `role = admin` required + Tina Cloud login).
3. Tina commits changes to GitHub → Vercel redeploys → visitors see updates.
4. Signed-in users browse **Library → Musical Notes**; detail pages at `/library/music/{slug}`.

### Tina Cloud setup (one-time, free)

1. Create a project at [app.tina.io](https://app.tina.io) and connect this GitHub repository (`shankho9/shankho.github.io`).
2. In **Configuration → Site URL(s)**, add **both** origins (exact match required for login):
   - `http://localhost:3000`
   - `https://www.nomadic-notions.co.in`
3. In **Collaborators**, invite your GitHub account as an editor.
4. Copy **Client ID** (Overview) and **Read token** (Tokens) into environment variables.

#### Tina Cloud project checklist (steps 2–4 in the dashboard)

| Checklist step                     | What to do                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Set up your site schema**        | Run `npm run dev:tina` locally (not `npm run dev` alone). This runs `tinacms dev`, registers the schema with TinaCloud, and updates `tina/tina-lock.json`. Commit and push `tina/tina-lock.json` if it changed. Wait a few minutes for branch indexing on [app.tina.io](https://app.tina.io) → Configuration. |
| **Log in through your site**       | With `npm run dev:tina` running, open `http://localhost:3000/admin/index.html`. Click **Log in** and authenticate with the GitHub account invited in TinaCloud. Site URL must match `http://localhost:3000` exactly.                                                                                          |
| **Create a commit with TinaCloud** | In the editor, open **Musical Notes**, edit any entry (e.g. add a word to the body), click **Save**. Tina commits to GitHub on the `main` branch.                                                                                                                                                             |

> **Note:** `tinacms build` alone does **not** satisfy the schema step — Tina docs require `tinacms dev` to generate/index `tina-lock.json` correctly.

### Environment variables

```env
NUXT_PUBLIC_TINA_CLIENT_ID=your_tina_client_id
TINA_TOKEN=your_tina_read_token
TINA_BRANCH=main
```

Add the same on **Vercel → Environment Variables**, then redeploy.

### Music frontmatter schema

| Field      | Type    | Notes                                   |
| ---------- | ------- | --------------------------------------- |
| title      | string  | Song or piece name                      |
| musicType  | select  | `lyrics`, `instrumental`, or `notation` |
| artist     | string  | Optional                                |
| language   | string  | Optional                                |
| youtubeUrl | string  | Optional — embeds on detail page        |
| spotifyUrl | string  | Optional — embeds on detail page        |
| tags       | list    | Optional                                |
| published  | boolean | Must be `true` to appear in the library |
| coverImage | image   | Optional — stored under `public/music/` |
| body       | MDX     | Lyrics blocks, notation notes, etc.     |

### MDX components for lyrics

Use in the body:

```md
::lyrics-verse
Line one
Line two
::

::lyrics-chorus
**Refrain** text here
::
```

### Admin workflow

1. Sign in as admin on the site.
2. Open **Library → Musical Notes → Edit in Tina** (or go to `/admin`).
3. Create or edit a **Musical Notes** entry; set **Published** when ready.
4. Save in Tina (commits to Git) → wait for Vercel deploy.

### Local development

```bash
# Standard Nuxt dev (read music MDX from repo; no Tina editor)
npm run dev

# Tina Cloud checklist + visual editor (requires TINA_* vars in .env)
npm run dev:tina
# Then open http://localhost:3000/admin/index.html
```

Ensure `.env` contains `NUXT_PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN`, and `TINA_BRANCH=main`. Tina CLI reads `.env` only (not `.env.local`). Add the same three variables on Vercel for production `/admin`.

### Deploy checklist

1. Set `NUXT_PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN`, `TINA_BRANCH` on Vercel.
2. Connect Tina Cloud to the repo; invite admin editors only.
3. Confirm build log includes `tinacms build` (skipped if env vars missing).
4. Verify: visitor sees Musical Notes list; admin sees **Edit in Tina**; unauthenticated `/admin` redirects to login; non-admin gets home with `admin-required`.

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
# * = allow any top-level folder (Android/, Desktop/, iOS/, Web/, …)
# Or restrict: R2_ALLOWED_KEY_PREFIXES=Android/,Desktop/,iOS/
R2_ALLOWED_KEY_PREFIXES=*
```

### Bucket layout / object key convention

Bucket: `nomadic-notions-apps`. Objects live under platform folders:

```
Android/Taskora_Android_v1.0.0.apk
Desktop/SomeApp_v1.0.0.msix
iOS/...
```

Store the **object key only** (not the bucket name) in Tina **`apkKey`** / **`msixKey`**:

```
Android/Taskora_Android_v1.0.0.apk
```

If you paste `nomadic-notions-apps/Android/...`, the server strips the bucket name automatically.

New top-level folders (e.g. `Web/`) work automatically when `R2_ALLOWED_KEY_PREFIXES=*`.

### Upload binaries

Using [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI:

```bash
wrangler r2 object put nomadic-notions-apps/Android/Taskora_Android_v1.0.0.apk --file=./release.apk
wrangler r2 object put nomadic-notions-apps/Desktop/SomeApp_v1.0.0.msix --file=./release.msix
```

Or upload via the Cloudflare R2 dashboard. Then paste the object key into the matching Tina app entry.

### Vercel checklist

1. Add all `R2_*` env vars in Vercel project settings.
2. Redeploy after adding variables.
3. Create a test app in Tina (`content/apps/`, `published: true`) with a valid `apkKey`.
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

- **Tina CMS:** Books, Tools, Learning Resources (`content/resources/`) and Apps (`content/apps/`).
- **R2:** App binaries (APK/MSIX) via presigned URLs for signed-in users.
- **ImageKit:** Photos and videos.
- **Static:** `data/index.ts` → `resourcesPage` for the public `/resources` starter page.
