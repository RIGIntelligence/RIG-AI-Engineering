#!/usr/bin/env python3
"""RIG Prompt Master with local and API-backed context adapters.

This is the daily front door for RIG v15: give it a rough prompt from an
argument, file, or stdin, and it returns a safer, more useful prompt that is
grounded in Mike's current work context. It is deterministic by default and
performs read-only context collection only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen

VERSION = "15.3.0"
HOME = Path.home()
RIG_HOME = HOME / ".rig"
HISTORY_FILE = RIG_HOME / "prompt-master-history.jsonl"
SIO_ROOT = HOME / "Desktop" / "Startup-Intelligence-OS"
QNAP_DOC = SIO_ROOT / "docs" / "operator" / "qnap-rag-data-plane-v3.md"
CONTEXT_PACK = HOME / ".rig" / "runtime" / "bin" / "rig-context-pack"

SECRET_PATTERNS = [
    re.compile(r"(?i)\b(api[_-]?key|token|secret|password|passwd|cookie)\b\s*[:=]\s*['\"]?[^'\"\s]+"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bglpat-[A-Za-z0-9_\-]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}\b"),
    re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._\-]{12,}\b"),
]

PROMPT_MODES: dict[str, dict[str, str]] = {
    "auto": {
        "label": "Auto detect",
        "description": "Infer the target surface from the prompt text.",
    },
    "general": {
        "label": "General prompt",
        "description": "Improve any prompt with context, constraints, acceptance criteria, and proof.",
    },
    "claude-design": {
        "label": "Claude Design",
        "description": "Rewrite prompts for Claude Design, Figma-style design files, screenshots, page polish, and walkthrough work.",
    },
    "ui-walkthrough": {
        "label": "UI walkthrough",
        "description": "Create a page-by-page polish loop with a visible todo list and acceptance checks.",
    },
    "coding-agent": {
        "label": "Coding agent",
        "description": "Rewrite prompts for Codex, Claude Code, OpenCode, Hermes, Jake, or Pi/PyCoding.",
    },
    "browser-agent": {
        "label": "Browser agent",
        "description": "Rewrite prompts for browser automation, screenshots, Playwright checks, and approval-gated actions.",
    },
    "research": {
        "label": "Research",
        "description": "Rewrite prompts for source-backed research, citations, synthesis, and confidence scoring.",
    },
    "product-strategy": {
        "label": "Product strategy",
        "description": "Rewrite prompts for product, business, positioning, roadmap, or operator decisions.",
    },
    "api-backend": {
        "label": "API/backend",
        "description": "Rewrite prompts for backend implementation, APIs, context adapters, and integration contracts.",
    },
}

ENHANCEMENT_PACKS: dict[str, dict[str, str]] = {
    "rigforge-contract": {
        "label": "RigForge DoneContract",
        "description": "Add objective, artifacts, acceptance criteria, forbidden actions, and GEV roles.",
    },
    "v15-gates": {
        "label": "V15 gates",
        "description": "Carry Gate 00-12 safety, proof, rollback, and verification checks into the prompt.",
    },
    "context-grounding": {
        "label": "Context grounding",
        "description": "Use worktree, QNAP policy, GitHub, Gitea, Recall, and local context pack before inventing.",
    },
    "claude-design-walkthrough": {
        "label": "Claude Design walkthrough",
        "description": "Force entry-screen first, page-by-page polish, and no jumping around.",
    },
    "todo-list": {
        "label": "Todo list",
        "description": "Ask the target assistant to create and maintain a visible checklist.",
    },
    "acceptance-tests": {
        "label": "Acceptance checks",
        "description": "Name the user-visible checks that prove the prompt was satisfied.",
    },
    "screenshot-qa": {
        "label": "Screenshot QA",
        "description": "Use screenshots or browser checks to verify layout, overflow, and polish.",
    },
    "proofpacket": {
        "label": "ProofPacket",
        "description": "End with sources, files changed, checks run, skipped checks, risks, and next action.",
    },
    "safety-boundaries": {
        "label": "Approval boundaries",
        "description": "Block secrets, destructive actions, private export, external sends, and public exposure without approval.",
    },
    "citations": {
        "label": "Citations",
        "description": "Require source links, file paths, commit IDs, API responses, or screenshot paths where relevant.",
    },
    "implementation-plan": {
        "label": "Implementation plan",
        "description": "Convert the prompt into deterministic phases before agentic execution.",
    },
    "design-polish": {
        "label": "Design polish",
        "description": "Tighten copy, hierarchy, spacing, responsive behavior, and RIG brand consistency.",
    },
    "api-ready": {
        "label": "API ready",
        "description": "Make output structured enough to call through an API or MCP tool.",
    },
}

DEFAULT_MODE_ENHANCEMENTS: dict[str, list[str]] = {
    "general": ["rigforge-contract", "v15-gates", "context-grounding", "todo-list", "acceptance-tests", "proofpacket", "safety-boundaries"],
    "claude-design": [
        "rigforge-contract",
        "v15-gates",
        "context-grounding",
        "claude-design-walkthrough",
        "todo-list",
        "acceptance-tests",
        "screenshot-qa",
        "design-polish",
        "proofpacket",
        "safety-boundaries",
    ],
    "ui-walkthrough": [
        "rigforge-contract",
        "context-grounding",
        "claude-design-walkthrough",
        "todo-list",
        "acceptance-tests",
        "screenshot-qa",
        "design-polish",
        "proofpacket",
        "safety-boundaries",
    ],
    "coding-agent": ["rigforge-contract", "v15-gates", "context-grounding", "acceptance-tests", "implementation-plan", "proofpacket", "safety-boundaries"],
    "browser-agent": ["rigforge-contract", "v15-gates", "context-grounding", "acceptance-tests", "screenshot-qa", "proofpacket", "safety-boundaries"],
    "research": ["rigforge-contract", "context-grounding", "citations", "acceptance-tests", "proofpacket", "safety-boundaries"],
    "product-strategy": ["rigforge-contract", "context-grounding", "todo-list", "citations", "acceptance-tests", "proofpacket", "safety-boundaries"],
    "api-backend": ["rigforge-contract", "v15-gates", "context-grounding", "acceptance-tests", "implementation-plan", "api-ready", "proofpacket", "safety-boundaries"],
}

RIGFORGE_PHASES: list[dict[str, str]] = [
    {"id": "P1", "name": "Bootstrap and Doctrine", "output": "Load RIG doctrine, user objective, and the target prompt surface."},
    {"id": "P2", "name": "Environment Validation", "output": "Check local context adapters and record missing context explicitly."},
    {"id": "P3", "name": "Runtime Kernel", "output": "Choose deterministic A1 work before agentic execution."},
    {"id": "P4", "name": "Control Plane Registries", "output": "Use v15 resources, personas, questions, and gates where relevant."},
    {"id": "P5", "name": "GEV Loop and DoneContract", "output": "Name generator, verifier, evaluator, artifacts, criteria, and forbidden actions."},
    {"id": "P6", "name": "Harness Adapter", "output": "Shape the prompt for the target harness: Claude Design, coding agent, browser agent, or API."},
    {"id": "P7", "name": "Cockpit and Retrofit", "output": "Produce ProofPacket-ready evidence, risks, rollback, and next experiment."},
]

RIGFORGE_FORBIDDEN_ACTIONS: list[str] = [
    "Do not print secrets, tokens, cookies, browser session state, or raw credential files.",
    "Do not perform external sends, account changes, public exposure, private data export, payments, or destructive actions without Mike approval.",
    "Do not clone or execute third-party repositories until source, license, pinning, sandbox, and proof are recorded.",
    "Do not claim completion without concrete proof: commands, files, screenshots, API responses, or citations.",
    "Do not let the generator self-verify its own work.",
]


@dataclass
class ContextSource:
    name: str
    status: str
    summary: str
    evidence: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_text(value: Any, limit: int = 600) -> str:
    text = str(value).replace("\x00", "")
    for pattern in SECRET_PATTERNS:
        text = pattern.sub("<redacted-secret>", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        return text[: limit - 3].rstrip() + "..."
    return text


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 8) -> tuple[int, str, str]:
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=os.environ.copy(),
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except subprocess.TimeoutExpired:
        return 124, "", f"Timed out after {timeout}s"
    except FileNotFoundError:
        return 127, "", f"Command not found: {cmd[0]}"
    except Exception as exc:  # pragma: no cover - defensive guard
        return 1, "", str(exc)


def read_prompt(args: argparse.Namespace) -> str:
    parts: list[str] = []

    if args.file:
        prompt_file = Path(args.file).expanduser()
        if not prompt_file.exists():
            raise SystemExit(f"ERROR: Prompt file not found: {prompt_file}")
        parts.append(prompt_file.read_text(encoding="utf-8", errors="replace"))

    if args.prompt:
        parts.append(" ".join(args.prompt))

    if not sys.stdin.isatty():
        stdin_value = sys.stdin.read()
        if stdin_value.strip():
            parts.append(stdin_value)

    prompt = "\n\n".join(part.strip() for part in parts if part and part.strip()).strip()
    if not prompt and not args.status:
        raise SystemExit("ERROR: Provide a prompt argument, --file prompt.md, or pipe prompt text on stdin.")
    return prompt


def parse_remote_slug(remote_url: str) -> tuple[str, str] | None:
    clean = remote_url.strip()
    if not clean:
        return None
    if clean.endswith(".git"):
        clean = clean[:-4]

    if clean.startswith("git@"):
        match = re.search(r":([^/]+)/([^/]+)$", clean)
        if match:
            return match.group(1), match.group(2)
        return None

    parsed = urlparse(clean)
    if parsed.path:
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) >= 2:
            return parts[-2], parts[-1]
    return None


def git_context(cwd: Path) -> ContextSource:
    code, root, _ = run_cmd(["git", "rev-parse", "--show-toplevel"], cwd, timeout=4)
    if code != 0:
        return ContextSource(
            name="work_surface",
            status="partial",
            summary=f"Current directory is not a git worktree: {cwd}",
            evidence=[f"cwd: {cwd}"],
            missing=["git worktree"],
        )

    root_path = Path(root)
    _, branch, _ = run_cmd(["git", "branch", "--show-current"], root_path, timeout=4)
    _, commit, _ = run_cmd(["git", "rev-parse", "--short", "HEAD"], root_path, timeout=4)
    _, status_out, _ = run_cmd(["git", "status", "--short"], root_path, timeout=5)
    _, remotes_out, _ = run_cmd(["git", "remote", "-v"], root_path, timeout=5)
    diff_code, recent_out, _ = run_cmd(["git", "diff", "--name-only", "HEAD~5"], root_path, timeout=6)
    if diff_code != 0 or not recent_out:
        _, recent_out, _ = run_cmd(["git", "ls-files"], root_path, timeout=6)

    status_lines = [line for line in status_out.splitlines() if line.strip()]
    recent_files = [line for line in recent_out.splitlines() if line.strip()][:12]
    remote_lines = []
    for line in remotes_out.splitlines():
        if "(fetch)" in line:
            remote_lines.append(safe_text(line.replace("\t", " "), 240))

    evidence = [
        f"repo: {root_path}",
        f"branch: {branch or '(detached/unknown)'}",
        f"commit: {commit or 'unknown'}",
        f"dirty files: {len(status_lines)}",
    ]
    if recent_files:
        evidence.append("recent files: " + ", ".join(recent_files[:8]))
    if remote_lines:
        evidence.append("remotes: " + "; ".join(remote_lines[:4]))

    return ContextSource(
        name="work_surface",
        status="ok",
        summary="Current git worktree, branch, commit, remotes, and recent files were collected read-only.",
        evidence=evidence,
        details={
            "repo": str(root_path),
            "branch": branch,
            "commit": commit,
            "dirty_count": len(status_lines),
            "recent_files": recent_files,
            "remotes": remote_lines,
        },
    )


def qnap_context() -> ContextSource:
    configured_mount = os.environ.get("RIG_QNAP_MOUNT", "").strip()
    candidates = []
    if configured_mount:
        candidates.append(Path(configured_mount).expanduser())
    candidates.extend(
        [
            Path("/Volumes/RIG"),
            Path("/Volumes/QNAP"),
            Path("/Volumes/RIG-QNAP"),
            Path("/share/ZFS18_DATA/RIG"),
        ]
    )
    found_roots = []
    for candidate in candidates:
        if candidate.exists():
            found_roots.append(candidate)

    evidence: list[str] = []
    missing: list[str] = []
    details: dict[str, Any] = {
        "default_ip": os.environ.get("RIG_QNAP_IP", "192.168.68.88"),
        "checked_mounts": [str(path) for path in candidates],
    }

    if found_roots:
        details["mounted_roots"] = [str(path) for path in found_roots]
        evidence.append("mounted roots: " + ", ".join(str(path) for path in found_roots[:4]))
        try:
            top_level = [child.name for child in found_roots[0].iterdir()][:10]
            if top_level:
                evidence.append("top-level entries: " + ", ".join(top_level))
                details["top_level_entries"] = top_level
        except OSError:
            pass
    else:
        missing.append("QNAP mount not found; set RIG_QNAP_MOUNT if mounted elsewhere")

    if QNAP_DOC.exists():
        doc_text = QNAP_DOC.read_text(encoding="utf-8", errors="replace")
        if "Recall writes to queue/raw first" in doc_text:
            evidence.append("policy: Recall writes to queue/raw first, never directly into trusted embeddings")
        if "/share/ZFS18_DATA/RIG/" in doc_text:
            evidence.append("layout: /share/ZFS18_DATA/RIG data-lake, databases, pipelines, daily-briefs")
        details["policy_doc"] = str(QNAP_DOC)
    else:
        missing.append(f"QNAP policy doc missing: {QNAP_DOC}")

    if found_roots:
        status = "ok"
        summary = "QNAP context is mounted and local policy is available."
    elif QNAP_DOC.exists():
        status = "partial"
        summary = "QNAP policy context is available, but no local QNAP mount was found."
    else:
        status = "missing"
        summary = "No QNAP mount or local QNAP policy context found."

    return ContextSource("qnap", status, summary, evidence, missing, details)


def github_context(cwd: Path, allow_apis: bool) -> ContextSource:
    code, root, _ = run_cmd(["git", "rev-parse", "--show-toplevel"], cwd, timeout=4)
    if code != 0:
        return ContextSource("github", "missing", "No git repo detected for GitHub context.", missing=["git repo"])

    root_path = Path(root)
    _, remotes_out, _ = run_cmd(["git", "remote", "-v"], root_path, timeout=5)
    github_remotes = []
    for line in remotes_out.splitlines():
        if "(fetch)" in line and "github.com" in line.lower():
            parts = line.split()
            if len(parts) >= 2:
                github_remotes.append(parts[1])

    if not github_remotes:
        return ContextSource(
            "github",
            "missing",
            "No GitHub remote found in this repo.",
            missing=["github.com git remote"],
        )

    evidence = ["remotes: " + ", ".join(safe_text(remote, 220) for remote in github_remotes[:4])]
    details: dict[str, Any] = {"remotes": [safe_text(remote, 220) for remote in github_remotes]}
    slug = parse_remote_slug(github_remotes[0])
    if slug:
        details["repo"] = f"{slug[0]}/{slug[1]}"
        evidence.append(f"repo slug: {slug[0]}/{slug[1]}")

    missing: list[str] = []
    if allow_apis and slug and shutil.which("gh"):
        code, out, err = run_cmd(
            [
                "gh",
                "repo",
                "view",
                f"{slug[0]}/{slug[1]}",
                "--json",
                "nameWithOwner,description,defaultBranchRef,url,isPrivate,pushedAt",
            ],
            root_path,
            timeout=8,
        )
        if code == 0 and out:
            try:
                gh_data = json.loads(out)
                details["api"] = gh_data
                evidence.append("GitHub API: gh repo view succeeded read-only")
                if gh_data.get("description"):
                    evidence.append("description: " + safe_text(gh_data["description"], 260))
            except json.JSONDecodeError:
                missing.append("GitHub API returned non-JSON output")
        else:
            missing.append("GitHub CLI API unavailable or not authenticated: " + safe_text(err or out, 220))
    elif allow_apis:
        missing.append("GitHub CLI not available for API enrichment")
    else:
        missing.append("GitHub API enrichment skipped")

    return ContextSource(
        "github",
        "ok",
        "GitHub context was collected from local remotes" + (" and gh API." if "api" in details else "."),
        evidence,
        missing,
        details,
    )


def gitea_context(cwd: Path, allow_apis: bool) -> ContextSource:
    base_url = os.environ.get("RIG_GITEA_BASE_URL", "").strip().rstrip("/")
    token = os.environ.get("RIG_GITEA_TOKEN", "").strip()
    repo_hint = os.environ.get("RIG_GITEA_REPO", "").strip()
    code, root, _ = run_cmd(["git", "rev-parse", "--show-toplevel"], cwd, timeout=4)
    if code != 0:
        return ContextSource("gitea", "missing", "No git repo detected for Gitea context.", missing=["git repo"])

    root_path = Path(root)
    _, remotes_out, _ = run_cmd(["git", "remote", "-v"], root_path, timeout=5)
    remote_candidates = []
    for line in remotes_out.splitlines():
        if "(fetch)" not in line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        remote = parts[1]
        if base_url and urlparse(base_url).hostname and urlparse(base_url).hostname in remote:
            remote_candidates.append(remote)
        elif "gitea" in remote.lower():
            remote_candidates.append(remote)

    evidence: list[str] = []
    missing: list[str] = []
    details: dict[str, Any] = {}
    if remote_candidates:
        evidence.append("remotes: " + ", ".join(safe_text(remote, 220) for remote in remote_candidates[:4]))
        details["remotes"] = [safe_text(remote, 220) for remote in remote_candidates]
    elif repo_hint:
        evidence.append("repo hint: " + safe_text(repo_hint, 160))
        details["repo_hint"] = safe_text(repo_hint, 160)
    else:
        missing.append("No Gitea remote detected")

    if not base_url:
        missing.append("Set RIG_GITEA_BASE_URL for Gitea API context")
    if base_url and not token:
        missing.append("Set RIG_GITEA_TOKEN for private Gitea API context")

    slug = parse_remote_slug(remote_candidates[0]) if remote_candidates else None
    if not slug and "/" in repo_hint:
        owner, repo = repo_hint.split("/", 1)
        if owner and repo:
            slug = (owner, repo)
    if base_url and allow_apis and slug:
        url = f"{base_url}/api/v1/repos/{quote(slug[0])}/{quote(slug[1])}"
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = "token " + token
        api_data, api_error = http_json(url, headers=headers, timeout=8)
        if api_data:
            details["repo"] = f"{slug[0]}/{slug[1]}"
            details["api"] = shrink_json(api_data)
            evidence.append("Gitea API: repo metadata fetched read-only")
            if isinstance(api_data, dict) and api_data.get("description"):
                evidence.append("description: " + safe_text(api_data["description"], 260))
        elif api_error:
            missing.append("Gitea API unavailable: " + safe_text(api_error, 220))
    elif base_url and not allow_apis:
        missing.append("Gitea API enrichment skipped")

    if "api" in details or remote_candidates or repo_hint:
        status = "ok" if "api" in details else "partial"
    else:
        status = "missing"

    return ContextSource(
        "gitea",
        status,
        "Gitea context adapter checked local remotes and optional API configuration.",
        evidence,
        missing,
        details,
    )


def recall_api_context(prompt: str, allow_apis: bool, limit: int) -> ContextSource:
    base_url = (
        os.environ.get("RIG_RECALL_API_URL", "").strip().rstrip("/")
        or os.environ.get("RECALL_API_URL", "").strip().rstrip("/")
    )
    api_key = os.environ.get("RIG_RECALL_API_KEY", "").strip() or os.environ.get("RECALL_API_KEY", "").strip()
    path = os.environ.get("RIG_RECALL_API_PATH", "/search").strip() or "/search"
    if not path.startswith("/"):
        path = "/" + path

    missing: list[str] = []
    if not base_url:
        missing.append("Set RIG_RECALL_API_URL or RECALL_API_URL")
    if not api_key:
        missing.append("Set RIG_RECALL_API_KEY or RECALL_API_KEY if the endpoint requires auth")
    if not allow_apis:
        missing.append("Recall API enrichment skipped")

    if not base_url or not allow_apis:
        return ContextSource(
            "recall_api",
            "missing",
            "Recall API context is not configured for direct API recall.",
            missing=missing,
            details={"path": path, "configured": bool(base_url)},
        )

    query = prompt.strip()[:400] or "RIG current work"
    params = urlencode({"q": query, "limit": str(limit)})
    url = f"{base_url}{path}?{params}"
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = "Bearer " + api_key

    data, error = http_json(url, headers=headers, timeout=10)
    if error:
        return ContextSource(
            "recall_api",
            "partial",
            "Recall API was configured but did not return usable results.",
            missing=missing + [safe_text(error, 260)],
            details={"path": path, "configured": True},
        )

    snippets = extract_snippets(data, limit)
    evidence = snippets if snippets else ["Recall API responded, but no title/snippet fields were detected."]
    return ContextSource(
        "recall_api",
        "ok",
        "Recall API returned read-only memory/context results.",
        evidence=evidence,
        missing=missing,
        details={"path": path, "result_count": len(snippets), "configured": True},
    )


def context_pack_context(prompt: str, include: bool, limit: int) -> ContextSource:
    if not include:
        return ContextSource(
            "rig_context_pack",
            "missing",
            "Local RIG context pack skipped.",
            missing=["--no-context-pack was used"],
        )
    if not CONTEXT_PACK.exists():
        return ContextSource(
            "rig_context_pack",
            "missing",
            "Local RIG context pack command was not found.",
            missing=[str(CONTEXT_PACK)],
        )

    with tempfile.NamedTemporaryFile(prefix="rig-context-pack-", suffix=".md", delete=False) as handle:
        output_path = Path(handle.name)

    code, out, err = run_cmd(
        [str(CONTEXT_PACK), prompt[:600] or "RIG Prompt Master context", "--output", str(output_path)],
        Path.cwd(),
        timeout=45,
    )
    if code != 0:
        try:
            output_path.unlink(missing_ok=True)
        except OSError:
            pass
        return ContextSource(
            "rig_context_pack",
            "partial",
            "Local RIG context pack command failed.",
            missing=[safe_text(err or out, 260)],
            details={"command": str(CONTEXT_PACK)},
        )

    text = output_path.read_text(encoding="utf-8", errors="replace") if output_path.exists() else ""
    evidence = summarize_context_pack(text, limit)
    details = {"path": str(output_path), "bytes": len(text.encode("utf-8"))}
    if evidence:
        return ContextSource(
            "rig_context_pack",
            "ok",
            "Local RIG context pack returned Recall, local source, and operating-process context.",
            evidence=evidence,
            details=details,
        )
    return ContextSource(
        "rig_context_pack",
        "partial",
        "Local RIG context pack ran, but no concise evidence could be extracted.",
        evidence=[f"context pack: {output_path}"],
        details=details,
    )


def http_json(url: str, headers: dict[str, str], timeout: int) -> tuple[Any | None, str | None]:
    try:
        request = Request(url, headers=headers, method="GET")
        with urlopen(request, timeout=timeout) as response:
            raw = response.read(2_000_000).decode("utf-8", errors="replace")
        try:
            return json.loads(raw), None
        except json.JSONDecodeError:
            return None, "response was not JSON"
    except HTTPError as exc:
        return None, f"HTTP {exc.code}"
    except URLError as exc:
        return None, str(exc.reason)
    except TimeoutError:
        return None, "request timed out"
    except Exception as exc:  # pragma: no cover - defensive guard
        return None, str(exc)


def shrink_json(value: Any) -> Any:
    if isinstance(value, dict):
        keep = {}
        for key in ["name", "full_name", "html_url", "ssh_url", "clone_url", "description", "private", "default_branch", "updated_at"]:
            if key in value:
                keep[key] = safe_text(value[key], 400)
        return keep or {"keys": sorted(list(value.keys()))[:20]}
    if isinstance(value, list):
        return [shrink_json(item) for item in value[:5]]
    return safe_text(value, 400)


def extract_snippets(data: Any, limit: int) -> list[str]:
    candidates: list[Any]
    if isinstance(data, list):
        candidates = data
    elif isinstance(data, dict):
        for key in ["results", "items", "data", "memories", "documents"]:
            if isinstance(data.get(key), list):
                candidates = data[key]
                break
        else:
            candidates = [data]
    else:
        candidates = []

    snippets: list[str] = []
    for item in candidates[:limit]:
        if isinstance(item, dict):
            title = item.get("title") or item.get("name") or item.get("url") or item.get("source") or "Recall result"
            body = item.get("snippet") or item.get("text") or item.get("content") or item.get("summary") or ""
            snippets.append(safe_text(f"{title}: {body}", 420))
        else:
            snippets.append(safe_text(item, 420))
    return [snippet for snippet in snippets if snippet]


def summarize_context_pack(text: str, limit: int) -> list[str]:
    evidence: list[str] = []
    if "No remote RIG knowledge endpoint responded." in text:
        evidence.append("remote RIG knowledge: no endpoint responded")
    if "No QNAP indexed search hits returned." in text:
        evidence.append("QNAP indexed search: no hits returned")

    recall_section = section_between(text, "## Recall", "## ")
    if recall_section:
        bullets = [line.strip("- ").strip() for line in recall_section.splitlines() if line.strip().startswith("- ")]
        for bullet in bullets[:limit]:
            evidence.append("Recall: " + safe_text(bullet, 360))

    local_section = section_between(text, "## Local And Mounted Sources", "## Working Process")
    if local_section:
        for source in ["obsidian", "qnap", "omniscout", "pharaon"]:
            if f"### {source}" in local_section:
                source_section = section_between(local_section, f"### {source}", "### ")
                first_hit = next((line.strip("- ").strip() for line in source_section.splitlines() if line.strip().startswith("- `")), "")
                if first_hit:
                    evidence.append(f"{source}: {safe_text(first_hit, 360)}")
                elif "No matching file hits" in source_section or "Roots: none" in source_section:
                    evidence.append(f"{source}: no matching local hits")

    return evidence[: max(limit * 2, limit)]


def section_between(text: str, start_marker: str, next_marker: str) -> str:
    start = text.find(start_marker)
    if start == -1:
        return ""
    start += len(start_marker)
    end = text.find(next_marker, start)
    if end == -1:
        return text[start:]
    return text[start:end]


def gather_context(args: argparse.Namespace, prompt: str) -> list[ContextSource]:
    cwd = Path(args.cwd).expanduser().resolve()
    if args.context == "none":
        return [ContextSource("mode", "ok", "Context collection disabled by --context none.")]

    allow_apis = not args.no_apis
    include_context_pack = not args.no_context_pack
    limit = max(1, int(args.limit))
    return [
        git_context(cwd),
        qnap_context(),
        github_context(cwd, allow_apis),
        gitea_context(cwd, allow_apis),
        recall_api_context(prompt, allow_apis, limit),
        context_pack_context(prompt, include_context_pack, limit),
    ]


def prompt_master_catalog() -> dict[str, Any]:
    """Return mode and enhancement metadata for CLI, API, MCP, and the web app."""
    return {
        "version": VERSION,
        "modes": [{"id": key, **value} for key, value in PROMPT_MODES.items()],
        "enhancement_packs": [{"id": key, **value} for key, value in ENHANCEMENT_PACKS.items()],
        "default_mode_enhancements": DEFAULT_MODE_ENHANCEMENTS,
        "rigforge_phases": RIGFORGE_PHASES,
        "rigforge_invariants": [
            "No DoneContract -> no build.",
            "Generator, verifier, and evaluator are named before work starts.",
            "Verifier differs from generator.",
            "Approval-required contracts include Human in the GEV chain.",
        ],
    }


def normalize_mode(requested_mode: str | None) -> str:
    mode = (requested_mode or "auto").strip().lower().replace("_", "-")
    return mode if mode in PROMPT_MODES else "auto"


def infer_prompt_mode(prompt: str, requested_mode: str | None = "auto") -> str:
    requested = normalize_mode(requested_mode)
    if requested != "auto":
        return requested
    text = prompt.lower()
    if any(token in text for token in ["claude design", "design prompt", "figma", "screenshot", "walkthrough.html", "design files"]):
        return "claude-design"
    if any(token in text for token in ["walkthrough", "entry point", "page by page", "each page", "polish"]):
        return "ui-walkthrough"
    if any(token in text for token in ["browser", "playwright", "selenium", "click", "form", "screenshot qa"]):
        return "browser-agent"
    if any(token in text for token in ["api", "backend", "endpoint", "server", "database", "qnap", "recall", "gitea"]):
        return "api-backend"
    if any(token in text for token in ["fix", "bug", "test", "refactor", "code", "commit", "repo"]):
        return "coding-agent"
    if any(token in text for token in ["research", "compare", "find", "investigate", "source", "citation"]):
        return "research"
    if any(token in text for token in ["strategy", "roadmap", "positioning", "business", "customer", "market"]):
        return "product-strategy"
    return "general"


def normalize_enhancements(values: list[str] | tuple[str, ...] | None, mode: str) -> list[str]:
    raw_values: list[str] = []
    for value in values or []:
        raw_values.extend(part.strip() for part in str(value).split(","))
    if not raw_values:
        raw_values = DEFAULT_MODE_ENHANCEMENTS.get(mode, DEFAULT_MODE_ENHANCEMENTS["general"])

    normalized: list[str] = []
    for value in raw_values:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        if not slug:
            continue
        if slug == "walkthrough":
            slug = "claude-design-walkthrough"
        if slug == "contract":
            slug = "rigforge-contract"
        if slug == "proof":
            slug = "proofpacket"
        if slug not in normalized:
            normalized.append(slug)
    return normalized


def mode_label(mode: str) -> str:
    return PROMPT_MODES.get(mode, PROMPT_MODES["general"])["label"]


def pack_label(pack_id: str) -> str:
    return ENHANCEMENT_PACKS.get(pack_id, {"label": pack_id.replace("-", " ").title()})["label"]


def needs_human_approval(prompt: str, mode: str) -> bool:
    text = prompt.lower()
    risky_tokens = [
        "deploy",
        "release",
        "publish",
        "delete",
        "payment",
        "email",
        "calendar",
        "send",
        "login",
        "credential",
        "account",
        "public",
        "private data",
        "destructive",
    ]
    return mode == "browser-agent" or any(token in text for token in risky_tokens)


def build_prompt_master_contract(
    original_prompt: str,
    sources: list[ContextSource],
    mode: str,
    enhancements: list[str],
    screenshot_note: str = "",
) -> dict[str, Any]:
    approval_required = needs_human_approval(original_prompt, mode)
    run_id = "prompt-master-" + sha256_text(f"{mode}\n{original_prompt}\n{utc_now()[:10]}")[:12]
    context_names = [source.name for source in sources if source.status in {"ok", "partial"}]
    missing_names = [source.name for source in sources if source.status not in {"ok", "partial"} or source.missing]

    required_artifacts = [
        {"name": "fixed_prompt", "type": "markdown", "required": True},
        {"name": "context_map", "type": "source_summary", "required": True},
        {"name": "acceptance_criteria", "type": "checklist", "required": True},
        {"name": "approval_boundaries", "type": "safety_contract", "required": True},
        {"name": "proofpacket_summary", "type": "evidence_plan", "required": True},
    ]
    if "claude-design-walkthrough" in enhancements or mode in {"claude-design", "ui-walkthrough"}:
        required_artifacts.append({"name": "page_walkthrough_todo", "type": "design_workflow", "required": True})
    if "screenshot-qa" in enhancements:
        required_artifacts.append({"name": "screenshot_or_browser_qa_plan", "type": "verification_plan", "required": True})
    if "api-ready" in enhancements:
        required_artifacts.append({"name": "api_payload_shape", "type": "integration_contract", "required": True})

    acceptance_criteria = [
        "The fixed prompt preserves the original user intent and removes ambiguity.",
        "The fixed prompt names target surface, context sources, missing context, and explicit assumptions.",
        "The fixed prompt includes acceptance criteria, verification evidence, and ProofPacket summary requirements.",
        "The fixed prompt blocks secrets, destructive actions, external sends, account changes, public exposure, and private export without approval.",
        "The contract names generator, verifier, and evaluator with no self-verification.",
    ]
    if mode in {"claude-design", "ui-walkthrough"}:
        acceptance_criteria.extend(
            [
                "The fixed prompt tells Claude Design to start at the entry point and polish one page at a time.",
                "The fixed prompt asks for a visible todo list aligned to the page walkthrough.",
                "The fixed prompt preserves RIG branding, visual hierarchy, copy tone, and responsive layout checks.",
            ]
        )
    if screenshot_note:
        acceptance_criteria.append("The fixed prompt uses the supplied screenshot notes as design context without inventing hidden UI state.")

    verifier_package = {
        "generator": "Codex CLI",
        "verifier": "Hermes",
        "evaluator": "Human" if approval_required else "Jake",
        "rules": [
            "verifier must differ from generator",
            "evaluator authority must be >= generator authority",
            "approval_required contracts include Human in the chain",
        ],
    }

    return {
        "schema_version": "rigforge.prompt_master.v1",
        "studio": "RIG Prompt Master",
        "lane": "BC-RIG-PROMPT-MASTER-V15",
        "run_id": run_id,
        "mode": mode,
        "mode_label": mode_label(mode),
        "objective": f"Transform the rough prompt into a context-grounded {mode_label(mode)} instruction packet.",
        "non_goals": [
            "Do not execute the generated prompt.",
            "Do not mutate external systems while fixing the prompt.",
            "Do not expose private context, secrets, cookies, or credentials.",
        ],
        "enhancements": enhancements,
        "context_sources_available": context_names,
        "context_sources_missing_or_partial": missing_names,
        "required_artifacts": required_artifacts,
        "acceptance_criteria": acceptance_criteria,
        "forbidden_actions": RIGFORGE_FORBIDDEN_ACTIONS,
        "approval_required": approval_required,
        "approval_gate": "Mike approval required before external writes or private/public exposure." if approval_required else "No external side effects allowed during prompt fixing.",
        "verifier_package": verifier_package,
        "phases": RIGFORGE_PHASES,
        "is_sealed": True,
        "invariants": [
            "No DoneContract -> no build.",
            "A1 deterministic path before A2/A3 agentic execution.",
            "ProofPacket or it did not happen.",
            "No self-verification.",
        ],
    }


def contract_summary_lines(contract: dict[str, Any]) -> list[str]:
    verifier = contract.get("verifier_package", {})
    return [
        f"- Studio: {contract.get('studio')}",
        f"- Run ID: {contract.get('run_id')}",
        f"- Mode: {contract.get('mode_label')} ({contract.get('mode')})",
        f"- Sealed: {'yes' if contract.get('is_sealed') else 'no'}",
        f"- Approval required: {'yes' if contract.get('approval_required') else 'no'}",
        f"- GEV: generator={verifier.get('generator')}; verifier={verifier.get('verifier')}; evaluator={verifier.get('evaluator')}",
        f"- Enhancement packs: {', '.join(pack_label(item) for item in contract.get('enhancements', [])) or 'none'}",
    ]


def enhancement_instruction_lines(enhancements: list[str], mode: str) -> list[str]:
    lines: list[str] = []
    if "rigforge-contract" in enhancements:
        lines.append("Include a short DoneContract-style preflight: objective, artifacts, acceptance criteria, forbidden actions, and GEV roles.")
    if "v15-gates" in enhancements:
        lines.append("Carry the v15 gate checklist into the work: source/license, secret blocking, task envelope, A1 path, sandbox/dry-run, tests, observability, approval, proof, rollback, docs, bridge updates, and side-effect verification.")
    if "context-grounding" in enhancements:
        lines.append("Use the provided context map first: local repo, QNAP policy, GitHub/Gitea, Recall/API, and RIG context pack. Mark unavailable context as an assumption.")
    if "todo-list" in enhancements:
        lines.append("Create a visible todo list before changing anything, keep one active item at a time, and check items off as evidence appears.")
    if "acceptance-tests" in enhancements:
        lines.append("Define acceptance checks that a human can verify: commands, screenshots, API responses, file paths, or rendered states.")
    if "screenshot-qa" in enhancements:
        lines.append("Use screenshot or browser QA for layout, text overflow, visual hierarchy, responsive behavior, and final polish.")
    if "proofpacket" in enhancements:
        lines.append("End with a ProofPacket summary: sources used, files changed, checks run, skipped checks, risks, rollback, and next action.")
    if "safety-boundaries" in enhancements:
        lines.append("Stop for Mike approval before secrets, login/session use, external sends, public exposure, payments, private export, destructive changes, or account mutation.")
    if "citations" in enhancements:
        lines.append("Cite source links, local file paths, commit IDs, screenshot paths, API responses, or docs for every material claim.")
    if "implementation-plan" in enhancements:
        lines.append("Break work into deterministic phases with expected artifacts before running agentic or exploratory steps.")
    if "design-polish" in enhancements or mode in {"claude-design", "ui-walkthrough"}:
        lines.append("Tighten copy, hierarchy, spacing, responsive behavior, and RIG brand consistency. Do not add explanatory UI text that merely describes obvious controls.")
    if "api-ready" in enhancements:
        lines.append("Return output in stable sections that can be called through an API and saved as a durable prompt artifact.")
    return lines


def mode_specific_block(mode: str, screenshot_note: str = "") -> str:
    if mode == "claude-design":
        screenshot_lines = ""
        if screenshot_note.strip():
            screenshot_lines = f"\n\nAttached screenshot notes to use:\n{safe_text(screenshot_note, 1200)}"
        return f"""Target surface: Claude Design.

Rewrite the user's prompt so Claude Design can act inside the current design file. The prompt must tell Claude Design to:
- Start with the entry point or first screen, not a random page.
- Bring up each page/screen in order, fix and polish it, mark it done, then move to the next.
- Create a visible todo list aligned to the walkthrough before editing.
- Preserve RIG branding: decisive operator tone, refined editorial feel, clean hierarchy, restrained controls, and production polish.
- Use the attached screenshot if present to infer the current file structure, active tab, page list, visual language, and user's step-by-step workflow goal.
- Check copy, spacing, hierarchy, overflow, responsive behavior, navigation state, CTAs, and public/polish/fix status indicators.
- Stop and ask before deleting major structure, changing brand direction, publishing, sharing, or exposing private content.{screenshot_lines}"""
    if mode == "ui-walkthrough":
        return """Target surface: UI walkthrough.

Create a step-by-step page polish prompt. The assistant must show the current page, write a todo list, polish one page at a time, verify it, then advance only after the current page is complete."""
    if mode == "browser-agent":
        return """Target surface: browser agent.

Create a dry-run-first browser task envelope. The assistant may read page state and capture screenshots, but login, sends, purchases, public posts, account changes, and private export require Mike approval."""
    if mode == "coding-agent":
        return """Target surface: coding agent.

Create an implementation prompt for a coding agent. It must inspect the repo first, make the smallest reversible change, run tests or smoke checks, avoid unrelated refactors, and report proof."""
    if mode == "api-backend":
        return """Target surface: API/backend.

Create an implementation prompt for backend/API work. It must define request and response contracts, context adapters, auth/secret boundaries, observability fields, tests, and rollback."""
    if mode == "research":
        return """Target surface: research.

Create a source-backed research prompt. It must prefer primary sources, record dates and links, separate facts from inference, and score confidence."""
    if mode == "product-strategy":
        return """Target surface: product strategy.

Create a product/operator prompt. It must define the decision, the customer or operator workflow, constraints, tradeoffs, success signal, and next experiment."""
    return """Target surface: general prompt.

Create a clearer prompt that preserves intent, adds context, constraints, acceptance criteria, proof requirements, and explicit approval boundaries."""


def infer_coordinate(prompt: str) -> str:
    text = prompt.lower()
    if any(token in text for token in ["deploy", "release", "publish", "delete", "payment", "email", "calendar", "send"]):
        return "L5-D1-A3-S"
    if any(token in text for token in ["agent", "harness", "browser", "mcp", "api", "gitea", "github", "qnap", "recall"]):
        return "L4-D2-A3-S"
    if any(token in text for token in ["research", "compare", "find", "investigate", "source"]):
        return "L2-D2-A2-Q"
    if any(token in text for token in ["fix", "bug", "test", "refactor", "code"]):
        return "L3-D1-A2-I"
    return "L2-D2-A2-Q"


def build_fixed_prompt(
    original_prompt: str,
    sources: list[ContextSource],
    mode: str = "auto",
    enhancements: list[str] | None = None,
    contract: dict[str, Any] | None = None,
    screenshot_note: str = "",
) -> str:
    selected_mode = infer_prompt_mode(original_prompt, mode)
    selected_enhancements = normalize_enhancements(enhancements, selected_mode)
    if contract is None:
        contract = build_prompt_master_contract(original_prompt, sources, selected_mode, selected_enhancements, screenshot_note)
    coordinate = infer_coordinate(original_prompt)
    context_bullets = []
    missing_bullets = []
    for source in sources:
        if source.status in {"ok", "partial"}:
            line = f"- {source.name} [{source.status}]: {source.summary}"
            context_bullets.append(line)
            for item in source.evidence[:4]:
                context_bullets.append(f"  - Evidence: {safe_text(item, 420)}")
        if source.missing:
            missing_bullets.append(f"- {source.name}: " + "; ".join(safe_text(item, 220) for item in source.missing[:4]))

    if not context_bullets:
        context_bullets.append("- No live context was available; proceed with explicit assumptions and ask for missing inputs.")
    if not missing_bullets:
        missing_bullets.append("- None detected from the configured adapters.")

    task = safe_text(original_prompt, 700)
    phase_lines = [f"- {phase['id']} {phase['name']}: {phase['output']}" for phase in RIGFORGE_PHASES]
    enhancement_lines = enhancement_instruction_lines(selected_enhancements, selected_mode)
    if not enhancement_lines:
        enhancement_lines = ["Preserve the original intent, add context, clarify constraints, and require proof."]
    criteria_lines = [f"- {item}" for item in contract.get("acceptance_criteria", [])]
    artifact_lines = [
        f"- {item.get('name')}: {item.get('type')} ({'required' if item.get('required') else 'optional'})"
        for item in contract.get("required_artifacts", [])
    ]
    forbidden_lines = [f"- {item}" for item in contract.get("forbidden_actions", [])]
    mode_block = mode_specific_block(selected_mode, screenshot_note)
    fixed_prompt_title = "Fixed Prompt To Send"

    return f"""# RIG Prompt Master Output

You are operating inside Mike Rodgers' RIG system. Use local-first, deterministic-before-agentic execution. Do not print secrets, tokens, cookies, browser session state, or raw credential files. External sends, account changes, public exposure, destructive commands, private-data export, payments, and other irreversible actions require Mike approval.

## RigForge DoneContract
{chr(10).join(contract_summary_lines(contract))}

## RigForge 7-Phase Path
{chr(10).join(phase_lines)}

## Required Artifacts
{chr(10).join(artifact_lines)}

## Task
{task}

## RIG Coordinate
- Coordinate: {coordinate}
- Default mode: A1 deterministic discovery first, then A2/A3 only when evidence requires it.
- Proof rule: record sources, commands, changed files, verification, and open risks.

## Context To Use
{chr(10).join(context_bullets)}

## Missing Or Unconfigured Context
{chr(10).join(missing_bullets)}

## Enhancement Instructions
{chr(10).join(f"- {line}" for line in enhancement_lines)}

## {fixed_prompt_title}
```text
You are operating inside Mike Rodgers' RIG system as RIG Prompt Master. Rewrite and execute the following prompt brief for the target surface.

{mode_block}

Original user intent:
{original_prompt.strip()}

Context map:
{chr(10).join(context_bullets)}

Missing or unconfigured context:
{chr(10).join(missing_bullets)}

Deterministic execution rules:
1. Restate the job-to-be-done in one sentence and name the decision this work supports.
2. Load the available work surface, QNAP policy, GitHub/Gitea remotes, Recall/API memory, and RIG context pack before inventing new structure.
3. If context is missing, continue with a clear assumption instead of stalling, unless the missing input changes safety, credentials, or public exposure.
4. Use A1 deterministic discovery first. Escalate to A2/A3 agentic work only when evidence requires it.
5. Make the smallest reversible change or recommendation that moves the system forward.
6. Use read-only API calls first. Do not clone, execute third-party code, mutate repos, write to external services, or export private data without explicit approval.
7. Maintain one visible todo list. Keep exactly one item in progress when doing sequential work.
8. Verify with concrete commands, tests, screenshots, API responses, rendered states, citations, or file evidence.
9. End with a ProofPacket-style summary: sources used, files changed, checks run, skipped checks, risks, rollback/undo, and next action.

Acceptance criteria:
{chr(10).join(criteria_lines)}

Forbidden actions:
{chr(10).join(forbidden_lines)}
```

## Acceptance Criteria
{chr(10).join(criteria_lines)}

## Original Prompt
```text
{original_prompt.strip()}
```
"""


def build_prompt_master_output(
    original_prompt: str,
    sources: list[ContextSource],
    mode: str = "auto",
    enhancements: list[str] | None = None,
    screenshot_note: str = "",
) -> dict[str, Any]:
    selected_mode = infer_prompt_mode(original_prompt, mode)
    selected_enhancements = normalize_enhancements(enhancements, selected_mode)
    contract = build_prompt_master_contract(original_prompt, sources, selected_mode, selected_enhancements, screenshot_note)
    fixed_prompt = build_fixed_prompt(
        original_prompt,
        sources,
        mode=selected_mode,
        enhancements=selected_enhancements,
        contract=contract,
        screenshot_note=screenshot_note,
    )
    return {
        "mode": selected_mode,
        "mode_label": mode_label(selected_mode),
        "enhancements": selected_enhancements,
        "contract": contract,
        "fixed_prompt": fixed_prompt,
        "rigforge_phases": RIGFORGE_PHASES,
    }


def render_markdown(original_prompt: str, fixed_prompt: str, sources: list[ContextSource]) -> str:
    source_lines = []
    for source in sources:
        source_lines.append(f"- {source.name}: {source.status} - {source.summary}")
        for item in source.evidence[:3]:
            source_lines.append(f"  - {safe_text(item, 300)}")
        for item in source.missing[:2]:
            source_lines.append(f"  - Missing: {safe_text(item, 240)}")

    return f"""{fixed_prompt}

---

## RIG Prompt Master Context Status
- Generated UTC: {utc_now()}
- Prompt hash: {sha256_text(original_prompt)[:16]}
- Output hash: {sha256_text(fixed_prompt)[:16]}

{chr(10).join(source_lines)}
"""


def write_history(
    original_prompt: str,
    fixed_prompt: str,
    sources: list[ContextSource],
    cwd: Path,
    mode: str = "general",
    enhancements: list[str] | None = None,
) -> None:
    RIG_HOME.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": utc_now(),
        "version": VERSION,
        "cwd": str(cwd),
        "prompt_hash": sha256_text(original_prompt),
        "output_hash": sha256_text(fixed_prompt),
        "mode": mode,
        "enhancements": enhancements or [],
        "sources": [{"name": source.name, "status": source.status} for source in sources],
    }
    with HISTORY_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")


def render_status(sources: list[ContextSource], as_json: bool) -> str:
    if as_json:
        return json.dumps(
            {
                "status": "ok",
                "generated_utc": utc_now(),
                "version": VERSION,
                "sources": [source.to_dict() for source in sources],
            },
            indent=2,
            sort_keys=True,
        )
    lines = [f"# RIG Prompt Master Context Status", "", f"- Generated UTC: {utc_now()}", f"- Version: {VERSION}", ""]
    for source in sources:
        lines.append(f"## {source.name}")
        lines.append(f"- Status: {source.status}")
        lines.append(f"- Summary: {source.summary}")
        for item in source.evidence:
            lines.append(f"- Evidence: {safe_text(item, 420)}")
        for item in source.missing:
            lines.append(f"- Missing: {safe_text(item, 260)}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fix a rough prompt with RIG Prompt Master, RigForge contracts, and context from the current work surface, QNAP, GitHub, Gitea, Recall API, and local context pack."
    )
    parser.add_argument("prompt", nargs="*", help="Prompt text. Omit when using --file or stdin.")
    parser.add_argument("-f", "--file", help="Read prompt from a file.")
    parser.add_argument("-o", "--output", help="Write the fixed prompt to a file.")
    parser.add_argument("--cwd", default=os.getcwd(), help="Workspace directory for git/context detection.")
    parser.add_argument("--context", choices=["auto", "none"], default="auto", help="Context mode.")
    parser.add_argument("--mode", choices=sorted(PROMPT_MODES.keys()), default="auto", help="Target prompt surface.")
    parser.add_argument("--claude-design", action="store_true", help="Shortcut for --mode claude-design with walkthrough/design polish defaults.")
    parser.add_argument("--enhancement", action="append", default=[], help="Enhancement pack id. Repeat or comma-separate values.")
    parser.add_argument("--screenshot-note", default="", help="Text notes about an attached screenshot to inject into the fixed prompt.")
    parser.add_argument("--list-enhancements", action="store_true", help="Print available modes and enhancement packs.")
    parser.add_argument("--no-context-pack", action="store_true", help="Skip ~/.rig/runtime/bin/rig-context-pack.")
    parser.add_argument("--no-apis", action="store_true", help="Skip direct GitHub/Gitea/Recall API enrichment.")
    parser.add_argument("--limit", type=int, default=5, help="Maximum snippets per API/context adapter.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of Markdown.")
    parser.add_argument("--status", action="store_true", help="Show context adapter status instead of fixing a prompt.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.list_enhancements:
        print(json.dumps(prompt_master_catalog(), indent=2, sort_keys=True))
        return 0

    prompt = read_prompt(args)
    if args.status and not prompt:
        prompt = "RIG context status"

    sources = gather_context(args, prompt)
    if args.status:
        print(render_status(sources, args.json))
        return 0

    mode = "claude-design" if args.claude_design else args.mode
    output = build_prompt_master_output(prompt, sources, mode=mode, enhancements=args.enhancement, screenshot_note=args.screenshot_note)
    fixed_prompt = output["fixed_prompt"]
    write_history(
        prompt,
        fixed_prompt,
        sources,
        Path(args.cwd).expanduser().resolve(),
        mode=output["mode"],
        enhancements=output["enhancements"],
    )

    if args.json:
        payload = {
            "status": "ok",
            "generated_utc": utc_now(),
            "version": VERSION,
            "prompt_hash": sha256_text(prompt),
            "output_hash": sha256_text(fixed_prompt),
            "source_count": len(sources),
            "fixed_prompt": fixed_prompt,
            "mode": output["mode"],
            "mode_label": output["mode_label"],
            "enhancements": output["enhancements"],
            "contract": output["contract"],
            "rigforge_phases": output["rigforge_phases"],
            "sources": [source.to_dict() for source in sources],
        }
        output_text = json.dumps(payload, indent=2, sort_keys=True)
    else:
        output_text = render_markdown(prompt, fixed_prompt, sources)

    if args.output:
        output_path = Path(args.output).expanduser()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_text, encoding="utf-8")
        print(f"Wrote fixed prompt to {output_path}")
    else:
        print(output_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
