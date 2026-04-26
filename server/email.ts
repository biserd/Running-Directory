import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "running.services <hello@running.services>";
const ADMIN_EMAIL = "hello@bigappledigital.nyc";

export async function sendMagicLinkEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
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

export async function sendClaimVerificationEmail(
  email: string,
  raceName: string,
  raceCity: string,
  raceState: string,
  token: string,
  baseUrl: string,
): Promise<boolean> {
  const verifyLink = `${baseUrl}/auth/verify-claim?token=${token}`;
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Verify your claim: ${raceName}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #111; margin: 0;">running.services</h1>
            <p style="color: #666; font-size: 14px; margin-top: 4px;">Race organizer verification</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 32px;">
            <h2 style="font-size: 20px; color: #111; margin: 0 0 12px;">Confirm you organize this race</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
              You requested to claim <strong>${raceName}</strong> in ${raceCity}, ${raceState}.
              Click below to verify your email and unlock the organizer dashboard.
              This link expires in 7 days.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyLink}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                Verify and open dashboard
              </a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 20px; line-height: 1.4;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    if (result.error) {
      console.error("Resend claim verify error:", result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send claim verification email:", error);
    return false;
  }
}

export async function sendFeaturedRequestAdminNotification(
  raceName: string,
  raceSlug: string,
  organizerName: string | null,
  contactEmail: string,
  plan: string,
  durationDays: number,
  message: string | null,
  requestId: number,
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Featured listing request: ${raceName}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="margin: 0 0 12px;">Featured listing request #${requestId}</h2>
          <p style="margin: 0 0 8px;"><strong>Race:</strong> ${raceName} (<a href="https://running.services/races/${raceSlug}">/races/${raceSlug}</a>)</p>
          <p style="margin: 0 0 8px;"><strong>Organizer:</strong> ${organizerName || "—"}</p>
          <p style="margin: 0 0 8px;"><strong>Contact:</strong> ${contactEmail}</p>
          <p style="margin: 0 0 8px;"><strong>Plan:</strong> ${plan} for ${durationDays} days</p>
          ${message ? `<p style="margin: 12px 0 0;"><strong>Message:</strong><br>${message.replace(/</g, "&lt;")}</p>` : ""}
          <p style="margin-top: 16px; color: #666; font-size: 13px;">Approve via POST /api/admin/featured/${requestId}/approve</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send featured request admin notification:", error);
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
