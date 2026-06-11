---
name: update-help-docs
description: >-
  Update or create admin help documentation and technical docs for this
  lesson-booking project. Use when a feature is added or changed that affects
  admin workflows, UI components, API routes, or Vue Query composables. Also
  use when asked to write, edit, or sync help articles, update _route-map.json,
  or update /docs technical documentation.
disable-model-invocation: true
---

# Update Help Documentation

## Content locations

| Type | Path |
|---|---|
| User-facing help articles | `/content/help/admin/` |
| Article template | `/content/help/admin/_template.md` |
| Route map | `/content/help/admin/_route-map.json` |
| Technical docs | `/docs/` |

## When to update what

- **UI workflow or admin page changed** → update or create a help article
- **New admin route added** → add `[category]/overview.md` + entry in `_route-map.json`
- **Route path renamed** → update key in `_route-map.json`
- **API route or composable changed** → update relevant `/docs/` file
- **Help system itself changed** (`routes/help.js`, `useHelp.js`, `HelpViewer.vue`, `_route-map.json`) → update or create `/docs/HELP_SYSTEM.md`

---

## User-facing help articles

### Directory = category, filename = slug

The filesystem drives routing — not frontmatter. The `category` in the URL comes from the parent directory name; the `slug` comes from the filename (without `.md`).

```
/content/help/admin/
  index.md              → /help  (admin overview)
  users/overview.md     → /help/users/overview
  users/create-users.md → /help/users/create-users
  settings/overview.md  → /help/settings/overview
  bookings/overview.md  → /help/bookings/overview
  packages/manage-packages.md → /help/packages/manage-packages
  _template.md          (not served — copy this to start a new article)
  _route-map.json       (not served — maps app routes to landing articles)
```

Allowed category directories: `users` · `settings` · `bookings` · `packages`

### Frontmatter schema

Copy from `_template.md`. All fields required unless marked optional:

```yaml
---
id: category-short-slug        # unique, kebab-case, e.g. users-create
title: Verb-noun task title     # e.g. "Create a new user account"
audience: admin
category: users                 # for sidebar grouping only — routing uses the directory
order: 1                        # sidebar position within category; 0 = overview articles
uiRoute: /admin/users           # app route where this article is relevant
uiTab: account                  # optional: modal tab or settings tab
relatedComponents: []           # Vue component filenames documented
sources: []                     # /docs/*.md files used as source material
keywords: []                    # user search terms
---
```

### Article structure

Follow this structure (sections are optional except the opening sentence):

```markdown
# Title

One sentence: what this does and why an admin would use it.

## Where to find it

> Navigation path → Tab or action

## Steps

1. Numbered steps for procedural tasks.
2. **Bold** UI element names exactly as they appear.

## Notes

- Caveats, limits, permission rules, required fields.
- Use blockquotes for warnings: > **Note:** …

See also: [Related article](relative-slug.md) | [Cross-category](../settings/smtp.md)
```

### Writing conventions

- **Concise.** Admins are capable. Do not over-explain.
- Titles: verb-noun. "Create a new user account" not "How to Create a New User Account"
- Reference UI elements exactly as labelled in the interface
- Cross-article links use relative `.md` paths — the backend rewrites them to app routes
- No raw HTML, Vue components, or custom markdown extensions
- No emoji unless the UI itself uses them

### Category overview articles

Each admin page has one `overview.md` with `order: 0`. It orients the user on what the page does and links to all related how-tos. If a new admin page is added, create the overview first.

### Updating `_route-map.json`

Single source of truth mapping app routes to landing articles. Update whenever a route is added or renamed, or the designated landing article changes.

```json
{
  "/admin/users":    { "category": "users",    "slug": "overview" },
  "/admin/packages": { "category": "packages", "slug": "manage-packages" },
  "/admin/settings": { "category": "settings", "slug": "overview" },
  "/calendar":       { "category": "bookings", "slug": "overview" }
}
```

---

## Technical documentation (`/docs/`)

Check existing files before creating a new one — the relevant doc usually exists.

| Change | Doc to update |
|---|---|
| New/changed API route | Feature doc closest to the change (e.g. `USER_MANAGEMENT_FLOW.md`) |
| New composable or changed return shape | `VUE_QUERY_PATTERN.md` or feature doc |
| Help system changes | `/docs/HELP_SYSTEM.md` (create if missing) |
| CASL permission changes | `CASL_PERMISSIONS_GUIDE.md` |
| New integration | Existing guide or new `[FEATURE]_FEATURE.md` |

> `SYSTEM_EMAIL_OAUTH_FEATURE.md` documents an **unimplemented proposal** — do not treat it as a source of truth.

Write for developers and future AI agents: explicit file paths, function names, env var names, request/response shapes. Explain the "why", not just the "what". No user-facing onboarding prose.

---

## Completion output

After changes, summarise:
- **User docs updated/created:** list files
- **`_route-map.json` updated:** yes/no
- **Tech docs updated/created:** list files
