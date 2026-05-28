#!/usr/bin/env python3
"""
RIG AI Engineering v15 — MCP Server
Exposes prompt intelligence and v15 operator workflows as MCP tools via stdio JSON-RPC.

Tools:
  rig_score_prompt     — Score a prompt (0-100, 4 axes)
  rig_enhance_prompt   — Analyze and enhance a prompt
  rig_suggest_template — Search prompt templates
  rig_get_stats        — Personal prompting stats
  rig_get_trends       — Score trends over time
  rig_run_prompt       — Enhance → Execute → Learn
  rig_fix_prompt       — Fix any prompt with RIG Prompt Master context and RigForge contract
  rig_prompt_master_catalog — List Prompt Master modes and enhancement packs
  rig_context_status   — Check QNAP/GitHub/Gitea/Recall context adapter status
  rig_v15_audit        — Validate v15 catalogs
  rig_v15_intake       — Generate a v15 intake packet

Usage:
  python3 rig-mcp-server.py

Configure in Claude Code MCP settings:
  {
    "mcpServers": {
      "rig": {
        "command": "python3",
        "args": ["/path/to/rig-mcp-server.py"]
      }
    }
  }
"""

import json
import sys
import os
import hashlib
from pathlib import Path
from datetime import datetime, timezone

# Add parent dir to path so we can import prompt_engine
sys.path.insert(0, str(Path(__file__).parent))

HOME = Path.home()
RIG_DIR = HOME / ".rig"
ENGINE = Path(__file__).parent / "prompt_engine.py"
V15 = Path(__file__).parent / "rig_v15.py"
FIXER = Path(__file__).parent / "rig_prompt_fixer.py"

# ─── JSON-RPC Helpers ────────────────────────────────────────────────

def send_response(id, result):
    msg = {"jsonrpc": "2.0", "id": id, "result": result}
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()

def send_error(id, code, message):
    msg = {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()

def send_notification(method, params=None):
    msg = {"jsonrpc": "2.0", "method": method}
    if params:
        msg["params"] = params
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()

# ─── MCP Protocol ────────────────────────────────────────────────────

def handle_initialize(params, id):
    """MCP initialize handshake."""
    send_response(id, {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": {},
        },
        "serverInfo": {
            "name": "rig-ai-engineering",
            "version": "15.3.0",
        },
    })

def handle_tools_list(params, id):
    """List available MCP tools."""
    tools = [
        {
            "name": "rig_score_prompt",
            "description": "Score a prompt on 4 axes (Specificity, RIG Doctrine, Context, Actionability) returning 0-100 grade with detailed findings",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The prompt to score",
                    },
                },
                "required": ["prompt"],
            },
        },
        {
            "name": "rig_enhance_prompt",
            "description": "Analyze and enhance a prompt with auto-context injection (git state, recent files, project type), lattice coordinate suggestion, and acceptance criteria",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The prompt to enhance",
                    },
                },
                "required": ["prompt"],
            },
        },
        {
            "name": "rig_suggest_template",
            "description": "Search RIG prompt templates by keyword across 10 categories (doctrine, fleet, agents, content, clients, product, research, healthcare, brand, coaching)",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query",
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "rig_get_stats",
            "description": "Get personal prompting statistics: total prompts, success rate, favorite harness, session counts, average score",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "rig_get_trends",
            "description": "Get prompting score trends over time with daily averages and improvement/decline detection",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to include (default 30)",
                        "default": 30,
                    },
                },
            },
        },
        {
            "name": "rig_run_prompt",
            "description": "Full closed-loop: enhance prompt → execute via Hermes → record outcome for learning",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The prompt to execute",
                    },
                    "tool": {
                        "type": "string",
                        "description": "Tool to use: hermes, claude, codex, opencode, gsd (default hermes)",
                        "default": "hermes",
                    },
                },
                "required": ["prompt"],
            },
        },
        {
            "name": "rig_fix_prompt",
            "description": "Fix any prompt with RIG Prompt Master using current work surface, QNAP policy, GitHub/Gitea remotes, Recall API, local RIG context pack, and a RigForge DoneContract. Read-only context collection; no external writes.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The rough prompt to fix",
                    },
                    "cwd": {
                        "type": "string",
                        "description": "Workspace directory for git/context detection",
                        "default": "",
                    },
                    "mode": {
                        "type": "string",
                        "description": "Target prompt surface",
                        "enum": ["auto", "general", "claude-design", "ui-walkthrough", "coding-agent", "browser-agent", "research", "product-strategy", "api-backend"],
                        "default": "auto",
                    },
                    "enhancements": {
                        "type": "array",
                        "description": "Prompt Master enhancement pack ids such as rigforge-contract, claude-design-walkthrough, screenshot-qa, api-ready",
                        "items": {"type": "string"},
                        "default": [],
                    },
                    "screenshot_note": {
                        "type": "string",
                        "description": "Optional notes about an attached screenshot or visible UI state",
                        "default": "",
                    },
                    "include_context_pack": {
                        "type": "boolean",
                        "description": "Include local RIG context pack results",
                        "default": True,
                    },
                    "include_apis": {
                        "type": "boolean",
                        "description": "Allow read-only GitHub/Gitea/Recall API enrichment when configured",
                        "default": True,
                    },
                    "json": {
                        "type": "boolean",
                        "description": "Return structured JSON instead of Markdown",
                        "default": False,
                    },
                },
                "required": ["prompt"],
            },
        },
        {
            "name": "rig_prompt_master_catalog",
            "description": "List RIG Prompt Master modes, enhancement packs, RigForge phases, and invariants for API/MCP clients.",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "rig_context_status",
            "description": "Check read-only context adapter status for work surface, QNAP, GitHub, Gitea, Recall API, and local RIG context pack configuration",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "cwd": {
                        "type": "string",
                        "description": "Workspace directory for git/context detection",
                        "default": "",
                    },
                    "include_context_pack": {
                        "type": "boolean",
                        "description": "Include local RIG context pack status",
                        "default": False,
                    },
                    "include_apis": {
                        "type": "boolean",
                        "description": "Allow read-only GitHub/Gitea/Recall API checks when configured",
                        "default": True,
                    },
                    "json": {
                        "type": "boolean",
                        "description": "Return structured JSON instead of Markdown",
                        "default": True,
                    },
                },
            },
        },
        {
            "name": "rig_coach",
            "description": "Get personalized prompting diagnostic: score distribution, common weaknesses, coaching recommendations",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "rig_get_history",
            "description": "Get recent prompt history with scores and grades",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of entries (default 10)",
                        "default": 10,
                    },
                },
            },
        },
        {
            "name": "rig_validate_clipboard",
            "description": "Read the system clipboard and score whatever prompt is in it",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "rig_v15_audit",
            "description": "Validate the v15 open-source resource catalog, methodology agents, 100-question bank, mappings, and hashes",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "rig_v15_resources",
            "description": "Search the reviewed v15 open-source agent and harness resource catalog",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search query such as mcp, browser, eval, orchestration",
                        "default": "",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum resources to return",
                        "default": 8,
                    },
                },
            },
        },
        {
            "name": "rig_v15_personas",
            "description": "Search the v15 methodology-inspired multi-role persona agents",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search query such as tests, observability, product, research",
                        "default": "",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum persona agents to return",
                        "default": 4,
                    },
                },
            },
        },
        {
            "name": "rig_v15_questions",
            "description": "Return the full 100-question bank or a filtered subset by query/persona",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional query used to select persona/question subsets",
                        "default": "",
                    },
                    "persona_id": {
                        "type": "string",
                        "description": "Optional persona id such as kent-beck-method or charity-majors-method",
                        "default": "",
                    },
                    "include_all": {
                        "type": "boolean",
                        "description": "Return all 100 questions",
                        "default": False,
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Optional maximum question count; 0 means no limit",
                        "default": 0,
                    },
                },
            },
        },
        {
            "name": "rig_v15_intake",
            "description": "Generate a v15 task intake packet with route, selected resources, methodology agents, questions, gates, and proof requirements",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "The agent/harness/product-build task to intake",
                    },
                    "fast": {
                        "type": "boolean",
                        "description": "Use focused subset instead of the full 100-question intake",
                        "default": False,
                    },
                },
                "required": ["task"],
            },
        },
    ]
    send_response(id, {"tools": tools})

def handle_tools_call(params, id):
    """Execute an MCP tool call."""
    name = params.get("name", "")
    args = params.get("arguments", {})

    result = {"content": []}

    if name == "rig_score_prompt":
        prompt = args.get("prompt", "")
        if not prompt:
            result["content"].append({"type": "text", "text": "ERROR: No prompt provided"})
        else:
            output = _run_engine("score", prompt)
            result["content"].append({"type": "text", "text": output})

    elif name == "rig_enhance_prompt":
        prompt = args.get("prompt", "")
        if not prompt:
            result["content"].append({"type": "text", "text": "ERROR: No prompt provided"})
        else:
            output = _run_engine("enhance", prompt)
            result["content"].append({"type": "text", "text": output})

    elif name == "rig_suggest_template":
        query = args.get("query", "")
        if not query:
            result["content"].append({"type": "text", "text": "ERROR: No query provided"})
        else:
            output = _run_engine("suggest", query)
            result["content"].append({"type": "text", "text": output})

    elif name == "rig_get_stats":
        output = _run_engine("stats")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_get_trends":
        days = args.get("days", 30)
        output = _run_engine("trends", str(days))
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_run_prompt":
        prompt = args.get("prompt", "")
        tool = args.get("tool", "hermes")
        if not prompt:
            result["content"].append({"type": "text", "text": "ERROR: No prompt provided"})
        else:
            output = _run_engine("run", prompt, tool)
            result["content"].append({"type": "text", "text": output})

    elif name == "rig_fix_prompt":
        prompt = args.get("prompt", "")
        if not prompt:
            result["content"].append({"type": "text", "text": "ERROR: No prompt provided"})
        else:
            cmd_args = [prompt]
            mode = args.get("mode", "")
            if mode:
                cmd_args.extend(["--mode", mode])
            screenshot_note = args.get("screenshot_note", "")
            if screenshot_note:
                cmd_args.extend(["--screenshot-note", screenshot_note])
            enhancements = args.get("enhancements", [])
            if isinstance(enhancements, list):
                for enhancement in enhancements:
                    cmd_args.extend(["--enhancement", enhancement])
            if args.get("json", False):
                cmd_args.append("--json")
            if not args.get("include_context_pack", True):
                cmd_args.append("--no-context-pack")
            if not args.get("include_apis", True):
                cmd_args.append("--no-apis")
            output = _run_fixer(*cmd_args, cwd=args.get("cwd") or None)
            result["content"].append({"type": "text", "text": output})

    elif name == "rig_prompt_master_catalog":
        output = _run_fixer("--list-enhancements")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_context_status":
        cmd_args = ["--status"]
        if args.get("json", True):
            cmd_args.append("--json")
        if not args.get("include_context_pack", False):
            cmd_args.append("--no-context-pack")
        if not args.get("include_apis", True):
            cmd_args.append("--no-apis")
        output = _run_fixer(*cmd_args, cwd=args.get("cwd") or None)
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_coach":
        output = _run_engine("coach")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_get_history":
        limit = args.get("limit", 10)
        output = _run_engine("history", str(limit))
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_validate_clipboard":
        output = _run_engine("validate")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_v15_audit":
        output = _run_v15("audit", "--json")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_v15_resources":
        query = args.get("query", "")
        limit = args.get("limit", 8)
        output = _run_v15("resources", query, "--limit", limit, "--json")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_v15_personas":
        query = args.get("query", "")
        limit = args.get("limit", 4)
        output = _run_v15("personas", query, "--limit", limit, "--json")
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_v15_questions":
        cmd_args = ["questions"]
        query = args.get("query", "")
        persona_id = args.get("persona_id", "")
        limit = args.get("limit", 0)
        if query:
            cmd_args.append(query)
        if persona_id:
            cmd_args.extend(["--persona", persona_id])
        if args.get("include_all", False):
            cmd_args.append("--all")
        if limit:
            cmd_args.extend(["--limit", limit])
        cmd_args.append("--json")
        output = _run_v15(*cmd_args)
        result["content"].append({"type": "text", "text": output})

    elif name == "rig_v15_intake":
        task = args.get("task", "")
        if not task:
            result["content"].append({"type": "text", "text": "ERROR: No task provided"})
        else:
            cmd_args = ["intake", task]
            if args.get("fast", False):
                cmd_args.append("--fast")
            output = _run_v15(*cmd_args)
            result["content"].append({"type": "text", "text": output})

    else:
        result["content"].append({"type": "text", "text": f"ERROR: Unknown tool '{name}'"})
        result["isError"] = True

    send_response(id, result)

# ─── Engine Runner ───────────────────────────────────────────────────

def _run_engine(command, *args):
    """Run the prompt engine as a subprocess and return output."""
    import subprocess

    cmd = [sys.executable, str(ENGINE), command]
    for arg in args:
        if command == "trends":
            cmd.extend(["--days", str(arg)])
        elif command == "history":
            cmd.extend(["--limit", str(arg)])
        elif command == "run" and arg != args[0]:  # tool arg
            cmd.extend(["--tool", str(arg)])
        else:
            cmd.append(str(arg))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            env={**os.environ, "PYTHONPATH": str(Path(__file__).parent)},
        )
        return result.stdout if result.returncode == 0 else f"ERROR: {result.stderr[:500]}"
    except subprocess.TimeoutExpired:
        return "ERROR: Engine timed out after 300s"
    except Exception as e:
        return f"ERROR: {e}"

def _run_v15(*args):
    """Run the v15 operator layer as a subprocess and return output."""
    import subprocess

    cmd = [sys.executable, str(V15), *[str(arg) for arg in args if arg is not None]]
    try:
        result = subprocess.run(
            cmd,
            input="",
            capture_output=True,
            text=True,
            timeout=60,
            env={**os.environ, "PYTHONPATH": str(Path(__file__).parent)},
        )
        return result.stdout if result.returncode == 0 else f"ERROR: {result.stderr[:500]}"
    except subprocess.TimeoutExpired:
        return "ERROR: v15 operator layer timed out after 60s"
    except Exception as e:
        return f"ERROR: {e}"

def _run_fixer(*args, cwd=None):
    """Run RIG Prompt Master as a subprocess and return output."""
    import subprocess

    cmd = [sys.executable, str(FIXER), *[str(arg) for arg in args if arg is not None]]
    run_cwd = str(Path(cwd).expanduser()) if cwd else None
    try:
        result = subprocess.run(
            cmd,
            input="",
            capture_output=True,
            text=True,
            timeout=75,
            cwd=run_cwd,
            env={**os.environ, "PYTHONPATH": str(Path(__file__).parent)},
        )
        return result.stdout if result.returncode == 0 else f"ERROR: {result.stderr[:500]}"
    except subprocess.TimeoutExpired:
        return "ERROR: RIG Prompt Master timed out after 75s"
    except Exception as e:
        return f"ERROR: {e}"

# ─── Main Loop ───────────────────────────────────────────────────────

def main():
    """Main MCP server loop — reads JSON-RPC from stdin, writes to stdout."""

    # Send initialize notification
    send_notification("notifications/initialized")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue

        method = msg.get("method", "")
        msg_id = msg.get("id")
        params = msg.get("params", {})

        if method == "initialize":
            handle_initialize(params, msg_id)
        elif method == "tools/list":
            handle_tools_list(params, msg_id)
        elif method == "tools/call":
            handle_tools_call(params, msg_id)
        elif method == "ping":
            send_response(msg_id, {})
        elif method == "notifications/initialized":
            pass  # Client acknowledging our init
        else:
            if msg_id:
                send_error(msg_id, -32601, f"Method not found: {method}")

if __name__ == "__main__":
    main()
