# Clean Branch Workflow Guide

## Current Setup

- **New Branch**: `fix/clean-reapply` (created from b56cd83)
- **Base Commit**: b56cd83 (Merge pull request #63) - This is the last known working state
- **Old Branch**: `4Jan` (has 17 commits that need to be reviewed/reapplied)

## Workflow

### 1. Test Current State

```bash
# Make sure the base state works
npm run build
npm run preview
```

### 2. Review and Reapply Commits

View commits to reapply:

```bash
git log --oneline --reverse b56cd83..origin/4Jan
```

Apply commits one by one:

```bash
# View a commit first
git show <commit-hash>

# Apply it
git cherry-pick <commit-hash>

# Test after each commit
npm run build && npm run preview
```

### 3. Push Your Progress

```bash
# Push the new branch to remote
git push -u origin fix/clean-reapply
```

### 4. When Ready to Replace 4Jan

Once you've tested and confirmed everything works on `fix/clean-reapply`:

#### Option A: Replace 4Jan branch (Recommended)

```bash
# Make sure you're on fix/clean-reapply and it's up to date
git checkout fix/clean-reapply
git pull origin fix/clean-reapply

# Delete the old 4Jan branch locally
git branch -D 4Jan

# Delete the old 4Jan branch on remote
git push origin --delete 4Jan

# Rename your new branch to 4Jan
git branch -m fix/clean-reapply 4Jan

# Push the renamed branch
git push -u origin 4Jan

# Force push if needed (be careful!)
git push -f origin 4Jan
```

#### Option B: Keep both branches (Safer)

```bash
# Keep fix/clean-reapply as your working branch
# Update 4Jan to point to the same commit when ready
git checkout 4Jan
git reset --hard fix/clean-reapply
git push -f origin 4Jan
```

## Commits to Review (from origin/4Jan)

1. 39a36c7 - bulk changes
2. cdb260b - format error
3. ec659a7 - fix deleete
4. b2d3b59 - format
5. b616e1c - fix for build
6. a2ed6b6 - removed sharp
7. e696e71 - fix prerenderer
8. 440745a - format
9. cbe9a1a - fix ⚠️ (adds site config - important!)
10. 8d4629d - fixed hanging issue with npm run build
11. 0e78de6 - fixed vercel failing deployment
12. cd086d4 - more vercel fixes
13. 14480bb - more minimalistic fixes
14. 3e743cc - use npm ci
15. b6bad71 - more changes
16. 723c88f - adding lint again
17. 310b52a - fix 500 error

## Useful Commands

```bash
# See what commits are available to cherry-pick
git log --oneline --reverse b56cd83..origin/4Jan

# View a specific commit
git show <commit-hash>

# See what files changed in a commit
git show --stat <commit-hash>

# Compare your branch with origin/4Jan
git log --oneline fix/clean-reapply..origin/4Jan

# See what you've applied
git log --oneline b56cd83..fix/clean-reapply
```

## Testing Checklist

After each commit (especially config changes):

- [ ] `npm run build` succeeds
- [ ] `npm run preview` starts without errors
- [ ] Homepage loads (http://localhost:3000)
- [ ] No console errors
- [ ] Check key pages (blogs, categories, etc.)

## If Something Breaks

```bash
# Undo the last commit (keep changes)
git reset --soft HEAD~1

# Or completely remove it
git reset --hard HEAD~1

# Or go back to a known good state
git reset --hard b56cd83
```

## Notes

- The new branch `fix/clean-reapply` is independent of `4Jan`
- You can safely experiment here without affecting `4Jan`
- Once you're confident, you can replace `4Jan` with this branch
- Production likely uses `4Jan` branch, so test thoroughly before replacing it
