import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "running.services <onboarding@resend.dev>";
const ADMIN_EMAIL = "hello@bigappledigital.nyc";

export async function sendMagicLinkEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NODE_ENV === "production"
    ? "https://running.services"
    : `http://localhost:${process.env.PORT || 5000}`;

  const magicLink = `${baseUrl}/auth/verify?token=${token}`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Sign in to running.services",
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #111; margin: 0;">running.services</h1>
            <p style="color: #666; font-size: 14px; margin-top: 4px;">Your running hub</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="font-size: 20px; color: #111; margin: 0 0 12px;">Sign in to your account</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
              Click the button below to sign in. This link expires in 15 minutes.
            </p>
            <a href="${magicLink}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Sign in
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px; line-height: 1.4;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        </div>
      `,
    });
    console.log("Resend magic link response:", JSON.stringify(result));
    if (result.error) {
      console.error("Resend API error:", result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    return false;
  }
}

export async function sendAdminNewUserNotification(userEmail: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New user registered: ${userEmail}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; padding: 20px;">
          <h2>New User Registration</h2>
          <p>A new user has registered on running.services:</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}
