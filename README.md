# Yamabiko project site

Japanese static project website for Yamabiko. The app repository is not deployed: only this directory's `dist/` contains public website assets.

## Preview

Run `python3 -m http.server 4317 --bind 127.0.0.1 --directory dist` in this directory.

## Edit

- `dist/index.html`: Japanese content and download links
- `dist/style.css`: responsive styling
- `dist/assets/yamabiko-icon.png`: existing app icon

`dist/downloads.mjs` reads GitHub's public latest-release API on page load and again for every normal download click. It selects the Apple Silicon DMG or x64 setup EXE from that release's uploaded assets and updates the displayed version. No version number or asset URL is pinned in the site.

On API failure, rate limiting, timeout, or a missing installer, the button opens GitHub's latest-release page. Without JavaScript (or with a modified/middle click), the native link also opens that page. The site stores no GitHub token and does not cache a stale fallback installer. New releases should preserve the `Yamabiko_<version>_aarch64.dmg` and `Yamabiko_<version>_x64-setup.exe` naming conventions; otherwise visitors use the release-page fallback.

Run `node --test tests/downloads.test.mjs` to check release selection, failure fallbacks, and rechecking at click time.

The app window in the hero is a static UI illustration, not a live microphone demo. This website does not request microphone access.

## Hosting

Public URL: https://z-fujimori.github.io/yamabiko/

GitHub Pages serves the root of the `codex/project-site` branch in `z-fujimori/yamabiko`. Only `dist/` is published; the app source and website tests are excluded. `.nojekyll` makes this a plain static site.

After editing, run:

```sh
node --test tests/downloads.test.mjs
bash scripts/deploy-pages.sh
```

The deployment script uses a temporary checkout and pushes a regular commit. GitHub Pages publishes that commit automatically. Git SSH access to the repository is required. The existing app checkout is not modified.

The former ChatGPT Sites deployment has been made private. It is no longer the public hosting provider; deleting its remote project still requires the Sites management interface.
