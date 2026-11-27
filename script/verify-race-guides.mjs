import assert from "node:assert/strict";

const origin = new URL(process.argv[2] ?? "https://running.services");
const year = 2027;
const hubPath = `/race-guides/${year}`;
const canonical = "https://running.services";
const pageSitemap = "/sitemap-pages.xml";
const guideSitemap = "/sitemap-race-guides.xml";

async function get(path, status = 200) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(70_000) });
  assert.equal(response.status, status, `${path} returned ${response.status}`);
  return response.text();
}

function appMarkup(html) {
  return html.split("</footer>")[0];
}

const [hub, rootSitemap, guideXml, pageXml] = await Promise.all(
  [hubPath, "/sitemap.xml", guideSitemap, pageSitemap].map(path => get(path)),
);
assert.ok(rootSitemap.includes(`<loc>${canonical}${guideSitemap}</loc>`));
assert.match(hub, /id="root"/);
const paths = [...new Set([...appMarkup(hub).matchAll(/href="(\/race-guides\/2027\/[a-z-]+)"/g)].map(match => match[1]))];
assert.equal(paths.length, 50, "50 state guide links in the server-rendered hub");
assert.ok(!paths.includes(`${hubPath}/district-of-columbia`));
const eligible = new Set([...guideXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname));
assert.ok(eligible.delete(hubPath));
for (const path of eligible) assert.ok(paths.includes(path), `Unknown sitemap entry ${path}`);

const counts = { guides: paths.length, indexable: eligible.size, excluded: paths.length - eligible.size, maps: 0 };
const titles = new Set();
const samples = {};
const concurrency = origin.hostname === "127.0.0.1" ? 1 : 5;
for (let offset = 0; offset < paths.length; offset += concurrency) {
  await Promise.all(paths.slice(offset, offset + concurrency).map(async path => {
    const html = await get(path);
    const app = appMarkup(html);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}${path}"`), `Canonical URL for ${path}`);
    assert.equal(!/name="robots" content="noindex\b/i.test(html), eligible.has(path), `Sitemap and robots for ${path}`);
    assert.ok(app.includes("<h1"), `Server-rendered heading for ${path}`);
    assert.ok(app.includes("guide-email-cta") && app.includes('id="race-faq"'), `Signup and FAQs for ${path}`);
    assert.ok(app.includes("state=") && app.includes(`year=${year}`), `Filtered race map link for ${path}`);
    assert.ok(app.includes('href="/races/state/'), `State calendar link for ${path}`);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title && !titles.has(title), `Unique title for ${path}`);
    titles.add(title);
    if (app.includes('data-testid="race-area-map"')) counts.maps++;
    const races = [...new Set([...app.matchAll(/href="(\/races\/(?!state\/)[a-z0-9-]+)"/g)].map(match => match[1]))];
    if (eligible.has(path)) {
      assert.ok(races.length >= 3, `Server-rendered race links for ${path}`);
      assert.ok(app.includes(">Official registration</a>"), `Organizer source link for ${path}`);
    }
    if ([`${hubPath}/new-york`, `${hubPath}/florida`].includes(path)) {
      assert.match(app, /guide-fee-table/);
      assert.match(app, /data-testid="race-area-map"/);
      samples[path] = { raceLinks: races.length, sitemap: eligible.has(path) };
      await get(races[0]);
    }
  }));
}

for (const [path, title] of [
  ["/races", /U\.S\. Running Race Calendar/],
  ["/for-organizers", /Claim Your Race Listing for Free/],
  ["/developers", /U\.S\. Running Race Data API/],
]) {
  const html = await get(path);
  assert.match(html, title);
  assert.ok(html.includes(`href="${canonical}${path}"`));
  assert.ok(pageXml.includes(`<loc>${canonical}${path}</loc>`));
}
await get(`${hubPath}/unknown-state`, 404);
console.log(JSON.stringify({ ...counts, samples, suppressed: paths.filter(path => !eligible.has(path)) }, null, 2));
