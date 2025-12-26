/**
 * Track user login events for analytics
 * @param userEmail - User's email address
 * @param userName - User's display name
 * @param loginLocation - The page/location where login occurred (e.g., '/gallery', '/blogs/...')
 */
export async function trackLogin(
  userEmail: string,
  userName: string,
  loginLocation?: string,
): Promise<void> {
  // Get current location if not provided
  const location = loginLocation || (typeof window !== 'undefined' ? window.location.pathname : '/')

  try {
    await $fetch('/api/analytics/track-login', {
      method: 'POST',
      body: {
        userEmail,
        userName,
        loginLocation: location,
      },
    })
  } catch (error) {
    // Silent fail - don't interrupt login flow if tracking fails
    console.warn('[TrackLogin] Failed to track login event:', error)
  }
}
