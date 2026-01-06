# Codebase Structure & Organization

This document outlines the optimized structure of the codebase after reorganization.

> **Related Documentation:**
>
> - [Authorization System Documentation](./authorization.md) - Complete guide to authentication and authorization
> - [Dev Utilities Guide](./DEV_UTILITIES.md) - Development tools documentation

## 📁 Directory Structure

### `/server/api/` - API Endpoints

All API endpoints are organized by feature domain:

```
server/api/
├── analytics/          # Analytics & tracking endpoints
│   ├── track-login.post.ts
│   └── track-visit.post.ts
├── auth/              # Authentication endpoints
│   ├── google.post.ts           # Google OAuth authentication
│   ├── login.post.ts            # Email/password login
│   ├── register.post.ts         # User registration
│   ├── logout.post.ts           # Logout
│   ├── me.get.ts                # Get current user
│   ├── password/
│   │   └── change.post.ts       # Change password
│   ├── mfa/
│   │   └── setup.post.ts        # MFA setup/verify/disable
│   └── utility-passcode/
│       ├── verify.post.ts       # Verify utility passcode
│       ├── set.post.ts          # Set utility passcode
│       └── status.get.ts        # Check passcode status
├── blog/              # Blog-related endpoints
│   ├── [slug].get.ts  # Dynamic route for blog posts
│   ├── comments.get.ts
│   ├── comments.post.ts
│   ├── like.post.ts
│   └── likes.get.ts
├── dev/               # Development/testing utilities
│   └── test-db.get.ts
├── feeds/             # RSS and feed endpoints
│   └── rss.xml.get.ts
├── gallery/           # Gallery social features
│   ├── comments.get.ts
│   ├── comments.post.ts
│   ├── like.post.ts
│   └── likes.get.ts
└── travel/            # Travel places endpoints
    ├── places.get.ts
    └── places.post.ts
```

### `/utils/` - Utility Functions

Organized by domain:

```
utils/
├── analytics/         # Analytics & tracking utilities
│   └── trackLogin.ts
├── blog/              # Blog-specific utilities
│   ├── blogMeta.ts    # Blog post metadata extraction
│   ├── readingTime.ts # Reading time calculation
│   └── tagColors.ts   # Tag color assignment
└── common/            # General-purpose utilities
    ├── dateParser.ts  # Date parsing & formatting
    └── helper.ts      # General helper functions
```

### `/server/utils/` - Server-Side Utilities

```
server/utils/
├── auth.ts        # Authentication utilities (users, sessions, devices, MFA, passcodes)
├── db.ts          # Database connection & query utilities
├── email.ts       # Email sending utilities (Resend)
└── getClientIP.ts # IP address extraction utility
```

### `/scripts/` - Build & Migration Scripts

```
scripts/
└── migrations/     # Database migration scripts
    ├── run-auth-migration.js      # Authentication tables migration
    ├── run-login-migration.js
    ├── run-migration.js
    └── run-migration.ts
```

### `/components/` - Vue Components

Already well-organized by feature:

```
components/
├── archive/       # Archive-related components
├── blog/          # Blog components (card, comments, etc.)
├── category/      # Category components
├── content/      # Content components
├── footer/       # Footer component
├── gallery/      # Gallery components (lightbox, comments)
├── logo/         # Logo components
├── main/         # Main layout components (header, footer, hero)
├── OgImage/      # OG image components
└── personalSpace/ # Personal space components
```

### `/pages/` - Page Components

Well-organized by feature:

```
pages/
├── auth/              # Authentication pages
│   ├── login.vue              # Login page
│   ├── register.vue           # Registration page
│   ├── settings.vue            # User settings (password, MFA, passcode)
│   └── utility-passcode.vue   # Utility passcode verification
```

```
pages/
├── admin/         # Admin pages
├── blogs/         # Blog pages
├── categories/    # Category pages
├── personalSpace/ # Personal space pages
├── about.vue
├── gallery.vue
├── index.vue
├── library.vue
└── resources.vue
```

### `/composables/` - Vue Composables

```
composables/
├── useAuth.ts        # Unified authentication composable (replaces useGoogleAuth and useAdminAuth)
└── useLikeStore.ts   # Like state management composable
```

### `/types/` - TypeScript Type Definitions

```
types/
├── blog.ts           # Blog-related types
├── google.d.ts       # Google API types
├── google.maps.d.ts  # Google Maps types
├── nuxt.d.ts         # Nuxt configuration types
└── shims-nuxt.d.ts   # Nuxt shims
```

### `/data/` - Static Data

```
data/
└── index.ts          # All static data exports
```

## 🔄 Migration Summary

### API Endpoints Reorganized

**Before:**

- All API files in root of `server/api/`
- Mixed naming conventions (`.ts`, `.post.ts`, `.get.ts`)

**After:**

- Organized into feature-based directories
- Consistent naming: `[name].[method].ts` (e.g., `like.post.ts`, `likes.get.ts`)
- Clear separation of concerns

### Utility Functions Reorganized

**Before:**

- All utilities in flat `utils/` directory
- No clear categorization

**After:**

- Organized into `blog/`, `common/`, and `analytics/` subdirectories
- Easy to find related utilities
- Better code discoverability

### Scripts Reorganized

**Before:**

- Migration scripts in root of `scripts/`

**After:**

- All migration scripts in `scripts/migrations/`
- Updated `package.json` scripts to reflect new paths

## 📝 Import Path Updates

All import paths have been updated throughout the codebase:

### Utils Imports

- `~/utils/blogMeta` → `~/utils/blog/blogMeta`
- `~/utils/readingTime` → `~/utils/blog/readingTime`
- `~/utils/tagColors` → `~/utils/blog/tagColors`
- `~/utils/dateParser` → `~/utils/common/dateParser`
- `~/utils/helper` → `~/utils/common/helper`
- `~/utils/trackLogin` → `~/utils/analytics/trackLogin`

### API Endpoints

- `/api/comments` → `/api/blog/comments`
- `/api/like` → `/api/blog/like`
- `/api/get-likes` → `/api/blog/likes`
- `/api/track-login` → `/api/analytics/track-login`
- `/api/track-visit` → `/api/analytics/track-visit`
- `/api/places` → `/api/travel/places`
- `/rss.xml` → `/api/feeds/rss.xml` (route still accessible at `/rss.xml`)

## ✅ Benefits of This Organization

1. **Better Discoverability**: Related files are grouped together
2. **Easier Maintenance**: Clear structure makes it easier to find and update code
3. **Scalability**: Easy to add new features without cluttering root directories
4. **Consistency**: Uniform naming conventions across the codebase
5. **Team Collaboration**: New developers can quickly understand the structure

## 🚀 Future Organization Opportunities

Consider these for future improvements:

1. **Types Organization**: If types grow, consider organizing by domain:
   - `types/blog.ts`, `types/gallery.ts`, `types/auth.ts`, etc.

2. **Composables**: If more composables are added, consider:
   - `composables/auth/`, `composables/blog/`, etc.

3. **Data Files**: If data grows, consider splitting:
   - `data/blog.ts`, `data/resources.ts`, `data/site.ts`, etc.

4. **Server Utils**: Already well-organized, but could add:
   - `server/utils/validation/` for validation utilities
   - `server/utils/security/` for security utilities

## 📚 Related Documentation

- See `docs/RESOURCES_GUIDE.md` for adding resources
- See `docs/GALLERY_IDEAS.md` for gallery feature ideas
- See `README.md` for general project information
