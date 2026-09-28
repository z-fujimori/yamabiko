# Yamabiko project site

Japanese static project website for Yamabiko. The app repository is not deployed: only this directory's `dist/` contains public website assets.

## Preview

Run `python3 -m http.server 4317 --bind 127.0.0.1 --directory dist` in this directory.

## Edit

- `dist/index.html`: Japanese content and download links
- `dist/style.css`: responsive styling
- `dist/assets/yamabiko-icon.png`: existing app icon

The download section currently links to the verified v0.3.2 release. Update both platform URLs and the version caption together when promoting a later release. The release-history link always points to GitHub's latest release.

The app window in the hero is a static UI illustration, not a live microphone demo. This website does not request microphone access.

## Hosting

`.openai/hosting.json` identifies the Sites project. Publish with the Sites workflow. Keep the site's audience unchanged unless explicitly requested.
