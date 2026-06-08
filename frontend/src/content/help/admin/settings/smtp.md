---
id: settings-smtp
title: Set up SMTP email delivery
audience: admin
category: settings
order: 8
uiRoute: /admin/settings
uiTab: email
relatedComponents: [SMTPSettingsSection.vue, EmailTemplatesSection.vue]
sources: [docs/SMTP_CONFIGURATION_GUIDE.md]
keywords: [SMTP, email, host, port, username, password, connection, test]
---

# Set Up SMTP Email Delivery

Configure an SMTP server so the app can send automated emails. Works with Gmail, Outlook, and most email providers.

## Where to find it

> Settings → Email Settings → SMTP configuration section

First, make sure **SMTP** is selected as your [email provider](email-provider.md).

## Steps

1. Click **Configure SMTP** (or **Edit** if already configured).
2. Fill in your SMTP details:
   - **Host** — your mail server, e.g. `smtp.gmail.com`
   - **Port** — `465` (SSL) or `587` (TLS) are most common
   - **Username** — usually your email address
   - **Password** — your email password or app-specific password
   - **From Name** (optional) — the display name on outgoing emails
   - **From Address** (optional) — the sender email address
3. Click **Save Configuration**.
4. Click **Test Connection** to send a test email to your admin address.

## Gmail setup

Gmail requires an App Password if your account has 2-Step Verification enabled.

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. Generate a password for "Mail."
3. Use that 16-character password in the Password field above.
4. Use `smtp.gmail.com`, port `465`.

## Notes

- Your password is encrypted before being stored.
- The Test Connection button sends a real email to your admin address — check your inbox to confirm it arrives.
- To remove the configuration entirely, click **Delete**.
