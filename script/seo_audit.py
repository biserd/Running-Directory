
"""Collect public, production-only SEO evidence."""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from html.parser import HTMLParser
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree

ORIGIN = "https://running.services"
PRIORITY = ["/", "/races", "/blog", "/for-organizers", "/pricing", "/developers", "/contact"]
HOSTS = {"running.services", "www.running.services"}
MAX_BODY = 2_000_000


def is_site_url(url):
    parsed = urlsplit(url)
    return parsed.scheme == "https" and parsed.netloc in HOSTS


class SameSiteRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url):
    chain = []
    opener = build_opener(SameSiteRedirect())
    for _ in range(6):
        if not is_site_url(url):
            return {"status": 0, "url": url, "chain": chain, "error": "Unexpected redirect host"}, ""
        try:
            response = opener.open(Request(url, headers={
                "User-Agent": "running.services daily SEO audit",
                "Accept": "text/html, application/xml, text/plain",
                "Cache-Control": "no-cache",
            }), timeout=12)
        except HTTPError as error:
            response = error
        except OSError:
            return {"status": 0, "url": url, "chain": chain, "error": "Network or TLS error"}, ""
        with response:
            location = response.headers.get("Location")
            if response.code in {301, 302, 303, 307, 308} and location:
                target = urljoin(url, location)
                chain.append({"status": response.code, "from": url, "to": target})
                if target == url or any(hop["from"] == target for hop in chain):
                    return {"status": 0, "url": target, "chain": chain, "error": "Redirect loop"}, ""
                url = target
                continue
            try:
                body = response.read(MAX_BODY).decode("utf-8", errors="replace")
            except OSError:
                return {"status": 0, "url": url, "chain": chain, "error": "Response read failed"}, ""
            return {
                "status": response.code, "url": url, "chain": chain,
                "robots": response.headers.get("X-Robots-Tag", ""),
                "type": response.headers.get("Content-Type", ""),
            }, body
    return {"status": 0, "url": url, "chain": chain, "error": "Redirect limit exceeded"}, ""


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = defaultdict(list)
        self.links = set()
        self.capture = None
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "template", "noscript"}:
            self.hidden += 1
        if tag in {"title", "h1"}:
            self.capture = tag
        if tag == "a" and attrs.get("href"):
            self.links.add(attrs["href"])
        if tag == "link" and "canonical" in (attrs.get("rel") or "").lower().split():
            self.values["canonical"].append(attrs.get("href") or "")
        if tag == "meta" and (attrs.get("name") or "").lower() in {"description", "robots", "googlebot"}:
            self.values[attrs["name"].lower()].append(attrs.get("content") or "")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "template", "noscript"}:
            self.hidden = max(0, self.hidden - 1)
        if tag == self.capture:
            self.capture = None

    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.values[self.capture or "text"].append(data.strip())


def page(url):
    result, body = fetch(url)
    parser = Page()
    if result["status"] == 200 and "text/html" in result.get("type", ""):
        parser.feed(body)
    for field in ("title", "h1", "description", "canonical", "text"):
        result[field] = " ".join(" ".join(parser.values[field]).split())
    if result["canonical"]:
        result["canonical"] = urljoin(result["url"], result["canonical"])
    result["noindex"] = "noindex" in " ".join(
        [result.get("robots", "")] + parser.values["robots"] + parser.values["googlebot"]
    ).lower()
    links = set()
    for link in parser.links:
        target = urlsplit(urljoin(result["url"], link))
        if target.scheme == "https" and target.netloc == "running.services" and not target.query:
            links.add(urlunsplit(("https", target.netloc, target.path or "/", "", "")))
    result["links"] = sorted(links)
    return result


def rotating(urls, limit, day):
    if not urls or len(urls) <= limit:
        return urls
    start = day.toordinal() * limit % len(urls)
    return (urls + urls)[start:start + limit]


def audit(day):
    issues = []
    robot_result, robots = fetch(ORIGIN + "/robots.txt")
    if robot_result["status"] != 200:
        issues.append({"url": ORIGIN + "/robots.txt", "kind": "robots unavailable", **robot_result})
    robot_rules = []
    active = False
    for line in robots.splitlines():
        key, _, value = line.split("#", 1)[0].partition(":")
        key, value = key.strip().lower(), value.strip()
        if key == "user-agent":
            active = value == "*"
        if active and key in {"allow", "disallow"} and value and "*" not in value and "$" not in value:
            robot_rules.append((value, key == "allow"))
    root = ORIGIN + "/sitemap.xml"
    if root not in [line.partition(":")[2].strip() for line in robots.splitlines()
                    if line.lower().startswith("sitemap:")]:
        issues.append({"url": ORIGIN + "/robots.txt", "kind": "Missing production sitemap directive"})
    sitemap_urls = set()
    seen = set()
    queue = [root]
    while queue and len(seen) < 30:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        result, body = fetch(url)
        try:
            if result["status"] != 200 or result["chain"]:
                raise ValueError("Sitemap did not return a direct 200")
            node = ElementTree.fromstring(body)
            kind = node.tag.split("}")[-1]
            if kind not in {"urlset", "sitemapindex"}:
                raise ValueError("Unexpected sitemap root")
            for loc in node.findall("./{*}*/{*}loc"):
                value = (loc.text or "").strip()
                if not is_site_url(value) or urlsplit(value).netloc != "running.services":
                    issues.append({"url": url, "kind": "Sitemap contains a noncanonical host", "target": value})
                elif kind == "sitemapindex":
                    queue.append(value)
                else:
                    if value in sitemap_urls:
                        issues.append({"url": url, "kind": "Duplicate sitemap URL", "target": value})
                    sitemap_urls.add(value)
        except (ValueError, ElementTree.ParseError) as error:
            issues.append({"url": url, "kind": "Invalid sitemap", "detail": str(error)})
    if queue:
        issues.append({"url": root, "kind": "Sitemap traversal exceeded configured limit"})
    primary = {ORIGIN + path for path in PRIORITY}
    selected = sorted(primary | set(rotating(sorted(sitemap_urls - primary), 150, day)))
    fields = {key: defaultdict(list) for key in ("title", "description")}
    incoming = defaultdict(set)
    with ThreadPoolExecutor(max_workers=8) as pool:
        pages = dict(zip(selected, pool.map(page, selected)))
        for url, result in pages.items():
            if result["status"] != 200 or result["chain"]:
                issues.append({"url": url, "kind": "Non-200 or redirect on audited page",
                               "status": result["status"], "chain": result["chain"]})
                continue
            for target in result["links"]:
                path = urlsplit(target).path
                if not path.startswith(("/api/", "/auth/", "/admin", "/assets/", "/organizers/dashboard")):
                    incoming[target].add(url)
            for field, values in fields.items():
                if not result[field]:
                    issues.append({"url": url, "kind": f"Missing {field}"})
                else:
                    values[result[field].casefold()].append(url)
            if not result["h1"]:
                issues.append({"url": url, "kind": "Missing server-rendered H1"})
            if result["canonical"] != url:
                issues.append({"url": url, "kind": "Canonical mismatch", "canonical": result["canonical"]})
            if result["noindex"] and (url in sitemap_urls or url in primary):
                issues.append({"url": url, "kind": "Noindex on sitemap or priority URL"})
            rules = [(len(pattern), allowed) for pattern, allowed in robot_rules
                     if urlsplit(url).path.startswith(pattern)]
            if rules and not max(rules)[1]:
                issues.append({"url": url, "kind": "Blocked by wildcard robots group"})
        links = rotating(sorted(incoming.keys() - pages.keys()), 90, day)
        for url, result in zip(links, pool.map(lambda url: fetch(url)[0], links)):
            if result["status"] >= 400 or result["status"] == 0 or len(result["chain"]) > 1:
                issues.append({"url": url, "kind": "Broken internal link or redirect chain",
                               "status": result["status"], "chain": result["chain"],
                               "linked_from": sorted(incoming[url])[:5]})
    for field, values in fields.items():
        for duplicates in values.values():
            if len(duplicates) > 1:
                issues.append({"url": duplicates[0], "kind": f"Duplicate {field} in sample", "also": duplicates[1:]})
    for url in (ORIGIN + "/organizers", "https://www.running.services/"):
        result, _ = fetch(url)
        expected = ORIGIN + ("/for-organizers" if url.endswith("/organizers") else "/")
        if result["status"] != 200 or result["url"] != expected or len(result["chain"]) != 1:
            issues.append({"url": url, "kind": "Known redirect regression", **result})
    return {"sitemaps": len(seen), "sitemap_urls": len(sitemap_urls), "pages_checked": len(selected),
            "internal_targets_checked": len(links), "issues": issues}
