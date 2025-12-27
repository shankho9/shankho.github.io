#!/usr/bin/env node
/**
 * Script to generate 2FA secret for admin authentication
 * Usage: node scripts/admin/setup-2fa.js
 * Output: Secret key and QR code URL for Microsoft Authenticator
 */

const { authenticator } = require('otplib')
const qrcode = require('qrcode')

const serviceName = 'Dev Utilities'
const accountName = 'Admin'

async function generate2FA() {
  try {
    // Generate a secret
    const secret = authenticator.generateSecret()

    // Create OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret)

    console.log('\n✅ 2FA Secret Generated!')
    console.log('\n📱 Add this to your .env file:')
    console.log(`ADMIN_2FA_SECRET=${secret}\n`)

    // Generate QR code as ASCII
    try {
      const qrCode = await qrcode.toString(otpAuthUrl, { type: 'terminal', small: true })
      console.log('📱 Scan this QR code with Microsoft Authenticator:\n')
      console.log(qrCode)
    } catch {
      console.log('\n📱 Manual entry URL:')
      console.log(otpAuthUrl)
    }

    console.log('\n⚠️  Keep this secret secure and do not commit it to version control.\n')
  } catch (error) {
    console.error('Error generating 2FA secret:', error)
    process.exit(1)
  }
}

generate2FA()
