import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
  
  console.log('Attempting to send verification email to:', email)
  console.log('Using verification URL:', verificationUrl)

  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'AI GrantMatch <noreply@aigrantmatch.com>',
      to: email,
      subject: 'Verify your AI GrantMatch account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">Welcome to AI GrantMatch!</h1>
          <p>Thank you for signing up. Please verify your email address to get started.</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with AI GrantMatch, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 14px;">
            If the button above doesn't work, copy and paste this link into your browser:
            <br>
            ${verificationUrl}
          </p>
        </div>
      `
    })
    console.log('Email sent successfully:', data)
  } catch (error) {
    console.error('Error sending verification email:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw new Error('Failed to send verification email')
  }
} 