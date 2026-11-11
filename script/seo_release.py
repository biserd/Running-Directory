
"""Validate the SEO proposal, verify production, and write durable run state."""
import csv
from datetime import datetime
from io import StringIO
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from seo_audit import ORIGIN, PRIORITY, fetch, page

WORK = Path(".seo-work")
STAGES = ("seo-autopilot", "blog-refresher", "seo-title-optimization")
ALLOWED_FILES = {
    "server/seo.ts", "server/ssr-prefetch.ts", "shared/blog-months.ts",
    "client/src/App.tsx", "seo/keyword-map.csv",
}


def read(path, default=None):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True, encoding="utf-8").stdout


def state():
    return read(WORK / "history/state.json", {"pending_title": {}, "blog": {}})


def stage_patch():
    git("add", "-N", "--all")
    patch = git("diff", "--binary", "HEAD")
    (WORK / "candidate.patch").write_text(patch, encoding="utf-8")


def field_matches(expected, observed):
    for key, value in expected.items():
        if key == "text":
            if " ".join(value.split()) not in observed["text"]:
                return False
        elif observed.get(key) != value:
            return False
    return True


def observe(url):
    if url.endswith((".xml", ".txt")):
        result, body = fetch(url)
        result["text"] = " ".join(body.split())
    else:
        result = page(url)
    if result.get("chain"):
        result["location"] = result["chain"][0]["to"]
        result["status"] = result["chain"][0]["status"]
    return result


def validate():
    proposed = read(WORK / "proposal.json", {})
    patch = WORK / "candidate.patch"
    if not patch.exists() or not patch.stat().st_size:
        if proposed.get("changes"):
            raise ValueError("Proposal lists URL edits without a source patch")
        return
    if set(proposed.get("stages", {})) != set(STAGES):
        raise ValueError("Proposal must record all three SEO stages")
    git("apply", "--check", str(patch))
    git("apply", "--index", str(patch))
    files = git("diff", "--cached", "--name-only", "-z").strip("\0").split("\0")
    for path in files:
        is_page = path.startswith("client/src/pages/") and path.endswith(".tsx")
        is_content = path.startswith("shared/seo-content/") and path.endswith(".json")
        if path not in ALLOWED_FILES and not (is_page or is_content):
            raise ValueError(f"Out of scope edit: {path}")
        file = Path(path)
        if not file.is_file() or file.is_symlink():
            raise ValueError(f"Deletion or symlink not eligible: {path}")
    changes = proposed.get("changes", [])
    if not changes:
        if set(files) != {"seo/keyword-map.csv"}:
            raise ValueError("Page edits require URL-level production verification")
        return
    if set(files) == {"seo/keyword-map.csv"} or len(changes) > 12:
        raise ValueError("Invalid number of source edits or production URLs")
    evidence = read(WORK / "evidence.json", {})
    gsc = evidence.get("gsc", {})
    counts = {key: 0 for key in STAGES}
    seen = set()
    for item in changes:
        url, expected = item["url"], item["expected"]
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or parsed.netloc != "running.services" or
            parsed.query or parsed.fragment or url in seen or parsed.path.startswith(("/api/", "/auth/", "/admin"))):
            raise ValueError("Invalid or duplicate production URL")
        seen.add(url)
        if not expected or expected.keys() - {"title", "h1", "text", "status", "location", "canonical", "noindex"}:
            raise ValueError(f"Missing or unsupported proof for {url}")
        if "text" in expected and len(expected["text"].strip()) < 20:
            raise ValueError(f"Text proof must contain a unique phrase for {url}")
        stage = item["stage"]
        counts[stage] += 1
        changes_title = bool({"title", "h1"} & expected.keys())
        item["title_changed"] = changes_title
        if stage == "blog-refresher":
            candidates = [row for row in gsc.get("blog", [])
                          if row["url"] == url and row["query"] == item.get("query")]
            serp = evidence.get("serp", {}).get(item.get("query"), [])
            if len(candidates) != 1 or not isinstance(serp, list) or len(serp) < 3:
                raise ValueError(f"Missing finalized blog and top-three SERP evidence for {url}")
            item["blog_baseline"] = {**candidates[0], "start": gsc["start"], "end": gsc["end"]}
        if changes_title or stage == "seo-title-optimization":
            if url in evidence.get("pending_title", {}):
                raise ValueError(f"Title or H1 is awaiting measurement for {url}")
            if stage != "seo-autopilot":
                source = "title" if stage == "seo-title-optimization" else "page_baselines"
                choices = [row for row in gsc.get(source, []) if row["url"] == url]
                if not choices:
                    raise ValueError(f"Missing device baseline for {url}")
                selected = max(choices, key=lambda row: row["impressions"])
                item["baseline"] = {**selected, "start": gsc["start"], "end": gsc["end"]}
            else:
                # Technical repairs can fill missing metadata even when Search Console is unavailable.
                # Still lock the URL for the full measurement period.
                item["baseline"] = {"unchecked": "Technical fix; no reliable pre-change metrics"}
        if stage == "seo-title-optimization" and "title" not in expected:
            raise ValueError(f"A title edit requires the expected new title for {url}")
        observed = observe(url)
        if observed["status"] == 0:
            raise ValueError(f"Unable to capture production baseline for {url}")
        if any(field_matches({key: value}, observed) for key, value in expected.items()):
            raise ValueError(f"Proof includes fields already live on {url}")
        item["rendered_before"] = {key: observed.get(key) for key in expected if key != "text"}
    if counts["blog-refresher"] > 1 or counts["seo-title-optimization"] > 1:
        raise ValueError("Only one blog refresh and title opportunity are eligible per run")
    write(WORK / "proposal.json", proposed)


def verify():
    changes = read(WORK / "proposal.json", {}).get("changes", [])
    for attempt in range(6):
        problems = []
        for item in changes:
            observed = observe(item["url"])
            expected = item["expected"]
            if not field_matches(expected, observed) or ("status" not in expected and observed["status"] != 200):
                problems.append(item["url"])
        for path in PRIORITY:
            result, _ = fetch(ORIGIN + path)
            if result["status"] != 200:
                problems.append(ORIGIN + path)
        if not problems:
            return
        print("Live proof failed on:", ", ".join(sorted(set(problems))), flush=True)
        if attempt < 5:
            time.sleep(10)
    raise ValueError("Rendered production proof or priority health checks failed")


def record(directory, status):
    evidence = read(WORK / "evidence.json", {})
    proposal = read(WORK / "proposal.json", {})
    history = state()
    gsc = evidence.get("gsc", {})
    day = evidence.get("date", str(datetime.now(ZoneInfo("America/New_York")).date()))
    pending = history.setdefault("pending_title", {})
    blog = history.setdefault("blog", {})
    for url in gsc.get("title_followups", {}):
        pending.pop(url, None)
    changes = proposal.get("changes", [])
    if status == "deployed and verified":
        for item in changes:
            if item.get("title_changed"):
                pending[item["url"]] = {"published": day, "baseline": item["baseline"]}
            if item.get("stage") == "blog-refresher":
                blog[item["url"]] = {"query": item["query"], "baseline": item["blog_baseline"]}
    audit = evidence.get("audit", {})
    default = {
        "seo-autopilot": "Public audit completed" if audit else "Evidence collection failed",
        "blog-refresher": gsc.get("unchecked", "No validated model proposal"),
        "seo-title-optimization": gsc.get("unchecked", "No validated model proposal"),
    }
    report = {
        "date": day, "status": status,
        "run": f"https://github.com/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{os.environ['GITHUB_RUN_ID']}",
        "audit": {**audit, "issues": audit.get("issues", [])[:100]},
        "stages": {**default, **proposal.get("stages", {})},
        "blockers": {**{key: value["unchecked"] for key, value in {
            "Search Console": gsc, "Analytics": evidence.get("analytics", {}),
            "SERP": evidence.get("serp", {})}.items() if "unchecked" in value},
            **({"Codex": "Missing OPENAI_API_KEY"} if os.getenv("CODEX_READY") != "true" else {}),
            **({"Cloudflare": "Missing CLOUDFLARE_API_TOKEN"} if os.getenv("CF_READY") != "true" else {})},
        "changed_urls": [item["url"] for item in changes] if status == "deployed and verified" else [],
        "changes": changes if status == "deployed and verified" else [],
        "index_inspections": gsc.get("index_inspections", []),
        "title_followups": gsc.get("title_followups", {}),
        "blog_tracking": gsc.get("blog_tracking", []),
        "keyword_overlaps": gsc.get("overlap", []),
        "analytics": evidence.get("analytics", {}),
        "ai_visibility": evidence.get("ai", []),
    }
    run = f"{day}-{os.environ['GITHUB_RUN_ID']}-{os.getenv('GITHUB_RUN_ATTEMPT', '1')}"
    write(Path(directory) / "runs" / (run + ".json"), report)
    write(Path(directory) / "state.json", history)
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
        summary.write(f"## Daily SEO · {day}\n\nDeployment status: **{status}**\n\n")
        summary.write(f"Pages checked: {audit.get('pages_checked', 0)}. "
                      f"Internal links checked: {audit.get('internal_targets_checked', 0)}. "
                      f"Findings: {len(audit.get('issues', []))}.\n\n")
        for stage, detail in report["stages"].items():
            summary.write(f"- **{stage}** — {str(detail)[:500]}\n")
        for source, reason in report["blockers"].items():
            summary.write(f"- **{source}** — {reason}\n")
        for url in report["changed_urls"]:
            summary.write(f"- Published and verified: {url}\n")


if __name__ == "__main__":
    command = sys.argv[1]
    if command == "patch":
        stage_patch()
    elif command == "validate":
        validate()
    elif command == "verify":
        verify()
    elif command == "record":
        record(sys.argv[2], sys.argv[3])
