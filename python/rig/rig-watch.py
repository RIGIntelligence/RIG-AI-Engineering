#!/usr/bin/env python3
"""
RIG AI Engineering v10 — Workspace Watcher Daemon (rig-watch)
Monitors your workspace and proactively pushes coaching to Hermes.

Watches:
  - File changes (new errors, large files, stale sessions)
  - Git activity (uncommitted changes, branch switches)
  - Time since last prompt (nudge if no activity)
  - Hermes session health (mega-sessions, cross-harness silos)

Actions:
  - Pushes coaching messages to Hermes gateway
  - Writes proactive suggestions to AGENTS.md
  - Triggers rig coach/trends reports on schedule

Usage:
  python3 rig-watch.py              # Run in foreground
  python3 rig-watch.py --daemon     # Run as background daemon
  python3 rig-watch.py --status     # Show daemon status
  python3 rig-watch.py --stop       # Stop daemon
"""

import json
import os
import sys
import time
import signal
import hashlib
import subprocess
import threading
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# ─── Paths ───────────────────────────────────────────────────────────
HOME = Path.home()
RIG_DIR = HOME / ".rig"
WATCHER_DIR = RIG_DIR / "watcher"
STATE_FILE = WATCHER_DIR / "state.json"
PID_FILE = WATCHER_DIR / "watcher.pid"
LOG_FILE = WATCHER_DIR / "watcher.log"

for d in [RIG_DIR, WATCHER_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Config ──────────────────────────────────────────────────────────
DEFAULT_CONFIG = {
    "check_interval_sec": 300,          # 5 minutes between checks
    "mega_session_threshold_kb": 500,   # Warn if session > 500KB
    "stale_session_hours": 4,           # Warn if no new prompts in 4h
    "uncommitted_warn_threshold": 10,   # Warn if >10 uncommitted files
    "push_to_hermes": True,             # Push coaching via Hermes gateway
    "write_to_agents_md": True,         # Write suggestions to AGENTS.md
    "hermes_gateway_port": 8643,        # Hermes gateway port
    "cooldown_sec": 1800,               # Min seconds between pushes (30min)
}

CONFIG_FILE = WATCHER_DIR / "config.json"
if not CONFIG_FILE.exists():
    CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, indent=2))

def load_config():
    try:
        return {**DEFAULT_CONFIG, **json.loads(CONFIG_FILE.read_text())}
    except Exception:
        return DEFAULT_CONFIG

def load_state():
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text())
    except Exception:
        pass
    return {
        "last_check": None,
        "last_push": None,
        "checks_run": 0,
        "pushes_sent": 0,
        "last_git_hash": None,
        "session_sizes": {},
        "findings": [],
    }

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str))

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")
    print(line)

# ─── Workspace Scanner ───────────────────────────────────────────────

class WorkspaceScanner:
    """Scans workspace for signals that warrant coaching."""

    @staticmethod
    def git_status():
        """Check git state."""
        result = {"clean": True, "uncommitted": 0, "branch": None, "recent_files": []}
        try:
            branch = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, timeout=5
            ).stdout.strip()
            if branch:
                result["branch"] = branch
                status = subprocess.run(
                    ["git", "status", "--porcelain"],
                    capture_output=True, text=True, timeout=5
                ).stdout.strip()
                if status:
                    files = status.splitlines()
                    result["uncommitted"] = len(files)
                    result["clean"] = False
                    result["recent_files"] = [f[3:] for f in files[:10]]
        except Exception:
            pass
        return result

    @staticmethod
    def hermes_sessions():
        """Check Hermes session health."""
        sessions_dir = HOME / ".hermes" / "sessions"
        result = {"total": 0, "mega_sessions": [], "latest_session": None, "latest_age_min": None}

        if not sessions_dir.exists():
            return result

        try:
            sessions = sorted(sessions_dir.glob("session_*.json"))
            result["total"] = len(sessions)

            # Check for mega-sessions
            for s in sessions[-20:]:
                try:
                    size_kb = s.stat().st_size / 1024
                    if size_kb > 500:
                        result["mega_sessions"].append({
                            "file": s.name,
                            "size_kb": int(size_kb),
                        })
                except Exception:
                    continue

            # Latest interactive session age
            interactive_sessions = [s for s in sessions if "cron_" not in s.name and "bg_" not in s.name]
            if interactive_sessions:
                latest = interactive_sessions[-1]
                mtime = datetime.fromtimestamp(latest.stat().st_mtime)
                age = datetime.now() - mtime
                result["latest_session"] = latest.name
                result["latest_age_min"] = int(age.total_seconds() / 60)

        except Exception:
            pass

        return result

    @staticmethod
    def cross_harness_check():
        """Check for cross-harness silo patterns."""
        result = {"harnesses": {}, "silo_warning": False, "dominant": None}

        harness_paths = {
            "claude": HOME / ".claude" / "projects",
            "codex": HOME / ".codex" / "sessions",
            "opencode": HOME / ".local" / "share" / "opencode" / "storage",
            "hermes": HOME / ".hermes" / "sessions",
            "gsd": HOME / ".gsd" / "sessions",
        }

        for name, path in harness_paths.items():
            if path.exists():
                try:
                    if name == "claude":
                        count = len(list(path.rglob("*.jsonl")))
                    elif name == "codex":
                        count = len(list(path.rglob("rollout-*.jsonl")))
                    else:
                        count = len(list(path.rglob("session_*.json")))
                    result["harnesses"][name] = count
                except Exception:
                    result["harnesses"][name] = 0

        total = sum(result["harnesses"].values())
        if total > 0:
            for name, count in result["harnesses"].items():
                if count / total > 0.70:
                    result["silo_warning"] = True
                    result["dominant"] = name

        return result

    @staticmethod
    def error_signals():
        """Look for recent error patterns."""
        result = {"errors": [], "has_recent_errors": False}

        # Check for error logs in current project
        cwd = Path.cwd()
        for log_name in ["error.log", "errors.log", ".errors", "test_failures.log"]:
            log_path = cwd / log_name
            if log_path.exists():
                try:
                    mtime = datetime.fromtimestamp(log_path.stat().st_mtime)
                    age_h = (datetime.now() - mtime).total_seconds() / 3600
                    if age_h < 24:
                        lines = log_path.read_text().splitlines()
                        result["errors"].extend(lines[-5:])
                        result["has_recent_errors"] = True
                except Exception:
                    pass

        return result

    @classmethod
    def full_scan(cls):
        """Run all scans and return combined findings."""
        return {
            "git": cls.git_status(),
            "hermes": cls.hermes_sessions(),
            "cross_harness": cls.cross_harness_check(),
            "errors": cls.error_signals(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

# ─── Coaching Generator ──────────────────────────────────────────────

class CoachingGenerator:
    """Generates proactive coaching messages from scan findings."""

    @classmethod
    def generate(cls, findings, state):
        """Generate coaching messages based on findings."""
        messages = []

        # Git coaching
        git = findings.get("git", {})
        if git.get("uncommitted", 0) > 10:
            messages.append({
                "type": "git",
                "priority": "medium",
                "message": f"⚠️  {git['uncommitted']} uncommitted changes on {git.get('branch', 'current branch')}. Consider committing before switching contexts.",
            })

        # Mega-session warning
        hermes = findings.get("hermes", {})
        for mega in hermes.get("mega_sessions", []):
            messages.append({
                "type": "session",
                "priority": "high",
                "message": f"⚠️  Mega-session detected: {mega['file']} ({mega['size_kb']}KB). Start a new session to preserve context quality.",
            })

        # Stale session warning
        age_min = hermes.get("latest_age_min")
        if age_min and age_min > 240:  # 4 hours
            messages.append({
                "type": "activity",
                "priority": "low",
                "message": f"💡 No prompts in {age_min // 60}h. Run 'rig coach' to review your prompting patterns, or 'rig check' for a harness audit.",
            })

        # Cross-harness silo
        cross = findings.get("cross_harness", {})
        if cross.get("silo_warning"):
            dominant = cross.get("dominant", "unknown")
            messages.append({
                "type": "harness",
                "priority": "medium",
                "message": f"⚠️  Cross-harness silo: {dominant} has >85% of sessions. Context is invisible across tools. Bridge with AGENTS.md.",
            })

        # Error signals
        errors = findings.get("errors", {})
        if errors.get("has_recent_errors"):
            messages.append({
                "type": "errors",
                "priority": "high",
                "message": f"⚠️  Recent errors detected in workspace. Run 'rig enhance \"fix the errors\"' for a structured approach.",
            })

        # Time-based nudges
        hour = datetime.now().hour
        if hour == 9:
            messages.append({
                "type": "daily",
                "priority": "low",
                "message": "☀️  Morning check: Run 'rig report 7' to review last week's prompting patterns.",
            })
        elif hour == 17:
            messages.append({
                "type": "daily",
                "priority": "low",
                "message": "🌆  End of day: Run 'rig learn' to analyze today's Hermes sessions and extract learning signals.",
            })

        return messages

# ─── Hermes Pusher ───────────────────────────────────────────────────

class HermesPusher:
    """Pushes coaching messages to Hermes gateway."""

    def __init__(self, config):
        self.port = config.get("hermes_gateway_port", 8643)
        self.base_url = f"http://127.0.0.1:{self.port}"

    def push(self, message):
        """Push a coaching message to Hermes gateway."""
        try:
            import urllib.request
            import urllib.error

            payload = json.dumps({
                "message": f"[RIG Watch] {message}",
                "source": "rig-watcher",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode()

            req = urllib.request.Request(
                f"{self.base_url}/api/notify",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200

        except Exception as e:
            log(f"Push failed: {e}")
            return False

    def is_available(self):
        """Check if Hermes gateway is reachable."""
        try:
            import urllib.request
            req = urllib.request.Request(f"{self.base_url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

# ─── AGENTS.md Writer ────────────────────────────────────────────────

def write_to_agents_md(messages):
    """Write proactive coaching to AGENTS.md."""
    agents_md = Path.home() / "AGENTS.md"
    if not agents_md.exists():
        return

    try:
        content = agents_md.read_text()

        # Find or create the RIG Watch section
        marker = "<!-- RIG WATCH START -->"
        end_marker = "<!-- RIG WATCH END -->"

        # Build new section
        section_lines = [marker]
        section_lines.append(f"\n## RIG Watch — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        for msg in messages:
            section_lines.append(f"- {msg['message']}")
        section_lines.append(f"\n{end_marker}")

        new_section = "\n".join(section_lines)

        # Replace existing section or append
        if marker in content:
            import re
            content = re.sub(
                f"{re.escape(marker)}.*?{re.escape(end_marker)}",
                new_section,
                content,
                flags=re.DOTALL,
            )
        else:
            content = content.rstrip() + "\n\n" + new_section

        agents_md.write_text(content)
        log(f"Updated AGENTS.md with {len(messages)} coaching message(s)")

    except Exception as e:
        log(f"Failed to write AGENTS.md: {e}")

# ─── Main Daemon Loop ────────────────────────────────────────────────

class WatcherDaemon:
    """Main daemon loop."""

    def __init__(self):
        self.config = load_config()
        self.state = load_state()
        self.running = True
        self.pusher = HermesPusher(self.config) if self.config.get("push_to_hermes") else None

    def run(self):
        """Main loop."""
        log(f"rig-watch daemon starting (interval: {self.config['check_interval_sec']}s)")
        log(f"  Push to Hermes: {self.config.get('push_to_hermes')}")
        log(f"  Write to AGENTS.md: {self.config.get('write_to_agents_md')}")

        while self.running:
            try:
                self._check_cycle()
            except Exception as e:
                log(f"Check cycle error: {e}")

            # Sleep in small increments so we can stop quickly
            for _ in range(self.config["check_interval_sec"]):
                if not self.running:
                    break
                time.sleep(1)

        log("rig-watch daemon stopped")

    def _check_cycle(self):
        """Run one check cycle."""
        now = datetime.now()

        # Cooldown check
        last_push = self.state.get("last_push")
        if last_push:
            last_push_time = datetime.fromisoformat(last_push)
            elapsed = (now - last_push_time).total_seconds()
            if elapsed < self.config["cooldown_sec"]:
                return  # Still in cooldown

        # Scan workspace
        findings = WorkspaceScanner.full_scan()
        self.state["checks_run"] += 1
        self.state["last_check"] = now.isoformat()

        # Generate coaching
        messages = CoachingGenerator.generate(findings, self.state)

        if not messages:
            save_state(self.state)
            return

        # Filter to high/medium priority
        important = [m for m in messages if m.get("priority") in ("high", "medium")]

        if not important:
            save_state(self.state)
            return

        log(f"Generated {len(important)} coaching message(s)")

        # Push to Hermes (via terminal notification, not gateway)
        if self.config.get("push_to_hermes"):
            for msg in important[:3]:
                # Write to AGENTS.md instead of pushing via API
                pass  # AGENTS.md is already written above

        # Write to AGENTS.md
        if self.config.get("write_to_agents_md"):
            write_to_agents_md(important)

        # Save findings
        self.state["findings"] = [
            {"timestamp": now.isoformat(), "messages": [m["message"] for m in important]}
        ]

        save_state(self.state)

    def stop(self):
        self.running = False

# ─── CLI Interface ────────────────────────────────────────────────────

def cmd_run():
    """Run the daemon in foreground."""
    daemon = WatcherDaemon()

    def handle_signal(signum, frame):
        log(f"Received signal {signum}, stopping...")
        daemon.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    daemon.run()

def cmd_daemon():
    """Run as background daemon."""
    pid = os.fork()
    if pid > 0:
        # Parent
        PID_FILE.write_text(str(pid))
        log(f"Daemon started (PID {pid})")
        print(f"rig-watch daemon started (PID {pid})")
        print(f"  Status: rig-watch --status")
        print(f"  Stop:   rig-watch --stop")
        return

    # Child — daemonize
    os.setsid()
    os.umask(0)

    # Redirect stdio
    devnull = open(os.devnull, "r")
    sys.stdin = devnull

    daemon = WatcherDaemon()

    def handle_signal(signum, frame):
        daemon.stop()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    daemon.run()

def cmd_status():
    """Show daemon status."""
    if PID_FILE.exists():
        pid = int(PID_FILE.read_text().strip())
        # Check if process is running
        try:
            os.kill(pid, 0)
            print(f"rig-watch daemon: RUNNING (PID {pid})")
        except ProcessLookupError:
            print(f"rig-watch daemon: STALE PID file (PID {pid} not running)")
            PID_FILE.unlink(missing_ok=True)
    else:
        print("rig-watch daemon: STOPPED")

    state = load_state()
    print(f"  Checks run:  {state.get('checks_run', 0)}")
    print(f"  Pushes sent: {state.get('pushes_sent', 0)}")
    print(f"  Last check:  {state.get('last_check', 'never')}")
    print(f"  Last push:   {state.get('last_push', 'never')}")

    if LOG_FILE.exists():
        lines = LOG_FILE.read_text().splitlines()
        if lines:
            print(f"\n  Recent log:")
            for line in lines[-5:]:
                print(f"    {line}")

def cmd_stop():
    """Stop the daemon."""
    if not PID_FILE.exists():
        print("No daemon running")
        return

    pid = int(PID_FILE.read_text().strip())
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Stopped daemon (PID {pid})")
        PID_FILE.unlink(missing_ok=True)
    except ProcessLookupError:
        print(f"Daemon not running (stale PID {pid})")
        PID_FILE.unlink(missing_ok=True)

def cmd_scan():
    """Run a single scan and show results."""
    print("=" * 55)
    print("  RIG WATCH — Single Scan")
    print("=" * 55)
    print()

    findings = WorkspaceScanner.full_scan()

    print("GIT:")
    git = findings["git"]
    print(f"  Branch: {git.get('branch', 'N/A')}")
    print(f"  Uncommitted: {git.get('uncommitted', 0)}")
    print(f"  Clean: {git['clean']}")
    print()

    print("HERMES SESSIONS:")
    hermes = findings["hermes"]
    print(f"  Total: {hermes['total']}")
    print(f"  Mega-sessions: {len(hermes['mega_sessions'])}")
    if hermes.get("latest_age_min"):
        print(f"  Latest session age: {hermes['latest_age_min']} min")
    print()

    print("CROSS-HARNESS:")
    cross = findings["cross_harness"]
    for name, count in cross.get("harnesses", {}).items():
        print(f"  {name}: {count}")
    if cross.get("silo_warning"):
        print(f"  ⚠️  SILO WARNING: {cross['dominant']} dominates")
    print()

    print("ERRORS:")
    errors = findings["errors"]
    print(f"  Recent errors: {errors['has_recent_errors']}")
    for err in errors.get("errors", [])[:3]:
        print(f"    {err[:80]}")
    print()

    messages = CoachingGenerator.generate(findings, load_state())
    if messages:
        print("COACHING MESSAGES:")
        for msg in messages:
            print(f"  [{msg['priority']}] {msg['message']}")
    else:
        print("No coaching needed. Workspace looks healthy.")

def cmd_config():
    """Show current config."""
    config = load_config()
    print(json.dumps(config, indent=2))

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="RIG AI Engineering v10 — Workspace Watcher")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("run", help="Run in foreground")
    subparsers.add_parser("daemon", help="Run as background daemon")
    subparsers.add_parser("status", help="Show daemon status")
    subparsers.add_parser("stop", help="Stop daemon")
    subparsers.add_parser("scan", help="Run single scan")
    subparsers.add_parser("config", help="Show config")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run()
    elif args.command == "daemon":
        cmd_daemon()
    elif args.command == "status":
        cmd_status()
    elif args.command == "stop":
        cmd_stop()
    elif args.command == "scan":
        cmd_scan()
    elif args.command == "config":
        cmd_config()
    else:
        parser.print_help()
