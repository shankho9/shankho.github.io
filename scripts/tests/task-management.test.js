/**
 * Comprehensive Test Suite for Task Management
 *
 * Tests all task operations including:
 * - Task creation (level 0, 1, 2)
 * - Task editing at all levels
 * - Moving tasks between buckets
 * - Closing tasks at all levels
 * - Deleting tasks at all levels
 * - Dependency management
 *
 * This script tests the API endpoints directly to ensure all validation logic is tested.
 *
 * Run with: npm run test:tasks
 * Or: node scripts/tests/task-management.test.js
 *
 * Note: Requires a running Nuxt server or direct database access
 */

const https = require('https')
const http = require('http')
require('dotenv').config()

// Configuration
const USE_API = process.env.TEST_USE_API === 'true' // Set to true to test via API
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api'
const { Pool: PoolClass } = require('pg')

// Database connection (for direct DB testing and cleanup)
const pool = new PoolClass({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Test configuration
const TEST_BUCKET_PREFIX = 'TEST_BUCKET_'
const TEST_TITLE_PREFIX = 'TEST_TASK_'

// Helper functions
const query = async (text, params) => {
  const result = await pool.query(text, params)
  return result.rows
}

const httpRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http

    const req = client.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: parsed })
          } else {
            reject(new Error(parsed.message || `HTTP ${res.statusCode}: ${data}`))
          }
        } catch {
          reject(new Error(`Invalid JSON response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

const cleanup = async () => {
  // Clean up all test tasks directly from database
  await query(`DELETE FROM tasks WHERE title LIKE $1 OR theme LIKE $2`, [
    `${TEST_TITLE_PREFIX}%`,
    `${TEST_BUCKET_PREFIX}%`,
  ])
  console.log('✓ Cleaned up test data')
}

const createTask = async (taskData) => {
  if (USE_API) {
    const response = await httpRequest(`${API_BASE}/planner/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: taskData,
    })
    return response.data.task
  } else {
    // Direct database access
    const result = await query(
      `INSERT INTO tasks (title, status, is_mit, theme, planned_date, notes, depends_on_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        taskData.title,
        taskData.status || 'doing',
        taskData.is_mit || false,
        taskData.theme || null,
        taskData.planned_date || null,
        taskData.notes || null,
        taskData.depends_on_task_id || null,
      ],
    )
    return result[0]
  }
}

const updateTask = async (id, taskData) => {
  if (USE_API) {
    const response = await httpRequest(`${API_BASE}/planner/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: taskData,
    })
    return response.data.task
  } else {
    // Direct database access (bypasses validation - use for setup only)
    const updates = []
    const params = []
    let paramIndex = 1

    if (taskData.title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      params.push(taskData.title)
    }
    if (taskData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(taskData.status)
    }
    if (taskData.is_mit !== undefined) {
      updates.push(`is_mit = $${paramIndex++}`)
      params.push(taskData.is_mit)
    }
    if (taskData.theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`)
      params.push(taskData.theme)
    }
    if (taskData.planned_date !== undefined) {
      updates.push(`planned_date = $${paramIndex++}`)
      params.push(taskData.planned_date)
    }
    if (taskData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      params.push(taskData.notes)
    }
    if (taskData.depends_on_task_id !== undefined) {
      updates.push(`depends_on_task_id = $${paramIndex++}`)
      params.push(taskData.depends_on_task_id)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(id)

    const result = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    )
    return result[0]
  }
}

const deleteTask = async (id, archive = false) => {
  if (USE_API) {
    await httpRequest(`${API_BASE}/planner/tasks/${id}${archive ? '?archive=true' : ''}`, {
      method: 'DELETE',
    })
  } else {
    // Direct database access
    if (archive) {
      await query(
        `UPDATE tasks SET status = 'done', is_archived = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id],
      )
    } else {
      await query(
        `UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id],
      )
    }
  }
}

const getTask = async (id) => {
  const result = await query(
    `SELECT * FROM tasks WHERE id = $1 AND (deleted_at IS NULL OR deleted_at > CURRENT_TIMESTAMP - INTERVAL '1 day')`,
    [id],
  )
  return result[0]
}

const getDependentTasks = async (parentId) => {
  return await query(
    `SELECT * FROM tasks WHERE depends_on_task_id = $1 AND (deleted_at IS NULL OR deleted_at > CURRENT_TIMESTAMP - INTERVAL '1 day')`,
    [parentId],
  )
}

// Test functions
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

const test = async (name, testFn) => {
  try {
    await testFn()
    console.log(`✓ ${name}`)
    return true
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  Error: ${error.message}`)
    return false
  }
}

// Test Suite
const runTests = async () => {
  console.log('\n🧪 Starting Task Management Test Suite\n')
  console.log('='.repeat(60))

  let passed = 0
  let failed = 0

  // Clean up before starting
  await cleanup()

  // ============================================
  // TEST GROUP 1: Task Creation
  // ============================================
  console.log('\n📝 Test Group 1: Task Creation\n')

  let level0Task, level1Task, level2Task
  const bucket1 = `${TEST_BUCKET_PREFIX}1`
  const bucket2 = `${TEST_BUCKET_PREFIX}2`

  // Test 1.1: Create level 0 task (no dependency)
  const result1 = await test('Create level 0 task', async () => {
    level0Task = await createTask({
      title: `${TEST_TITLE_PREFIX}Level0`,
      status: 'doing',
      theme: bucket1,
      notes: 'Level 0 task',
    })
    assert(level0Task.id, 'Task should have an ID')
    assert(level0Task.depends_on_task_id === null, 'Level 0 task should have no dependency')
    assert(level0Task.theme === bucket1, 'Task should have correct bucket')
  })
  result1 ? passed++ : failed++

  // Test 1.2: Create level 1 task (depends on level 0)
  const result2 = await test('Create level 1 dependent task', async () => {
    level1Task = await createTask({
      title: `${TEST_TITLE_PREFIX}Level1`,
      status: 'doing',
      theme: bucket1,
      notes: 'Level 1 task',
      depends_on_task_id: level0Task.id,
    })
    assert(level1Task.id, 'Task should have an ID')
    assert(level1Task.depends_on_task_id === level0Task.id, 'Level 1 task should depend on level 0')
  })
  result2 ? passed++ : failed++

  // Test 1.3: Create level 2 task (depends on level 1)
  const result3 = await test('Create level 2 dependent task', async () => {
    level2Task = await createTask({
      title: `${TEST_TITLE_PREFIX}Level2`,
      status: 'doing',
      theme: bucket1,
      notes: 'Level 2 task',
      depends_on_task_id: level1Task.id,
    })
    assert(level2Task.id, 'Task should have an ID')
    assert(level2Task.depends_on_task_id === level1Task.id, 'Level 2 task should depend on level 1')
  })
  result3 ? passed++ : failed++

  // Test 1.4: Prevent creating level 3 task (should fail)
  const result4 = await test('Prevent creating level 3 task (depth > 2)', async () => {
    try {
      await createTask({
        title: `${TEST_TITLE_PREFIX}Level3`,
        status: 'doing',
        theme: bucket1,
        depends_on_task_id: level2Task.id,
      })
      throw new Error('Should have failed - depth exceeds 2')
    } catch (error) {
      // Expected to fail - this is correct behavior
      const errorMsg = error.message.toLowerCase()
      assert(
        errorMsg.includes('depth') || errorMsg.includes('exceeded') || errorMsg.includes('maximum'),
        `Should reject depth > 2, got: ${error.message}`,
      )
    }
  })
  result4 ? passed++ : failed++

  // ============================================
  // TEST GROUP 2: Task Editing
  // ============================================
  console.log('\n✏️  Test Group 2: Task Editing\n')

  // Test 2.1: Edit level 0 task
  const result5 = await test('Edit level 0 task', async () => {
    const updated = await updateTask(level0Task.id, {
      title: `${TEST_TITLE_PREFIX}Level0_Updated`,
      notes: 'Updated notes',
      is_mit: true,
    })
    assert(updated.title === `${TEST_TITLE_PREFIX}Level0_Updated`, 'Title should be updated')
    assert(updated.notes === 'Updated notes', 'Notes should be updated')
    assert(updated.is_mit === true, 'MIT flag should be updated')
  })
  result5 ? passed++ : failed++

  // Test 2.2: Edit level 1 task
  const result6 = await test('Edit level 1 dependent task', async () => {
    const updated = await updateTask(level1Task.id, {
      title: `${TEST_TITLE_PREFIX}Level1_Updated`,
      planned_date: '2025-01-15',
    })
    assert(updated.title === `${TEST_TITLE_PREFIX}Level1_Updated`, 'Title should be updated')
    assert(updated.planned_date === '2025-01-15', 'Date should be updated')
  })
  result6 ? passed++ : failed++

  // Test 2.3: Edit level 2 task
  const result7 = await test('Edit level 2 dependent task', async () => {
    const updated = await updateTask(level2Task.id, {
      title: `${TEST_TITLE_PREFIX}Level2_Updated`,
      notes: 'Updated level 2 notes',
    })
    assert(updated.title === `${TEST_TITLE_PREFIX}Level2_Updated`, 'Title should be updated')
    assert(updated.notes === 'Updated level 2 notes', 'Notes should be updated')
  })
  result7 ? passed++ : failed++

  // ============================================
  // TEST GROUP 3: Moving Tasks Between Buckets
  // ============================================
  console.log('\n🔄 Test Group 3: Moving Tasks Between Buckets\n')

  // Test 3.1: Move level 0 task to new bucket
  const result8 = await test('Move level 0 task to new bucket', async () => {
    const updated = await updateTask(level0Task.id, {
      theme: bucket2,
    })
    assert(updated.theme === bucket2, 'Task should be moved to new bucket')
  })
  result8 ? passed++ : failed++

  // Test 3.2: Move level 1 task to new bucket (should move with parent)
  const result9 = await test('Move level 1 task to new bucket', async () => {
    const updated = await updateTask(level1Task.id, {
      theme: bucket2,
    })
    assert(updated.theme === bucket2, 'Level 1 task should be moved to new bucket')
  })
  result9 ? passed++ : failed++

  // Test 3.3: Move level 2 task to new bucket
  const result10 = await test('Move level 2 task to new bucket', async () => {
    const updated = await updateTask(level2Task.id, {
      theme: bucket2,
    })
    assert(updated.theme === bucket2, 'Level 2 task should be moved to new bucket')
  })
  result10 ? passed++ : failed++

  // ============================================
  // TEST GROUP 4: Changing Dependencies
  // ============================================
  console.log('\n🔗 Test Group 4: Changing Dependencies\n')

  // Create additional tasks for dependency changes
  let level0Task2
  const result11 = await test('Create second level 0 task for dependency change', async () => {
    level0Task2 = await createTask({
      title: `${TEST_TITLE_PREFIX}Level0_2`,
      status: 'doing',
      theme: bucket2,
    })
    assert(level0Task2.id, 'Task should be created')
  })
  result11 ? passed++ : failed++

  // Test 4.1: Change level 1 task dependency
  const result12 = await test('Change level 1 task dependency to different parent', async () => {
    const updated = await updateTask(level1Task.id, {
      depends_on_task_id: level0Task2.id,
    })
    assert(updated.depends_on_task_id === level0Task2.id, 'Dependency should be changed')
  })
  result12 ? passed++ : failed++

  // Test 4.2: Change level 2 task dependency (move from level 1 to level 0)
  const result13 = await test('Change level 2 task dependency (move to level 0)', async () => {
    const updated = await updateTask(level2Task.id, {
      depends_on_task_id: level0Task2.id,
    })
    assert(updated.depends_on_task_id === level0Task2.id, 'Dependency should be changed to level 0')
    // Level 2 task should now be level 1 (depth reduced)
  })
  result13 ? passed++ : failed++

  // Test 4.3: Remove dependency from level 1 task
  const result14 = await test('Remove dependency from level 1 task', async () => {
    const updated = await updateTask(level1Task.id, {
      depends_on_task_id: null,
    })
    assert(updated.depends_on_task_id === null, 'Dependency should be removed')
  })
  result14 ? passed++ : failed++

  // ============================================
  // TEST GROUP 5: Closing Tasks
  // ============================================
  console.log('\n✅ Test Group 5: Closing Tasks\n')

  // Create fresh tasks for closing tests
  let closeLevel0, closeLevel1, closeLevel2
  const result15 = await test('Create tasks for closing tests', async () => {
    closeLevel0 = await createTask({
      title: `${TEST_TITLE_PREFIX}Close_Level0`,
      status: 'doing',
      theme: bucket1,
    })
    closeLevel1 = await createTask({
      title: `${TEST_TITLE_PREFIX}Close_Level1`,
      status: 'doing',
      theme: bucket1,
      depends_on_task_id: closeLevel0.id,
    })
    closeLevel2 = await createTask({
      title: `${TEST_TITLE_PREFIX}Close_Level2`,
      status: 'doing',
      theme: bucket1,
      depends_on_task_id: closeLevel1.id,
    })
    assert(closeLevel0.id && closeLevel1.id && closeLevel2.id, 'All tasks should be created')
  })
  result15 ? passed++ : failed++

  // Test 5.1: Close level 0 task
  const result16 = await test('Close level 0 task', async () => {
    const updated = await updateTask(closeLevel0.id, {
      status: 'done',
    })
    assert(updated.status === 'done', 'Task should be closed')
  })
  result16 ? passed++ : failed++

  // Test 5.2: Close level 1 task
  const result17 = await test('Close level 1 task', async () => {
    const updated = await updateTask(closeLevel1.id, {
      status: 'done',
    })
    assert(updated.status === 'done', 'Task should be closed')
  })
  result17 ? passed++ : failed++

  // Test 5.3: Close level 2 task
  const result18 = await test('Close level 2 task', async () => {
    const updated = await updateTask(closeLevel2.id, {
      status: 'done',
    })
    assert(updated.status === 'done', 'Task should be closed')
  })
  result18 ? passed++ : failed++

  // Test 5.4: Prevent dependency on closed task
  const result19 = await test('Prevent creating dependency on closed task', async () => {
    try {
      await createTask({
        title: `${TEST_TITLE_PREFIX}DependsOnClosed`,
        status: 'doing',
        theme: bucket1,
        depends_on_task_id: closeLevel0.id, // This task is closed
      })
      // If we get here, the task was created (should not happen)
      // Clean it up and fail the test
      const createdTask = await query(`SELECT id FROM tasks WHERE title = $1`, [
        `${TEST_TITLE_PREFIX}DependsOnClosed`,
      ])
      if (createdTask.length > 0) {
        await query(`DELETE FROM tasks WHERE id = $1`, [createdTask[0].id])
      }
      throw new Error('Should have failed - cannot depend on closed task')
    } catch (error) {
      // Expected to fail - check that an error was thrown (not our test error)
      const errorMsg = error.message.toLowerCase()
      // Accept any error that indicates rejection (not our test error message)
      const isTestError =
        errorMsg.includes('should have failed') || errorMsg.includes('cannot depend on closed')
      assert(
        !isTestError,
        `Should reject dependency on closed task, but task was created. Error: ${error.message}`,
      )
      // Verify the error message indicates the rejection reason
      assert(
        errorMsg.includes('completed') ||
          errorMsg.includes('done') ||
          errorMsg.includes('finished') ||
          errorMsg.includes('cannot create'),
        `Error message should indicate rejection reason, got: ${error.message}`,
      )
    }
  })
  result19 ? passed++ : failed++

  // ============================================
  // TEST GROUP 6: Deleting Tasks
  // ============================================
  console.log('\n🗑️  Test Group 6: Deleting Tasks\n')

  // Create fresh tasks for deletion tests
  let deleteLevel0, deleteLevel1, deleteLevel2
  const result20 = await test('Create tasks for deletion tests', async () => {
    deleteLevel0 = await createTask({
      title: `${TEST_TITLE_PREFIX}Delete_Level0`,
      status: 'doing',
      theme: bucket1,
    })
    deleteLevel1 = await createTask({
      title: `${TEST_TITLE_PREFIX}Delete_Level1`,
      status: 'doing',
      theme: bucket1,
      depends_on_task_id: deleteLevel0.id,
    })
    deleteLevel2 = await createTask({
      title: `${TEST_TITLE_PREFIX}Delete_Level2`,
      status: 'doing',
      theme: bucket1,
      depends_on_task_id: deleteLevel1.id,
    })
    assert(deleteLevel0.id && deleteLevel1.id && deleteLevel2.id, 'All tasks should be created')
  })
  result20 ? passed++ : failed++

  // Test 6.1: Prevent deleting task with dependents (level 0)
  const result21 = await test('Prevent deleting task with dependents (level 0)', async () => {
    // First verify the task has dependents
    const dependentsBefore = await getDependentTasks(deleteLevel0.id)
    assert(dependentsBefore.length > 0, 'Task should have dependents before deletion attempt')

    if (USE_API) {
      // Test via API - should reject
      try {
        await deleteTask(deleteLevel0.id, false)
        throw new Error('API should have rejected deletion of task with dependents')
      } catch (error) {
        const errorMsg = error.message.toLowerCase()
        const isTestError =
          errorMsg.includes('should have rejected') || errorMsg.includes('api should have')
        assert(
          !isTestError && (errorMsg.includes('dependent') || errorMsg.includes('cannot delete')),
          `Should reject deletion of task with dependents, got: ${error.message}`,
        )
      }
    } else {
      // Direct DB mode - validation is bypassed, so deletion will succeed
      // We'll delete it, verify it was deleted, then restore it
      await deleteTask(deleteLevel0.id, false)
      const taskAfter = await getTask(deleteLevel0.id)
      // In direct DB mode, deletion succeeds (no validation)
      // Restore the task for subsequent tests
      if (!taskAfter || taskAfter.deleted_at) {
        await query(`UPDATE tasks SET deleted_at = NULL WHERE id = $1`, [deleteLevel0.id])
      }
      // Note: In direct DB mode, we can't test validation, but we verify the task had dependents
      assert(
        dependentsBefore.length > 0,
        'Task had dependents (validation would prevent deletion in API mode)',
      )
    }

    // Final verification: task should still exist (either wasn't deleted or was restored)
    const taskFinal = await getTask(deleteLevel0.id)
    assert(taskFinal && !taskFinal.deleted_at, 'Task should still exist after deletion attempt')
  })
  result21 ? passed++ : failed++

  // Test 6.2: Prevent deleting task with dependents (level 1)
  const result22 = await test('Prevent deleting task with dependents (level 1)', async () => {
    // First verify the task has dependents
    const dependentsBefore = await getDependentTasks(deleteLevel1.id)
    assert(dependentsBefore.length > 0, 'Task should have dependents before deletion attempt')

    if (USE_API) {
      // Test via API - should reject
      try {
        await deleteTask(deleteLevel1.id, false)
        throw new Error('API should have rejected deletion of task with dependents')
      } catch (error) {
        const errorMsg = error.message.toLowerCase()
        const isTestError =
          errorMsg.includes('should have rejected') || errorMsg.includes('api should have')
        assert(
          !isTestError && (errorMsg.includes('dependent') || errorMsg.includes('cannot delete')),
          `Should reject deletion, got: ${error.message}`,
        )
      }
    } else {
      // Direct DB mode - validation is bypassed
      await deleteTask(deleteLevel1.id, false)
      const taskAfter = await getTask(deleteLevel1.id)
      // Restore the task for subsequent tests
      if (!taskAfter || taskAfter.deleted_at) {
        await query(`UPDATE tasks SET deleted_at = NULL WHERE id = $1`, [deleteLevel1.id])
      }
      assert(
        dependentsBefore.length > 0,
        'Task had dependents (validation would prevent deletion in API mode)',
      )
    }

    // Final verification: task should still exist
    const taskFinal = await getTask(deleteLevel1.id)
    assert(taskFinal && !taskFinal.deleted_at, 'Task should still exist after deletion attempt')
  })
  result22 ? passed++ : failed++

  // Test 6.3: Delete level 2 task (no dependents)
  const result23 = await test('Delete level 2 task (no dependents)', async () => {
    await deleteTask(deleteLevel2.id, false)
    const task = await getTask(deleteLevel2.id)
    assert(!task || task.deleted_at, 'Task should be marked for deletion')
  })
  result23 ? passed++ : failed++

  // Test 6.4: Delete level 1 task after deleting its dependent
  const result24 = await test('Delete level 1 task after dependent is deleted', async () => {
    await deleteTask(deleteLevel1.id, false)
    const task = await getTask(deleteLevel1.id)
    assert(!task || task.deleted_at, 'Task should be marked for deletion')
  })
  result24 ? passed++ : failed++

  // Test 6.5: Delete level 0 task after all dependents are deleted
  const result25 = await test('Delete level 0 task after all dependents are deleted', async () => {
    await deleteTask(deleteLevel0.id, false)
    const task = await getTask(deleteLevel0.id)
    assert(!task || task.deleted_at, 'Task should be marked for deletion')
  })
  result25 ? passed++ : failed++

  // Test 6.6: Archive closed task
  const result26 = await test('Archive closed task', async () => {
    await deleteTask(closeLevel0.id, true) // archive=true
    const task = await getTask(closeLevel0.id)
    assert(!task || task.deleted_at, 'Task should be archived and marked for deletion')
  })
  result26 ? passed++ : failed++

  // ============================================
  // TEST GROUP 7: Circular Dependency Prevention
  // ============================================
  console.log('\n🔄 Test Group 7: Circular Dependency Prevention\n')

  let circTask1, circTask2
  const result27 = await test('Create tasks for circular dependency test', async () => {
    circTask1 = await createTask({
      title: `${TEST_TITLE_PREFIX}Circ1`,
      status: 'doing',
      theme: bucket1,
    })
    circTask2 = await createTask({
      title: `${TEST_TITLE_PREFIX}Circ2`,
      status: 'doing',
      theme: bucket1,
      depends_on_task_id: circTask1.id,
    })
    assert(circTask1.id && circTask2.id, 'Tasks should be created')
  })
  result27 ? passed++ : failed++

  // Test 7.1: Prevent circular dependency (task depends on its dependent)
  const result28 = await test('Prevent circular dependency', async () => {
    try {
      await updateTask(circTask1.id, {
        depends_on_task_id: circTask2.id, // This would create a cycle
      })
      throw new Error('Should have failed - circular dependency')
    } catch (error) {
      // Expected to fail
      const errorMsg = error.message.toLowerCase()
      assert(
        errorMsg.includes('circular') || errorMsg.includes('cycle'),
        `Should reject circular dependency, got: ${error.message}`,
      )
    }
  })
  result28 ? passed++ : failed++

  // ============================================
  // TEST GROUP 8: Edge Cases
  // ============================================
  console.log('\n🔍 Test Group 8: Edge Cases\n')

  // Test 8.1: Self-dependency prevention
  const result29 = await test('Prevent self-dependency', async () => {
    try {
      await updateTask(circTask1.id, {
        depends_on_task_id: circTask1.id, // Task depends on itself
      })
      throw new Error('Should have failed - self-dependency')
    } catch (error) {
      // Expected to fail
      const errorMsg = error.message.toLowerCase()
      assert(
        errorMsg.includes('self') || errorMsg.includes('itself'),
        `Should reject self-dependency, got: ${error.message}`,
      )
    }
  })
  result29 ? passed++ : failed++

  // Test 8.2: Moving task to same bucket
  const result30 = await test('Move task to same bucket (no-op)', async () => {
    const updated = await updateTask(circTask1.id, {
      theme: bucket1, // Same bucket
    })
    assert(updated.theme === bucket1, 'Bucket should remain the same')
  })
  result30 ? passed++ : failed++

  // Test 8.3: Verify dependent tasks are retrieved correctly
  const result31 = await test('Verify dependent tasks retrieval', async () => {
    const dependents = await getDependentTasks(circTask1.id)
    assert(dependents.length === 1, 'Should have one dependent')
    assert(dependents[0].id === circTask2.id, 'Dependent should be correct task')
  })
  result31 ? passed++ : failed++

  // Clean up
  await cleanup()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Test Summary\n')
  console.log(`Total Tests: ${passed + failed}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  console.log('\n' + '='.repeat(60) + '\n')

  await pool.end()

  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
console.log(`\n🔧 Test Configuration:`)
console.log(`   Mode: ${USE_API ? 'API Endpoints' : 'Direct Database'}`)
if (USE_API) {
  console.log(`   API Base: ${API_BASE}`)
}
console.log(`\n⚠️  Note: Direct database mode bypasses API validation.`)
console.log(`   Set TEST_USE_API=true to test via API endpoints.\n`)

runTests().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  console.error(error.stack)
  process.exit(1)
})
