# Task Management Test Suite

Comprehensive test suite for task management functionality covering all operations at all dependency levels.

## Overview

This test suite validates:

- ✅ Task creation (level 0, 1, 2)
- ✅ Task editing at all levels
- ✅ Moving tasks between buckets
- ✅ Changing dependencies
- ✅ Closing tasks at all levels
- ✅ Deleting tasks at all levels
- ✅ Dependency validation (circular, depth limits, closed tasks)
- ✅ Edge cases (self-dependency, etc.)

## Running Tests

### Option 1: Direct Database Testing (Default)

Tests database operations directly (bypasses API validation):

```bash
npm run test:tasks
```

### Option 2: API Endpoint Testing

Tests via HTTP API endpoints (includes full validation):

```bash
TEST_USE_API=true TEST_API_BASE=http://localhost:3000/api npm run test:tasks
```

**Note:** For API testing, ensure your Nuxt dev server is running (`npm run dev`).

## Test Groups

### 1. Task Creation

- Create level 0 task (no dependency)
- Create level 1 dependent task
- Create level 2 dependent task
- Prevent creating level 3 task (depth > 2)

### 2. Task Editing

- Edit level 0 task
- Edit level 1 dependent task
- Edit level 2 dependent task

### 3. Moving Tasks Between Buckets

- Move level 0 task to new bucket
- Move level 1 task to new bucket
- Move level 2 task to new bucket

### 4. Changing Dependencies

- Change level 1 task dependency
- Change level 2 task dependency (move to level 0)
- Remove dependency from level 1 task

### 5. Closing Tasks

- Close level 0 task
- Close level 1 task
- Close level 2 task
- Prevent dependency on closed task

### 6. Deleting Tasks

- Prevent deleting task with dependents (level 0)
- Prevent deleting task with dependents (level 1)
- Delete level 2 task (no dependents)
- Delete level 1 task after dependent is deleted
- Delete level 0 task after all dependents are deleted
- Archive closed task

### 7. Circular Dependency Prevention

- Prevent circular dependency

### 8. Edge Cases

- Prevent self-dependency
- Move task to same bucket (no-op)
- Verify dependent tasks retrieval

## Test Output

The test suite provides:

- ✅ Pass/fail status for each test
- 📊 Summary with pass rate
- 🧹 Automatic cleanup of test data
- ❌ Detailed error messages for failures

## Configuration

Set environment variables:

- `TEST_USE_API=true` - Use API endpoints instead of direct DB
- `TEST_API_BASE=http://localhost:3000/api` - API base URL
- `DATABASE_URL` - Database connection string (required)

## Notes

- All test data is automatically cleaned up after tests
- Test tasks use prefixes: `TEST_TASK_*` and `TEST_BUCKET_*`
- Tests are designed to be idempotent (can run multiple times)
- Direct DB mode bypasses API validation (use for setup/teardown)
- API mode tests full validation logic including backend checks
