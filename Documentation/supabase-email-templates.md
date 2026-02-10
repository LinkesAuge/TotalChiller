# Supabase Email Templates

These email templates must be configured in the **Supabase Dashboard** under:

**Authentication → Email Templates**

The app cannot set these programmatically. Copy the HTML below into the corresponding template slot in the dashboard.

> **Important:** The `{{ .ConfirmationURL }}` variable is provided by Supabase and already includes the redirect to `/profile` (configured in the registration code via `emailRedirectTo`).

---

## Confirm Signup (Bilingual DE/EN)

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
      Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail-Adresse, um fortzufahren.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        E-Mail bestätigen &amp; zum Profil
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
          <span style="color: #8a8a9a;"
            >Klicke auf den Button oben. Du wirst direkt zu deinem Profil weitergeleitet.</span
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
  </div>

  <!-- DIVIDER -->
  <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 28px 0;" />

  <!-- ENGLISH -->
  <div>
    <h2 style="font-size: 18px; color: #c8a84e; margin: 0 0 12px;">Welcome to TotalChiller!</h2>
    <p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">
      Your account has been created. Please confirm your email address to continue.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; padding: 12px 32px; background-color: #c8a84e; color: #1a1a2e; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;"
      >
        Confirm Email &amp; Go to Profile
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
          <span style="color: #8a8a9a;">Click the button above. You will be redirected to your profile.</span>
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
3. Select the **Confirm Signup** template
4. Set the **Subject** field to the subject above
5. Paste the **HTML Body** into the template body
6. Click **Save**

### Template Variables

| Variable                 | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `{{ .ConfirmationURL }}` | The full confirmation URL including redirect to `/profile` |
| `{{ .SiteURL }}`         | The site URL configured in Supabase project settings       |

### Notes

- The email redirect goes to `/auth/callback?next=/profile` (configured in `app/auth/register/page.tsx`)
- After clicking the link, the user is logged in and taken directly to their profile page
- Both German and English are included in a single template since Supabase does not support per-user language selection for email templates
- The gold color (`#c8a84e`) and dark background (`#1a1a2e`) match the TotalChiller platform theme
