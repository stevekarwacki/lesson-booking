---
id: settings-email-provider
title: Choose how the system sends email
audience: admin
category: settings
order: 7
uiRoute: /admin/settings
uiTab: email
relatedComponents: [EmailTemplatesSection.vue, EmailProviderSettings.vue]
sources: [docs/SMTP_CONFIGURATION_GUIDE.md]
keywords: [email, SMTP, Gmail, OAuth, provider, notifications, disabled]
---

# Choose How the System Sends Email

The app sends automated emails for booking confirmations, payment receipts, reminders, and more. This setting controls which delivery method is used.

## Where to find it

> Settings → Email Settings (top of the page)

## Options

| Method | Best for |
|---|---|
| **SMTP** | Any email provider — Gmail, Outlook, your own mail server |
| **Gmail OAuth** | Connecting a Google account without storing a password |
| **Disabled** | Turning off automated email entirely |

Select a method and it saves immediately. The relevant configuration section will appear below.

## Next steps

- **SMTP selected:** see [Set up SMTP email delivery](smtp.md)
- **Gmail OAuth selected:** see [Set up Gmail OAuth email delivery](gmail-oauth.md)

## Notes

- If no method is configured, the app will still work normally — it simply won't send emails.
- Only one method is active at a time.
