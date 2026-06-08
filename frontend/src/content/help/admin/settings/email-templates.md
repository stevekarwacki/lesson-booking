---
id: settings-email-templates
title: Customize email templates
audience: admin
category: settings
order: 10
uiRoute: /admin/settings
uiTab: email
relatedComponents: [EmailTemplatesSection.vue]
sources: []
keywords: [email, templates, subject, body, variables, test email, reset, customize]
---

# Customize Email Templates

Edit the content of the automated emails the app sends — booking confirmations, reminders, payment receipts, and more.

## Where to find it

> Settings → Email Settings (scroll down to the templates list)

## Browse templates

The templates list shows all available email types with their category, the number of dynamic variables available, when they were last updated, and a "Modified" badge if the template has been customized.

## Edit a template

1. Click on a template to open the editor.
2. Update the **Subject** line and/or the **Body** content.
3. To insert a dynamic variable (e.g. the student's name or lesson date), open the variables sidebar and click any variable to insert it at your cursor position.
4. Click **Save**.

## Send a test email

After saving, click **Send Test Email** to send a preview to your admin email address.

## Reset a template

Click **Reset to Default** to restore the original template content. Any customizations will be lost.

## Notes

- Variables use `{{ variableName }}` syntax — take care not to break the formatting when editing around them.
- Sending test emails requires a working [email provider](email-provider.md) to be configured.
- Only templates marked "Modified" differ from the defaults.
