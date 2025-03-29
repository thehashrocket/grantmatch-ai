import sgMail from '@sendgrid/mail'

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set')
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@grantmatch.ai',
    subject: 'Verify your GrantMatch.AI account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0066cc;">Welcome to GrantMatch.AI!</h1>
        <p>Thank you for signing up. Please verify your email address to get started.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account with GrantMatch.AI, you can safely ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          If the button above doesn't work, copy and paste this link into your browser:
          <br>
          ${verificationUrl}
        </p>
      </div>
    `,
  }

  try {
    await sgMail.send(msg)
  } catch (error) {
    console.error('Error sending verification email:', error)
    throw new Error('Failed to send verification email')
  }
} 