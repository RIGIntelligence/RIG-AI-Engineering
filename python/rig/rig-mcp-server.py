#!/usr/bin/env python3
"""
RIG AI Engineering v10 — MCP Server
Exposes prompt intelligence as MCP tools via stdio JSON-RPC.

Tools:
  rig_score_prompt     — Score a prompt (0-100, 4 axes)
  rig_enhance_prompt   — Analyze and enhance a prompt
  rig_suggest_template — Search prompt templates
  rig_get_stats        — Personal prompting stats
  rig_get_trends       — Score trends over time
  rig_run_prompt       — Enhance → Execute → Learn

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
            "version": "10.0.0",
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
