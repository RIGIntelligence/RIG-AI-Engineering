#!/usr/bin/env python3
"""RIG AI Engineering v15 deterministic operator layer.

The v15 layer turns the open-source catalog, methodology agents, and
100-question bank into callable CLI/MCP workflows. It does not clone repos,
execute third-party code, call models, or perform external side effects.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "15.3.0"
ROOT = Path(__file__).resolve().parents[2]
CATALOG_DIR = ROOT / "catalogs"
GUIDE_FILE = ROOT / "docs" / "rig-open-source-expansion.md"
RESOURCE_FILE = CATALOG_DIR / "open-source-agent-harnesses.yaml"
PERSONA_FILE = CATALOG_DIR / "rig-methodology-persona-agents.yaml"
QUESTION_FILE = CATALOG_DIR / "rig-methodology-question-bank.yaml"

V15_GATES = [
    ("00", "Source and license reviewed"),
    ("01", "Secret and private-data exposure blocked"),
    ("02", "Task envelope and acceptance checks written"),
    ("03", "A1 deterministic path attempted first"),
    ("04", "Sandbox or dry-run boundary selected"),
    ("05", "Tests, evals, or command checks defined"),
    ("06", "Observability and debug fields identified"),
    ("07", "Human approval boundary explicit"),
    ("08", "ProofPacket path selected"),
    ("09", "Rollback or undo path defined"),
    ("10", "Docs or operator notes updated"),
    ("11", "Agent bridge instructions updated when needed"),
    ("12", "Integration verified without hidden external side effects"),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore
    except Exception as exc:  # pragma: no cover - environment guard
        raise SystemExit(
            "ERROR: PyYAML is required for rig v15. Install with: python3 -m pip install PyYAML"
        ) from exc

    if not path.exists():
        raise SystemExit(f"ERROR: Missing v15 catalog file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"ERROR: Catalog file did not parse as a mapping: {path}")
    return data


def load_catalogs() -> dict[str, Any]:
    return {
        "resources": load_yaml(RESOURCE_FILE),
        "personas": load_yaml(PERSONA_FILE),
        "questions": load_yaml(QUESTION_FILE),
    }


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug[:80] or "untitled"


def flatten(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(flatten(item))
        return out
    if isinstance(value, dict):
        out = []
        for item in value.values():
            out.extend(flatten(item))
        return out
    return [str(value)]


def tokenize(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", value.lower()) if token]


def item_blob(item: dict[str, Any], fields: list[str]) -> str:
    values: list[str] = []
    for field in fields:
        values.extend(flatten(item.get(field)))
    return " ".join(values).lower()


def item_matches_query(item: dict[str, Any], query: str, fields: list[str]) -> bool:
    query = query.strip()
    if not query:
        return True
    blob = item_blob(item, fields)
    exact_query = query.lower()
    if exact_query and exact_query in blob:
        return True
    return any(token in blob for token in tokenize(query))


def ranked_items(
    items: list[dict[str, Any]],
    query: str,
    fields: list[str],
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        limit = len(items)
    query = query.strip()
    query_tokens = tokenize(query)
    if not query_tokens:
        return items[:limit]

    ranked: list[tuple[int, int, dict[str, Any]]] = []
    exact_query = query.lower()
    for index, item in enumerate(items):
        blob = item_blob(item, fields)
        score = 0
        if exact_query and exact_query in blob:
            score += 8
        for token in query_tokens:
            if token in blob:
                score += 2
            if token == str(item.get("id", "")).lower():
                score += 6
            if token in str(item.get("name", "")).lower():
                score += 4
            if token in str(item.get("display_name", "")).lower():
                score += 4
        if score:
            ranked.append((score, -index, item))

    ranked.sort(key=lambda row: (row[0], row[1]), reverse=True)
    if ranked:
        return [item for _, _, item in ranked[:limit]]
    return items[:limit]


def resources(data: dict[str, Any]) -> list[dict[str, Any]]:
    return list(data["resources"].get("resources", []))


def personas(data: dict[str, Any]) -> list[dict[str, Any]]:
    return list(data["personas"].get("agents", []))


def questions(data: dict[str, Any]) -> list[dict[str, Any]]:
    return list(data["questions"].get("questions", []))


def persona_name_map(data: dict[str, Any]) -> dict[str, str]:
    return {
        item["id"]: item.get("display_name", item["id"])
        for item in personas(data)
    }


def select_resources(data: dict[str, Any], query: str, limit: int) -> list[dict[str, Any]]:
    return ranked_items(
        resources(data),
        query,
        ["id", "name", "repo", "license", "class", "role_in_rig", "first_experiment", "load_when"],
        limit,
    )


def select_personas(data: dict[str, Any], query: str, limit: int) -> list[dict[str, Any]]:
    return ranked_items(
        personas(data),
        query,
        ["id", "display_name", "name_reference", "methodology_focus", "roles", "use_when"],
        limit,
    )


def select_questions(
    data: dict[str, Any],
    query: str = "",
    persona_id: str | None = None,
    include_all: bool = False,
    limit: int = 0,
) -> list[dict[str, Any]]:
    all_questions = questions(data)
    if include_all or (not query and not persona_id):
        selected = all_questions
    elif persona_id:
        selected = [item for item in all_questions if item.get("persona_id") == persona_id]
    else:
        direct_matches = [
            item
            for item in all_questions
            if item_matches_query(item, query, ["id", "persona_id", "question", "evidence"])
        ]
        selected_personas = [
            item
            for item in select_personas(data, query, 4)
            if item_matches_query(
                item,
                query,
                ["id", "display_name", "name_reference", "methodology_focus", "roles", "use_when"],
            )
        ]
        persona_ids = {item["id"] for item in selected_personas}
        selected = direct_matches or [
            item for item in all_questions if item.get("persona_id") in persona_ids
        ]

    if limit > 0:
        return selected[:limit]
    return selected


def route_task(task: str) -> dict[str, str]:
    tokens = set(tokenize(task))
    if tokens & {"deploy", "release", "ship", "public", "payment", "delete", "migrate"}:
        return {
            "level": "L5 Launch",
            "diamond": "D1 Physical",
            "bms_mode": "A3 Agent Bounded",
            "iqrsqpi_step": "S/Q2/P",
            "coordinate": "L5-D1-A3-S",
            "reason": "Release or external-impact language requires bounded workflow and proof gates.",
        }
    if tokens & {"agent", "agents", "harness", "mcp", "workflow", "orchestration", "multi", "fleet"}:
        return {
            "level": "L4 Link",
            "diamond": "D2 Cognitive",
            "bms_mode": "A3 Agent Bounded",
            "iqrsqpi_step": "I1/Q1/R/S",
            "coordinate": "L4-D2-A3-S",
            "reason": "Agent/harness work needs explicit state, tool boundaries, and approval gates.",
        }
    if tokens & {"research", "find", "compare", "evaluate", "license"}:
        return {
            "level": "L2 Learn",
            "diamond": "D2 Cognitive",
            "bms_mode": "A2 Hybrid",
            "iqrsqpi_step": "Q1/R/Q2",
            "coordinate": "L2-D2-A2-R",
            "reason": "Research and evaluation need evidence collection with deterministic synthesis checks.",
        }
    if tokens & {"bug", "fix", "test", "refactor"}:
        return {
            "level": "L3 Link",
            "diamond": "D1 Physical",
            "bms_mode": "A1 Python Only",
            "iqrsqpi_step": "S/Q2/P",
            "coordinate": "L3-D1-A1-S",
            "reason": "Implementation work should start with deterministic tests and local verification.",
        }
    return {
        "level": "L2 Learn",
        "diamond": "D2 Cognitive",
        "bms_mode": "A2 Hybrid",
        "iqrsqpi_step": "I1/Q1/R",
        "coordinate": "L2-D2-A2-Q1",
        "reason": "Default route for ambiguous operator work is research-before-synthesis.",
    }


def audit_payload(data: dict[str, Any]) -> dict[str, Any]:
    resource_items = resources(data)
    persona_items = personas(data)
    question_items = questions(data)
    expected_resources = int(data["resources"].get("expected_resource_count", 20))
    expected_personas = int(data["personas"].get("expected_agent_count", 10))
    expected_questions = int(data["questions"].get("expected_question_count", 100))
    question_ids = {item["id"] for item in question_items}
    referenced_ids = {
        qid
        for persona in persona_items
        for qid in persona.get("must_ask_question_ids", [])
    }
    persona_ids = {item["id"] for item in persona_items}
    question_persona_ids = {item.get("persona_id") for item in question_items}

    return {
        "version": VERSION,
        "generated_utc": utc_now(),
        "counts": {
            "resources": len(resource_items),
            "personas": len(persona_items),
            "questions": len(question_items),
        },
        "expected_counts": {
            "resources": expected_resources,
            "personas": expected_personas,
            "questions": expected_questions,
        },
        "missing_referenced_questions": sorted(referenced_ids - question_ids),
        "unmapped_questions": sorted(question_ids - referenced_ids),
        "unknown_question_personas": sorted(x for x in question_persona_ids - persona_ids if x),
        "catalog_hashes": {
            "resources": file_hash(RESOURCE_FILE),
            "personas": file_hash(PERSONA_FILE),
            "questions": file_hash(QUESTION_FILE),
        },
        "status": "PASS"
        if (
            len(resource_items) == expected_resources
            and len(persona_items) == expected_personas
            and len(question_items) == expected_questions
            and not (referenced_ids - question_ids)
            and not (question_ids - referenced_ids)
            and not (question_persona_ids - persona_ids)
        )
        else "FAIL",
    }


def print_audit(data: dict[str, Any], as_json: bool = False) -> None:
    payload = audit_payload(data)
    if as_json:
        print(json.dumps(payload, indent=2))
        return

    print("RIG AI Engineering v15 - Audit")
    print(f"Generated: {payload['generated_utc']}")
    print(f"Status: {payload['status']}")
    print("")
    for key, value in payload["counts"].items():
        expected = payload["expected_counts"][key]
        mark = "OK" if value == expected else "FAIL"
        print(f"- {key}: {value} / {expected} {mark}")
    print(f"- missing referenced questions: {payload['missing_referenced_questions'] or 'none'}")
    print(f"- unmapped questions: {payload['unmapped_questions'] or 'none'}")
    print(f"- unknown question personas: {payload['unknown_question_personas'] or 'none'}")
    print("")
    print("Catalog hashes:")
    for key, value in payload["catalog_hashes"].items():
        print(f"- {key}: {value}")


def print_resources(items: list[dict[str, Any]], as_json: bool = False) -> None:
    if as_json:
        print(json.dumps(items, indent=2))
        return
    for item in items:
        print(f"- {item['id']} | {item['name']} | {item['class']} | {item['license']}")
        print(f"  repo: {item['repo']}")
        print(f"  role: {item['role_in_rig']}")
        print(f"  first experiment: {item['first_experiment']}")
        print(f"  load when: {', '.join(item.get('load_when', []))}")


def print_personas(items: list[dict[str, Any]], as_json: bool = False) -> None:
    if as_json:
        print(json.dumps(items, indent=2))
        return
    for item in items:
        focus = ", ".join(item.get("methodology_focus", []))
        roles = ", ".join(item.get("roles", []))
        print(f"- {item['id']} | {item['display_name']}")
        print(f"  public method lens: {item['name_reference']}")
        print(f"  focus: {focus}")
        print(f"  roles: {roles}")
        print(f"  use when: {', '.join(item.get('use_when', []))}")
        print(f"  questions: {', '.join(item.get('must_ask_question_ids', []))}")


def print_questions(
    items: list[dict[str, Any]],
    name_map: dict[str, str],
    as_json: bool = False,
) -> None:
    if as_json:
        print(json.dumps(items, indent=2))
        return
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        grouped[item.get("persona_id", "unknown")].append(item)
    for persona_id, group in grouped.items():
        print(f"## {name_map.get(persona_id, persona_id)}")
        for item in group:
            print(f"- {item['id']}: {item['question']}")
            print(f"  evidence: {item['evidence']}")
        print("")


def print_gates(as_json: bool = False) -> None:
    payload = {
        "status": "ok",
        "generated_utc": utc_now(),
        "gate_count": len(V15_GATES),
        "gates": [
            {"id": gate_id, "description": description}
            for gate_id, description in V15_GATES
        ],
    }
    if as_json:
        print(json.dumps(payload, indent=2))
        return
    print("# RIG AI Engineering v15 Gate Checklist")
    print("")
    for gate_id, description in V15_GATES:
        print(f"- [ ] Gate {gate_id}: {description}")


def build_intake_packet(
    data: dict[str, Any],
    task: str,
    fast: bool,
    resource_limit: int,
    persona_limit: int,
) -> tuple[str, dict[str, Any]]:
    route = route_task(task)
    chosen_resources = select_resources(data, task, resource_limit)
    chosen_personas = personas(data) if not fast else select_personas(data, task, persona_limit)
    persona_ids = {item["id"] for item in chosen_personas}
    chosen_questions = (
        questions(data)
        if not fast
        else [item for item in questions(data) if item.get("persona_id") in persona_ids]
    )
    names = persona_name_map(data)
    audit = audit_payload(data)

    lines: list[str] = []
    lines.append("# RIG AI Engineering v15 Intake Packet")
    lines.append("")
    lines.append(f"- Generated UTC: {utc_now()}")
    lines.append(f"- Mode: {'fast subset' if fast else 'full 100-question intake'}")
    lines.append(f"- Task: {task or 'N/A'}")
    lines.append(f"- Catalog status: {audit['status']}")
    lines.append("")
    lines.append("## RIG Coordinate")
    lines.append("")
    lines.append(f"- Coordinate: {route['coordinate']}")
    lines.append(f"- Level: {route['level']}")
    lines.append(f"- Diamond: {route['diamond']}")
    lines.append(f"- BMS Mode: {route['bms_mode']}")
    lines.append(f"- IQRSQPI Step: {route['iqrsqpi_step']}")
    lines.append(f"- Reason: {route['reason']}")
    lines.append("")
    lines.append("## Selected Open Source Resources")
    lines.append("")
    for item in chosen_resources:
        lines.append(f"- {item['name']} ({item['id']})")
        lines.append(f"  - Repo: {item['repo']}")
        lines.append(f"  - License: {item['license']}")
        lines.append(f"  - RIG role: {item['role_in_rig']}")
        lines.append(f"  - First experiment: {item['first_experiment']}")
    lines.append("")
    lines.append("## Methodology Agents")
    lines.append("")
    for item in chosen_personas:
        focus = ", ".join(item.get("methodology_focus", []))
        roles = ", ".join(item.get("roles", []))
        lines.append(f"- {item['display_name']} ({item['id']})")
        lines.append(f"  - Public method lens: {item['name_reference']}")
        lines.append(f"  - Focus: {focus}")
        lines.append(f"  - Roles: {roles}")
    lines.append("")
    lines.append("## Required Questions")
    lines.append("")
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in chosen_questions:
        grouped[item.get("persona_id", "unknown")].append(item)
    for persona_id in [item["id"] for item in chosen_personas]:
        group = grouped.get(persona_id, [])
        if not group:
            continue
        lines.append(f"### {names.get(persona_id, persona_id)}")
        for question in group:
            lines.append(f"- {question['id']}: {question['question']}")
            lines.append(f"  - Evidence: {question['evidence']}")
        lines.append("")
    lines.append("## V15 Gate Checklist")
    lines.append("")
    for gate_id, description in V15_GATES:
        lines.append(f"- [ ] Gate {gate_id}: {description}")
    lines.append("")
    lines.append("## Proof Requirements")
    lines.append("")
    lines.append("- Record source links, commit IDs, commands, test results, and changed files.")
    lines.append("- Record skipped questions as N/A with evidence and reason.")
    lines.append("- Do not clone or execute third-party repos without pinning, sandboxing, and proof.")
    lines.append("- Do not perform external sends, account changes, public exposure, or destructive actions without Mike approval.")
    lines.append("")

    payload = {
        "version": VERSION,
        "generated_utc": utc_now(),
        "mode": "fast" if fast else "full",
        "task": task,
        "route": route,
        "resource_ids": [item["id"] for item in chosen_resources],
        "persona_ids": [item["id"] for item in chosen_personas],
        "question_ids": [item["id"] for item in chosen_questions],
        "question_count": len(chosen_questions),
        "gate_count": len(V15_GATES),
        "catalog_status": audit["status"],
    }
    return "\n".join(lines), payload


def write_output(path_value: str | None, content: str) -> None:
    if not path_value:
        print(content)
        return
    path = Path(path_value).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(str(path))


def create_proof_template(title: str, output: str | None) -> None:
    data = load_catalogs()
    audit = audit_payload(data)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    title = title.strip() or "RIG v15 work"
    default_path = Path.cwd() / "artifacts" / "proofpackets" / f"rig-v15-{slugify(title)}-{today}.md"
    path = Path(output).expanduser() if output else default_path
    path.parent.mkdir(parents=True, exist_ok=True)
    content = f"""# ProofPacket: {title}

Date: {today}
Generated UTC: {utc_now()}
RIG AI Engineering Version: v{VERSION}

## Scope

- Task:
- RIG coordinate:
- BMS mode:
- IQRSQPI step:

## Sources

- Catalog status: {audit['status']}
- Resource catalog hash: {audit['catalog_hashes']['resources']}
- Persona catalog hash: {audit['catalog_hashes']['personas']}
- Question bank hash: {audit['catalog_hashes']['questions']}

## Actions

- Files changed:
- Commands run:
- Third-party repos cloned or executed: none / list pinned commits

## Verification

- Tests:
- CLI checks:
- Manual review:

## V15 Gates

"""
    for gate_id, description in V15_GATES:
        content += f"- [ ] Gate {gate_id}: {description}\n"
    content += """
## Risks And Rollback

- Remaining risks:
- Required approvals:
- Rollback:
"""
    path.write_text(content, encoding="utf-8")
    print(str(path))


def print_overview() -> None:
    print("RIG AI Engineering v15 - Operator Layer")
    print("")
    print("Commands:")
    print("  rig v15 audit                         Validate v15 catalog counts and hashes")
    print("  rig v15 resources [query]             Search reviewed OSS resources")
    print("  rig v15 personas [query]              Search methodology-inspired agents")
    print("  rig v15 questions [query]             Print full or selected question bank")
    print("  rig v15 gates                         Print v15 Gate 00-12 checklist")
    print("  rig v15 intake <task>                 Generate full 100-question intake packet")
    print("  rig v15 intake <task> --fast          Generate focused subset packet")
    print("  rig v15 proof <title>                 Create a local ProofPacket template")
    print("")
    print("Safety:")
    print("- Cataloging is not installation.")
    print("- Third-party code requires pinning, review, sandboxing, and proof before execution.")
    print("- Methodology agents are public method lenses, not impersonation or endorsement.")


def parse_text_arg(parts: list[str]) -> str:
    text = " ".join(parts).strip()
    if text:
        return text
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    return ""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="RIG AI Engineering v15 operator layer")
    parser.add_argument("--version", action="store_true", help="Print v15 version")
    subparsers = parser.add_subparsers(dest="command")

    p_audit = subparsers.add_parser("audit", help="Validate v15 catalogs")
    p_audit.add_argument("--json", action="store_true")

    p_resources = subparsers.add_parser("resources", help="Search reviewed OSS resources")
    p_resources.add_argument("query", nargs="*")
    p_resources.add_argument("--limit", type=int, default=20)
    p_resources.add_argument("--json", action="store_true")

    p_personas = subparsers.add_parser("personas", help="Search methodology agents")
    p_personas.add_argument("query", nargs="*")
    p_personas.add_argument("--limit", type=int, default=10)
    p_personas.add_argument("--json", action="store_true")

    p_questions = subparsers.add_parser("questions", help="Print full or selected questions")
    p_questions.add_argument("query", nargs="*")
    p_questions.add_argument("--persona", default=None, help="Persona id to filter by")
    p_questions.add_argument("--all", action="store_true", help="Print all 100 questions")
    p_questions.add_argument("--limit", type=int, default=0)
    p_questions.add_argument("--json", action="store_true")

    p_gates = subparsers.add_parser("gates", help="Print v15 Gate 00-12 checklist")
    p_gates.add_argument("--json", action="store_true")

    p_intake = subparsers.add_parser("intake", help="Generate a v15 intake packet")
    p_intake.add_argument("task", nargs="*")
    p_intake.add_argument("--fast", action="store_true", help="Use focused subset instead of all 100 questions")
    p_intake.add_argument("--limit-resources", type=int, default=8)
    p_intake.add_argument("--limit-personas", type=int, default=4)
    p_intake.add_argument("--output", default=None)
    p_intake.add_argument("--json", action="store_true")

    p_proof = subparsers.add_parser("proof", help="Create a local ProofPacket template")
    p_proof.add_argument("title", nargs="*")
    p_proof.add_argument("--output", default=None)

    args = parser.parse_args(argv)
    if args.version:
        print(VERSION)
        return 0
    if not args.command:
        print_overview()
        return 0

    if args.command == "gates":
        print_gates(args.json)
        return 0

    if args.command == "proof":
        create_proof_template(parse_text_arg(args.title), args.output)
        return 0

    data = load_catalogs()

    if args.command == "audit":
        print_audit(data, args.json)
        return 0
    if args.command == "resources":
        query = parse_text_arg(args.query)
        print_resources(select_resources(data, query, args.limit), args.json)
        return 0
    if args.command == "personas":
        query = parse_text_arg(args.query)
        print_personas(select_personas(data, query, args.limit), args.json)
        return 0
    if args.command == "questions":
        query = parse_text_arg(args.query)
        selected = select_questions(data, query, args.persona, args.all, args.limit)
        print_questions(selected, persona_name_map(data), args.json)
        return 0
    if args.command == "intake":
        task = parse_text_arg(args.task)
        content, payload = build_intake_packet(
            data,
            task,
            args.fast,
            args.limit_resources,
            args.limit_personas,
        )
        if args.json:
            write_output(args.output, json.dumps(payload, indent=2))
        else:
            write_output(args.output, content)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
