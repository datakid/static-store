# Shelf

Static download store for a set of apps. Versions, files and release notes are read live from each repo's GitHub Releases, so publishing a release updates the site with no redeploy.

## Entry
- `index.html` — the whole store
- `#/<app-id>` opens an app, `#/<app-id>/<tag>` opens a specific version (shareable)

## Add an app
One line in `js/apps.js`:

```js
{ id: 'my-app', name: 'My App', repo: 'owner/repo', platforms: ['windows', 'linux'], soon: ['macos'], hue: 120, about: 'Optional text' }
```

- `platforms` / `soon`: `android`, `windows`, `linux`, `macos`
- `hue`: 0–360, optional (derived from `id` if omitted)
- `about`: optional, falls back to the GitHub repo description
- Store name: `name` at the top of the same file

## Features
- Search across app names, descriptions, platforms and version tags (`/` to focus, arrows to move, `Esc` to clear or close)
- Platform filter, generated from the app list
- Per app: version list, Stable / Pre-release filter, version filter when there are more than 6
- Files grouped by platform from their filenames; the visitor's OS is offered first
- One-click latest download on each row
- Light and dark theme

## Data
- Source: `api.github.com/repos/<repo>` and `/releases` (public, no key)
- Cached in `localStorage` for 15 minutes with ETag revalidation; unauthenticated GitHub limit is 60 requests per hour per visitor IP
- Repos must be public and releases need attached binaries to show downloads
