# Quick Reference: Functional Changes to Reapply

## 🎯 Core Functional Commits (Reapply These)

### 1. **39a36c7** - Planner System Enhancements

**What it adds:**

- Archive statistics API (`/api/planner/archive-stats.get.ts`)
- Batch task updates API (`/api/planner/tasks/batch-update.post.ts`)
- Task purge API (`/api/planner/tasks/purge.post.ts`)
- Health check endpoint (`/api/planner/health.get.ts`)
- Database migrations for archival and performance
- Enhanced planner UI (major improvements to tasks, review, index pages)

**Files to review:**

```bash
git show 39a36c7 --stat
git show 39a36c7 -- server/api/planner/
git show 39a36c7 -- pages/dev/planner/
```

---

### 2. **cbe9a1a** - SEO & Site Configuration

**What it adds:**

- Site configuration for `nuxt-og-image`
- Enhanced SEO components with fallbacks
- Better structured data handling
- Improved site URL configuration

**Files to review:**

```bash
git show cbe9a1a -- nuxt.config.ts
git show cbe9a1a -- components/seo/
```

---

### 3. **8d4629d** - Component Improvements (Selective)

**What it adds:**

- Google Maps SSR fixes (client-side checks)
- Image protection enhancements
- Cache improvements
- Database utility improvements

**Files to review:**

```bash
git show 8d4629d -- components/blog/GoogleMap.vue
git show 8d4629d -- plugins/image-protection.client.ts
```

---

## ❌ Skip These (Experimental Fixes)

All other commits are build/deployment/config fixes that should be rebuilt cleanly:

- Formatting commits (cdb260b, b2d3b59, 440745a)
- Build fixes (b616e1c, a2ed6b6, e696e71)
- Deployment fixes (0e78de6, cd086d4, 14480bb, b6bad71)
- Config fixes (3e743cc, 723c88f, 310b52a)
- Bug fixes (ec659a7)

---

## 🚀 Reapplication Steps

### Step 1: Apply Planner Features

```bash
# Review the changes
git show 39a36c7

# Apply the commit
git cherry-pick 39a36c7

# Test
npm run build && npm run preview
```

### Step 2: Apply SEO Improvements

```bash
# Review the changes
git show cbe9a1a

# Apply the commit
git cherry-pick cbe9a1a

# Test
npm run build && npm run preview
```

### Step 3: Apply Component Fixes (Selective)

```bash
# Review specific files
git show 8d4629d -- components/blog/GoogleMap.vue

# Manually apply only the functional improvements
# Skip the build/config changes
```

### Step 4: Configure Build Cleanly

Manually set up:

- Image provider (ipx)
- Site configuration
- Prerendering (if needed)
- Error handling
- Build optimizations

---

## 📊 Statistics

- **Total commits:** 17
- **Functional commits:** 3 (39a36c7, cbe9a1a, 8d4629d)
- **Experimental fixes:** 14 (skip these)
- **Major features:** Planner enhancements, SEO improvements

---

## 🔍 View Full Details

See `FUNCTIONAL_CHANGES.md` for complete analysis of each commit.
