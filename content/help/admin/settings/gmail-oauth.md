---
id: settings-gmail-oauth
title: Set up Gmail OAuth email delivery
audience: admin
category: settings
order: 9
uiRoute: /admin/settings
uiTab: email
relatedComponents: [GmailOAuthSettings.vue, EmailTemplatesSection.vue]
sources: []
keywords: [Gmail, OAuth, Google, email, credentials, client ID, token]
---

# Set Up Gmail OAuth Email Delivery

Connect a Google account for sending email using OAuth, so you don't need to store a password.

## Where to find it

> Settings → Email Settings → Gmail OAuth section

First, make sure **Gmail OAuth** is selected as your [email provider](email-provider.md).

## Prerequisites

You need a **Google Cloud OAuth Client ID and Secret**. If you haven't created these yet, follow the [Google OAuth credentials guide](https://console.cloud.google.com/apis/credentials) — you'll need to enable the Gmail API and set the redirect URI to match your app's URL.

## Steps

1. Click **Configure** (or **Edit** if already set up).
2. Enter your **Client ID**, **Client Secret**, and **Redirect URI**.
3. Click **Save**.
4. Once saved, each instructor can connect their own Google account from their Availability tab.

## View connected accounts

Below the configuration, you'll see a list of instructors who have connected their Google accounts, along with their token status (Active or Token Missing).

A "Token Missing" status means the instructor needs to reconnect their account.

## Notes

- The Redirect URI must exactly match what is registered in your Google Cloud project.
- OAuth credentials here are shared with the Google Calendar integration if you're using the OAuth calendar method.
- Removing credentials will disconnect all instructor accounts.
