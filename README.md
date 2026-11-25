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
- Description: first sentence of the repo's GitHub "About" line, capped at 64 characters, or `tune.about`  
- Name: repo name in title case, or `tune.name`
- `tune.about` is the one-line card text, `tune.more` the full description on the app page, `tune.stack` and `tune.engine` show as technology chips and are searchable  
**Config (**`js/apps.js`**)**  
- `name` — store name  
- `owners` — GitHub users or organisations to scan  
- `repos` — extra `owner/repo` entries  
- `hide` — `owner/repo` entries to leave out  
- `makers` — `{ user, tag }` entries shown as profile links in the footer and as the "by" link on app pages (`datakid` Main, `nickburser122` Alt)
- `tune` — optional per-repo overrides: `{ name, about, more, stack, engine, hue, icon, zoom }` (`hue` 0–360 sets the accent colour, `icon` is a key in `js/icons.js` or an image path / URL, `zoom` scales an image icon inside its tile)  
- `tune` keys ignore case and punctuation, so `datakid/ps-tools-`, `datakid/ps-tools` and `datakid/PS_Tools` are the same entry  
**Icons (**`js/icons.js`**)**  
- Inline SVG redraws of the original artwork on a 64×64 grid, clipped to one shared squircle mask: no image requests, sharp at any size, no black placeholder while loading  
- `tacit` → `nickburser122/tacit`  
- `polars` → Floe (`datakid/polars-desktop-demo`, also matched as `datakid/floe`)  
- `duckbars` → `datakid/duckbench-2`  
- `duckgrid` → `datakid/duckbench-tauri`  
- `datakid/contact-flow` uses the original artwork file `images/contact-flow.jpg` (image icon, `zoom: 1.25`), not a redraw  
- `pstools` → `datakid/ps-tools-` (shows up once that repo publishes a release with a real installer)  
- Apps without an icon get a monogram on an accent gradient  
**QR (**`js/qr.js`**)**  
- Built-in QR encoder (byte mode, ECC level L, versions 1–13), output as SVG; no library, no network  
**Interface**  
- Floating glass top bar, pill controls, Geist and Geist Mono type bundled in `fonts/` (SIL OFL 1.1), light and dark themes  
- Spring easing on press and hover, pointer-following highlight on app cards, staggered card entrance (replayed on platform filter)  
- The app icon morphs between its card and the app page (View Transitions); the featured panel's accent hue animates between apps  
- Version rail stays in view while release details scroll; settings open as a bottom sheet on phones  
- All motion is switched off under `prefers-reduced-motion`  
**Features**  
- Grid of app cards with icons, platform glyphs, latest version, a Get button and a GitHub repo link  
- App page: repository link and maker link (Main / Alt) under the title; Repository link next to the release links  
- App page: Scan or copy panel with a QR code of the direct download link, a platform switch and a Copy button; the QR button on every file row and on the Release page, Source .zip and Repository links loads that link into the same panel  
- Footer: links to both maker profiles  
- Featured panel with previous / next arrows and a position counter; it steps through the apps left by the platform filter  
- App page: the same arrows move to the previous / next app in the filtered list  
- Left / Right arrow keys do the same on both views when no text field is focused  
- App page: one download button per platform, version list, Stable / Pre-release filter, release notes, full file list  
- Search across names, descriptions, platforms and version tags (`/` to focus, `Esc` to clear or go back)  
- Platform filter  
- Sync button: rechecks GitHub now, ignoring the 15 minute cache  
- Settings: Auto / Light / Dark theme, Match my device, GitHub token  
- No CDN and no third-party requests: fonts, icons and the QR encoder ship with the site; only `api.github.com` is called  
- Offline: `sw.js` (cache `shelf-5`) caches the site files and the last GitHub data is kept in `localStorage`  
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
