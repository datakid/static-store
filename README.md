**Shelf**  
Static download store for Windows, Linux and Android apps. Apps, versions, files and descriptions are read live from GitHub, so publishing a release under a listed owner updates the store with no edit and no redeploy.  
**Entry**  
- `index.html` — store front: featured latest release and the app grid  
- `#/<app-id>` opens an app page, `#/<app-id>/<tag>` opens a specific version (shareable)  
- `<app-id>` is the repo name in lower case; a unique prefix also works  
**What is listed**  
- Owners scanned: `datakid`, `nickburser122` (public, non-fork, non-archived repos)  
- A release is shown only if it has at least one Windows, Linux or Android file; an app is shown only if it has such a release  
- macOS, iOS, checksum and signature files stay downloadable under "Other files" on the release, but never count as a platform  
- Description: first sentence of the repo's GitHub "About" line, capped at 80 characters  
- Name: repo name in title case  
**Config (**`js/apps.js`**)**  
- `name` — store name  
- `owners` — GitHub users or organisations to scan  
- `repos` — extra `owner/repo` entries  
- `hide` — `owner/repo` entries to leave out  
- `tune` — optional per-repo overrides: `{ name, about, hue, icon }` (`hue` 0–360 sets the icon colour, `icon` is an image URL that replaces the generated letter icon)  
**Features**  
- Grid of app cards with generated icons, platform glyphs, latest version and a Get button  
- Featured panel for the most recently released app  
- App page: one download button per platform, version list, Stable / Pre-release filter, release notes, full file list  
- Search across names, descriptions, platforms and version tags (`/` to focus, `Esc` to clear or go back)  
- Platform filter  
- Sync button: rechecks GitHub now, ignoring the 15 minute cache  
- Settings: Auto / Light / Dark theme, Match my device, GitHub token  
- No CDN, no web fonts, no third-party scripts  
- Offline: `sw.js` caches the site files and the last GitHub data is kept in `localStorage`  
**GitHub token**  
- Optional. Raises the GitHub limit from 60 to 5,000 requests an hour  
- A fine-grained token with read-only access to public repositories is enough  
- Stored unencrypted in this browser's `localStorage` under `gh-token` and sent only to `api.github.com`  
- If GitHub rejects it, requests fall back to no token and the footer says so  
**Data**  
- Source: `api.github.com` — `/users/<owner>/repos`, `/repos/<repo>`, `/repos/<repo>/releases`, and `/rate_limit` once when a token is saved  
- `localStorage` keys: `gh:<path>` (cached responses), `theme`, `detect`, `gh-token`  
- Cached for 15 minutes with ETag revalidation; repos without releases are rechecked once a day, when pushed to, or on Sync with a token  
- A first visit costs one request per owner plus one per repo, so two large accounts can use up the 60 an hour without a token  
- Owners with more than 100 repos: only the 100 most recently pushed are scanned  
**Not done**  
- These files are in this project only; they have not been pushed to `datakid/static-store`  
- Only the desktop store front has been rendered and checked; the app page, settings, token and Sync flows and the phone layout are untested  
