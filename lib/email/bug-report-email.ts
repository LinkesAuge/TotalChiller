/**
 * HTML email template for new bug report notifications.
 */

interface BugReportEmailData {
  readonly title: string;
  readonly description: string;
  readonly reporterName: string;
  readonly categoryName: string | null;
  readonly pageUrl: string | null;
  readonly reportUrl: string;
}

/** Generates the HTML email body for a new bug report notification. */
export function buildBugReportEmail(data: BugReportEmailData): string {
  const truncatedDesc = data.description.length > 500 ? `${data.description.slice(0, 500)}…` : data.description;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Bug Report</title>
</head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:8px;border:1px solid #374151;max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:24px 24px 16px;border-bottom:1px solid #374151;">
          <h1 style="margin:0;font-size:18px;color:#fbbf24;">New Bug Report</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">A new report was submitted on TotalChiller.</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:20px 24px;">
          <h2 style="margin:0 0 8px;font-size:16px;color:#f3f4f6;">${escapeHtml(data.title)}</h2>
          <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
            Reported by <strong style="color:#d1d5db;">${escapeHtml(data.reporterName)}</strong>
            ${data.categoryName ? ` &middot; <span style="color:#fbbf24;">${escapeHtml(data.categoryName)}</span>` : ""}
          </p>
          ${data.pageUrl ? `<p style="margin:4px 0 12px;font-size:12px;color:#6b7280;">Page: ${escapeHtml(data.pageUrl)}</p>` : ""}
          <div style="margin:12px 0;padding:12px;background:#111827;border-radius:6px;border:1px solid #374151;">
            <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;white-space:pre-wrap;">${escapeHtml(truncatedDesc)}</p>
          </div>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:0 24px 24px;">
          <a href="${escapeHtml(data.reportUrl)}" style="display:inline-block;padding:10px 20px;background:#b45309;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
            View Report
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #374151;">
          <p style="margin:0;font-size:11px;color:#6b7280;">You received this because you have bug report email notifications enabled in your TotalChiller settings.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
