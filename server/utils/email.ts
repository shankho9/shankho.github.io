// server/utils/email.ts
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL
const DEFAULT_FROM_EMAIL = 'Nomadic Notions <blogsite@nomadic-notions.co.in>'
const PUBLISHER_NAME = 'Nomadic Notions'

function getFromEmail(): string {
  return process.env.FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL
}

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
      from: getFromEmail(),
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
    <p>A new user has registered on ${escapeHtml(PUBLISHER_NAME)}:</p>
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
    <p>A user has logged in to ${escapeHtml(PUBLISHER_NAME)}:</p>
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
    <p>A new user has logged in to ${escapeHtml(PUBLISHER_NAME)}:</p>
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
  if (!RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY not configured')
    console.error('[Email] Password reset email failed:', error)
    throw error
  }

  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello ${escapeHtml(userName || 'there')},</p>
    <p>You requested to reset your password for ${escapeHtml(PUBLISHER_NAME)}. Click the link below to reset your password:</p>
    <p>
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all;">${escapeHtml(resetUrl)}</p>
    <p><strong>This link will expire in 24 hours.</strong></p>
    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    <p>Best regards,<br>${escapeHtml(PUBLISHER_NAME)}</p>
  `

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)

    console.log('[Email] Sending password reset email to:', userEmail)
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: userEmail,
      subject: `Reset Your Password - ${PUBLISHER_NAME}`,
      html,
    })

    // Check if Resend returned an error in the response
    if (result.error) {
      const errorMessage = result.error.message || 'Failed to send password reset email'
      console.error('[Email] Resend API error:', result.error)
      throw new Error(errorMessage)
    }

    console.log('[Email] Password reset email sent successfully:', result.data)
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error)
    throw error
  }
}

/**
 * Send utility passcode reset email
 */
export async function sendPasscodeResetEmail(
  userEmail: string,
  userName: string | null,
  resetUrl: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY not configured')
    console.error('[Email] Utility passcode reset email failed:', error)
    throw error
  }

  const html = `
    <h2>Utility Passcode Reset Request</h2>
    <p>Hello ${escapeHtml(userName || 'there')},</p>
    <p>You requested to reset your utility passcode for ${escapeHtml(PUBLISHER_NAME)}. Click the link below to set a new passcode:</p>
    <p>
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
        Set New Utility Passcode
      </a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all;">${escapeHtml(resetUrl)}</p>
    <p><strong>This link will expire in 24 hours.</strong></p>
    <p>If you didn't request this passcode reset, please ignore this email.</p>
    <p>Best regards,<br>${escapeHtml(PUBLISHER_NAME)}</p>
  `

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)

    console.log('[Email] Sending utility passcode reset email to:', userEmail)
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: userEmail,
      subject: `Reset Your Utility Passcode - ${PUBLISHER_NAME}`,
      html,
    })

    // Check if Resend returned an error in the response
    if (result.error) {
      const errorMessage = result.error.message || 'Failed to send utility passcode reset email'
      console.error('[Email] Resend API error:', result.error)
      throw new Error(errorMessage)
    }

    console.log('[Email] Utility passcode reset email sent successfully:', result.data)
  } catch (error) {
    console.error('[Email] Failed to send utility passcode reset email:', error)
    throw error
  }
}

/**
 * Send OTP email when an admin requests a user role change
 */
export async function sendAdminRoleChangeOtp(
  adminEmail: string,
  adminName: string | null,
  targetEmail: string,
  newRole: 'visitor' | 'admin',
  otp: string,
): Promise<void> {
  const greeting = adminName ? escapeHtml(adminName) : 'Admin'
  const roleLabel = newRole === 'admin' ? 'Admin' : 'Visitor'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Confirm role change — ${escapeHtml(PUBLISHER_NAME)}</h2>
      <p>Hello ${greeting},</p>
      <p>You requested to change the role for <strong>${escapeHtml(targetEmail)}</strong> to <strong>${roleLabel}</strong>.</p>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e40af;">${escapeHtml(otp)}</p>
      <p>This code expires in 10 minutes. If you did not request this change, ignore this email.</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">${escapeHtml(PUBLISHER_NAME)}</p>
    </div>
  `

  await sendEmailNotification(adminEmail, `Role change verification code — ${PUBLISHER_NAME}`, html)
}
