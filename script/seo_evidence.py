
"""Collect finalized Search Console, SERP, analytics, and AI observations."""
import base64
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.error import HTTPError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from seo_audit import ORIGIN, PRIORITY, audit

WORK = Path(".seo-work")
TODAY = datetime.now(ZoneInfo("America/New_York")).date()
PROPERTY = "sc-domain:running.services"
SC = "https://www.googleapis.com/webmasters/v3/sites/" + quote(PROPERTY, safe="")


def request(url, payload=None, token=None, form=False):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
        data = (urlencode(payload) if form else json.dumps(payload)).encode()
    try:
        with urlopen(Request(url, data=data, headers=headers), timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        # Provider exceptions can embed credentials or authenticated URLs.
        raise ValueError(f"HTTP {error.code}") from None
    except (OSError, ValueError):
        raise ValueError("provider response unavailable") from None


def google_token(raw):
    credentials = json.loads(raw)
    now = int(time.time())
    encode = lambda value: base64.urlsafe_b64encode(value).rstrip(b"=")
    header = encode(b'{"alg":"RS256","typ":"JWT"}')
    scopes = "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly"
    claims = encode(json.dumps({"iss": credentials["client_email"], "scope": scopes,
        "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 900}).encode())
    unsigned = header + b"." + claims
    with tempfile.TemporaryDirectory() as directory:
        key = Path(directory) / "service-account.pem"
        key.write_text(credentials["private_key"], encoding="utf-8")
        key.chmod(0o600)
        signature = subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(key)],
                                   input=unsigned, capture_output=True, check=True).stdout
    return request("https://oauth2.googleapis.com/token", {
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": (unsigned + b"." + encode(signature)).decode(),
    }, form=True)["access_token"]


def search_rows(token, start, end, dimensions, filters=None, limit=10000):
    payload = {"startDate": str(start), "endDate": str(end), "dimensions": dimensions,
               "dataState": "final", "type": "web", "rowLimit": limit}
    if filters:
        payload["dimensionFilterGroups"] = [{"filters": filters}]
    return request(SC + "/searchAnalytics/query", payload, token).get("rows", [])


def metrics(row):
    return {key: row[key] for key in ("clicks", "impressions", "ctr", "position")}


def exact_filter(dimension, expression):
    return {"dimension": dimension, "operator": "equals", "expression": expression}


def complete_range(token):
    # Search Console dates are Pacific dates. Recent incomplete dates never count.
    last_possible = datetime.now(ZoneInfo("America/Los_Angeles")).date() - timedelta(days=1)
    recent = search_rows(token, last_possible - timedelta(days=20), last_possible, ["date"])
    if not recent:
        raise ValueError("no finalized dates in Search Console")
    end = max(date.fromisoformat(row["keys"][0]) for row in recent)
    if end < last_possible - timedelta(days=8):
        raise ValueError("latest finalized date is too old to publish")
    return end - timedelta(days=27), end


def opportunities(rows, locked):
    candidates = []
    for row in rows:
        url, device = row["keys"]
        if not url.startswith(ORIGIN + "/") or url in locked or row["impressions"] < 100:
            continue
        peers = [other for other in rows if other["keys"][1] == device and
                 other["keys"][0] != url and other["impressions"] >= 25 and
                 abs(other["position"] - row["position"]) <= 1.5]
        impressions = sum(peer["impressions"] for peer in peers)
        if len(peers) < 3 or impressions < 200:
            continue
        benchmark = sum(peer["clicks"] for peer in peers) / impressions
        gap = benchmark - row["ctr"]
        if gap >= 0.005 and row["ctr"] <= benchmark * 0.75:
            candidates.append({"url": url, "device": device, **metrics(row),
                               "peer_ctr": benchmark, "peer_pages": len(peers),
                               "estimated_missed_clicks": round(gap * row["impressions"], 2)})
    return sorted(candidates, key=lambda item: -item["estimated_missed_clicks"])[:12]


def console(token, state):
    start, end = complete_range(token)
    pages = search_rows(token, start, end, ["page", "device"])
    queries = search_rows(token, start, end, ["page", "query"])
    pending = state.get("pending_title", {})
    title = opportunities(pages, set(pending))
    selected = {row["url"] for row in title}
    by_query = defaultdict(list)
    blog = []
    for row in queries:
        url, query = row["keys"]
        if not url.startswith(ORIGIN + "/") or row["impressions"] < 25:
            continue
        by_query[query].append({"url": url, **metrics(row)})
        if url.startswith(ORIGIN + "/blog/") and 8 <= row["position"] <= 20:
            blog.append({"url": url, "query": query, **metrics(row)})
    blog = sorted(blog, key=lambda row: -row["impressions"])[:8]
    for row in title:
        row["queries"] = sorted(
            [{"query": query, **metrics(item)} for item in queries for url, query in [item["keys"]]
             if url == row["url"]], key=lambda item: -item["impressions"]
        )[:5]
    followups = {}
    for url, item in pending.items():
        published = date.fromisoformat(item["published"])
        first = published + timedelta(days=1)
        last = first + timedelta(days=27)
        if last <= end:
            filters = [exact_filter("page", url)]
            device = item["baseline"].get("device")
            if device:
                filters.append(exact_filter("device", device))
            rows = search_rows(token, first, last, [], filters)
            followups[url] = {"kind": "title", "start": str(first), "end": str(last),
                              "baseline": item["baseline"], "after": metrics(rows[0]) if rows else
                              {"clicks": 0, "impressions": 0, "ctr": None, "position": None}}
    blog_tracking = []
    for url, item in state.get("blog", {}).items():
        rows = search_rows(token, start, end, [],
                           [exact_filter("page", url), exact_filter("query", item["query"])])
        after = metrics(rows[0]) if rows else None
        blog_tracking.append({"url": url, "query": item["query"], "baseline": item["baseline"],
                              "after": after, "top_three": bool(after and after["position"] <= 3)})
    inspections = []
    for path in ("/", "/blog", "/for-organizers", "/developers", "/pricing"):
        url = ORIGIN + path
        try:
            result = request("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                             {"inspectionUrl": url, "siteUrl": PROPERTY}, token)
            index = result.get("inspectionResult", {}).get("indexStatusResult", {})
            inspections.append({"url": url, **{key: index.get(key) for key in
                ("verdict", "coverageState", "robotsTxtState", "indexingState",
                 "pageFetchState", "googleCanonical", "userCanonical", "lastCrawlTime")}})
        except ValueError as error:
            inspections.append({"url": url, "unchecked": str(error)})
    return {"status": "checked", "start": str(start), "end": str(end), "title": title, "blog": blog,
            "page_baselines": [{"url": row["keys"][0], "device": row["keys"][1], **metrics(row)}
                               for row in pages if row["keys"][0] in selected | {b["url"] for b in blog}],
            "overlap": [{"query": query, "pages": rows[:5]} for query, rows in by_query.items()
                        if len(rows) > 1][:40],
            "title_followups": followups, "blog_tracking": blog_tracking, "index_inspections": inspections}


def serp(key, engine, **params):
    result = request("https://serpapi.com/search.json?" + urlencode({"api_key": key, "engine": engine, **params}))
    if result.get("error"):
        raise ValueError("SERP provider returned an error")
    return result


def references(value):
    return sorted({url.rstrip(".,);") for url in
                   re.findall(r'https?://[^\s"<>\\]+', json.dumps(value, ensure_ascii=False))
                   if urlsplit(url).hostname in {"running.services", "www.running.services"}})


def answer_observation(payload):
    return {"status": "checked", "brand_mentioned": bool(re.search(r"running\.services", json.dumps(payload), re.I)),
            "cited_urls": references(payload)}


def ai_check(query, serp_key, perplexity_key):
    output = {"query": query, "ChatGPT Search": {"unchecked": "No hosted consumer ChatGPT Search connector"}}
    output["Google AI Overviews"] = {"unchecked": "Missing SERPAPI_KEY"}
    if serp_key:
        try:
            result = serp(serp_key, "google", q=query, gl="us", hl="en")
            overview = result.get("ai_overview")
            if overview and overview.get("page_token"):
                overview = serp(serp_key, "google_ai_overview", page_token=overview["page_token"]).get("ai_overview")
                if not overview:
                    raise ValueError("Overview token yielded no answer")
            output["Google AI Overviews"] = answer_observation(overview) if overview else {"status": "no overview"}
        except ValueError as error:
            output["Google AI Overviews"] = {"unchecked": str(error)}
    output["Perplexity"] = {"unchecked": "Missing PERPLEXITY_API_KEY"}
    if perplexity_key:
        try:
            answer = request("https://api.perplexity.ai/chat/completions",
                             {"model": "sonar", "messages": [{"role": "user", "content": query}]}, perplexity_key)
            message = answer["choices"][0]["message"]["content"]
            obs = answer_observation(message)
            obs["cited_urls"] = references(answer.get("citations", []) + answer.get("search_results", []))
            output["Perplexity"] = obs
        except (ValueError, KeyError, IndexError) as error:
            output["Perplexity"] = {"unchecked": str(error)}
    return output


def collect():
    WORK.mkdir(exist_ok=True)
    state_path = WORK / "history/state.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    serp_key, perplexity_key = os.getenv("SERPAPI_KEY"), os.getenv("PERPLEXITY_API_KEY")
    with ThreadPoolExecutor(max_workers=5) as pool:
        public = pool.submit(audit, TODAY)
        ai = [pool.submit(ai_check, query, serp_key, perplexity_key)
              for query in json.loads(Path("seo/ai-queries.json").read_text(encoding="utf-8"))]
        gsc = {"unchecked": "Missing SEO_GSC_SERVICE_ACCOUNT_JSON"}
        ga = {"unchecked": "Missing SEO_GA4_PROPERTY_ID or Google service account"}
        raw = os.getenv("SEO_GSC_SERVICE_ACCOUNT_JSON")
        if raw:
            try:
                token = google_token(raw)
                try:
                    gsc = console(token, state)
                except ValueError as error:
                    gsc = {"unchecked": str(error)}
                property_id = os.getenv("SEO_GA4_PROPERTY_ID", "")
                if property_id.isdigit():
                    try:
                        response = request(f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport", {
                            "dateRanges": [{"startDate": "9daysAgo", "endDate": "3daysAgo"}],
                            "metrics": [{"name": "eventCount"}],
                            "dimensionFilter": {"filter": {"fieldName": "eventName",
                                "stringFilter": {"value": "generate_lead"}}},
                        }, token)
                        rows = response.get("rows", [])
                        ga = {"status": "checked", "period": "9 to 3 days ago",
                              "generate_lead": int(rows[0]["metricValues"][0]["value"]) if rows else 0}
                    except (ValueError, KeyError, IndexError) as error:
                        ga = {"unchecked": str(error)}
            except (ValueError, KeyError, subprocess.SubprocessError):
                gsc = {"unchecked": "Google service account authentication failed"}
        results = {}
        if serp_key:
            query_list = {item["query"] for item in gsc.get("blog", [])[:4]}
            query_list |= {page["queries"][0]["query"] for page in gsc.get("title", [])[:3] if page["queries"]}
            for query in sorted(query_list):
                try:
                    data = serp(serp_key, "google", q=query, gl="us", hl="en")
                    results[query] = [{key: row.get(key) for key in ("position", "title", "link", "snippet")}
                                      for row in data.get("organic_results", [])[:3]]
                except ValueError as error:
                    results[query] = {"unchecked": str(error)}
        evidence = {"date": str(TODAY), "audit": public.result(), "gsc": gsc, "analytics": ga,
                    "serp": results if serp_key else {"unchecked": "Missing SERPAPI_KEY"},
                    "ai": [item.result() for item in ai], "pending_title": state.get("pending_title", {})}
    (WORK / "evidence.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Audited {evidence['audit']['pages_checked']} pages and "
          f"{evidence['audit']['internal_targets_checked']} linked targets; "
          f"Search Console: {gsc.get('status', gsc.get('unchecked'))}")


if __name__ == "__main__":
    collect()
