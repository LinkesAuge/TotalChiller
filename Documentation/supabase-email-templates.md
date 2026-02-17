# Supabase Email Templates

These email templates must be configured in the **Supabase Dashboard** under:

**Authentication → Email Templates**

The app cannot set these programmatically. Copy the HTML below into the corresponding template slot in the dashboard.

> **Important:** The `{{ .ConfirmationURL }}` variable is provided by Supabase and already includes any redirect configured in the application code.

> **Dual-theme design:** Each template contains two versions — a warm light theme for Outlook (which cannot render dark backgrounds) and the dark gold theme for all modern clients (Gmail, Apple Mail, etc.). MSO conditional comments (`<!--[if mso]>`) automatically serve the correct version.

## Table of Contents

1. [Confirm Signup](#1-confirm-signup)
2. [Reset Password](#2-reset-password)
3. [Change Email Address](#3-change-email-address)
4. [Invite User](#4-invite-user)
5. [Magic Link](#5-magic-link) _(not actively used)_
6. [Setup Instructions](#setup-instructions)

---

## 1. Confirm Signup

**Subject:** Willkommen bei [THC] Chiller & Killer – E-Mail bestätigen / Welcome to [THC] Chiller & Killer – Confirm Your Email

**HTML Body:**

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>[THC] Chiller & Killer</title>
  </head>
  <body style="margin:0;padding:0;" bgcolor="#f5f3ef">
    <!--[if mso]>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f3ef">
        <tr>
          <td align="center" style="padding:24px 0;">
            <table
              cellpadding="0"
              cellspacing="0"
              border="0"
              width="600"
              bgcolor="#ffffff"
              style="border:1px solid #e8e4dc;"
            >
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="padding:24px 24px 20px;border-bottom:1px solid #e8e4dc;">
                  <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                    [THC] Chiller &amp; Killer
                  </h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#999999;font-family:Arial,sans-serif;">
                    [THC] Chiller & Killer Community Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:24px 24px 0;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Willkommen bei [THC] Chiller & Killer!
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Dein Konto wurde erfolgreich erstellt. Bitte best&auml;tige deine E-Mail-Adresse, um dein Konto zu
                    aktivieren.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >E-Mail best&auml;tigen</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;font-family:Arial,sans-serif;">
                    N&auml;chste Schritte:
                  </h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              1
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>E-Mail best&auml;tigen</strong><br /><span style="color:#666666;"
                          >Klicke auf den Button oben, um dein Konto zu aktivieren.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              2
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Einloggen</strong><br /><span style="color:#666666;"
                          >Melde dich mit deinen Zugangsdaten an. Beim ersten Login wirst du automatisch zu deinem
                          Profil weitergeleitet.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              3
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Spielkonto anlegen</strong><br /><span style="color:#666666;"
                          >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen
                          hinzuf&uuml;gst.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              4
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Clan-Zuweisung abwarten</strong><br /><span style="color:#666666;"
                          >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24&ndash;48
                          Stunden.</span
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Welcome to [THC] Chiller & Killer!
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Your account has been created. Please confirm your email address to activate your account.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Confirm Email</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;font-family:Arial,sans-serif;">
                    Next Steps:
                  </h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              1
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Confirm your email</strong><br /><span style="color:#666666;"
                          >Click the button above to activate your account.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              2
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Log in</strong><br /><span style="color:#666666;"
                          >Sign in with your credentials. On your first login you will be redirected to your profile
                          automatically.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              3
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Create a game account</strong><br /><span style="color:#666666;"
                          >In your profile, add your Total Battle player name to create a game account.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              4
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Wait for clan assignment</strong><br /><span style="color:#666666;"
                          >An administrator will assign you to a clan. This typically takes 24&ndash;48 hours.</span
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  bgcolor="#ffffff"
                  style="padding:0 24px 24px;font-size:12px;color:#999999;font-family:Arial,sans-serif;"
                >
                  <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                  <p style="margin:4px 0 0;">
                    <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    <![endif]-->

    <!--[if !mso]><!-->
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      bgcolor="#1a1a2e"
      style="background-color:#1a1a2e;font-family:Arial,sans-serif;"
    >
      <tr>
        <td align="center" bgcolor="#1a1a2e" style="padding:0;background-color:#1a1a2e;">
          <table
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            style="max-width:600px;color:#e0d8c8;font-family:Arial,sans-serif;"
          >
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:24px 24px 20px;border-bottom:1px solid #2a2a3e;background-color:#1a1a2e;"
              >
                <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                  [THC] Chiller &amp; Killer
                </h1>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8a9a;">[THC] Chiller & Killer Community Platform</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:24px 24px 0;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Willkommen bei [THC] Chiller & Killer!</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Dein Konto wurde erfolgreich erstellt. Bitte best&auml;tige deine E-Mail-Adresse, um dein Konto zu
                  aktivieren.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 20px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >E-Mail best&auml;tigen</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;">N&auml;chste Schritte:</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            1
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>E-Mail best&auml;tigen</strong><br /><span style="color:#8a8a9a;"
                        >Klicke auf den Button oben, um dein Konto zu aktivieren.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            2
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Einloggen</strong><br /><span style="color:#8a8a9a;"
                        >Melde dich mit deinen Zugangsdaten an. Beim ersten Login wirst du automatisch zu deinem Profil
                        weitergeleitet.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            3
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Spielkonto anlegen</strong><br /><span style="color:#8a8a9a;"
                        >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen
                        hinzuf&uuml;gst.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            4
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Clan-Zuweisung abwarten</strong><br /><span style="color:#8a8a9a;"
                        >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24&ndash;48
                        Stunden.</span
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Welcome to [THC] Chiller & Killer!</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Your account has been created. Please confirm your email address to activate your account.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 20px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Confirm Email</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;">Next Steps:</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            1
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Confirm your email</strong><br /><span style="color:#8a8a9a;"
                        >Click the button above to activate your account.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            2
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Log in</strong><br /><span style="color:#8a8a9a;"
                        >Sign in with your credentials. On your first login you will be redirected to your profile
                        automatically.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            3
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Create a game account</strong><br /><span style="color:#8a8a9a;"
                        >In your profile, add your Total Battle player name to create a game account.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            4
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Wait for clan assignment</strong><br /><span style="color:#8a8a9a;"
                        >An administrator will assign you to a clan. This typically takes 24&ndash;48 hours.</span
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:0 24px 24px;font-size:12px;color:#6a6a7a;background-color:#1a1a2e;"
              >
                <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                <p style="margin:4px 0 0;">
                  <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </body>
</html>
```

---

## 2. Reset Password

**Subject:** [THC] Chiller & Killer – Passwort zurücksetzen / Reset Your Password

**HTML Body:**

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[THC] Chiller & Killer</title>
  </head>
  <body style="margin:0;padding:0;" bgcolor="#f5f3ef">
    <!--[if mso]>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f3ef">
        <tr>
          <td align="center" style="padding:24px 0;">
            <table
              cellpadding="0"
              cellspacing="0"
              border="0"
              width="600"
              bgcolor="#ffffff"
              style="border:1px solid #e8e4dc;"
            >
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="padding:24px 24px 20px;">
                  <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                    [THC] Chiller &amp; Killer
                  </h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#999999;font-family:Arial,sans-serif;">
                    [THC] Chiller & Killer Community Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:24px 24px 0;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Passwort zur&uuml;cksetzen
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Du hast eine Anfrage zum Zur&uuml;cksetzen deines Passworts gestellt. Klicke auf den Button unten,
                    um ein neues Passwort zu erstellen.
                  </p>
                  <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Neues Passwort erstellen</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    Dieser Link ist aus Sicherheitsgr&uuml;nden nur f&uuml;r begrenzte Zeit g&uuml;ltig.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Reset Your Password
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    You requested a password reset. Click the button below to create a new password.
                  </p>
                  <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Create New Password</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    This link is valid for a limited time for security reasons.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  bgcolor="#ffffff"
                  style="padding:0 24px 24px;font-size:12px;color:#999999;font-family:Arial,sans-serif;"
                >
                  <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                  <p style="margin:4px 0 0;">
                    <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    <![endif]-->

    <!--[if !mso]><!-->
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      bgcolor="#1a1a2e"
      style="background-color:#1a1a2e;font-family:Arial,sans-serif;"
    >
      <tr>
        <td align="center" bgcolor="#1a1a2e" style="padding:0;background-color:#1a1a2e;">
          <table
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            style="max-width:600px;color:#e0d8c8;font-family:Arial,sans-serif;"
          >
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:24px 24px 20px;border-bottom:1px solid #2a2a3e;background-color:#1a1a2e;"
              >
                <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                  [THC] Chiller &amp; Killer
                </h1>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8a9a;">[THC] Chiller & Killer Community Platform</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:24px 24px 0;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Passwort zur&uuml;cksetzen</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Du hast eine Anfrage zum Zur&uuml;cksetzen deines Passworts gestellt. Klicke auf den Button unten, um
                  ein neues Passwort zu erstellen.
                </p>
                <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Neues Passwort erstellen</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">
                  Dieser Link ist aus Sicherheitsgr&uuml;nden nur f&uuml;r begrenzte Zeit g&uuml;ltig.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Reset Your Password</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  You requested a password reset. Click the button below to create a new password.
                </p>
                <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Create New Password</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">
                  This link is valid for a limited time for security reasons.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:0 24px 24px;font-size:12px;color:#6a6a7a;background-color:#1a1a2e;"
              >
                <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                <p style="margin:4px 0 0;">
                  <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </body>
</html>
```

---

## 3. Change Email Address

**Subject:** [THC] Chiller & Killer – E-Mail-Adresse bestätigen / Confirm Your New Email Address

**HTML Body:**

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[THC] Chiller & Killer</title>
  </head>
  <body style="margin:0;padding:0;" bgcolor="#f5f3ef">
    <!--[if mso]>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f3ef">
        <tr>
          <td align="center" style="padding:24px 0;">
            <table
              cellpadding="0"
              cellspacing="0"
              border="0"
              width="600"
              bgcolor="#ffffff"
              style="border:1px solid #e8e4dc;"
            >
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="padding:24px 24px 20px;">
                  <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                    [THC] Chiller &amp; Killer
                  </h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#999999;font-family:Arial,sans-serif;">
                    [THC] Chiller & Killer Community Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:24px 24px 0;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    E-Mail-Adresse &auml;ndern
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Du hast eine &Auml;nderung deiner E-Mail-Adresse angefordert. Bitte best&auml;tige die neue Adresse.
                  </p>
                  <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Falls du diese &Auml;nderung nicht angefordert hast, kannst du diese E-Mail ignorieren.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Neue E-Mail best&auml;tigen</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    Dieser Link ist nur f&uuml;r begrenzte Zeit g&uuml;ltig.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Change Email Address
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    You requested to change your email address. Please confirm your new address.
                  </p>
                  <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Confirm New Email</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    This link is valid for a limited time.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  bgcolor="#ffffff"
                  style="padding:0 24px 24px;font-size:12px;color:#999999;font-family:Arial,sans-serif;"
                >
                  <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                  <p style="margin:4px 0 0;">
                    <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    <![endif]-->

    <!--[if !mso]><!-->
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      bgcolor="#1a1a2e"
      style="background-color:#1a1a2e;font-family:Arial,sans-serif;"
    >
      <tr>
        <td align="center" bgcolor="#1a1a2e" style="padding:0;background-color:#1a1a2e;">
          <table
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            style="max-width:600px;color:#e0d8c8;font-family:Arial,sans-serif;"
          >
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:24px 24px 20px;border-bottom:1px solid #2a2a3e;background-color:#1a1a2e;"
              >
                <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                  [THC] Chiller &amp; Killer
                </h1>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8a9a;">[THC] Chiller & Killer Community Platform</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:24px 24px 0;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">E-Mail-Adresse &auml;ndern</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Du hast eine &Auml;nderung deiner E-Mail-Adresse angefordert. Bitte best&auml;tige die neue Adresse.
                </p>
                <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Falls du diese &Auml;nderung nicht angefordert hast, kannst du diese E-Mail ignorieren.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Neue E-Mail best&auml;tigen</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">
                  Dieser Link ist nur f&uuml;r begrenzte Zeit g&uuml;ltig.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Change Email Address</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  You requested to change your email address. Please confirm your new address.
                </p>
                <p style="margin:0 0 4px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Confirm New Email</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">This link is valid for a limited time.</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:0 24px 24px;font-size:12px;color:#6a6a7a;background-color:#1a1a2e;"
              >
                <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                <p style="margin:4px 0 0;">
                  <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </body>
</html>
```

---

## 4. Invite User

Used when an admin creates a new user via the admin panel (`/api/admin/create-user`).

**Subject:** [THC] Chiller & Killer – Du wurdest eingeladen! / You've Been Invited!

**HTML Body:**

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[THC] Chiller & Killer</title>
  </head>
  <body style="margin:0;padding:0;" bgcolor="#f5f3ef">
    <!--[if mso]>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f3ef">
        <tr>
          <td align="center" style="padding:24px 0;">
            <table
              cellpadding="0"
              cellspacing="0"
              border="0"
              width="600"
              bgcolor="#ffffff"
              style="border:1px solid #e8e4dc;"
            >
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="padding:24px 24px 20px;">
                  <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                    [THC] Chiller &amp; Killer
                  </h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#999999;font-family:Arial,sans-serif;">
                    [THC] Chiller & Killer Community Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:24px 24px 0;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Du wurdest eingeladen!
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Ein Administrator hat ein Konto f&uuml;r dich erstellt. Klicke auf den Button, um deine Einladung
                    anzunehmen und dein Passwort festzulegen.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Einladung annehmen</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;font-family:Arial,sans-serif;">
                    N&auml;chste Schritte:
                  </h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              1
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Passwort festlegen</strong><br /><span style="color:#666666;"
                          >Erstelle ein sicheres Passwort f&uuml;r dein Konto.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              2
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Spielkonto anlegen</strong><br /><span style="color:#666666;"
                          >F&uuml;ge deinen Total-Battle-Spielernamen hinzu.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              3
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Clan-Zuweisung abwarten</strong><br /><span style="color:#666666;"
                          >Dauert in der Regel 24&ndash;48 Stunden.</span
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    You've Been Invited!
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    An administrator has created an account for you. Click the button to accept and set your password.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 20px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Accept Invitation</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;font-family:Arial,sans-serif;">
                    Next Steps:
                  </h3>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              1
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Set your password</strong><br /><span style="color:#666666;"
                          >Create a secure password for your account.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              2
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Create a game account</strong><br /><span style="color:#666666;"
                          >Add your Total Battle player name.</span
                        >
                      </td>
                    </tr>
                    <tr>
                      <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td
                              bgcolor="#f5eed8"
                              width="24"
                              height="24"
                              align="center"
                              style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;"
                            >
                              3
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td
                        style="padding:6px 0;font-size:14px;line-height:1.5;color:#333333;font-family:Arial,sans-serif;"
                      >
                        <strong>Wait for clan assignment</strong><br /><span style="color:#666666;"
                          >Typically takes 24&ndash;48 hours.</span
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  bgcolor="#ffffff"
                  style="padding:0 24px 24px;font-size:12px;color:#999999;font-family:Arial,sans-serif;"
                >
                  <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                  <p style="margin:4px 0 0;">
                    <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    <![endif]-->

    <!--[if !mso]><!-->
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      bgcolor="#1a1a2e"
      style="background-color:#1a1a2e;font-family:Arial,sans-serif;"
    >
      <tr>
        <td align="center" bgcolor="#1a1a2e" style="padding:0;background-color:#1a1a2e;">
          <table
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            style="max-width:600px;color:#e0d8c8;font-family:Arial,sans-serif;"
          >
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:24px 24px 20px;border-bottom:1px solid #2a2a3e;background-color:#1a1a2e;"
              >
                <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                  [THC] Chiller &amp; Killer
                </h1>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8a9a;">[THC] Chiller & Killer Community Platform</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:24px 24px 0;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Du wurdest eingeladen!</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Ein Administrator hat ein Konto f&uuml;r dich erstellt. Klicke auf den Button, um deine Einladung
                  anzunehmen und dein Passwort festzulegen.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 20px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Einladung annehmen</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;">N&auml;chste Schritte:</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            1
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Passwort festlegen</strong><br /><span style="color:#8a8a9a;"
                        >Erstelle ein sicheres Passwort f&uuml;r dein Konto.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            2
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Spielkonto anlegen</strong><br /><span style="color:#8a8a9a;"
                        >F&uuml;ge deinen Total-Battle-Spielernamen hinzu.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            3
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Clan-Zuweisung abwarten</strong><br /><span style="color:#8a8a9a;"
                        >Dauert in der Regel 24&ndash;48 Stunden.</span
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">You've Been Invited!</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  An administrator has created an account for you. Click the button to accept and set your password.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 20px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Accept Invitation</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h3 style="font-size:15px;color:#c8a84e;margin:0 0 10px;">Next Steps:</h3>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            1
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Set your password</strong><br /><span style="color:#8a8a9a;"
                        >Create a secure password for your account.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            2
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Create a game account</strong><br /><span style="color:#666666;"
                        >Add your Total Battle player name.</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <td width="28" valign="top" style="padding:6px 8px 6px 0;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td
                            bgcolor="#3d3628"
                            width="24"
                            height="24"
                            align="center"
                            style="color:#c8a84e;font-weight:bold;font-size:13px;font-family:Arial,sans-serif;border-radius:4px;"
                          >
                            3
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#e0d8c8;">
                      <strong>Wait for clan assignment</strong><br /><span style="color:#8a8a9a;"
                        >Typically takes 24&ndash;48 hours.</span
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:0 24px 24px;font-size:12px;color:#6a6a7a;background-color:#1a1a2e;"
              >
                <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                <p style="margin:4px 0 0;">
                  <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </body>
</html>
```

---

## 5. Magic Link

> **Note:** Magic Link login is not currently used in the app. Included for completeness.

**Subject:** [THC] Chiller & Killer – Anmelde-Link / Your Login Link

**HTML Body:**

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[THC] Chiller & Killer</title>
  </head>
  <body style="margin:0;padding:0;" bgcolor="#f5f3ef">
    <!--[if mso]>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f5f3ef">
        <tr>
          <td align="center" style="padding:24px 0;">
            <table
              cellpadding="0"
              cellspacing="0"
              border="0"
              width="600"
              bgcolor="#ffffff"
              style="border:1px solid #e8e4dc;"
            >
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="padding:24px 24px 20px;">
                  <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                    [THC] Chiller &amp; Killer
                  </h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#999999;font-family:Arial,sans-serif;">
                    [THC] Chiller & Killer Community Platform
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:24px 24px 0;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Dein Anmelde-Link
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Klicke auf den Button, um dich bei [THC] Chiller & Killer anzumelden. Dieser Link kann nur einmal
                    verwendet werden.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Bei [THC] Chiller & Killer anmelden</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    Falls du diese Anmeldung nicht angefordert hast, ignoriere diese E-Mail.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:0 24px;">
                  <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;font-family:Arial,sans-serif;">
                    Your Login Link
                  </h2>
                  <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#333333;font-family:Arial,sans-serif;">
                    Click the button to log in to [THC] Chiller & Killer. This link can only be used once.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" bgcolor="#ffffff" style="padding:16px 24px 8px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#c8a84e" style="padding:12px 32px;">
                        <a
                          href="{{ .ConfirmationURL }}"
                          style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                          >Log in to [THC] Chiller & Killer</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:8px 24px 0;">
                  <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
                    If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#ffffff" style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td bgcolor="#e8e4dc" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  bgcolor="#ffffff"
                  style="padding:0 24px 24px;font-size:12px;color:#999999;font-family:Arial,sans-serif;"
                >
                  <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                  <p style="margin:4px 0 0;">
                    <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    <![endif]-->

    <!--[if !mso]><!-->
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      bgcolor="#1a1a2e"
      style="background-color:#1a1a2e;font-family:Arial,sans-serif;"
    >
      <tr>
        <td align="center" bgcolor="#1a1a2e" style="padding:0;background-color:#1a1a2e;">
          <table
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            style="max-width:600px;color:#e0d8c8;font-family:Arial,sans-serif;"
          >
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:24px 24px 20px;border-bottom:1px solid #2a2a3e;background-color:#1a1a2e;"
              >
                <h1 style="margin:0;font-size:22px;color:#c8a84e;font-family:Arial,sans-serif;">
                  [THC] Chiller &amp; Killer
                </h1>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8a9a;">[THC] Chiller & Killer Community Platform</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:24px 24px 0;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Dein Anmelde-Link</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Klicke auf den Button, um dich bei [THC] Chiller & Killer anzumelden. Dieser Link kann nur einmal
                  verwendet werden.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Bei [THC] Chiller & Killer anmelden</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">
                  Falls du diese Anmeldung nicht angefordert hast, ignoriere diese E-Mail.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:0 24px;background-color:#1a1a2e;">
                <h2 style="font-size:18px;color:#c8a84e;margin:0 0 12px;">Your Login Link</h2>
                <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#e0d8c8;">
                  Click the button to log in to [THC] Chiller & Killer. This link can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#1a1a2e" style="padding:16px 24px 8px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="#c8a84e" style="padding:12px 32px;border-radius:6px;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="color:#1a1a2e;text-decoration:none;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;"
                        >Log in to [THC] Chiller & Killer</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:8px 24px 0;background-color:#1a1a2e;">
                <p style="margin:0;font-size:12px;color:#6a6a7a;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#1a1a2e" style="padding:20px 24px;background-color:#1a1a2e;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td bgcolor="#2a2a3e" height="1" style="font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td
                align="center"
                bgcolor="#1a1a2e"
                style="padding:0 24px 24px;font-size:12px;color:#6a6a7a;background-color:#1a1a2e;"
              >
                <p style="margin:0;">[THC] Chiller &amp; Killer &bull; [THC] Chiller & Killer Platform</p>
                <p style="margin:4px 0 0;">
                  <a href="{{ .SiteURL }}" style="color:#c8a84e;text-decoration:none;">totalchiller.de</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </body>
</html>
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

### Dual-Theme Design

Each template contains two complete versions of the email content:

| Property      | Outlook (light)            | Modern clients (dark)  |
| ------------- | -------------------------- | ---------------------- |
| Page bg       | `#f5f3ef` (warm off-white) | `#1a1a2e` (dark navy)  |
| Card bg       | `#ffffff` (white)          | `#1a1a2e` (dark navy)  |
| Header bg     | `#1a1a2e` (dark)           | `#1a1a2e` (dark)       |
| Headings      | `#c8a84e` (gold)           | `#c8a84e` (gold)       |
| Body text     | `#333333` (dark)           | `#e0d8c8` (cream)      |
| Muted text    | `#666666` (gray)           | `#8a8a9a` (light gray) |
| Button bg     | `#c8a84e` (gold)           | `#c8a84e` (gold)       |
| Button text   | `#ffffff` (white)          | `#1a1a2e` (dark)       |
| Step badge bg | `#f5eed8` (light gold)     | `#3d3628` (dark gold)  |
| Divider       | `#e8e4dc` (light)          | `#2a2a3e` (dark)       |
| Footer text   | `#999999`                  | `#6a6a7a`              |

### How It Works

- **`<!--[if mso]> ... <![endif]-->`** — Content inside this block is ONLY rendered by Outlook (MSO = Microsoft Office). All other email clients ignore it.
- **`<!--[if !mso]><!--> ... <!--<![endif]-->`** — Content inside this block is rendered by ALL clients EXCEPT Outlook. The extra `<!-->` is required for the "downlevel-hidden" syntax to work.
- Classic Outlook cannot reliably render dark backgrounds on table cells, so it gets a clean white-card design with the same gold accents.
- Modern clients (Gmail, Apple Mail, Thunderbird, webmail, mobile) get the full dark theme with rounded corners.

### Notes

- Both German and English are included in every template since Supabase does not support per-user language selection
- German appears first (as the platform default language)
- The header banner (`#1a1a2e` with gold text) renders consistently across both themes
- The "Confirm signup" and "Invite user" templates include the game-account / clan-assignment next steps
- After confirming their email, users are redirected to the login page (not directly to profile)
- The login page (`app/auth/login/page.tsx`) detects first-time users (no game accounts) and automatically redirects them to `/profile`
