import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LATEST_PAGE, resolveRelease, getLatestRelease, bindDownloads } from '../dist/downloads.mjs';
function release(version = 'v9.8.7') {
  return { tag_name: version, draft: false, prerelease: false, assets: [
    `Yamabiko_${version.slice(1)}_aarch64.dmg`, `Yamabiko_${version.slice(1)}_x64-setup.exe`,
  ].map(name => ({name, state: 'uploaded', size: 100, browser_download_url: `https://github.com/z-fujimori/yamabiko/releases/download/${version}/${name}`})) };
}
function ui() {
  const caption = {textContent: ''};
  const cards = ['macos', 'windows'].map(platform => ({dataset: {downloadPlatform: platform},
    addEventListener(_, handler) { this.click = handler; }, setAttribute() {}, removeAttribute() {}}));
  return { caption, cards, root: {querySelector: () => caption, querySelectorAll: () => cards} };
}
const event = () => ({button: 0, preventDefault() {this.prevented = true;}});
const tick = () => new Promise(resolve => setImmediate(resolve));
test('selects each platform from a future release, ignoring signatures and other architectures', () => {
  const data = release();
  data.assets.unshift({...data.assets[0], name:'Yamabiko_9.8.7_x64.dmg'});
  const result = resolveRelease(data);
  assert.equal(result.version, 'v9.8.7');
  assert.match(result.downloads.macos, /v9\.8\.7\/Yamabiko_9\.8\.7_aarch64\.dmg$/);
  assert.match(result.downloads.windows, /v9\.8\.7\/Yamabiko_9\.8\.7_x64-setup\.exe$/);
});
test('missing, incomplete and unsafe installers fall back, never to an older release', () => {
  for (const change of [a => a.size = 0, a => a.state = 'new', a => a.browser_download_url = 'https://evil.example/app.dmg', a => a.browser_download_url = a.browser_download_url.replace('/v9.8.7/', '/v0.3.2/')]) {
    const data = release(); change(data.assets[0]);
    assert.equal(resolveRelease(data).downloads.macos, LATEST_PAGE);
  }
  assert.equal(resolveRelease({...release(),assets:[]}).downloads.windows,LATEST_PAGE);
  assert.throws(() => resolveRelease({...release(),prerelease:true}));
  assert.throws(() => resolveRelease({...release(),draft:true}));
});
test('HTTP rate limits and malformed API results fail safely', async () => {
  await assert.rejects(getLatestRelease(async () => ({ok:false,status:403})));
  await assert.rejects(getLatestRelease(async () => ({ok:true,json:async () => ({})})));
  await getLatestRelease(async (url,options) => {
    assert.match(url,/\/releases\/latest$/); assert.equal(options.cache,'no-store');
    return {ok:true,json:async () => release()};
  });
});
test('a click rechecks after a new version is published while the page stays open', async () => {
  const {root,cards,caption} = ui(); const navigations=[]; let n=0;
  bindDownloads(root,url=>navigations.push(url),async()=>resolveRelease(release(++n===1?'v1.0.0':'v2.0.0')));
  await tick(); assert.match(caption.textContent,/v1.0.0/);
  await cards[0].click(event());
  assert.match(navigations[0],/\/v2.0.0\//); assert.match(caption.textContent,/v2.0.0/);
});
test('lookup failure at click time goes to latest page even after successful preload', async () => {
  const {root,cards}=ui(); const navigations=[];let n=0;
  bindDownloads(root,url=>navigations.push(url),async()=>{if(n++)throw Error('offline');return resolveRelease(release());});
  await tick();await cards[1].click(event());assert.deepEqual(navigations,[LATEST_PAGE]);
});
test('late preload cannot overwrite the newer result and modified clicks keep native navigation', async () => {
  const {root,cards,caption}=ui();let finish;let n=0;
  bindDownloads(root,()=>{},()=>n++===0?new Promise(r=>finish=r):Promise.resolve(resolveRelease(release('v2.0.0'))));
  const modified={...event(),ctrlKey:true};await cards[0].click(modified);assert.equal(modified.prevented,undefined);
  await cards[0].click(event());finish(resolveRelease(release('v1.0.0')));await tick();assert.match(caption.textContent,/v2.0.0/);
});
