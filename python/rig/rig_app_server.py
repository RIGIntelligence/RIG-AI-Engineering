#!/usr/bin/env python3
"""Local RIG Prompt Master server.

This is a local-first production surface for v15. It serves a static browser
app plus a small JSON API for prompt fixing, context status, catalog search,
browser-task envelopes, and ProofPacket creation. It never clones or executes
third-party repos, never sends external writes, and binds to localhost by
default.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import webbrowser
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PYTHON_DIR = ROOT / "python" / "rig"
STATIC_DIR = PYTHON_DIR / "app_static"
COMMAND_SURFACE_PATH = STATIC_DIR / "commands.json"
RIG_HOME = Path.home() / ".rig"
PROOFPACKET_DIR = RIG_HOME / "proofpackets"
VERSION = "15.3.0"
MAX_BODY_BYTES = 2_000_000

if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))

import rig_prompt_fixer as fixer  # noqa: E402
import rig_v15  # noqa: E402


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug[:80] or "rig-prompt-master"


def load_v15() -> dict[str, Any]:
    return rig_v15.load_catalogs()


def safe_prompt(value: Any) -> str:
    text = str(value or "").replace("\x00", "").strip()
    if len(text) > 100_000:
        text = text[:100_000]
    return text


def make_context_args(payload: dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(
        cwd=str(Path(payload.get("cwd") or os.getcwd()).expanduser()),
        context=payload.get("context") or "auto",
        no_apis=not bool(payload.get("include_apis", False)),
        no_context_pack=not bool(payload.get("include_context_pack", False)),
        limit=int(payload.get("limit") or 5),
    )


def fix_prompt_payload(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = safe_prompt(payload.get("prompt"))
    if not prompt:
        raise ValueError("prompt is required")
    args = make_context_args(payload)
    sources = fixer.gather_context(args, prompt)
    mode = safe_prompt(payload.get("mode") or "auto")
    enhancements = payload.get("enhancements") if isinstance(payload.get("enhancements"), list) else []
    screenshot_note = safe_prompt(payload.get("screenshot_note") or "")
    output = fixer.build_prompt_master_output(prompt, sources, mode=mode, enhancements=enhancements, screenshot_note=screenshot_note)
    fixed_prompt = output["fixed_prompt"]
    fixer.write_history(
        prompt,
        fixed_prompt,
        sources,
        Path(args.cwd).expanduser().resolve(),
        mode=output["mode"],
        enhancements=output["enhancements"],
    )
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        "version": VERSION,
        "prompt_hash": fixer.sha256_text(prompt),
        "output_hash": fixer.sha256_text(fixed_prompt),
        "fixed_prompt": fixed_prompt,
        "mode": output["mode"],
        "mode_label": output["mode_label"],
        "enhancements": output["enhancements"],
        "contract": output["contract"],
        "rigforge_phases": output["rigforge_phases"],
        "sources": [source.to_dict() for source in sources],
        "v15_audit": rig_v15.audit_payload(load_v15()),
    }


def context_status_payload(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    prompt = safe_prompt(payload.get("prompt") or "RIG Prompt Master context status")
    args = make_context_args(payload)
    sources = fixer.gather_context(args, prompt)
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        "version": VERSION,
        "sources": [source.to_dict() for source in sources],
    }


def prompt_master_catalog_payload() -> dict[str, Any]:
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        **fixer.prompt_master_catalog(),
    }


def resource_payload(query: str = "", limit: int = 50) -> dict[str, Any]:
    data = load_v15()
    resources = rig_v15.select_resources(data, query, limit)
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        "count": len(resources),
        "resources": resources,
    }


def questions_payload(query: str = "", persona: str | None = None, limit: int = 0) -> dict[str, Any]:
    data = load_v15()
    selected = rig_v15.select_questions(data, query, persona, include_all=not query and not persona, limit=limit)
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        "count": len(selected),
        "questions": selected,
        "personas": rig_v15.personas(data),
    }


def gate_payload() -> dict[str, Any]:
    return {
        "status": "ok",
        "generated_utc": utc_now(),
        "gates": [{"id": gate_id, "description": description} for gate_id, description in rig_v15.V15_GATES],
    }


def command_surface_payload() -> dict[str, Any]:
    if not COMMAND_SURFACE_PATH.exists():
        raise FileNotFoundError("command surface catalog is not installed")
    payload = json.loads(COMMAND_SURFACE_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("command surface catalog must be a JSON object")
    payload.setdefault("status", "ok")
    payload.setdefault("served_by", "RIG Prompt Master")
    return payload


def browser_envelope_payload(payload: dict[str, Any]) -> dict[str, Any]:
    task = safe_prompt(payload.get("task"))
    url = safe_prompt(payload.get("url"))
    if not task:
        raise ValueError("task is required")
    route = rig_v15.route_task(f"browser agent harness {task} {url}")
    envelope = {
        "title": payload.get("title") or "RIG browser-agent harness task",
        "generated_utc": utc_now(),
        "route": route,
        "target_url": url or "N/A",
        "task": task,
        "mode": "dry-run envelope only",
        "allowed_actions": [
            "read public page state",
            "capture screenshots for verification",
            "create local notes, envelopes, and ProofPackets",
        ],
        "requires_mike_approval": [
            "login or credential use",
            "form submission, message send, purchase, publish, or account mutation",
            "private data export",
            "destructive browser or repository action",
        ],
        "candidate_resources": [item["id"] for item in rig_v15.select_resources(load_v15(), "browser harness automation", 8)],
        "gates": [{"id": gate_id, "description": description, "status": "open"} for gate_id, description in rig_v15.V15_GATES],
    }
    return {"status": "ok", "envelope": envelope}


def proofpacket_payload(payload: dict[str, Any]) -> dict[str, Any]:
    title = safe_prompt(payload.get("title") or "RIG Prompt Master work")
    task = safe_prompt(payload.get("task") or "")
    fixed_prompt = safe_prompt(payload.get("fixed_prompt") or "")
    sources = payload.get("sources") if isinstance(payload.get("sources"), list) else []
    mode = safe_prompt(payload.get("mode") or "")
    enhancements = payload.get("enhancements") if isinstance(payload.get("enhancements"), list) else []
    contract = payload.get("contract") if isinstance(payload.get("contract"), dict) else {}
    PROOFPACKET_DIR.mkdir(parents=True, exist_ok=True)
    path = PROOFPACKET_DIR / f"{slugify(title)}-{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M%SZ')}.md"
    audit = rig_v15.audit_payload(load_v15())
    lines = [
        f"# ProofPacket: {title}",
        "",
        f"Generated UTC: {utc_now()}",
        f"RIG Prompt Master Version: {VERSION}",
        f"Catalog Status: {audit['status']}",
        f"Prompt Mode: {mode or 'N/A'}",
        f"Enhancements: {', '.join(str(item) for item in enhancements) or 'N/A'}",
        "",
        "## Task",
        "",
        task or "N/A",
        "",
        "## Sources",
        "",
    ]
    if sources:
        for source in sources:
            if isinstance(source, dict):
                lines.append(f"- {source.get('name', 'source')}: {source.get('status', 'unknown')} - {source.get('summary', '')}")
    else:
        lines.append("- N/A")
    lines.extend(
        [
            "",
            "## RigForge DoneContract",
            "",
            "```json",
            json.dumps(contract or {"status": "not captured"}, indent=2, sort_keys=True),
            "```",
            "",
            "## Fixed Prompt",
            "",
            "```text",
            fixed_prompt or "N/A",
            "```",
            "",
            "## V15 Gates",
            "",
        ]
    )
    for gate_id, description in rig_v15.V15_GATES:
        lines.append(f"- [ ] Gate {gate_id}: {description}")
    lines.extend(
        [
            "",
            "## Verification",
            "",
            "- Commands:",
            "- Screenshots:",
            "- API responses:",
            "",
            "## Risks And Rollback",
            "",
            "- Remaining risks:",
            "- Approval boundaries:",
            "- Rollback:",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")
    return {"status": "ok", "path": str(path), "generated_utc": utc_now()}


@dataclass
class AppConfig:
    host: str
    port: int


class RigAppHandler(BaseHTTPRequestHandler):
    server_version = f"RigPromptMaster/{VERSION}"

    def _json(self, payload: dict[str, Any], status: int = 200) -> None:
        raw = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _error(self, message: str, status: int = 400) -> None:
        self._json({"status": "error", "error": message}, status=status)

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY_BYTES:
            raise ValueError("request body is too large")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("request body must be JSON") from exc
        if not isinstance(payload, dict):
            raise ValueError("request body must be a JSON object")
        return payload

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        try:
            path, _, query_string = self.path.partition("?")
            query = parse_query(query_string)
            if path == "/api/health":
                self._json(
                    {
                        "status": "ok",
                        "generated_utc": utc_now(),
                        "version": VERSION,
                        "root": str(ROOT),
                        "static_dir": str(STATIC_DIR),
                        "catalog_status": rig_v15.audit_payload(load_v15())["status"],
                    }
                )
                return
            if path == "/api/context-status":
                self._json(context_status_payload({"include_apis": False, "include_context_pack": False}))
                return
            if path == "/api/prompt-master/enhancements":
                self._json(prompt_master_catalog_payload())
                return
            if path == "/api/v15/audit":
                self._json(rig_v15.audit_payload(load_v15()))
                return
            if path == "/api/v15/resources":
                self._json(resource_payload(query.get("q", ""), int(query.get("limit", "50") or "50")))
                return
            if path == "/api/v15/questions":
                limit = int(query.get("limit", "0") or "0")
                self._json(questions_payload(query.get("q", ""), query.get("persona") or None, limit))
                return
            if path == "/api/v15/gates":
                self._json(gate_payload())
                return
            if path in {"/api/command-surface/bootstrap", "/api/commands/bootstrap"}:
                self._json(command_surface_payload())
                return
            self._static(path)
        except Exception as exc:  # pragma: no cover - HTTP boundary
            self._error(str(exc), status=500)

    def do_POST(self) -> None:  # noqa: N802
        try:
            payload = self._read_json_body()
            if self.path in {"/api/fix-prompt", "/api/prompt-master/fix"}:
                self._json(fix_prompt_payload(payload))
                return
            if self.path == "/api/prompt-master/contract":
                prompt = safe_prompt(payload.get("prompt"))
                if not prompt:
                    raise ValueError("prompt is required")
                args = make_context_args(payload)
                sources = fixer.gather_context(args, prompt)
                mode = fixer.infer_prompt_mode(prompt, payload.get("mode") or "auto")
                enhancements = fixer.normalize_enhancements(payload.get("enhancements") if isinstance(payload.get("enhancements"), list) else [], mode)
                contract = fixer.build_prompt_master_contract(prompt, sources, mode, enhancements, safe_prompt(payload.get("screenshot_note") or ""))
                self._json({"status": "ok", "generated_utc": utc_now(), "version": VERSION, "contract": contract})
                return
            if self.path == "/api/context-status":
                self._json(context_status_payload(payload))
                return
            if self.path == "/api/browser-envelope":
                self._json(browser_envelope_payload(payload))
                return
            if self.path == "/api/proofpacket":
                self._json(proofpacket_payload(payload))
                return
            self._error(f"unknown endpoint: {self.path}", status=404)
        except ValueError as exc:
            self._error(str(exc), status=400)
        except Exception as exc:  # pragma: no cover - HTTP boundary
            self._error(str(exc), status=500)

    def _static(self, path: str) -> None:
        if path in {"", "/"}:
            path = "/index.html"
        rel = Path(path.lstrip("/"))
        if rel.parts and rel.parts[0] == "api":
            self._error("unknown endpoint", status=404)
            return
        target = (STATIC_DIR / rel).resolve()
        if not str(target).startswith(str(STATIC_DIR.resolve())) or not target.exists() or target.is_dir():
            self._error("not found", status=404)
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        raw = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        sys.stderr.write("%s - %s\n" % (self.log_date_time_string(), format % args))


def parse_query(query_string: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for part in query_string.split("&"):
        if not part:
            continue
        key, _, value = part.partition("=")
        values[unquote_plus(key)] = unquote_plus(value)
    return values


def unquote_plus(value: str) -> str:
    from urllib.parse import unquote_plus as _unquote_plus

    return _unquote_plus(value)


def smoke_check() -> dict[str, Any]:
    required_static = [STATIC_DIR / "index.html", STATIC_DIR / "styles.css", STATIC_DIR / "app.js", COMMAND_SURFACE_PATH]
    missing = [str(path) for path in required_static if not path.exists()]
    audit = rig_v15.audit_payload(load_v15())
    payload = {
        "status": "PASS" if not missing and audit["status"] == "PASS" else "FAIL",
        "version": VERSION,
        "missing_static_files": missing,
        "audit": audit,
        "endpoints": [
            "/api/health",
            "/api/fix-prompt",
            "/api/prompt-master/fix",
            "/api/prompt-master/enhancements",
            "/api/prompt-master/contract",
            "/api/context-status",
            "/api/v15/audit",
            "/api/v15/resources",
            "/api/v15/questions",
            "/api/v15/gates",
            "/api/command-surface/bootstrap",
            "/api/browser-envelope",
            "/api/proofpacket",
        ],
    }
    return payload


def run_server(host: str, port: int, open_browser: bool) -> None:
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise SystemExit("ERROR: RIG Prompt Master binds to localhost only unless a reviewed deployment wrapper is added.")
    server = ThreadingHTTPServer((host, port), RigAppHandler)
    url = f"http://{host}:{server.server_port}/"
    print(f"RIG Prompt Master v{VERSION}")
    print(f"URL: {url}")
    print("Mode: local-only, read-first, no third-party repo execution")
    if open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping RIG Prompt Master.")
    finally:
        server.server_close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local RIG Prompt Master web app and JSON API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--open", action="store_true", help="Open the app in the default browser.")
    parser.add_argument("--smoke", action="store_true", help="Run a deterministic smoke check and exit.")
    parser.add_argument("--json", action="store_true", help="Emit JSON for --smoke.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.smoke:
        payload = smoke_check()
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"RIG Prompt Master smoke: {payload['status']}")
            print(f"- resources: {payload['audit']['counts']['resources']} / {payload['audit']['expected_counts']['resources']}")
            print(f"- static files missing: {payload['missing_static_files'] or 'none'}")
        return 0 if payload["status"] == "PASS" else 1
    run_server(args.host, args.port, args.open)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
