# Supabase Email Templates

These email templates must be configured in the **Supabase Dashboard** under:

**Authentication → Email Templates**

The app cannot set these programmatically. Copy the HTML below into the corresponding template slot in the dashboard.

> **Important:** The `{{ .ConfirmationURL }}` variable is provided by Supabase and already includes any redirect configured in the application code.

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
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #1a1a2e; color: #e0d8c8; border-radius: 8px;"
>
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2a2a3e;">
    <h1 style="margin: 0; font-size: 22px; color: #c8a84e;">[THC] Chiller &amp; Killer</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
  </div>

  <!-- GERMAN -->
  <div style="margin-top: 24px;">
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Willkommen bei TotalChiller!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        E-Mail bestätigen
      </a>
    </div>

    <h3 style="font-size: 15px; color: #c8a84e; margin: 20px 0 10px;">Nächste Schritte:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >1</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>E-Mail bestätigen</strong><br />
          <span style="color: #8a8a9a;">Klicke auf den Button oben, um dein Konto zu aktivieren.</span>
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >2</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Einloggen</strong><br />
          <span style="color: #8a8a9a;"
            >Melde dich mit deinen Zugangsdaten an. Beim ersten Login wirst du automatisch zu deinem Profil
            weitergeleitet.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >3</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Spielkonto anlegen</strong><br />
          <span style="color: #8a8a9a;"
            >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen hinzufügst.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >4</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Clan-Zuweisung abwarten</strong><br />
          <span style="color: #8a8a9a;"
            >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24–48 Stunden.</span
          >
        </td>
      </tr>
    </table>
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Welcome to TotalChiller!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Your account has been created. Please confirm your email address to activate your account.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Confirm Email
      </a>
    </div>

    <h3 style="font-size: 15px; color: #c8a84e; margin: 20px 0 10px;">Next Steps:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >1</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Confirm your email</strong><br />
          <span style="color: #8a8a9a;">Click the button above to activate your account.</span>
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >2</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Log in</strong><br />
          <span style="color: #8a8a9a;"
            >Sign in with your credentials. On your first login you will be redirected to your profile
            automatically.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >3</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Create a game account</strong><br />
          <span style="color: #8a8a9a;"
            >In your profile, add your Total Battle player name to create a game account.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >4</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Wait for clan assignment</strong><br />
          <span style="color: #8a8a9a;"
            >An administrator will assign you to a clan. This typically takes 24–48 hours.</span
          >
        </td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div
    style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a3e; text-align: center; font-size: 12px; color: #6a6a7a;"
  >
    <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
    <p style="margin: 4px 0 0;">
      <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
    </p>
  </div>
</div>
```

---

## 2. Reset Password

**Subject:** TotalChiller – Passwort zurücksetzen / Reset Your Password

**HTML Body:**

```html
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #1a1a2e; color: #e0d8c8; border-radius: 8px;"
>
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2a2a3e;">
    <h1 style="margin: 0; font-size: 22px; color: #c8a84e;">[THC] Chiller &amp; Killer</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
  </div>

  <!-- GERMAN -->
  <div style="margin-top: 24px;">
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Passwort zurücksetzen</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues
      Passwort zu erstellen.
    </p>
    <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px;">
      Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Neues Passwort erstellen
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      Dieser Link ist aus Sicherheitsgründen nur für begrenzte Zeit gültig.
    </p>
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Reset Your Password</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      You requested a password reset for your TotalChiller account. Click the button below to create a new password.
    </p>
    <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px;">
      If you did not request this, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Create New Password
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      This link is valid for a limited time for security reasons.
    </p>
  </div>

  <!-- Footer -->
  <div
    style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a3e; text-align: center; font-size: 12px; color: #6a6a7a;"
  >
    <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
    <p style="margin: 4px 0 0;">
      <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
    </p>
  </div>
</div>
```

---

## 3. Change Email Address

**Subject:** TotalChiller – E-Mail-Adresse bestätigen / Confirm Your New Email Address

**HTML Body:**

```html
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #1a1a2e; color: #e0d8c8; border-radius: 8px;"
>
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2a2a3e;">
    <h1 style="margin: 0; font-size: 22px; color: #c8a84e;">[THC] Chiller &amp; Killer</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
  </div>

  <!-- GERMAN -->
  <div style="margin-top: 24px;">
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">E-Mail-Adresse ändern</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Du hast eine Änderung deiner E-Mail-Adresse für dein TotalChiller-Konto angefordert. Bitte bestätige die neue
      Adresse, indem du auf den Button unten klickst.
    </p>
    <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px;">
      Falls du diese Änderung nicht angefordert hast, kannst du diese E-Mail ignorieren. Deine E-Mail-Adresse bleibt
      unverändert.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Neue E-Mail-Adresse bestätigen
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      Dieser Link ist aus Sicherheitsgründen nur für begrenzte Zeit gültig.
    </p>
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Change Email Address</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      You requested to change the email address associated with your TotalChiller account. Please confirm your new
      address by clicking the button below.
    </p>
    <p style="margin: 0 0 4px; line-height: 1.6; font-size: 14px;">
      If you did not request this change, you can safely ignore this email. Your email address will remain unchanged.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Confirm New Email Address
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      This link is valid for a limited time for security reasons.
    </p>
  </div>

  <!-- Footer -->
  <div
    style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a3e; text-align: center; font-size: 12px; color: #6a6a7a;"
  >
    <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
    <p style="margin: 4px 0 0;">
      <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
    </p>
  </div>
</div>
```

---

## 4. Invite User

Used when an admin creates a new user via the admin panel (`/api/admin/create-user`).

**Subject:** TotalChiller – Du wurdest eingeladen! / You've Been Invited!

**HTML Body:**

```html
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #1a1a2e; color: #e0d8c8; border-radius: 8px;"
>
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2a2a3e;">
    <h1 style="margin: 0; font-size: 22px; color: #c8a84e;">[THC] Chiller &amp; Killer</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
  </div>

  <!-- GERMAN -->
  <div style="margin-top: 24px;">
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Du wurdest eingeladen!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Ein Administrator hat ein Konto für dich auf der TotalChiller-Plattform erstellt. Klicke auf den Button unten, um
      deine Einladung anzunehmen und dein Passwort festzulegen.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Einladung annehmen
      </a>
    </div>

    <h3 style="font-size: 15px; color: #c8a84e; margin: 20px 0 10px;">Nächste Schritte:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >1</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Passwort festlegen</strong><br />
          <span style="color: #8a8a9a;"
            >Klicke auf den Button oben und erstelle ein sicheres Passwort für dein Konto.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >2</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Spielkonto anlegen</strong><br />
          <span style="color: #8a8a9a;"
            >Erstelle in deinem Profil ein Spielkonto, indem du deinen Total-Battle-Spielernamen hinzufügst.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >3</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Clan-Zuweisung abwarten</strong><br />
          <span style="color: #8a8a9a;"
            >Ein Administrator wird dich einem Clan zuweisen. Dies dauert in der Regel 24–48 Stunden.</span
          >
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 12px; color: #6a6a7a;">
      Dieser Link ist aus Sicherheitsgründen nur für begrenzte Zeit gültig.
    </p>
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">You've Been Invited!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      An administrator has created an account for you on the TotalChiller platform. Click the button below to accept
      your invitation and set your password.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Accept Invitation
      </a>
    </div>

    <h3 style="font-size: 15px; color: #c8a84e; margin: 20px 0 10px;">Next Steps:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >1</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Set your password</strong><br />
          <span style="color: #8a8a9a;">Click the button above and create a secure password for your account.</span>
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >2</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Create a game account</strong><br />
          <span style="color: #8a8a9a;"
            >In your profile, add your Total Battle player name to create a game account.</span
          >
        </td>
      </tr>
      <tr>
        <td style="vertical-align: top; padding: 6px 10px 6px 0; width: 28px;">
          <span
            style="display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background-color: rgba(200,168,78,0.2); color: #c8a84e; font-weight: bold; font-size: 13px;"
            >3</span
          >
        </td>
        <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">
          <strong>Wait for clan assignment</strong><br />
          <span style="color: #8a8a9a;"
            >An administrator will assign you to a clan. This typically takes 24–48 hours.</span
          >
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 12px; color: #6a6a7a;">
      This link is valid for a limited time for security reasons.
    </p>
  </div>

  <!-- Footer -->
  <div
    style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a3e; text-align: center; font-size: 12px; color: #6a6a7a;"
  >
    <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
    <p style="margin: 4px 0 0;">
      <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
    </p>
  </div>
</div>
```

---

## 5. Magic Link

> **Note:** Magic Link login is not currently used in the app. This template is included for completeness in case it is enabled in the future.

**Subject:** TotalChiller – Anmelde-Link / Your Login Link

**HTML Body:**

```html
<div
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #1a1a2e; color: #e0d8c8; border-radius: 8px;"
>
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #2a2a3e;">
    <h1 style="margin: 0; font-size: 22px; color: #c8a84e;">[THC] Chiller &amp; Killer</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #8a8a9a;">TotalChiller Community Platform</p>
  </div>

  <!-- GERMAN -->
  <div style="margin-top: 24px;">
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Dein Anmelde-Link</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Klicke auf den Button unten, um dich bei TotalChiller anzumelden. Dieser Link kann nur einmal verwendet werden.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Bei TotalChiller anmelden
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.
    </p>
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Your Login Link</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Click the button below to log in to TotalChiller. This link can only be used once.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Log in to TotalChiller
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #6a6a7a;">
      If you did not request this login, you can safely ignore this email.
    </p>
  </div>

  <!-- Footer -->
  <div
    style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #2a2a3e; text-align: center; font-size: 12px; color: #6a6a7a;"
  >
    <p style="margin: 0;">[THC] Chiller &amp; Killer &bull; TotalChiller Platform</p>
    <p style="margin: 4px 0 0;">
      <a href="{{ .SiteURL }}" style="color: #c8a84e; text-decoration: none;">totalchiller.de</a>
    </p>
  </div>
</div>
```

---

## Setup Instructions

1. Go to the **Supabase Dashboard** for the project
2. Navigate to **Authentication → Email Templates**
3. For each template type (Confirm signup, Reset password, Change email, Invite user, Magic link):
   - Select the corresponding tab
   - Set the **Subject** field
   - Paste the **HTML Body** from the matching section above
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

| Token         | Value                  | Usage                |
| ------------- | ---------------------- | -------------------- |
| Background    | `#1a1a2e`              | Email body           |
| Text          | `#e0d8c8`              | Primary text         |
| Gold accent   | `#c8a84e`              | Headings, buttons    |
| Muted text    | `#8a8a9a`              | Secondary text       |
| Faint text    | `#6a6a7a`              | Footer, disclaimers  |
| Divider       | `#2a2a3e`              | Horizontal rules     |
| Step badge bg | `rgba(200,168,78,0.2)` | Numbered step circle |

### Notes

- Both German and English are included in every template since Supabase does not support per-user language selection
- German appears first (as the platform default language)
- The gold/dark theme matches the TotalChiller platform
- The "Confirm signup" and "Invite user" templates include the game-account / clan-assignment next steps; the others do not since they are for existing users
- After confirming their email, users are redirected to the login page (not directly to profile)
- The login page (`app/auth/login/page.tsx`) detects first-time users (no game accounts) and automatically redirects them to `/profile`
