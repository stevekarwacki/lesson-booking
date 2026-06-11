# In-App Help System

An admin-only help system that serves Markdown content via an Express API and renders it inside the Vue application. Admins access it via the `HelpCircle` icon in the NavBar, which links to a context-aware landing article based on the current route.

## Architecture overview

```
/content/help/admin/     ← Markdown source files (not bundled into frontend)
routes/help.js           ← Express API: serves manifest + articles
useHelp.js               ← Vue Query composable: fetches and caches help data
HelpViewer.vue           ← UI: sidebar nav + article pane
HelpPage.vue             ← Route view: wraps HelpViewer
NavBar.vue               ← Entry point: context-aware HelpCircle icon
```

## Content structure

```
/content/help/admin/
  index.md                    ← Admin overview (category: admin, slug: index)
  _template.md                ← Article template (not served)
  _route-map.json             ← Route → landing article map (not served)
  users/
    overview.md               ← Landing article for /admin/users
    create-users.md
    ...
  settings/
    overview.md               ← Landing article for /admin/settings
    smtp.md
    ...
  bookings/
    overview.md               ← Landing article for /calendar
    ...
  packages/
    manage-packages.md        ← Landing article for /admin/packages
```

Files prefixed with `_` are excluded from the manifest and not served.

**Routing is filesystem-derived.** The article's `category` in the URL comes from its parent directory name; the `slug` comes from the filename (without `.md`). Frontmatter `category` is used only for sidebar grouping and does not affect routing.

## Backend API (`routes/help.js`)

Mounted at `/api/help` with `authMiddleware` + `adminMiddleware` in `app.js`. All endpoints require an admin JWT.

### `GET /api/help`

Returns the full article manifest and the route map.

**Response:**
```json
{
  "articles": [
    {
      "id": "users-create",
      "title": "Create a new user account",
      "category": "users",
      "slug": "create-users",
      "order": 1,
      "uiRoute": "/admin/users",
      "keywords": ["create", "add", "new user"]
    }
  ],
  "routeMap": {
    "/admin/users":    { "category": "users",    "slug": "overview" },
    "/admin/packages": { "category": "packages", "slug": "manage-packages" },
    "/admin/settings": { "category": "settings", "slug": "overview" },
    "/calendar":       { "category": "bookings", "slug": "overview" }
  }
}
```

Articles are sorted by `order` ascending. `routeMap` is loaded from `_route-map.json`; returns `{}` if the file is missing.

### `GET /api/help/:category/:slug`

Returns a single article with rendered HTML body.

**Response:**
```json
{
  "article": {
    "id": "users-create",
    "title": "Create a new user account",
    "html": "<h1>Create a new user account</h1>...",
    "...frontmatter fields"
  }
}
```

`category` `admin` resolves to the root `CONTENT_DIR` (for `index.md`). All other categories resolve to `CONTENT_DIR/:category/:slug.md`.

Relative `.md` links in article content are rewritten to `/help/:category/:slug` app routes by `rewriteLinks()` before the HTML is returned. Same-directory links use the current article's category; cross-directory links (e.g. `../settings/smtp.md`) resolve from path segments.

**Error responses:** `400` path traversal attempt · `404` article not found · `500` render failure.

## Frontend composable (`useHelp.js`)

Located at `frontend/src/composables/useHelp.js`. Two exports:

### `useHelp()`

Fetches the manifest. Only enabled for admin users (`isAdmin && token`). Stale time: 10 minutes.

**Returns:**
| Field | Type | Description |
|---|---|---|
| `articles` | `Ref<Array\|null>` | Flat array of all article metadata |
| `routeMap` | `Ref<Object>` | Route → `{ category, slug }` map |
| `articlesByCategory` | `ComputedRef<Object>` | Articles grouped by category |
| `isLoadingManifest` | `Ref<boolean>` | |
| `isManifestError` | `Ref<boolean>` | |
| `refetchManifest` | `Function` | |
| `getByRoute(path)` | `Function` | Returns the landing article for a given app route, or `null` |
| `search(query)` | `Function` | OR-logic keyword search across title and keywords |

`getByRoute()` uses `routeMap` for an explicit lookup — it does not filter by `uiRoute` frontmatter. To add a new page mapping, update `_route-map.json`.

`search()` splits the query on whitespace and matches any term (OR logic) against article `title` and `keywords`.

### `useHelpArticle(category, slug)`

Fetches a single article. `category` and `slug` accept plain values, Vue `ref` objects, or getter functions.

**Returns:** `{ article, isLoadingArticle, isArticleError, articleError, refetchArticle }`

## Route map (`_route-map.json`)

Maps each admin app route to its designated landing article. This is the single source of truth for contextual help — the NavBar help icon uses this to deep-link to the most relevant article for the current page.

Update this file when:
- A new admin page is added → add an entry
- A route path changes → update the key
- The preferred landing article for a page changes → update `category`/`slug`

## Vue Router

Help routes in `frontend/src/router/index.js`:

| Path | Name | Guard |
|---|---|---|
| `/help` | `help` | `requiresAuth` + `manage User` |
| `/help/:category/:slug` | `help-article` | `requiresAuth` + `manage User` |

Both use `HelpPage.vue` as the component. The CASL guard (`manage User`) restricts access to admins only.

## Adding content

See `/content/help/admin/_template.md` for the article schema. Key rules:
- Filename must be kebab-case (becomes the URL slug)
- Place in the correct category subdirectory (becomes the URL category)
- Use `order: 0` for category overview articles
- Cross-article links use relative `.md` paths; the backend rewrites them automatically
