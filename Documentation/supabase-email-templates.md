# Supabase Email Templates

These email templates must be configured in the **Supabase Dashboard** under:

**Authentication → Email Templates**

The app cannot set these programmatically. Copy the HTML below into the corresponding template slot in the dashboard.

> **Important:** The `{{ .ConfirmationURL }}` variable is provided by Supabase and already includes any redirect configured in the application code.

> **Outlook compatibility:** All templates use table-based layout with `bgcolor` attributes and solid hex colors. This ensures proper rendering in Outlook (which uses Microsoft Word's HTML engine), Gmail, Apple Mail, and other clients.

## Table of Contents

1. [Confirm Signup](#1-confirm-signup)
2. [Reset Password](#2-reset-password)
3. [Change Email Address](#3-change-email-address)
4. [Invite User](#4-invite-user)
5. [Magic Link](#5-magic-link) _(not actively used)_
6. [Setup Instructions](#setup-instructions)

---

## 1. Confirm Signup

**Subject:** Willkommen bei TotalChiller – E-Mail bestätigen / Welcome to TotalChiller – Confirm Your Email

**HTML Body:**

```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center" style="padding: 0;">
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
        width="600"
        bgcolor="#1a1a2e"
        style="max-width: 600px; color: #e0d8c8;"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 24px 24px 20px; border-bottom: 1px solid #2a2a3e;">
            <h1 style="margin: 0; font-size: 22px; color: #c8a84e; font-family: Arial, sans-serif;">
              [THC] Chiller &amp; Killer
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
          </td>
        </tr>
        <!-- GERMAN -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Willkommen bei TotalChiller!</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Dein Konto wurde erfolgreich erstellt. Bitte best&auml;tige deine E-Mail-Adresse, um dein Konto zu
              aktivieren.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 20px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >E-Mail best&auml;tigen</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px;">
            <h3 style="font-size: 15px; color: #c8a84e; margin: 0 0 10px;">N&auml;chste Schritte:</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>E-Mail best&auml;tigen</strong><br />
                  <span style="color: #8a8a9a;">Klicke auf den Button oben, um dein Konto zu aktivieren.</span>
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Einloggen</strong><br />
                  <span style="color: #8a8a9a;"
                    >Melde dich mit deinen Zugangsdaten an. Beim ersten Login wirst du automatisch zu deinem Profil
                    weitergeleitet.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Spielkonto anlegen</strong><br />
                  <span style="color: #8a8a9a;"
                    >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen
                    hinzuf&uuml;gst.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        4
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Clan-Zuweisung abwarten</strong><br />
                  <span style="color: #8a8a9a;"
                    >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24&ndash;48
                    Stunden.</span
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ENGLISH -->
        <tr>
          <td style="padding: 0 24px;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Welcome to TotalChiller!</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Your account has been created. Please confirm your email address to activate your account.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 20px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Confirm Email</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px;">
            <h3 style="font-size: 15px; color: #c8a84e; margin: 0 0 10px;">Next Steps:</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Confirm your email</strong><br />
                  <span style="color: #8a8a9a;">Click the button above to activate your account.</span>
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Log in</strong><br />
                  <span style="color: #8a8a9a;"
                    >Sign in with your credentials. On your first login you will be redirected to your profile
                    automatically.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Create a game account</strong><br />
                  <span style="color: #8a8a9a;"
                    >In your profile, add your Total Battle player name to create a game account.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        4
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Wait for clan assignment</strong><br />
                  <span style="color: #8a8a9a;"
                    >An administrator will assign you to a clan. This typically takes 24&ndash;48 hours.</span
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 24px; font-size: 12px; color: #6a6a7a;">
            <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
            <p style="margin: 4px 0 0;">
              <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 2. Reset Password

**Subject:** TotalChiller – Passwort zur&uuml;cksetzen / Reset Your Password

**HTML Body:**

```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center" style="padding: 0;">
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
        width="600"
        bgcolor="#1a1a2e"
        style="max-width: 600px; color: #e0d8c8;"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 24px 24px 20px; border-bottom: 1px solid #2a2a3e;">
            <h1 style="margin: 0; font-size: 22px; color: #c8a84e; font-family: Arial, sans-serif;">
              [THC] Chiller &amp; Killer
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
          </td>
        </tr>
        <!-- GERMAN -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Passwort zur&uuml;cksetzen</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Du hast eine Anfrage zum Zur&uuml;cksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein
              neues Passwort zu erstellen.
            </p>
            <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt
              unver&auml;ndert.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Neues Passwort erstellen</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              Dieser Link ist aus Sicherheitsgr&uuml;nden nur f&uuml;r begrenzte Zeit g&uuml;ltig.
            </p>
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ENGLISH -->
        <tr>
          <td style="padding: 0 24px;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Reset Your Password</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              You requested a password reset for your TotalChiller account. Click the button below to create a new
              password.
            </p>
            <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              If you did not request this, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Create New Password</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              This link is valid for a limited time for security reasons.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 24px; font-size: 12px; color: #6a6a7a;">
            <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
            <p style="margin: 4px 0 0;">
              <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 3. Change Email Address

**Subject:** TotalChiller – E-Mail-Adresse best&auml;tigen / Confirm Your New Email Address

**HTML Body:**

```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center" style="padding: 0;">
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
        width="600"
        bgcolor="#1a1a2e"
        style="max-width: 600px; color: #e0d8c8;"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 24px 24px 20px; border-bottom: 1px solid #2a2a3e;">
            <h1 style="margin: 0; font-size: 22px; color: #c8a84e; font-family: Arial, sans-serif;">
              [THC] Chiller &amp; Killer
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
          </td>
        </tr>
        <!-- GERMAN -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">E-Mail-Adresse &auml;ndern</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Du hast eine &Auml;nderung deiner E-Mail-Adresse f&uuml;r dein TotalChiller-Konto angefordert. Bitte
              best&auml;tige die neue Adresse, indem du auf den Button unten klickst.
            </p>
            <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Falls du diese &Auml;nderung nicht angefordert hast, kannst du diese E-Mail ignorieren. Deine
              E-Mail-Adresse bleibt unver&auml;ndert.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Neue E-Mail-Adresse best&auml;tigen</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              Dieser Link ist aus Sicherheitsgr&uuml;nden nur f&uuml;r begrenzte Zeit g&uuml;ltig.
            </p>
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ENGLISH -->
        <tr>
          <td style="padding: 0 24px;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Change Email Address</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              You requested to change the email address associated with your TotalChiller account. Please confirm your
              new address by clicking the button below.
            </p>
            <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              If you did not request this change, you can safely ignore this email. Your email address will remain
              unchanged.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Confirm New Email Address</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              This link is valid for a limited time for security reasons.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 24px; font-size: 12px; color: #6a6a7a;">
            <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
            <p style="margin: 4px 0 0;">
              <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 4. Invite User

Used when an admin creates a new user via the admin panel (`/api/admin/create-user`).

**Subject:** TotalChiller – Du wurdest eingeladen! / You've Been Invited!

**HTML Body:**

```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center" style="padding: 0;">
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
        width="600"
        bgcolor="#1a1a2e"
        style="max-width: 600px; color: #e0d8c8;"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 24px 24px 20px; border-bottom: 1px solid #2a2a3e;">
            <h1 style="margin: 0; font-size: 22px; color: #c8a84e; font-family: Arial, sans-serif;">
              [THC] Chiller &amp; Killer
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
          </td>
        </tr>
        <!-- GERMAN -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Du wurdest eingeladen!</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Ein Administrator hat ein Konto f&uuml;r dich auf der TotalChiller-Plattform erstellt. Klicke auf den
              Button unten, um deine Einladung anzunehmen und dein Passwort festzulegen.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 20px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Einladung annehmen</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px;">
            <h3 style="font-size: 15px; color: #c8a84e; margin: 0 0 10px;">N&auml;chste Schritte:</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Passwort festlegen</strong><br />
                  <span style="color: #8a8a9a;"
                    >Klicke auf den Button oben und erstelle ein sicheres Passwort f&uuml;r dein Konto.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Spielkonto anlegen</strong><br />
                  <span style="color: #8a8a9a;"
                    >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen
                    hinzuf&uuml;gst.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Clan-Zuweisung abwarten</strong><br />
                  <span style="color: #8a8a9a;"
                    >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24&ndash;48
                    Stunden.</span
                  >
                </td>
              </tr>
            </table>
            <p style="margin: 16px 0 0; font-size: 12px; color: #6a6a7a;">
              Dieser Link ist aus Sicherheitsgr&uuml;nden nur f&uuml;r begrenzte Zeit g&uuml;ltig.
            </p>
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ENGLISH -->
        <tr>
          <td style="padding: 0 24px;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">You've Been Invited!</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              An administrator has created an account for you on the TotalChiller platform. Click the button below to
              accept your invitation and set your password.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 20px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Accept Invitation</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 24px;">
            <h3 style="font-size: 15px; color: #c8a84e; margin: 0 0 10px;">Next Steps:</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        1
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Set your password</strong><br />
                  <span style="color: #8a8a9a;"
                    >Click the button above and create a secure password for your account.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        2
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Create a game account</strong><br />
                  <span style="color: #8a8a9a;"
                    >In your profile, add your Total Battle player name to create a game account.</span
                  >
                </td>
              </tr>
              <tr>
                <td width="32" valign="top" style="padding: 6px 8px 6px 0;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td
                        bgcolor="#3d3628"
                        width="24"
                        height="24"
                        align="center"
                        style="color: #c8a84e; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;"
                      >
                        3
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #e0d8c8;">
                  <strong>Wait for clan assignment</strong><br />
                  <span style="color: #8a8a9a;"
                    >An administrator will assign you to a clan. This typically takes 24&ndash;48 hours.</span
                  >
                </td>
              </tr>
            </table>
            <p style="margin: 16px 0 0; font-size: 12px; color: #6a6a7a;">
              This link is valid for a limited time for security reasons.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 24px; font-size: 12px; color: #6a6a7a;">
            <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
            <p style="margin: 4px 0 0;">
              <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 5. Magic Link

> **Note:** Magic Link login is not currently used in the app. This template is included for completeness in case it is enabled in the future.

**Subject:** TotalChiller – Anmelde-Link / Your Login Link

**HTML Body:**

```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center" style="padding: 0;">
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
        width="600"
        bgcolor="#1a1a2e"
        style="max-width: 600px; color: #e0d8c8;"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="padding: 24px 24px 20px; border-bottom: 1px solid #2a2a3e;">
            <h1 style="margin: 0; font-size: 22px; color: #c8a84e; font-family: Arial, sans-serif;">
              [THC] Chiller &amp; Killer
            </h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
          </td>
        </tr>
        <!-- GERMAN -->
        <tr>
          <td style="padding: 24px 24px 0;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Dein Anmelde-Link</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Klicke auf den Button unten, um dich bei TotalChiller anzumelden. Dieser Link kann nur einmal verwendet
              werden.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Bei TotalChiller anmelden</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.
            </p>
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- ENGLISH -->
        <tr>
          <td style="padding: 0 24px;">
            <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Your Login Link</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px; color: #e0d8c8;">
              Click the button below to log in to TotalChiller. This link can only be used once.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 16px 24px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#c8a84e" style="padding: 12px 32px; text-align: center;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #1a1a2e; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;"
                    >Log in to TotalChiller</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
              If you did not request this login, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="#2a2a3e" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 24px; font-size: 12px; color: #6a6a7a;">
            <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
            <p style="margin: 4px 0 0;">
              <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## Setup Instructions

1. Go to the **Supabase Dashboard** for the project
2. Navigate to **Authentication → Email Templates**
3. For each template type (Confirm signup, Reset password, Change email, Invite user, Magic link):
   - Select the corresponding tab
   - Set the **Subject** field
   - Paste the **HTML Body** from the matching section above (only the content inside the ` ``` ` code fences, not the fences themselves)
   - Click **Save**

### Template Variables

| Variable                 | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `{{ .ConfirmationURL }}` | The full confirmation/action URL (includes any configured redirect path) |
| `{{ .SiteURL }}`         | The site URL configured in Supabase project settings                     |

### Redirect Paths by Email Type

| Email Type     | Redirect Destination | Configured In                           |
| -------------- | -------------------- | --------------------------------------- |
| Confirm signup | `/auth/login`        | `app/auth/register/page.tsx`            |
| Reset password | `/auth/update`       | `app/api/auth/forgot-password/route.ts` |
| Change email   | _(Supabase default)_ | `app/settings/settings-client.tsx`      |
| Invite user    | _(Supabase default)_ | `app/api/admin/create-user/route.ts`    |
| Magic link     | _(not used)_         | —                                       |

### Design Tokens

| Token         | Value     | Usage                        |
| ------------- | --------- | ---------------------------- |
| Background    | `#1a1a2e` | Email body (via `bgcolor`)   |
| Text          | `#e0d8c8` | Primary text                 |
| Gold accent   | `#c8a84e` | Headings, buttons            |
| Muted text    | `#8a8a9a` | Secondary text               |
| Faint text    | `#6a6a7a` | Footer, disclaimers          |
| Divider       | `#2a2a3e` | Horizontal rules (via table) |
| Step badge bg | `#3d3628` | Numbered step badge (solid)  |

### Outlook Compatibility

These templates are built for maximum email client compatibility:

- **Table-based layout** — all structure uses `<table>` elements, not `<div>`, because Outlook's Word-based renderer ignores many CSS layout properties on `<div>`.
- **`bgcolor` attribute** — background colors use the HTML `bgcolor` attribute on `<table>` and `<td>` elements, which Outlook supports natively.
- **Solid hex colors** — all colors are solid hex values (no `rgba()`, `hsl()`, or CSS variables). The step badge background `#3d3628` is the solid equivalent of `rgba(200,168,78,0.2)` on the dark body.
- **HTML entities** — German umlauts use HTML entities (`&auml;`, `&uuml;`, `&ouml;`) for reliable encoding across all mail clients.
- **No `border-radius`** — buttons and badges will render as rectangles in Outlook (rounded in modern clients). This is acceptable; Outlook does not support rounded corners.
- **Inline styles** — all styling is inline because many email clients strip `<style>` blocks.
- **`font-family: Arial`** — reliable fallback that renders consistently across all email clients.

### Notes

- Both German and English are included in every template since Supabase does not support per-user language selection
- German appears first (as the platform default language)
- The gold/dark theme matches the TotalChiller platform
- The "Confirm signup" and "Invite user" templates include the game-account / clan-assignment next steps; the others do not since they are for existing users
- After confirming their email, users are redirected to the login page (not directly to profile)
- The login page (`app/auth/login/page.tsx`) detects first-time users (no game accounts) and automatically redirects them to `/profile`
