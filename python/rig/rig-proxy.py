#!/usr/bin/env python3
"""
RIG AI Engineering v10 — Prompt Proxy
Sits between AI tools and model APIs. Scores every outgoing prompt.
If score < threshold, auto-rewrites with enhancements before forwarding.

This is the "always-on coach" — no manual invocation required.

Usage:
  python3 rig-proxy.py                    # Start on port 18787
  python3 rig-proxy.py --port 18787       # Custom port
  python3 rig-proxy.py --threshold 60     # Score threshold (default 60)
  python3 rig-proxy.py --dry-run         # Score but don't rewrite

Configure AI tools to use http://127.0.0.1:18787 as their API base URL.
"""

import json
import sys
import os
import re
import hashlib
import subprocess
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import urllib.request
import urllib.error

# ─── Config ──────────────────────────────────────────────────────────
DEFAULT_PORT = int(os.environ.get("RIG_PROXY_PORT", 18787))
DEFAULT_THRESHOLD = int(os.environ.get("RIG_PROXY_THRESHOLD", 60))
DRY_RUN = os.environ.get("RIG_PROXY_DRY_RUN", "0") == "1"
ENGINE = Path(__file__).parent / "prompt_engine.py"
LOG_FILE = Path.home() / ".rig" / "proxy.log"

# Model API endpoints to intercept
MODEL_ENDPOINTS = [
    "/v1/chat/completions",
    "/v1/completions",
    "/api/chat",
    "/api/generate",
]

# ─── Logging ─────────────────────────────────────────────────────────

def log(msg):
    ts = __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ─── Prompt Extraction ──────────────────────────────────────────────

def extract_prompt_from_request(body):
    """Extract the user prompt from various API request formats."""
    if isinstance(body, bytes):
        body = body.decode("utf-8", errors="replace")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None, None, body

    # OpenAI format: messages array
    if "messages" in data:
        messages = data["messages"]
        # Find the last user message
        for msg in reversed(messages):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                if isinstance(content, list):
                    # Multi-modal: extract text parts
                    text_parts = []
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            text_parts.append(part.get("text", ""))
                    content = " ".join(text_parts)
                return content, data, None
        return None, data, None

    # Simple prompt field
    if "prompt" in data:
        return data["prompt"], data, None

    return None, data, None

def inject_enhanced_prompt(data, enhanced_prompt):
    """Inject the enhanced prompt back into the request data."""
    if "messages" in data:
        messages = data["messages"]
        for msg in reversed(messages):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            part["text"] = enhanced_prompt
                            break
                else:
                    msg["content"] = enhanced_prompt
                break
    elif "prompt" in data:
        data["prompt"] = enhanced_prompt

    return data

# ─── Scoring ─────────────────────────────────────────────────────────

def score_and_enhance(prompt):
    """Score a prompt and return (score, grade, enhanced_prompt)."""
    try:
        result = subprocess.run(
            [sys.executable, str(ENGINE), "enhance", prompt],
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout

        # Extract score
        score_match = re.search(r"TOTAL:\s+(\d+)/100", output)
        score = int(score_match.group(1)) if score_match else 50

        # Extract grade
        grade_match = re.search(r"\((\w+)\s+—", output)
        grade = grade_match.group(1) if grade_match else "?"

        # Extract enhanced prompt
        enhanced = prompt  # fallback
        enhance_match = re.search(
            r"── ENHANCED PROMPT ─+\n(.*?)── COMMANDS",
            output,
            re.DOTALL,
        )
        if enhance_match:
            enhanced = enhance_match.group(1).strip()

        return score, grade, enhanced

    except Exception as e:
        log(f"Scoring error: {e}")
        return 50, "?", prompt

# ─── Proxy Handler ───────────────────────────────────────────────────

class ProxyHandler(BaseHTTPRequestHandler):
    """HTTP proxy that scores and optionally rewrites prompts."""

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Check if this is a model endpoint
        is_model_endpoint = any(
            self.path.endswith(ep) for ep in MODEL_ENDPOINTS
        )

        if is_model_endpoint:
            prompt, data, raw = extract_prompt_from_request(body)

            if prompt and data:
                score, grade, enhanced = score_and_enhance(prompt)

                log(f"SCORE: {score}/100 ({grade}) | {prompt[:80]}")

                if score < THRESHOLD and enhanced != prompt:
                    if DRY_RUN:
                        log(f"DRY RUN: Would enhance ({score} → enhanced)")
                    else:
                        data = inject_enhanced_prompt(data, enhanced)
                        body = json.dumps(data).encode()
                        log(f"ENHANCED: {enhanced[:80]}")

                        # Record for learning
                        try:
                            subprocess.run(
                                [sys.executable, str(ENGINE), "score", prompt],
                                capture_output=True,
                                text=True,
                                timeout=10,
                            )
                        except Exception:
                            pass

        # Forward to the real API
        self._forward(body)

    def do_GET(self):
        """Forward GET requests (health checks, models list, etc.)."""
        self._forward(b"")

    def _forward(self, body):
        """Forward request to the real API."""
        # Determine target URL from environment or default
        target_base = os.environ.get(
            "RIG_PROXY_TARGET",
            "http://127.0.0.1:4141",  # Default: local Hermes/ Ollama
        )

        target_url = f"{target_base}{self.path}"

        try:
            req = urllib.request.Request(
                target_url,
                data=body if body else None,
                method=self.command,
            )

            # Forward relevant headers
            for header in ["Content-Type", "Authorization", "Accept"]:
                value = self.headers.get(header)
                if value:
                    req.add_header(header, value)

            with urllib.request.urlopen(req, timeout=300) as resp:
                self.send_response(resp.status)
                for key, value in resp.getheaders():
                    if key.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(resp.read())

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())

        except Exception as e:
            log(f"Forward error: {e}")
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            error = json.dumps({
                "error": f"Proxy error: {str(e)}",
                "hint": "Ensure RIG_PROXY_TARGET is set to a valid API endpoint",
            })
            self.wfile.write(error.encode())

    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

# ─── Main ────────────────────────────────────────────────────────────

def main():
    import argparse

    parser = argparse.ArgumentParser(description="RIG Prompt Proxy")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--target", default=None, help="Target API base URL")
    args = parser.parse_args()

    THRESHOLD = args.threshold
    DRY_RUN = args.dry_run

    if args.target:
        os.environ["RIG_PROXY_TARGET"] = args.target

    target = os.environ.get("RIG_PROXY_TARGET", "http://127.0.0.1:4141")

    print(f"RIG Prompt Proxy starting on port {args.port}")
    print(f"  Target:    {target}")
    print(f"  Threshold: {THRESHOLD}")
    print(f"  Dry run:   {DRY_RUN}")
    print(f"  Engine:    {ENGINE}")
    print(f"")
    print(f"Configure AI tools to use: http://127.0.0.1:{args.port}")
    print(f"")
    print(f"Environment variables:")
    print(f"  RIG_PROXY_PORT     — Proxy port (default {DEFAULT_PORT})")
    print(f"  RIG_PROXY_THRESHOLD — Score threshold (default {DEFAULT_THRESHOLD})")
    print(f"  RIG_PROXY_DRY_RUN   — Score but don't rewrite (default 0)")
    print(f"  RIG_PROXY_TARGET    — Target API URL (default {target})")
    print(f"")

    log(f"Proxy starting on port {args.port} → {target} (threshold={THRESHOLD})")

    server = HTTPServer(("127.0.0.1", args.port), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Proxy stopped")
        print("\nProxy stopped")

if __name__ == "__main__":
    main()
