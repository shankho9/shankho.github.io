#!/usr/bin/env python3
"""Poll Vercel deployments until the given commit SHA is READY (or fail)."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def api_get(token: str, path: str, query: dict[str, str] | None = None) -> dict:
    qs = urllib.parse.urlencode({k: v for k, v in (query or {}).items() if v})
    url = f"https://api.vercel.com{path}"
    if qs:
        url = f"{url}?{qs}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def resolve_team_id(token: str, project_id: str, team_id: str) -> str:
    """
    Ensure we can see the project. Team projects require teamId on list APIs;
    without it Vercel often returns an empty deployment list (silent timeout).
    Prefer explicit VERCEL_TEAM_ID; otherwise use project.accountId when available.
    """
    query: dict[str, str] = {}
    if team_id:
        query["teamId"] = team_id

    try:
        project = api_get(token, f"/v9/projects/{urllib.parse.quote(project_id)}", query)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code in {403, 404} and not team_id:
            print(
                "::error::Vercel project not found without a team id. "
                "This project is likely under a Vercel team — set secret VERCEL_TEAM_ID "
                "(Team Settings → Team ID) and re-run.",
                file=sys.stderr,
            )
            print(f"API response: {body[:400]}", file=sys.stderr)
            raise SystemExit(1) from exc
        print(f"::error::Failed to load Vercel project ({exc.code}): {body[:400]}", file=sys.stderr)
        raise SystemExit(1) from exc

    account_id = (project.get("accountId") or "").strip()
    if team_id:
        return team_id

    # Team-owned projects need teamId on /v6/deployments; accountId is that team id.
    # Personal projects usually work without teamId — still pass accountId when present
    # so list calls are scoped correctly.
    if account_id:
        print(f"Using Vercel accountId as teamId for API calls: {account_id}")
        return account_id

    print(
        "::warning::No VERCEL_TEAM_ID and project has no accountId; "
        "listing deployments without teamId.",
    )
    return ""


def fetch_deployments(token: str, project_id: str, team_id: str) -> list[dict]:
    query: dict[str, str] = {"projectId": project_id, "limit": "20"}
    if team_id:
        query["teamId"] = team_id
    data = api_get(token, "/v6/deployments", query)
    return data.get("deployments") or []


def deployment_commit(d: dict) -> str:
    meta = d.get("meta") or {}
    git = d.get("gitSource") or {}
    return meta.get("githubCommitSha") or meta.get("commitSha") or git.get("sha") or ""


def match_deployment(deployments: list[dict], sha: str) -> tuple[str, str, str]:
    for d in deployments:
        if deployment_commit(d) != sha:
            continue
        meta = d.get("meta") or {}
        target = d.get("target") or meta.get("target") or ""
        state = d.get("readyState") or d.get("state") or ""
        url = d.get("url") or ""
        return state, target, url
    return "PENDING", "", ""


def find_superseding_production_deploy(
    deployments: list[dict], sha: str
) -> tuple[str, str, str] | None:
    """
    When Vercel cancels a queued production deploy because a newer commit was
    pushed, another production deploy (QUEUED/BUILDING/READY) usually appears
    for a different SHA. Treat that as superseded rather than a hard failure.
    """
    active = {"QUEUED", "BUILDING", "INITIALIZING", "READY"}
    for d in deployments:
        other = deployment_commit(d)
        if not other or other == sha:
            continue
        meta = d.get("meta") or {}
        target = (d.get("target") or meta.get("target") or "").lower()
        if target and target != "production":
            continue
        state = d.get("readyState") or d.get("state") or ""
        if state not in active:
            continue
        return other, state, d.get("url") or ""
    return None


def main() -> int:
    token = env("VERCEL_TOKEN")
    project_id = env("VERCEL_PROJECT_ID")
    explicit_team_id = env("VERCEL_TEAM_ID")
    sha = env("SHA") or env("GITHUB_SHA")

    if not token or not project_id:
        print(
            "::error::Missing VERCEL_TOKEN or VERCEL_PROJECT_ID. "
            "Add them under repo Settings → Secrets and variables → Actions.",
            file=sys.stderr,
        )
        return 1

    if not sha:
        print("::error::Missing SHA / GITHUB_SHA", file=sys.stderr)
        return 1

    try:
        team_id = resolve_team_id(token, project_id, explicit_team_id)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 1

    max_attempts = int(env("MAX_ATTEMPTS", "60"))
    sleep_seconds = int(env("SLEEP_SECONDS", "20"))
    empty_streak = 0

    print(f"Waiting for Vercel deploy of commit {sha}...")

    for attempt in range(1, max_attempts + 1):
        try:
            deployments = fetch_deployments(token, project_id, team_id)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code in {403, 404} and not explicit_team_id:
                print(
                    "::error::Deployments API denied/not found. "
                    "If this is a team project, set VERCEL_TEAM_ID.",
                    file=sys.stderr,
                )
                print(f"API response: {body[:400]}", file=sys.stderr)
                return 1
            print(f"::warning::Vercel API HTTP {exc.code}: {body[:300]}")
            time.sleep(sleep_seconds)
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"::warning::Vercel API request failed: {exc}")
            time.sleep(sleep_seconds)
            continue

        if not deployments:
            empty_streak += 1
            # Empty lists without any team/account scope usually mean a team project
            # queried without teamId — fail fast instead of timing out.
            if empty_streak >= 3 and not team_id:
                print(
                    "::error::Vercel returned no deployments repeatedly and no team id "
                    "is configured. Set secret VERCEL_TEAM_ID for team projects.",
                    file=sys.stderr,
                )
                return 1
        else:
            empty_streak = 0

        state, target, url = match_deployment(deployments, sha)
        print(
            f"[attempt {attempt}/{max_attempts}] "
            f"state={state} target={target or 'n/a'} url={url or 'n/a'} "
            f"(listed={len(deployments)})"
        )

        if state == "READY":
            print(f"Vercel deploy READY: https://{url}" if url else "Vercel deploy READY")
            return 0

        if state == "CANCELED":
            superseding = find_superseding_production_deploy(deployments, sha)
            if superseding:
                other_sha, other_state, other_url = superseding
                print(
                    f"::warning::Deploy for {sha} was CANCELED — superseded by "
                    f"{other_sha[:12]}… (state={other_state}"
                    + (f", url={other_url}" if other_url else "")
                    + "). A newer push will wait for that deploy; treating as OK."
                )
                return 0
            print(
                "::error::Vercel deploy ended with state=CANCELED "
                "(no newer production deploy found).",
                file=sys.stderr,
            )
            return 1

        if state == "ERROR":
            print(f"::error::Vercel deploy ended with state={state}", file=sys.stderr)
            return 1

        time.sleep(sleep_seconds)

    print(f"::error::Timed out waiting for Vercel deploy of {sha}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
