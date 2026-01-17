import { H3Error, type H3Event } from 'h3'
import { setResponseStatus } from 'h3'

/**
 * Standardized error response structure
 */
export interface ApiErrorResponse {
  success: false
  error: string
  statusCode?: number
  details?: unknown
}

/**
 * Standardized success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  event: H3Event,
  statusCode: number,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  setResponseStatus(event, statusCode)
  return {
    success: false,
    error: message,
    statusCode,
    ...(details && { details }),
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  event: H3Event,
  data?: T,
  message?: string,
  statusCode: number = 200,
): ApiSuccessResponse<T> {
  setResponseStatus(event, statusCode)
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  }
}

/**
 * Handle API errors consistently
 * Extracts error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred'

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    if ('message' in error) {
      return String(error.message)
    }

    if ('error' in error) {
      return String(error.error)
    }
  }

  return 'An unknown error occurred'
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('503')
    )
  }

  if (error && typeof error === 'object') {
    if ('statusCode' in error && error.statusCode === 503) {
      return true
    }

    if ('message' in error && typeof error.message === 'string') {
      return (
        error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('503')
      )
    }
  }

  return false
}

/**
 * Wrap API handler with standardized error handling
 */
export function withErrorHandler<T>(
  handler: (event: H3Event) => Promise<T>,
): (event: H3Event) => Promise<T | ApiErrorResponse> {
  return async (event: H3Event) => {
    try {
      return await handler(event)
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error)
      const statusCode = error instanceof H3Error ? error.statusCode : 500

      console.error('[API Error]', errorMessage, error)

      return createErrorResponse(event, statusCode, errorMessage)
    }
  }
}
