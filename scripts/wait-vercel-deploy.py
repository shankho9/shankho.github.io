#!/usr/bin/env python3
"""Poll Vercel deployments until the given commit SHA is READY (or fail)."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request


def env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def fetch_deployments(token: str, project_id: str, team_id: str) -> list[dict]:
    qs = f"projectId={project_id}&limit=20"
    if team_id:
        qs += f"&teamId={team_id}"
    url = f"https://api.vercel.com/v6/deployments?{qs}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return data.get("deployments") or []


def match_deployment(deployments: list[dict], sha: str) -> tuple[str, str, str]:
    for d in deployments:
        meta = d.get("meta") or {}
        git = d.get("gitSource") or {}
        commit = (
            meta.get("githubCommitSha") or meta.get("commitSha") or git.get("sha") or ""
        )
        if commit != sha:
            continue
        target = d.get("target") or meta.get("target") or ""
        state = d.get("readyState") or d.get("state") or ""
        url = d.get("url") or ""
        return state, target, url
    return "PENDING", "", ""


def main() -> int:
    token = env("VERCEL_TOKEN")
    project_id = env("VERCEL_PROJECT_ID")
    team_id = env("VERCEL_TEAM_ID")
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

    max_attempts = int(env("MAX_ATTEMPTS", "60"))
    sleep_seconds = int(env("SLEEP_SECONDS", "20"))

    print(f"Waiting for Vercel deploy of commit {sha}...")

    for attempt in range(1, max_attempts + 1):
        try:
            deployments = fetch_deployments(token, project_id, team_id)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            print(f"::warning::Vercel API HTTP {exc.code}: {body[:300]}")
            time.sleep(sleep_seconds)
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"::warning::Vercel API request failed: {exc}")
            time.sleep(sleep_seconds)
            continue

        state, target, url = match_deployment(deployments, sha)
        print(
            f"[attempt {attempt}/{max_attempts}] "
            f"state={state} target={target or 'n/a'} url={url or 'n/a'}"
        )

        if state == "READY":
            print(f"Vercel deploy READY: https://{url}" if url else "Vercel deploy READY")
            return 0

        if state in {"ERROR", "CANCELED"}:
            print(f"::error::Vercel deploy ended with state={state}", file=sys.stderr)
            return 1

        time.sleep(sleep_seconds)

    print(f"::error::Timed out waiting for Vercel deploy of {sha}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
