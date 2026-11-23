**Shelf**  
Static download store. Apps, versions, platforms, files and descriptions are read live from GitHub, so publishing a release anywhere under a listed owner updates the store with no edit and no redeploy.  
**Entry**  
- `index.html` — the whole store  
- `#/<app-id>` opens an app, `#/<app-id>/<tag>` opens a specific version (shareable)  
- `<app-id>` is the repo name in lower case; a unique prefix also works  
**What is dynamic**  
- Apps: every public, non-fork, non-archived repo of each owner that has at least one release, newest release first  
- Platforms: read from the file names of each release (Windows, Linux, macOS, Android, iOS)  
- Description: first sentence of the repo's GitHub "About" line, capped at 80 characters; empty if the repo has none  
- Name: repo name in title case  
**Config (**`js/apps.js`**)**  
- `name` — store name  
- `owners` — GitHub users or organisations to list  
- `repos` — extra `owner/repo` entries from other accounts  
- `hide` — `owner/repo` entries to leave out  
- `tune` — optional per-repo overrides: `{ name, about, hue }` (`hue` 0–360, otherwise derived from the id)  
**Features**  
- Search across names, descriptions, platforms and version tags (`/` to focus, arrows to move, `Esc` to clear or close)  
- Platform filter built from what the releases actually contain  
- Per app: version list, Stable / Pre-release filter, version filter above 6 versions  
- One-click latest download on a row when the target platform is unambiguous  
- Detect my system: off by default; when on it reads the browser's platform locally to put matching files first, and the result is never transmitted  
- Theme follows the system; the header button cycles Auto / Light / Dark  
- SVG favicon that follows light/dark and the open app's colour  
- No CDN, no web fonts, no third-party scripts  
- Offline: `sw.js` caches the site files and the last GitHub data is kept in `localStorage`  
**Data**  
- Source: `api.github.com` — `/users/<owner>/repos`, `/repos/<repo>`, `/repos/<repo>/releases` (public, no key). These are the only network requests the page makes  
- Cached in `localStorage` for 15 minutes with ETag revalidation; repos without releases are rechecked once a day or when pushed to  
- Unauthenticated GitHub limit is 60 requests per hour per visitor IP; a first visit costs one request per owner plus one per repo  
- Owners with more than 100 repos: only the 100 most recently pushed are scanned  
