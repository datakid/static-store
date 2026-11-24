**Shelf**  
Static download store for Windows, macOS, Linux and Android apps. Apps, versions, files and descriptions are read live from GitHub, so publishing a release under a listed owner updates the store with no edit and no redeploy.  
**Entry**  
- `index.html` — store front: featured release with arrow navigation and the app grid  
- `#/<app-id>` opens an app page, `#/<app-id>/<tag>` opens a specific version (shareable)  
- `<app-id>` is the repo name in lower case; a unique prefix also works  
**What is listed**  
- Owners scanned: `datakid`, `nickburser122` (public, non-fork, non-archived repos)  
- A release is shown only if it has at least one real Windows, macOS, Linux or Android installer (`.exe`, `.msi`, `.msix`, `.dmg`, `.pkg`, `.AppImage`, `.deb`, `.rpm`, `.flatpak`, `.snap`, `.apk`, `.aab`); an app is shown only if it has such a release  
- Archives (`.zip`, `.7z`, `.rar`, `.tar.gz`, `.tgz`, `.xz`, `.bz2`, `.zst`), iOS, checksum and signature files stay downloadable under "Other files" on the release, but never count as a platform, so a zip-only release does not list an app  
- Description: first sentence of the repo's GitHub "About" line, capped at 80 characters  
- Name: repo name in title case  
**Config (**`js/apps.js`**)**  
- `name` — store name  
- `owners` — GitHub users or organisations to scan  
- `repos` — extra `owner/repo` entries  
- `hide` — `owner/repo` entries to leave out  
- `tune` — optional per-repo overrides: `{ name, about, hue, icon, zoom }` (`hue` 0–360 sets the accent colour, `icon` is an image path or URL, `zoom` scales the image inside the icon mask to trim a baked-in border)  
- `tune` keys ignore case and punctuation, so `datakid/ps-tools-`, `datakid/ps-tools` and `datakid/PS_Tools` are the same entry  
**Icons (**`images/`**)**  
- `tacit.jpg` → `nickburser122/tacit`  
- `polars-desktop.jpg` → `datakid/polars-desktop-demo`  
- `duck-bars.jpg` → `datakid/duckbench`  
- `duck-grid.jpg` → `datakid/duckbench-tauri-demo`  
- `contact-flow.jpg` → `datakid/contact-flow`  
- `ps-tools.jpg` → `datakid/ps-tools-` (shows up once that repo publishes a release with a real installer)  
**Features**  
- Grid of app cards with icons, platform glyphs, latest version and a Get button  
- Featured panel with previous / next arrows and a position counter; it steps through the apps left by the platform filter  
- App page: the same arrows move to the previous / next app in the filtered list  
- Left / Right arrow keys do the same on both views when no text field is focused  
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
- The icon-to-app mapping was matched by what each icon depicts, not by file name; the two duck icons may need swapping in `js/apps.js`  
- The macOS glyph and macOS device matching have not been seen with a real macOS release  
- Tacit and PS Tools were not seen rendered: the preview hit GitHub's unauthenticated limit (two 403s) and showed 4 apps, all from `datakid`  
- `tacit.jpg`, `polars-desktop.jpg` and `duck-bars.jpg` were saved from preview copies of the uploads, not the original files; replace them with the originals for full quality  
- Arrow buttons and Left / Right keys were not clicked or pressed in a browser; only their presence and the `1 / 4` counter were checked  
- The app page, settings, token and Sync flows and the phone layout are untested  
