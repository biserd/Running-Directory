
#!/usr/bin/env bash
set -euo pipefail

wrangler=./node_modules/.bin/wrangler
status=.seo-work/deployment-status
default_ref="refs/heads/$DEFAULT_BRANCH"
branch="seo/run-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"

set_status() {
  printf '%s\n' "$1" > "$status"
  echo "$1"
}

publish_commit() {
  local subject=$1 target_branch=$2 source_commit pr merge_commit
  source_commit=$(git rev-parse HEAD)
  git fetch --no-tags origin "$default_ref"
  if [[ "$(git rev-parse FETCH_HEAD)" != "$(git rev-parse HEAD^)" ]]; then
    echo "Production branch changed since the baseline was captured."
    return 1
  fi
  if git push origin "HEAD:$default_ref" >.seo-work/push.log 2>&1; then
    return
  fi
  cat .seo-work/push.log
  if ! grep -Eq 'GH006|GH013|protected branch|pull request' .seo-work/push.log; then
    return 1
  fi
  git push origin "HEAD:refs/heads/$target_branch" || return 1
  pr=$(gh pr create --repo "$GITHUB_REPOSITORY" --head "$target_branch" --base "$DEFAULT_BRANCH" \
    --title "$subject" --body "Automated SEO change. TypeScript and production build passed. Run: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID") || return 1
  gh pr merge "$pr" --auto --squash --match-head-commit "$source_commit" || return 1
  for _ in {1..30}; do
    merge_commit=$(gh pr view "$pr" --json mergeCommit --jq '.mergeCommit.oid // empty') || return 1
    if [[ -n "$merge_commit" ]]; then
      git fetch --no-tags origin "$default_ref" || return 1
      [[ "$(git rev-parse FETCH_HEAD)" == "$merge_commit" ]] || return 1
      [[ "$(git rev-parse "$merge_commit^{tree}")" == "$(git rev-parse HEAD^{tree})" ]] || return 1
      # Keep the already validated build, whose source tree is identical.
      git reset --soft "$merge_commit" || return 1
      return
    fi
    sleep 20
  done
  gh pr merge "$pr" --disable-auto || true
  echo "PR checks did not finish within ten minutes: $pr"
  return 1
}

active_version() {
  "$wrangler" deployments status --json | python -c '
import json, re, sys
data = json.load(sys.stdin)
versions = data.get("versions", [])
if len(versions) != 1 or versions[0].get("percentage") != 100:
    sys.exit("Expected one Cloudflare version receiving 100% of traffic")
version = versions[0]["version_id"]
if not re.fullmatch("[0-9a-f-]{36}", version):
    sys.exit("Unexpected Cloudflare version identifier")
print(version)'
}

if git diff --cached --quiet; then
  if [[ "$CODEX_READY" == true ]]; then
    set_status "no qualifying edits"
  else
    set_status "audit and build completed; editorial stage blocked"
  fi
  exit 0
fi

if git diff --cached --quiet -- . ':!seo/keyword-map.csv'; then
  git commit -m "Maintain SEO keyword map"
  set_status "keyword map update awaiting publication"
  publish_commit "Maintain SEO keyword map" "$branch"
  set_status "keyword map updated; no production deployment"
  exit 0
fi

if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
  set_status "deployment blocked: CLOUDFLARE_API_TOKEN is missing"
  exit 0
fi
set_status "deployment blocked: Cloudflare preflight failed"
previous=$(active_version)

git commit -m "Publish verified daily SEO edits"
set_status "source publication blocked"
publish_commit "Publish verified daily SEO edits" "$branch"
published=$(git rev-parse HEAD)
set_status "deployment or live verification failed"
if "$wrangler" deploy --message "Daily SEO $published" 2>&1 | tee .seo-work/wrangler-deploy.log &&
  python script/seo_release.py verify; then
  set_status "deployed and verified"
  exit 0
fi

current=$(active_version || true)
if [[ -z "$current" ]]; then
  set_status "deployment failed and the active version could not be verified"
  exit 1
fi
if [[ "$current" != "$previous" ]]; then
  deployed=$(sed -nE 's/^Current Version ID: ([0-9a-f-]{36}).*/\1/p' .seo-work/wrangler-deploy.log | tail -1)
  if [[ "$current" != "$deployed" ]]; then
    set_status "production version changed outside this release or the deploy could not confirm its version"
    exit 1
  fi
  if ! "$wrangler" rollback "$previous" --message "Daily SEO $published failed live verification"; then
    set_status "rollback failed; inspect Cloudflare deployment"
    exit 1
  fi
  if [[ "$(active_version)" != "$previous" ]]; then
    set_status "rollback version could not be verified"
    exit 1
  fi
fi
set_status "production restored; source revert pending"
git revert --no-edit "$published"
publish_commit "Revert failed daily SEO release" "$branch-revert"
set_status "reverted after deployment or live verification failure"
exit 1
