import { Resend } from 'resend'
import { useRuntimeConfig } from '#imports'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const config = useRuntimeConfig()
    const apiKey = config.resendApiKey || process.env.RESEND_API_KEY

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    resendClient = new Resend(apiKey)
  }

  return resendClient
}

interface NewUserAlertParams {
  userEmail: string
  userName: string
  loginLocation: string
  ipAddress?: string
  country?: string
  browser?: string
  userAgent?: string
}

/**
 * Send email alert when a new user authenticates via Google
 */
export async function sendNewUserAlert(params: NewUserAlertParams): Promise<void> {
  try {
    const config = useRuntimeConfig()
    const alertEmail = config.alertEmail || process.env.ALERT_EMAIL

    if (!alertEmail) {
      console.warn('[Email] ALERT_EMAIL not configured, skipping email alert')
      return
    }

    const resend = getResendClient()
    const fromEmail = config.fromEmail || process.env.FROM_EMAIL || 'onboarding@resend.dev'

    const emailContent = {
      from: fromEmail,
      to: [alertEmail],
      subject: `🔔 New Google Authentication: ${params.userName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4285f4; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .info-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🔔 New Google Authentication</h2>
              </div>
              <div class="content">
                <p>A new user has authenticated via Google on your website.</p>
                
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">${escapeHtml(params.userName)}</span>
                </div>
                
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">${escapeHtml(params.userEmail)}</span>
                </div>
                
                <div class="info-row">
                  <span class="label">Login Location:</span>
                  <span class="value">${escapeHtml(params.loginLocation)}</span>
                </div>
                
                ${params.country ? `
                <div class="info-row">
                  <span class="label">Country:</span>
                  <span class="value">${escapeHtml(params.country)}</span>
                </div>
                ` : ''}
                
                ${params.ipAddress ? `
                <div class="info-row">
                  <span class="label">IP Address:</span>
                  <span class="value">${escapeHtml(params.ipAddress)}</span>
                </div>
                ` : ''}
                
                ${params.browser ? `
                <div class="info-row">
                  <span class="label">Browser:</span>
                  <span class="value">${escapeHtml(params.browser)}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                  <span class="label">Timestamp:</span>
                  <span class="value">${new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Google Authentication Alert

A new user has authenticated via Google on your website.

Name: ${params.userName}
Email: ${params.userEmail}
Login Location: ${params.loginLocation}
${params.country ? `Country: ${params.country}\n` : ''}
${params.ipAddress ? `IP Address: ${params.ipAddress}\n` : ''}
${params.browser ? `Browser: ${params.browser}\n` : ''}
Timestamp: ${new Date().toLocaleString()}
      `.trim(),
    }

    const result = await resend.emails.send(emailContent)

    if (result.error) {
      console.error('[Email] Failed to send new user alert:', result.error)
      throw result.error
    }

    console.log('[Email] New user alert sent successfully:', result.data?.id)
  } catch (error) {
    console.error('[Email] Error sending new user alert:', error)
    // Don't throw - we don't want email failures to break the login flow
  }
}

/**
 * Escape HTML to prevent XSS in email content
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

