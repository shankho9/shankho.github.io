const DEBUG_INGEST = 'http://127.0.0.1:7840/ingest/767d3ad0-6d04-4d9a-bc94-d2ef4df7b9b9'
const DEBUG_SESSION = 'a61321'

/** Emit a debug-session log (server or client). Never log secrets. */
export function deployDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  const payload = {
    sessionId: DEBUG_SESSION,
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId: 'deploy-trace',
  }
  // #region agent log
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_SESSION },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}
