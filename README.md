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

`.openai/hosting.json` identifies the Sites project. Publish with the Sites workflow. Keep the site's audience unchanged unless explicitly requested.
