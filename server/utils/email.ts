// server/utils/email.ts
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Send email notification using Resend
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email notification')
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)

    await resend.emails.send({
      from: "Sid's Blog <notifications@shankho-blogsite.vercel.app>",
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('[Email] Failed to send email notification:', error)
    // Don't throw - email failures shouldn't break the flow
  }
}

/**
 * Send new user registration notification
 */
export async function sendNewUserNotification(
  userEmail: string,
  userName: string | null,
  authProvider: 'email' | 'google',
): Promise<void> {
  if (!NOTIFICATION_EMAIL) {
    console.warn('[Email] NOTIFICATION_EMAIL not configured, skipping notification')
    return
  }

  const html = `
    <h2>New User Registration</h2>
    <p>A new user has registered on Sid's Blog:</p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>
      <li><strong>Name:</strong> ${escapeHtml(userName) || 'Not provided'}</li>
      <li><strong>Auth Provider:</strong> ${escapeHtml(authProvider)}</li>
      <li><strong>Time:</strong> ${new Date().toISOString()}</li>
    </ul>
  `

  await sendEmailNotification(NOTIFICATION_EMAIL, 'New User Registration', html)
}

/**
 * Send new login notification
 */
export async function sendLoginNotification(
  userEmail: string,
  userName: string | null,
  deviceInfo: {
    deviceName: string
    deviceType: string
    browser: string
    os: string
    ipAddress: string
  },
  isNewDevice: boolean,
): Promise<void> {
  if (!NOTIFICATION_EMAIL) {
    console.warn('[Email] NOTIFICATION_EMAIL not configured, skipping notification')
    return
  }

  const html = `
    <h2>${isNewDevice ? 'New Device Login' : 'User Login'}</h2>
    <p>A user has logged in to Sid's Blog:</p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>
      <li><strong>Name:</strong> ${escapeHtml(userName) || 'Not provided'}</li>
      <li><strong>Device:</strong> ${escapeHtml(deviceInfo.deviceName)}</li>
      <li><strong>Type:</strong> ${escapeHtml(deviceInfo.deviceType)}</li>
      <li><strong>Browser:</strong> ${escapeHtml(deviceInfo.browser)}</li>
      <li><strong>OS:</strong> ${escapeHtml(deviceInfo.os)}</li>
      <li><strong>IP Address:</strong> ${escapeHtml(deviceInfo.ipAddress)}</li>
      <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      ${isNewDevice ? '<li><strong>⚠️ This is a new device</strong></li>' : ''}
    </ul>
  `

  await sendEmailNotification(
    NOTIFICATION_EMAIL,
    isNewDevice ? 'New Device Login Alert' : 'User Login',
    html,
  )
}

/**
 * Send new user alert (for analytics tracking)
 * This is used by the track-login endpoint when a new user is detected
 */
export async function sendNewUserAlert(data: {
  userEmail: string
  userName: string
  loginLocation: string
  ipAddress?: string
  country?: string
  browser?: string
  userAgent?: string
}): Promise<void> {
  if (!NOTIFICATION_EMAIL) {
    console.warn('[Email] NOTIFICATION_EMAIL not configured, skipping notification')
    return
  }

  const html = `
    <h2>New User Login Alert</h2>
    <p>A new user has logged in to Sid's Blog:</p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(data.userEmail)}</li>
      <li><strong>Name:</strong> ${escapeHtml(data.userName)}</li>
      <li><strong>Location:</strong> ${escapeHtml(data.loginLocation)}</li>
      ${data.ipAddress ? `<li><strong>IP Address:</strong> ${escapeHtml(data.ipAddress)}</li>` : ''}
      ${data.country ? `<li><strong>Country:</strong> ${escapeHtml(data.country)}</li>` : ''}
      ${data.browser ? `<li><strong>Browser:</strong> ${escapeHtml(data.browser)}</li>` : ''}
      ${data.userAgent ? `<li><strong>User Agent:</strong> ${escapeHtml(data.userAgent)}</li>` : ''}
      <li><strong>Time:</strong> ${new Date().toISOString()}</li>
    </ul>
  `

  await sendEmailNotification(NOTIFICATION_EMAIL, 'New User Login Alert', html)
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string | null,
  resetUrl: string,
): Promise<void> {
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello ${escapeHtml(userName || 'there')},</p>
    <p>You requested to reset your password for Sid's Blog. Click the link below to reset your password:</p>
    <p>
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all;">${escapeHtml(resetUrl)}</p>
    <p><strong>This link will expire in 24 hours.</strong></p>
    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    <p>Best regards,<br>Sid's Blog</p>
  `

  await sendEmailNotification(userEmail, "Reset Your Password - Sid's Blog", html)
}
