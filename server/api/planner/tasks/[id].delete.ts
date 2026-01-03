import { defineEventHandler, getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({
      statusCode: 400,
      message: 'Valid task ID is required',
    })
  }

  try {
    const result = await query<{ id: number }>('DELETE FROM tasks WHERE id = $1 RETURNING id', [id])

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Task not found',
      })
    }

    return {
      success: true,
      message: 'Task deleted successfully',
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Failed to delete task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete task',
    })
  }
})
