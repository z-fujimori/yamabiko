export const LATEST_PAGE = 'https://github.com/z-fujimori/yamabiko/releases/latest';
const API_URL = 'https://api.github.com/repos/z-fujimori/yamabiko/releases/latest';
const assetNames = {
  macos: /^Yamabiko_.+_aarch64\.dmg$/i,
  windows: /^Yamabiko_.+_x64-setup\.exe$/i,
};

// Only offer installers belonging to this exact published release and repository.
export function resolveRelease(release) {
  if (!release || release.draft || release.prerelease ||
      typeof release.tag_name !== 'string' || !Array.isArray(release.assets)) {
    throw new Error('Invalid stable release');
  }
  const downloads = {};
  for (const [platform, pattern] of Object.entries(assetNames)) {
    const asset = release.assets.find((asset) => {
      if (!pattern.test(asset.name) || asset.state !== 'uploaded' || !(asset.size > 0)) return false;
      try {
        const url = new URL(asset.browser_download_url);
        return url.origin === 'https://github.com' && !url.username && !url.password &&
          !url.search && !url.hash &&
          decodeURIComponent(url.pathname) === `/z-fujimori/yamabiko/releases/download/${release.tag_name}/${asset.name}`;
      } catch { return false; }
    });
    downloads[platform] = asset?.browser_download_url ?? LATEST_PAGE;
  }
  return { version: release.tag_name, downloads };
}

export async function getLatestRelease(fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(API_URL, {
      cache: 'no-store', credentials: 'omit',
      headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal,
    });
    if (!response.ok) throw new Error('Release lookup failed');
    return resolveRelease(await response.json());
  } finally { clearTimeout(timeout); }
}

export function bindDownloads(root, navigate = (url) => window.location.assign(url), lookup = getLatestRelease) {
  const caption = root.querySelector('.download-caption');
  const cards = [...root.querySelectorAll('[data-download-platform]')];
  let busy = false;
  let hasClicked = false;
  const describe = (release) => {
    const complete = Object.values(release.downloads).every((url) => url !== LATEST_PAGE);
    caption.textContent = complete
      ? `${release.version} · GitHub Releasesからダウンロード`
      : `${release.version} · 対応版がない場合はリリースページへ`;
  };
  // Keep href on /latest for JavaScript-disabled, modified and middle clicks.
  // A normal click always checks again, even if this page has been open for hours.
  for (const card of cards) {
    card.addEventListener('click', async (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (busy) return;
      busy = true;
      hasClicked = true;
      cards.forEach((link) => link.setAttribute('aria-busy', 'true'));
      caption.textContent = '最新のダウンロード先を確認中…';
      let destination = LATEST_PAGE;
      try {
        const release = await lookup();
        describe(release);
        destination = release.downloads[card.dataset.downloadPlatform] ?? LATEST_PAGE;
      } catch {
        caption.textContent = '最新リリースページでダウンロードできます';
      } finally {
        busy = false;
        cards.forEach((link) => link.removeAttribute('aria-busy'));
      }
      navigate(destination);
    });
  }
  void lookup().then((release) => {
    if (!hasClicked) describe(release);
  }).catch(() => {
    if (!hasClicked) caption.textContent = '最新リリースページでダウンロードできます';
  });
}

if (typeof document !== 'undefined') bindDownloads(document);
