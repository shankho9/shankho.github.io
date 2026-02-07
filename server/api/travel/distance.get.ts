/** Calculate distance and time between locations using Google Distance Matrix API */
import { getQuery, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const q = getQuery(event)
  const origin = String(q.origin || '').trim()
  const destination = String(q.destination || '').trim()
  const mode = (q.mode as string) || 'driving' // driving, walking, bicycling, transit

  if (!origin || !destination) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Origin and destination are required' }
  }

  const config = useRuntimeConfig()
  const apiKey = config.googleMapsServerApiKey || config.public.googleMapsApiKey

  if (!apiKey) {
    setResponseStatus(event, 500)
    return { success: false, error: 'Google Maps API key not configured' }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', origin)
    url.searchParams.set('destinations', destination)
    url.searchParams.set('mode', mode)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('units', 'metric')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.warn('[Travel Distance] Google status not OK', {
        status: data.status,
        error: data.error_message,
      })
      setResponseStatus(event, 400)
      return {
        success: false,
        error: data.error_message || data.status || 'Distance calculation failed',
      }
    }

    const element = data.rows[0]?.elements[0]
    if (!element) {
      console.warn('[Travel Distance] Missing element in response')
      setResponseStatus(event, 400)
      return { success: false, error: 'Distance matrix response missing elements' }
    }

    if (element.status !== 'OK') {
      console.warn('[Travel Distance] Element status not OK', { status: element.status })
      setResponseStatus(event, 400)
      return {
        success: false,
        error: `Distance matrix element status: ${element.status}`,
      }
    }

    return {
      success: true,
      distance: {
        text: element.distance.text,
        value: element.distance.value, // meters
      },
      duration: {
        text: element.duration.text,
        value: element.duration.value, // seconds
      },
    }
  } catch (error) {
    console.error('[Travel Distance] Error:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate distance',
    }
  }
})
