---
id: settings-calendar-service-account
title: Configure a Google service account for calendar sync
audience: admin
category: settings
order: 12
uiRoute: /admin/settings
uiTab: calendar
relatedComponents: [ServiceAccountSettings.vue, CalendarSettingsSection.vue]
sources: [docs/GOOGLE_CALENDAR_INTEGRATION.md, docs/GET_GOOGLE_OAUTH_CREDENTIALS.md]
keywords: [service account, Google Calendar, credentials, private key, sync, instructor]
---

# Configure a Google Service Account for Calendar Sync

The service account is a Google identity that the app uses to read instructor calendars. Instructors share their calendar with the service account — no individual Google sign-in required.

## Where to find it

> Settings → Calendar Settings → Service Account section

Make sure **Service Account** is selected as your [calendar method](calendar-integration.md) first.

## Create the service account (one-time Google setup)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and open or create a project.
2. Enable the **Google Calendar API** for the project.
3. Go to **IAM & Admin → Service Accounts** and create a new service account.
4. On the service account, create a **JSON key** and download it.

The JSON file contains the `client_email` and `private_key` you'll need in the next step.

## Enter credentials in the app

1. Click **Configure** (or **Edit**) in the Service Account section.
2. Paste the **Service Account Email** (`client_email` from the JSON file).
3. Paste the **Private Key** (`private_key` from the JSON file, including the `-----BEGIN...` and `-----END...` lines).
4. Click **Save**.

The private key is encrypted before being stored.

## Set up each instructor

Once the service account is configured, go to each instructor's profile:

> Users → find instructor → Manage → Availability tab → Google Calendar Integration

The card shows the service account email and step-by-step instructions for the instructor to share their Google Calendar with it. After sharing, they paste their Calendar ID and click **Save Settings**, then **Test Connection**.

## Notes

- The JSON key file should be kept secure and not shared. You only need the two values above.
- If an instructor's sync shows "Failed" in the Calendar Settings overview, they likely haven't shared their calendar with the service account email, or the Calendar ID is incorrect.
- To remove the service account credentials, click **Delete**.
