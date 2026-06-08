---
id: settings-storage
title: Configure file storage
audience: admin
category: settings
order: 6
uiRoute: /admin/settings
uiTab: advanced
relatedComponents: [StorageSection.vue, AdvancedSettingsSection.vue]
sources: []
keywords: [storage, files, uploads, DigitalOcean Spaces, local, cloud, CDN]
---

# Configure File Storage

Choose where uploaded files (such as your logo) are stored — on the server itself, or in a DigitalOcean Spaces bucket.

## Where to find it

> Settings → Advanced Settings → Storage Configuration

## Local storage (default)

Files are saved on the server's filesystem. No extra setup required.

To switch to local storage, select **Local Storage** from the dropdown. It saves immediately.

## DigitalOcean Spaces

Files are stored in a cloud bucket with optional CDN support.

**Before you start:** your server must have `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY` set as environment variables. Contact your server administrator if these aren't configured.

1. Select **DigitalOcean Spaces** from the dropdown.
2. Fill in:
   - **Spaces Endpoint** — e.g. `sfo3.digitaloceanspaces.com`
   - **Region** — must match the endpoint, e.g. `sfo3`
   - **Bucket Name** — the bucket must already exist in your Spaces account
   - **CDN URL** (optional) — a custom CDN URL for faster file delivery
3. Click **Test Connection** to verify the bucket is reachable.
4. Click **Save Configuration**.

## Notes

- The access key credentials cannot be entered here — they must be set on the server.
- Switching storage types does not migrate existing files. Uploaded files before the switch remain where they were.
