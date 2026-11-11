
# Daily SEO for running.services

The **Running Services Daily SEO** Codex automation runs on the signed-in computer at 7:15 a.m. America/New_York. It uses the existing Codex, GitHub and Wrangler sign-ins. The computer and Codex session must be available for the local run. The [history branch](https://github.com/biserd/Running-Directory/tree/seo-run-history) holds the run log and pending measurements.

[GitHub Actions](https://github.com/biserd/Running-Directory/actions/workflows/daily-seo.yml) remains a manual fallback. Use **Run workflow** on the default branch only when the local automation is idle.

The three skills are vendored byte for byte at the commit in skill-lock.json. The prompt explicitly invokes all three and supplies the repository's autonomous publishing instructions. Build and deploy use the same Vite, TypeScript, and Wrangler commands as the production Worker. A change must pass build and production proof checks. On a protected branch, the workflow uses an ordinary PR and auto-merge when GitHub permissions and branch rules allow it. Set `SEO_GITHUB_TOKEN` only if the repository's workflow token cannot open PRs or trigger required checks. In that case use a fine-grained credential with this repository's Contents and Pull requests write permissions, and enable repository auto-merge. The current default branch accepts direct pushes.

## Local runtime

Use Node 24 with the repository's locked dependencies. On Windows, if Python does not have the IANA time zone database, install `tzdata` into a checkout-local virtual environment or add a local package directory to `PYTHONPATH` for the evidence script. The audit and technical fixes can run with the existing sign-ins. For editorial metrics and visibility tracking, use the existing signed-in data integrations when accessible and record unavailable sources as unchecked.

## Optional GitHub fallback credentials

These apply to the separate GitHub-hosted fallback. The local Codex automation does not use the repository's Actions secrets. See [Actions secrets and variables](https://github.com/biserd/Running-Directory/settings/secrets/actions) if running the fallback.

| Name | Type | Purpose |
| --- | --- | --- |
| OPENAI_API_KEY | Secret | Official Codex Action. Without it only the deterministic audit and build run. |
| CLOUDFLARE_API_TOKEN | Secret | Wrangler deployment and rollback for this Worker. Use a scoped Cloudflare Workers deployment token. |
| CLOUDFLARE_ACCOUNT_ID | Variable | Cloudflare account that owns running-directory. |
| SEO_GSC_SERVICE_ACCOUNT_JSON | Secret | Google service account JSON. Enable the Search Console API and grant the service account access to sc-domain:running.services. |
| SERPAPI_KEY | Secret | Actual Google organic results and AI Overviews. |
| PERPLEXITY_API_KEY | Secret | Perplexity Sonar observations and cited URLs. |
| SEO_GA4_PROPERTY_ID | Variable | GA4 numeric property ID. Enable the Analytics Data API and grant the same Google service account Viewer access. |
| SEO_GITHUB_TOKEN | Optional secret | PR and required check fallback for protected branches. |

The production audit checks sitemap integrity, priority routes, and rotating samples of up to 150 additional sitemap pages and 90 internal destinations. Search Console URL Inspection checks five core pages. An unavailable surface is logged as unchecked. Consumer ChatGPT Search currently has no hosted connector here. Sonar observations describe the API surface. The keyword map is in this branch, while the history branch records Search Console overlap observations and post-release measurements. Logged search metrics and query targets are aggregate data visible in this public repository.
