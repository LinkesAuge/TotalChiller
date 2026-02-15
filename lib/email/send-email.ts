/**
 * Lightweight transactional email via Resend API (no npm dependency).
 *
 * Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars.
 * If either is missing, `sendEmail` returns silently (email is opt-in).
 */

interface EmailPayload {
  /** Recipient email address. */
  readonly to: string;
  /** Email subject. */
  readonly subject: string;
  /** HTML body. */
  readonly html: string;
}

/**
 * Sends a single transactional email via the Resend REST API.
 * Returns `true` on success, `false` on failure (never throws).
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
