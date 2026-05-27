#!/usr/bin/env python3
"""
RIG AI Engineering v10 — Prompt Intelligence Engine
Makes every prompt 10x more effective through context, learning, and optimization.
"""

import json
import os
import re
import sys
import subprocess
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict
from typing import Optional

# ─── Paths ───────────────────────────────────────────────────────────
HOME = Path.home()
RIG_DIR = HOME / ".rig"
CACHE_DIR = RIG_DIR / "cache"
HISTORY_FILE = RIG_DIR / "prompt-history.jsonl"
SESSIONS_FILE = RIG_DIR / "sessions.jsonl"
PATTERNS_FILE = RIG_DIR / "success-patterns.json"
CONFIGS_FILE = RIG_DIR / "configs.json"
DOCTRINE_FILE = HOME / ".ai-engineer-coach" / "rules" / "rig-doctrine.md"

for d in [RIG_DIR, CACHE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

for f in [HISTORY_FILE, SESSIONS_FILE, PATTERNS_FILE, CONFIGS_FILE]:
    if not f.exists():
        f.write_text("") if f.suffix == ".jsonl" else f.write_text("{}")

# ─── Banned Words (RIG Brand) ───────────────────────────────────────
BANNED_WORDS = ["unlock", "empower", "synergy", "leverage", "disrupt", "hustle"]

# ─── RIG Lattice Coordinates ────────────────────────────────────────
LATTICE = {
    "A1": "IQ — Intelligence/Quality",
    "A2": "QR — Quality/Results",
    "A3": "SQ — Speed/Quality",
    "A4": "PI — Process/Integration",
    "D1": "Direct — Execute immediately",
    "D2": "Delegate — Route to specialist",
    "D3": "Defer — Schedule for later",
    "L1": "Listen — Gather signals",
    "L2": "Learn — Build understanding",
    "L3": "Link — Connect patterns",
    "L4": "Leverage — Apply compound effects",
    "L5": "Launch — Execute with force",
    "L6": "Loop — Iterate and improve",
    "L7": "Lock — Finalize and ship",
}

# ─── Context Synthesizer ─────────────────────────────────────────────
class ContextSynthesizer:
    """Collects and synthesizes context from multiple sources."""

    @staticmethod
    def git_context() -> dict:
        ctx = {}
        try:
            branch = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, timeout=5
            ).stdout.strip()
            if branch:
                ctx["branch"] = branch
                ctx["last_commit"] = subprocess.run(
                    ["git", "log", "--oneline", "-1"],
                    capture_output=True, text=True, timeout=5
                ).stdout.strip()
                status = subprocess.run(
                    ["git", "status", "--porcelain"],
                    capture_output=True, text=True, timeout=5
                ).stdout.strip()
                ctx["uncommitted"] = len(status.splitlines()) if status else 0
                recent_files = subprocess.run(
                    ["git", "diff", "--name-only", "HEAD~5"],
                    capture_output=True, text=True, timeout=5
                ).stdout.strip()
                ctx["recent_files"] = [f for f in recent_files.splitlines()][:10]
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return ctx

    @staticmethod
    def session_context() -> dict:
        ctx = {"today_count": 0, "recent_topics": [], "avg_score": 0}
        if not HISTORY_FILE.exists():
            return ctx
        today = datetime.now().strftime("%Y-%m-%d")
        scores = []
        try:
            for line in HISTORY_FILE.read_text().splitlines():
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    ts = entry.get("timestamp", "")
                    if today in ts:
                        ctx["today_count"] += 1
                    score = entry.get("score", 0)
                    if isinstance(score, (int, float)):
                        scores.append(score)
                    prompt_text = entry.get("raw", entry.get("prompt", ""))
                    if prompt_text:
                        ctx["recent_topics"].append(prompt_text[:80])
                except json.JSONDecodeError:
                    continue
        except Exception:
            pass
        if scores:
            ctx["avg_score"] = sum(scores) // len(scores)
        ctx["recent_topics"] = ctx["recent_topics"][-5:]
        return ctx

    @staticmethod
    def project_context() -> dict:
        ctx = {}
        cwd = Path.cwd()
        ctx["project"] = cwd.name
        ctx["is_git"] = (cwd / ".git").is_dir()

        # Detect project type
        if (cwd / "package.json").exists():
            ctx["type"] = "node"
        elif (cwd / "pyproject.toml").exists() or (cwd / "setup.py").exists() or (cwd / "requirements.txt").exists():
            ctx["type"] = "python"
        elif (cwd / "Cargo.toml").exists():
            ctx["type"] = "rust"
        elif (cwd / "go.mod").exists():
            ctx["type"] = "go"
        else:
            ctx["type"] = "unknown"

        # Count source files
        src_count = 0
        for ext in [".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".sh", ".md"]:
            src_count += len(list(cwd.rglob(f"*{ext}")))
        ctx["source_files"] = src_count

        return ctx

    @staticmethod
    def recent_errors() -> list:
        """Parse recent error patterns from common locations."""
        errors = []
        cwd = Path.cwd()

        # Check for recent error logs
        for log_path in [cwd / "error.log", cwd / "errors.log", cwd / ".errors"]:
            if log_path.exists():
                try:
                    lines = log_path.read_text().splitlines()
                    errors.extend(lines[-5:])
                except Exception:
                    pass

        return errors

    @classmethod
    def full_context(cls) -> dict:
        return {
            "git": cls.git_context(),
            "session": cls.session_context(),
            "project": cls.project_context(),
            "errors": cls.recent_errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ─── Prompt Optimizer ────────────────────────────────────────────────
class PromptOptimizer:
    """Analyzes and optimizes prompts before sending."""

    @staticmethod
    def analyze(prompt: str, context: dict) -> dict:
        analysis = {
            "length": len(prompt),
            "word_count": len(prompt.split()),
            "scores": {},
            "findings": [],
            "enhancements": [],
            "lattice_suggestion": None,
        }

        # ── Specificity Score (0-25) ──
        spec = 0
        if re.search(r"\d", prompt):
            spec += 3  # Contains numbers/lines
            analysis["findings"].append("Contains numerical references (+3)")
        if re.search(r"(file|path|line|function|class|module|method|variable)", prompt, re.I):
            spec += 5  # References code structure
            analysis["findings"].append("References code structure (+5)")
        if re.search(r"(format|output|return|print|display|response)", prompt, re.I):
            spec += 4  # Specifies output format
            analysis["findings"].append("Specifies output format (+4)")
        if re.search(r"(test|verify|validate|check|assert|confirm)", prompt, re.I):
            spec += 4  # Includes verification
            analysis["findings"].append("Includes verification steps (+4)")
        if re.search(r"(constraint|limit|maximum|minimum|within|bound)", prompt, re.I):
            spec += 3  # Has constraints
            analysis["findings"].append("Defines constraints (+3)")
        if re.search(r"(because|since|due to|reason|cause)", prompt, re.I):
            spec += 3  # Explains reasoning
            analysis["findings"].append("Includes reasoning (+3)")
        if len(prompt) > 100:
            spec += 3
        elif len(prompt) < 20:
            spec -= 5
            analysis["findings"].append("CRITICAL: Too short — add context, constraints, expected output (-5)")
        elif len(prompt) < 50:
            spec -= 2
            analysis["findings"].append("WARNING: Brief — consider adding specifics (-2)")

        analysis["scores"]["specificity"] = max(0, min(25, spec))

        # ── RIG Doctrine Score (0-25) ──
        rig = 0
        if re.search(r"(IQRSQPI|ProofPacket|BMS)", prompt, re.I):
            rig += 8
            analysis["findings"].append("References RIG doctrine concepts (+8)")
        if re.search(r"A[1-4]|D[1-3]|L[1-7]", prompt):
            rig += 5
            analysis["findings"].append("Uses lattice coordinates (+5)")
        if re.search(r"(acceptance criteria|success criteria|definition of done)", prompt, re.I):
            rig += 4
            analysis["findings"].append("Defines success criteria (+4)")
        if re.search(r"(scope|boundary|out of scope|constraint)", prompt, re.I):
            rig += 3
            analysis["findings"].append("Defines scope/boundaries (+3)")
        if re.search(r"(A1|D1|L1|L5|L7)", prompt):
            rig += 5
            analysis["findings"].append("Uses action-oriented lattice (+5)")

        analysis["scores"]["rig_doctrine"] = max(0, min(25, rig))

        # ── Context Injection Score (0-25) ──
        ctx = 0
        if "#file:" in prompt or re.search(r"#\w+", prompt):
            ctx += 8
            analysis["findings"].append("References files/sessions (+8)")
        if re.search(r"(skill_view|memory|session_search)", prompt, re.I):
            ctx += 5
            analysis["findings"].append("Loads skills/memory (+5)")
        if re.search(r"(previous|earlier|last time|from session|building on)", prompt, re.I):
            ctx += 4
            analysis["findings"].append("References prior work (+4)")
        git_ctx = context.get("git", {})
        if git_ctx.get("recent_files"):
            # Check if prompt references any recent files
            for f in git_ctx["recent_files"]:
                if f.split("/")[-1].split(".")[0] in prompt.lower():
                    ctx += 5
                    analysis["findings"].append(f"References recently modified file: {f} (+5)")
                    break

        if ctx == 0:
            analysis["findings"].append("NO CONTEXT: No file references, skill loads, or prior session context")

        analysis["scores"]["context"] = max(0, min(25, ctx))

        # ── Actionability Score (0-25) ──
        act = 0
        if re.search(r"(should|must|will|shall|needs to|required to)", prompt, re.I):
            act += 5
            analysis["findings"].append("Uses action verbs (+5)")
        if re.search(r"(step|first|then|next|finally)", prompt, re.I):
            act += 4
            analysis["findings"].append("Sequenced steps (+4)")
        if re.search(r"(example|for instance|such as|e\.g\.)", prompt, re.I):
            act += 4
            analysis["findings"].append("Includes examples (+4)")
        if re.search(r"(before|after|when|if|unless)", prompt, re.I):
            act += 3
            analysis["findings"].append("Defines conditions (+3)")
        if "?" not in prompt and len(prompt) > 10:
            act += 4  # Not a question — directive
            analysis["findings"].append("Directive format (+4)")

        analysis["scores"]["actionability"] = max(0, min(25, act))

        # ── Total Score ──
        total = sum(analysis["scores"].values())
        analysis["total_score"] = total

        # ── Grade ──
        if total >= 90:
            analysis["grade"] = "A+"
            analysis["grade_label"] = "Operator Grade"
        elif total >= 80:
            analysis["grade"] = "A"
            analysis["grade_label"] = "Excellent"
        elif total >= 70:
            analysis["grade"] = "B"
            analysis["grade_label"] = "Good"
        elif total >= 60:
            analysis["grade"] = "C"
            analysis["grade_label"] = "Acceptable"
        elif total >= 50:
            analysis["grade"] = "D"
            analysis["grade_label"] = "Needs Work"
        else:
            analysis["grade"] = "F"
            analysis["grade_label"] = "Rewrite Required"


        # ── Lattice Suggestion ──
        analysis["lattice_suggestion"] = PromptOptimizer._suggest_lattice(prompt)

        # ── Enhancements ──
        if analysis["scores"]["specificity"] < 15:
            analysis["enhancements"].append("Add: file paths, line numbers, expected output format")
        if analysis["scores"]["context"] < 10:
            analysis["enhancements"].append("Add: #file references, skill_view calls, prior session context")
        if analysis["scores"]["rig_doctrine"] < 10:
            analysis["enhancements"].append("Add: lattice coordinate, acceptance criteria, verification steps")
        if analysis["scores"]["actionability"] < 15:
            analysis["enhancements"].append("Add: explicit action verbs, sequenced steps, conditions")

        return analysis

    @staticmethod
    def _suggest_lattice(prompt: str) -> Optional[str]:
        """Suggest a lattice coordinate based on prompt content."""
        prompt_lower = prompt.lower()

        if any(w in prompt_lower for w in ["fix", "bug", "error", "crash", "broken"]):
            return "D1 — Direct: Execute immediately (bug fix)"
        if any(w in prompt_lower for w in ["deploy", "release", "ship", "launch"]):
            return "L5 — Launch: Execute with force (deployment)"
        if any(w in prompt_lower for w in ["research", "investigate", "explore", "analyze"]):
            return "L2 — Learn: Build understanding (research)"
        if any(w in prompt_lower for w in ["review", "audit", "check", "inspect"]):
            return "L1 — Listen: Gather signals (review)"
        if any(w in prompt_lower for w in ["connect", "integrate", "bridge", "link"]):
            return "L3 — Link: Connect patterns (integration)"
        if any(w in prompt_lower for w in ["iterate", "improve", "optimize", "refactor"]):
            return "L6 — Loop: Iterate and improve (optimization)"
        if any(w in prompt_lower for w in ["finalize", "complete", "close", "lock"]):
            return "L7 — Lock: Finalize and ship (completion)"
        if any(w in prompt_lower for w in ["delegate", "assign", "route"]):
            return "D2 — Delegate: Route to specialist"

        return None

    @staticmethod
    def enhance(prompt: str, context: dict, analysis: dict) -> str:
        """Generate an enhanced prompt with all improvements."""
        enhanced = prompt

        # Add lattice coordinate if missing
        lattice = analysis.get("lattice_suggestion")
        if lattice and not re.search(r"A[1-4]|D[1-3]|L[1-7]", prompt):
            enhanced = f"[{lattice}]\n\n{enhanced}"

        # Add context block if score is low
        if analysis["scores"]["context"] < 10:
            git_ctx = context.get("git", {})
            ctx_block = []
            if git_ctx.get("branch"):
                ctx_block.append(f"- Branch: {git_ctx['branch']}")
            if git_ctx.get("recent_files"):
                ctx_block.append(f"- Recent files: {', '.join(git_ctx['recent_files'][:5])}")
            proj_ctx = context.get("project", {})
            if proj_ctx.get("type"):
                ctx_block.append(f"- Project type: {proj_ctx['type']}")
            if ctx_block:
                enhanced = f"## Context\n{chr(10).join(ctx_block)}\n\n{enhanced}"

        # Add acceptance criteria if missing
        if analysis["scores"]["rig_doctrine"] < 10:
            if "acceptance criteria" not in prompt.lower():
                enhanced += "\n\n## Acceptance Criteria\n- [ ] Output meets specified format\n- [ ] Edge cases handled\n- [ ] Tests pass\n- [ ] No regressions"

        # Add verification if missing
        if not re.search(r"(test|verify|validate|check|assert)", prompt, re.I):
            enhanced += "\n\n## Verification\n- How will you verify this works?\n- What are the edge cases?"

        return enhanced


# ─── Learning Engine ──────────────────────────────────────────────────
class LearningEngine:
    """Tracks prompt patterns and learns what works."""

    @staticmethod
    def record_outcome(prompt_hash: str, success: bool, tool: str, duration_sec: float, iterations: int = 1):
        """Record whether a prompt led to a successful outcome."""
        try:
            patterns = json.loads(PATTERNS_FILE.read_text()) if PATTERNS_FILE.exists() and PATTERNS_FILE.stat().st_size > 0 else {}
        except Exception:
            patterns = {}

        if prompt_hash not in patterns:
            patterns[prompt_hash] = {"attempts": 0, "successes": 0, "tools": Counter(), "avg_duration": 0, "avg_iterations": 0}

        p = patterns[prompt_hash]
        p["attempts"] += 1
        if success:
            p["successes"] += 1
        p["tools"][tool] = p["tools"].get(tool, 0) + 1
        p["avg_duration"] = (p["avg_duration"] * (p["attempts"] - 1) + duration_sec) / p["attempts"]
        p["avg_iterations"] = (p["avg_iterations"] * (p["attempts"] - 1) + iterations) / p["attempts"]
        p["success_rate"] = p["successes"] / p["attempts"]

        # Convert Counter to dict for serialization
        p["tools"] = dict(p["tools"])

        PATTERNS_FILE.write_text(json.dumps(patterns, indent=2))

    @staticmethod
    def get_success_patterns(limit: int = 10) -> list:
        """Get the most successful prompt patterns."""
        try:
            patterns = json.loads(PATTERNS_FILE.read_text()) if PATTERNS_FILE.exists() and PATTERNS_FILE.stat().st_size > 0 else {}
        except Exception:
            return []

        sorted_patterns = sorted(
            patterns.items(),
            key=lambda x: x[1].get("success_rate", 0),
            reverse=True
        )
        return sorted_patterns[:limit]

    @staticmethod
    def get_personal_stats() -> dict:
        """Get personal prompting statistics."""
        try:
            patterns = json.loads(PATTERNS_FILE.read_text()) if PATTERNS_FILE.exists() and PATTERNS_FILE.stat().st_size > 0 else {}
        except Exception:
            patterns = {}

        total = sum(p.get("attempts", 0) for p in patterns.values())
        successes = sum(p.get("successes", 0) for p in patterns.values())
        all_tools = Counter()
        for p in patterns.values():
            for tool, count in p.get("tools", {}).items():
                all_tools[tool] += count

        return {
            "total_prompts_tracked": total,
            "total_successes": successes,
            "success_rate": (successes / total * 100) if total > 0 else 0,
            "favorite_tool": all_tools.most_common(1)[0][0] if all_tools else "none",
            "tools_distribution": dict(all_tools),
        }

    @staticmethod
    def suggest_improvements(prompt: str) -> list:
        """Based on past patterns, suggest improvements."""
        stats = LearningEngine.get_personal_stats()
        suggestions = []

        if stats["success_rate"] < 50 and stats["total_prompts_tracked"] > 5:
            suggestions.append(f"Your prompt success rate is {stats['success_rate']:.0f}%. Try being more specific with file paths and expected output.")

        if len(prompt) < 30:
            suggestions.append("Short prompts have lower success rates for you. Expand with context.")

        if not re.search(r"(test|verify|validate)", prompt, re.I):
            suggestions.append("Prompts without verification steps succeed less often for you.")

        return suggestions


# ─── Template Engine ──────────────────────────────────────────────────
class TemplateEngine:
    """Semantic template matching and suggestion."""

    CATEGORIES = [
        "rig-doctrine-execution",
        "fleet-infrastructure",
        "agent-orchestration",
        "content-engineering",
        "client-acquisition",
        "product-code",
        "research-intelligence",
        "healthcare-verticals",
        "personal-brand",
        "diagnostic-coaching",
    ]

    # Inline fallback templates (always available)
    BUILTIN_TEMPLATES = {
        "code-review": {
            "category": "product-code",
            "name": "Code Review",
            "description": "Review code with RIG standards",
            "template": "## Context\n- File: {file}\n- Branch: {branch}\n\n## Review Criteria\n- [ ] Follows project conventions\n- [ ] Error handling complete\n- [ ] Tests included\n- [ ] No banned words\n- [ ] Under {max_lines} lines\n\n## Output\n- Summary of findings\n- Critical issues (must fix)\n- Suggestions (nice to have)\n- Verdict: approve / request changes",
        },
        "bug-fix": {
            "category": "product-code",
            "name": "Bug Fix",
            "description": "Fix a bug with verification",
            "template": "[D1 — Direct]\n\n## Bug\n{issue}\n\n## Context\n- File: {file}\n- Error: {error}\n- Reproduction: {steps}\n\n## Fix\n- Root cause:\n- Implementation:\n- Edge cases:\n\n## Verification\n- [ ] Reproduction case passes\n- [ ] Unit tests added\n- [ ] No regressions",
        },
        "deploy": {
            "category": "fleet-infrastructure",
            "name": "Deploy to Fleet",
            "description": "Deploy across RIG nodes",
            "template": "[L5 — Launch]\n\n## Deployment\n- Target: {target_nodes}\n- Model/Service: {service}\n- Version: {version}\n\n## Steps\n1. Pre-flight checks\n2. Deploy to staging\n3. Verify staging\n4. Deploy to production nodes\n5. Post-deploy verification\n\n## Rollback Plan\n- Trigger: {rollback_trigger}\n- Steps:\n\n## Verification\n- [ ] All nodes healthy\n- [ ] Response time < {max_latency}ms\n- [ ] Error rate < {max_error_rate}%",
        },
        "research": {
            "category": "research-intelligence",
            "name": "Research Task",
            "description": "Structured research with synthesis",
            "template": "[L2 — Learn]\n\n## Research Question\n{question}\n\n## Context\n- Domain: {domain}\n- Prior work: {prior}\n- Constraints: {constraints}\n\n## Method\n1. Search sources\n2. Synthesize findings\n3. Identify gaps\n4. Recommendations\n\n## Output Format\n- Executive summary (3 bullets)\n- Detailed findings\n- Confidence level: high/medium/low\n- Next steps",
        },
        "prompt-coach": {
            "category": "diagnostic-coaching",
            "name": "Prompt Coaching",
            "description": "Score and improve a prompt",
            "template": "## Prompt to Review\n{prompt}\n\n## Scoring Criteria\n- Specificity (0-25): file paths, numbers, constraints, output format\n- RIG Doctrine (0-25): lattice coords, success criteria, verification\n- Context (0-25): file references, skills, prior sessions\n- Actionability (0-25): verbs, sequencing, conditions\n\n## Output\n- Total score (0-100)\n- Grade (A+ to F)\n- Top 3 improvements\n- Enhanced prompt suggestion",
        },
    }

    @classmethod
    def search(cls, query: str, limit: int = 5) -> list:
        """Search templates by keyword matching."""
        query_lower = query.lower()
        words = set(query_lower.split())
        results = []

        # Search built-in templates
        for key, tmpl in cls.BUILTIN_TEMPLATES.items():
            score = 0
            name_lower = tmpl["name"].lower()
            desc_lower = tmpl["description"].lower()
            cat_lower = tmpl["category"].lower()

            for word in words:
                if word in name_lower:
                    score += 3
                if word in desc_lower:
                    score += 2
                if word in cat_lower:
                    score += 2
                if word in key.lower():
                    score += 4

            if score > 0:
                results.append((score, tmpl))

        # Search JSON templates if available
        template_file = Path(__file__).parent.parent / "scripts" / "rig-prompt-templates.json"
        if template_file.exists():
            try:
                data = json.loads(template_file.read_text())
                for category, items in data.items():
                    if isinstance(items, list):
                        for item in items:
                            name = item.get("name", "").lower()
                            desc = item.get("description", "").lower()
                            score = 0
                            for word in words:
                                if word in name:
                                    score += 3
                                if word in desc:
                                    score += 2
                                if word in category.lower():
                                    score += 1
                            if score > 0:
                                results.append((score, {
                                    "name": item.get("name", ""),
                                    "description": item.get("description", ""),
                                    "category": category,
                                    "template": item.get("template", ""),
                                }))
            except Exception:
                pass

        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]

    @classmethod
    def fill_template(cls, template_key: str, **kwargs) -> str:
        """Fill a template with provided values."""
        tmpl = cls.BUILTIN_TEMPLATES.get(template_key, {}).get("template", "")
        for key, value in kwargs.items():
            tmpl = tmpl.replace(f"{{{key}}}", str(value))
        return tmpl


# ─── Session Bridge ──────────────────────────────────────────────────
class SessionBridge:
    """Cross-harness context synchronization."""

    HARNESSES = {
        "claude": lambda: Path.home() / ".claude" / "projects",
        "codex": lambda: Path.home() / ".codex" / "sessions",
        "opencode": lambda: Path.home() / ".local" / "share" / "opencode" / "storage",
        "hermes": lambda: Path.home() / ".hermes" / "sessions",
        "gsd": lambda: Path.home() / ".gsd" / "sessions",
    }

    @classmethod
    def scan_all(cls) -> dict:
        """Scan all harness session stores."""
        results = {}
        for name, path_fn in cls.HARNESSES.items():
            path = path_fn()
            if path.exists():
                try:
                    sessions = list(path.rglob("*.json*"))
                    results[name] = {"path": str(path), "count": len(sessions), "latest": str(sessions[-1]) if sessions else None}
                except Exception as e:
                    results[name] = {"path": str(path), "count": 0, "error": str(e)}
            else:
                results[name] = {"path": str(path), "count": 0}
        return results

    @classmethod
    def export_context(cls, from_harness: str = "hermes") -> dict:
        """Export context from one harness for use in another."""
        context = {}

        if from_harness == "hermes":
            # Parse recent Hermes sessions
            sessions_dir = Path.home() / ".hermes" / "sessions"
            if sessions_dir.exists():
                recent = sorted(sessions_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)[:5]
                context["recent_sessions"] = [
                    {
                        "file": str(s),
                        "modified": datetime.fromtimestamp(s.stat().st_mtime).isoformat(),
                        "size": s.stat().st_size,
                    }
                    for s in recent
                ]

        return context


# ─── Main Entry Points ──────────────────────────────────────────────
def cmd_enhance(prompt: str) -> str:
    """Analyze and enhance a prompt."""
    context = ContextSynthesizer.full_context()
    analysis = PromptOptimizer.analyze(prompt, context)
    enhanced = PromptOptimizer.enhance(prompt, context, analysis)

    output = []
    output.append("=" * 55)
    output.append("  RIG PROMPT INTELLIGENCE — Enhancement Report")
    output.append("=" * 55)
    output.append("")
    output.append(f"  RAW PROMPT:    {prompt[:80]}")
    output.append(f"  LENGTH:        {analysis['length']} chars")
    output.append("")
    output.append("  SCORES:")
    output.append(f"    Specificity: {analysis['scores']['specificity']}/25")
    output.append(f"    RIG Doctrine:{analysis['scores']['rig_doctrine']}/25")
    output.append(f"    Context:     {analysis['scores']['context']}/25")
    output.append(f"    Actionability:{analysis['scores']['actionability']}/25")
    output.append(f"    ─────────────────────")
    output.append(f"    TOTAL:       {analysis['total_score']}/100  ({analysis['grade']} — {analysis['grade_label']})")
    output.append("")

    if analysis["findings"]:
        output.append("  FINDINGS:")
        for i, f in enumerate(analysis["findings"], 1):
            output.append(f"    {i}. {f}")
        output.append("")

    if analysis["lattice_suggestion"]:
        output.append(f"  SUGGESTED LATTICE: {analysis['lattice_suggestion']}")
        output.append("")

    output.append("── ENHANCED PROMPT " + "─" * 35)
    output.append("")
    output.append(enhanced)
    output.append("")

    # Learning suggestions
    suggestions = LearningEngine.suggest_improvements(prompt)
    if suggestions:
        output.append("── COACHING " + "─" * 40)
        output.append("")
        for s in suggestions:
            output.append(f"  > {s}")
        output.append("")

    output.append("── COMMANDS " + "─" * 42)
    output.append(f"  Score:  rig score \"{prompt[:50]}...\"")
    output.append(f"  History: rig history")
    output.append(f"  Send:   hermes chat -q \"...\"")

    # Record in history
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "raw": prompt,
        "score": analysis["total_score"],
        "grade": analysis["grade"],
    }
    with open(HISTORY_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    return "\n".join(output)


def cmd_score(prompt: str) -> str:
    """Score a prompt in detail."""
    return cmd_enhance(prompt)  # enhance includes full scoring


def cmd_suggest(query: str) -> str:
    """Search templates."""
    results = TemplateEngine.search(query)

    output = []
    output.append("=" * 55)
    output.append(f"  RIG TEMPLATES — Search: '{query}'")
    output.append("=" * 55)
    output.append("")

    if not results:
        output.append("  No matches. Try different keywords.")
        output.append("  Categories: " + ", ".join(TemplateEngine.CATEGORIES))
    else:
        for i, tmpl in enumerate(results, 1):
            output.append(f"  [{i}] {tmpl.get('name', 'Unknown')}")
            output.append(f"      Category: {tmpl.get('category', 'general')}")
            output.append(f"      {tmpl.get('description', '')}")
            if tmpl.get("template"):
                preview = tmpl["template"][:150].replace("\n", " ")
                output.append(f"      Template: {preview}...")
            output.append("")

    return "\n".join(output)


def cmd_history(limit: int = 10) -> str:
    """Show prompt history."""
    output = []
    output.append("=" * 55)
    output.append(f"  RIG PROMPT HISTORY — Last {limit}")
    output.append("=" * 55)
    output.append("")

    if not HISTORY_FILE.exists() or HISTORY_FILE.stat().st_size == 0:
        output.append("  No history yet.")
        return "\n".join(output)

    lines = HISTORY_FILE.read_text().strip().splitlines()
    recent = lines[-limit:]

    for line in reversed(recent):
        try:
            entry = json.loads(line)
            ts = entry.get("timestamp", "unknown")[:16]
            prompt = entry.get("raw", entry.get("prompt", ""))[:70]
            score = entry.get("score", "?")
            grade = entry.get("grade", "")
            bar = "█" * (int(score) // 5) + "░" * (20 - int(score) // 5) if isinstance(score, (int, float)) else "?"
            output.append(f"  [{ts}] {score}/100 {grade}")
            output.append(f"    [{bar}]")
            output.append(f"    {prompt}")
            output.append("")
        except Exception:
            continue

    # Personal stats
    stats = LearningEngine.get_personal_stats()
    if stats["total_prompts_tracked"] > 0:
        output.append("── YOUR STATS " + "─" * 40)
        output.append(f"  Prompts tracked: {stats['total_prompts_tracked']}")
        output.append(f"  Success rate: {stats['success_rate']:.0f}%")
        output.append(f"  Favorite tool: {stats['favorite_tool']}")

    return "\n".join(output)


def cmd_stats() -> str:
    """Show personal prompting statistics."""
    stats = LearningEngine.get_personal_stats()
    context = ContextSynthesizer.full_context()
    scans = SessionBridge.scan_all()

    output = []
    output.append("=" * 55)
    output.append("  RIG PROMPT STATS — Personal Dashboard")
    output.append("=" * 55)
    output.append("")
    output.append(f"  Prompts tracked: {stats['total_prompts_tracked']}")
    output.append(f"  Success rate: {stats['success_rate']:.0f}%")
    output.append(f"  Favorite tool: {stats['favorite_tool']}")
    output.append(f"  Prompts today: {context['session']['today_count']}")
    output.append(f"  Avg score (all time): {context['session']['avg_score']}")
    output.append("")
    output.append("  HARNESS SESSIONS:")
    for name, info in scans.items():
        output.append(f"    {name:12s}: {info['count']} sessions  ({info['path']})")

    return "\n".join(output)


def cmd_fill(template_key: str, **kwargs) -> str:
    """Fill a template with values."""
    return TemplateEngine.fill_template(template_key, **kwargs)


def cmd_run(prompt: str, tool: str = "hermes", timeout: int = 300) -> str:
    """
    Full closed-loop prompt execution:
    1. Score the raw prompt
    2. Enhance if score < threshold
    3. Execute via specified tool
    4. Record outcome for learning
    """
    import time

    output = []
    output.append("=" * 55)
    output.append("  RIG PROMPT INTELLIGENCE — Execute & Learn")
    output.append("=" * 55)
    output.append("")

    # Phase 1: Analyze
    context = ContextSynthesizer.full_context()
    analysis = PromptOptimizer.analyze(prompt, context)
    raw_score = analysis["total_score"]

    output.append(f"  RAW PROMPT:  {prompt[:80]}")
    output.append(f"  RAW SCORE:   {raw_score}/100 ({analysis['grade']})")
    output.append("")

    # Phase 2: Enhance if below threshold
    enhanced_prompt = prompt
    if raw_score < 70:
        enhanced_prompt = PromptOptimizer.enhance(prompt, context, analysis)
        enhanced_analysis = PromptOptimizer.analyze(enhanced_prompt, context)
        output.append(f"  ENHANCED SCORE: {enhanced_analysis['total_score']}/100 ({enhanced_analysis['grade']})")
        output.append(f"  IMPROVEMENT:    +{enhanced_analysis['total_score'] - raw_score} points")
        output.append("")
        output.append("── ENHANCED PROMPT " + "─" * 35)
        output.append(enhanced_prompt)
        output.append("")
    else:
        output.append("  SCORE ADEQUATE: No enhancement needed.")
        output.append("")

    # Phase 3: Execute
    output.append("── EXECUTING " + "─" * 42)
    output.append(f"  TOOL: {tool}")
    output.append("")

    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
    start_time = time.time()

    try:
        if tool == "hermes":
            cmd = ["hermes", "chat", "-q", enhanced_prompt]
        elif tool == "claude":
            cmd = ["claude", "execute", "--prompt", enhanced_prompt]
        elif tool == "codex":
            cmd = ["codex", "exec", enhanced_prompt]
        elif tool == "opencode":
            cmd = ["opencode", "run", enhanced_prompt]
        elif tool == "gsd":
            cmd = ["gsd", "run", enhanced_prompt]
        else:
            return f"ERROR: Unknown tool '{tool}'. Use: hermes, claude, codex, opencode, gsd"

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        duration = time.time() - start_time

        output.append(f"  EXIT CODE: {result.returncode}")
        output.append(f"  DURATION:  {duration:.1f}s")
        output.append("")

        if result.stdout:
            output.append("── OUTPUT " + "─" * 43)
            output.append(result.stdout[:5000])
            output.append("")

        if result.stderr:
            output.append("── STDERR " + "─" * 43)
            output.append(result.stderr[:2000])
            output.append("")

        # Phase 4: Record outcome
        # Heuristic: exit code 0 + output present = success
        success = result.returncode == 0 and len(result.stdout.strip()) > 50
        LearningEngine.record_outcome(
            prompt_hash=prompt_hash,
            success=success,
            tool=tool,
            duration_sec=duration,
        )

        output.append("── LEARNING " + "─" * 41)
        status = "✅ SUCCESS" if success else "❌ NEEDS REVIEW"
        output.append(f"  OUTCOME: {status}")
        output.append(f"  HASH:    {prompt_hash}")
        output.append("")

        # Show personal stats
        stats = LearningEngine.get_personal_stats()
        if stats["total_prompts_tracked"] > 0:
            output.append(f"  YOUR STATS: {stats['total_prompts_tracked']} prompts tracked | "
                          f"{stats['success_rate']:.0f}% success rate | "
                          f"Top tool: {stats['favorite_tool']}")

    except subprocess.TimeoutExpired:
        output.append(f"  TIMEOUT after {timeout}s")
        LearningEngine.record_outcome(prompt_hash, False, tool, timeout)
    except FileNotFoundError:
        output.append(f"  ERROR: {tool} not found on this system")
        output.append(f"  Install {tool} or use a different tool with --tool")
    except Exception as e:
        output.append(f"  ERROR: {e}")

    return "\n".join(output)


def cmd_ab_test(prompt_a: str, prompt_b: str, tool: str = "hermes", timeout: int = 300) -> str:
    """
    A/B test two prompt variants against each other.
    Runs both, compares outcomes, declares a winner.
    """
    import time

    output = []
    output.append("=" * 55)
    output.append("  RIG A/B TEST — Prompt Variant Comparison")
    output.append("=" * 55)
    output.append("")

    context = ContextSynthesizer.full_context()

    analysis_a = PromptOptimizer.analyze(prompt_a, context)
    analysis_b = PromptOptimizer.analyze(prompt_b, context)

    output.append(f"  VARIANT A: {prompt_a[:60]}...")
    output.append(f"    Score: {analysis_a['total_score']}/100 ({analysis_a['grade']})")
    output.append(f"  VARIANT B: {prompt_b[:60]}...")
    output.append(f"    Score: {analysis_b['total_score']}/100 ({analysis_b['grade']})")
    output.append("")

    # Execute A
    output.append("── RUNNING VARIANT A " + "─" * 33)
    result_a = _run_single(prompt_a, tool, timeout)
    output.append(result_a["summary"])
    output.append("")

    # Execute B
    output.append("── RUNNING VARIANT B " + "─" * 33)
    result_b = _run_single(prompt_b, tool, timeout)
    output.append(result_b["summary"])
    output.append("")

    # Compare
    output.append("── RESULTS " + "─" * 42)

    score_a = result_a["score"]
    score_b = result_b["score"]

    if score_a > score_b:
        winner = "A"
        margin = score_a - score_b
    elif score_b > score_a:
        winner = "B"
        margin = score_b - score_a
    else:
        winner = "TIE"
        margin = 0

    output.append(f"  WINNER: Variant {winner} (by {margin:.0f} points)")
    output.append(f"  A: success={result_a['success']} duration={result_a['duration']:.1f}s")
    output.append(f"  B: success={result_b['success']} duration={result_b['duration']:.1f}s")

    if winner != "TIE":
        winning_prompt = prompt_a if winner == "A" else prompt_b
        output.append("")
        output.append(f"  WINNING PROMPT: {winning_prompt}")

        # Record A/B test result
        try:
            patterns = json.loads(PATTERNS_FILE.read_text()) if PATTERNS_FILE.exists() and PATTERNS_FILE.stat().st_size > 0 else {}
        except Exception:
            patterns = {}

        ab_key = f"ab_{hashlib.md5(winning_prompt.encode()).hexdigest()[:8]}"
        patterns[ab_key] = {
            "winner": winner,
            "margin": margin,
            "variant_a": prompt_a,
            "variant_b": prompt_b,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        PATTERNS_FILE.write_text(json.dumps(patterns, indent=2))

    return "\n".join(output)


def _run_single(prompt: str, tool: str, timeout: int) -> dict:
    """Execute a single prompt, return structured result."""
    import time
    enhanced = PromptOptimizer.enhance(prompt, ContextSynthesizer.full_context(), PromptOptimizer.analyze(prompt, ContextSynthesizer.full_context()))

    start = time.time()
    try:
        cmd_map = {
            "hermes": ["hermes", "chat", "-q", enhanced],
            "claude": ["claude", "execute", "--prompt", enhanced],
            "codex": ["codex", "exec", enhanced],
            "opencode": ["opencode", "run", enhanced],
            "gsd": ["gsd", "run", enhanced],
        }
        cmd = cmd_map.get(tool, ["hermes", "chat", "-q", enhanced])
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        duration = time.time() - start
        success = result.returncode == 0 and len(result.stdout.strip()) > 50
        score_val = min(100, len(result.stdout.strip()) // 10)  # Simple output-based score
        return {
            "success": success,
            "duration": duration,
            "score": score_val,
            "output": result.stdout[:2000],
            "summary": f"  success={success} | duration={duration:.1f}s | output_len={len(result.stdout)}",
        }
    except Exception as e:
        return {
            "success": False,
            "duration": time.time() - start,
            "score": 0,
            "output": "",
            "summary": f"  FAILED: {e}",
        }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="RIG AI Engineering v10 — Prompt Intelligence Engine")
    subparsers = parser.add_subparsers(dest="command")

    # enhance
    p_enhance = subparsers.add_parser("enhance", help="Analyze and enhance a prompt")
    p_enhance.add_argument("prompt", help="The prompt to enhance")

    # score
    p_score = subparsers.add_parser("score", help="Score a prompt")
    p_score.add_argument("prompt", help="The prompt to score")

    # suggest
    p_suggest = subparsers.add_parser("suggest", help="Search templates")
    p_suggest.add_argument("query", help="Search query")

    # history
    p_history = subparsers.add_parser("history", help="Show prompt history")
    p_history.add_argument("--limit", type=int, default=10)

    # stats
    subparsers.add_parser("stats", help="Show personal stats")

    # run
    p_run = subparsers.add_parser("run", help="Enhance → Execute → Learn")
    p_run.add_argument("prompt", help="The prompt to execute")
    p_run.add_argument("--tool", default="hermes", help="Tool to use (hermes|claude|codex|opencode|gsd)")
    p_run.add_argument("--timeout", type=int, default=300, help="Timeout in seconds")

    # ab-test
    p_ab = subparsers.add_parser("ab-test", help="A/B test two prompt variants")
    p_ab.add_argument("prompt_a", help="Variant A")
    p_ab.add_argument("prompt_b", help="Variant B")
    p_ab.add_argument("--tool", default="hermes", help="Tool to use")
    p_ab.add_argument("--timeout", type=int, default=300)

    args = parser.parse_args()

    if args.command == "enhance":
        print(cmd_enhance(args.prompt))
    elif args.command == "score":
        print(cmd_score(args.prompt))
    elif args.command == "suggest":
        print(cmd_suggest(args.query))
    elif args.command == "history":
        print(cmd_history(args.limit))
    elif args.command == "stats":
        print(cmd_stats())
    elif args.command == "run":
        print(cmd_run(args.prompt, args.tool, args.timeout))
    elif args.command == "ab-test":
        print(cmd_ab_test(args.prompt_a, args.prompt_b, args.tool, args.timeout))
    else:
        parser.print_help()

        parser.print_help()