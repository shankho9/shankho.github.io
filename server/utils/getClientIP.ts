// server/utils/getClientIP.ts
import type { H3Event, EventHandlerRequest } from 'h3'
import { getHeader } from 'h3'

export function getClientIP(event: H3Event<EventHandlerRequest>): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim() // in case of multiple proxies
  }
  return event.node.req.socket.remoteAddress || 'unknown'
}
