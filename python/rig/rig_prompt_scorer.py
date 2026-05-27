"""rig_prompt_scorer.py — Prompt scoring engine for RIG AI Engineering system.

Scores prompts across six dimensions (length, specificity, context, spec,
verification, RIG doctrine) and produces structured findings with suggested fixes.
"""

import re
from datetime import datetime


class PromptScorer:
    """Evaluates prompt quality and RIG doctrine adherence.

    Produces a structured score dict with dimension scores, markers,
    findings, and an improved prompt rewrite.
    """

    # RIG-specific technical terms for specificity detection
    TECHNICAL_TERMS = frozenset({
        "api", "endpoint", "sdk", "cli", "rest", "graphql", "grpc", "json",
        "yaml", "toml", "csv", "xml", "sql", "nosql", "orm", "db", "database",
        "schema", "migration", "query", "index", "cache", "redis", "postgres",
        "mongodb", "docker", "kubernetes", "k8s", "container", "pod", "deploy",
        "ci/cd", "pipeline", "github", "git", "repo", "branch", "commit",
        "pr", "merge", "release", "test", "unit", "integration", "e2e",
        "lint", "format", "type", "interface", "abstract", "class", "method",
        "function", "async", "await", "thread", "process", "stream", "event",
        "handler", "callback", "middleware", "plugin", "module", "package",
        "dependency", "config", "env", "secret", "token", "auth", "oauth",
        "jwt", "ssl", "tls", "https", "websocket", "tcp", "udp", "http",
        "rig", "harness", "proofpacket", "artifact", "agent", "skill",
        "vector", "embedding", "rag", "llm", "model", "inference", "prompt",
        "temperature", "top_k", "top_p", "logit", "token", "context_window",
    })

    COMMON_TERMS = frozenset({
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "shall", "to", "of", "in", "for",
        "on", "with", "at", "by", "from", "as", "into", "through", "during",
        "before", "after", "above", "below", "between", "out", "off", "over",
        "under", "again", "further", "then", "once", "here", "there", "when",
        "where", "why", "how", "all", "each", "every", "both", "few", "more",
        "most", "other", "some", "such", "no", "nor", "not", "only", "own",
        "same", "so", "than", "too", "very", "just", "also", "and", "but",
        "or", "if", "while", "because", "although", "since", "unless",
        "until", "that", "which", "who", "whom", "what", "this", "that",
        "these", "those", "it", "its", "i", "you", "we", "they", "he", "she",
        "please", "help", "need", "want", "like", "make", "do", "get", "go",
    })

    def __init__(self):
        self._rig_terms = {
            "harness", "proofpacket", "artifact", "rig", "lattice",
            "altitude", "iqrsqpi", "bms", "gate", "skill", "doctrine",
        }

    def score(self, prompt_text: str) -> dict:
        """Score a prompt across all quality dimensions.

        Args:
            prompt_text: The raw prompt string to evaluate.

        Returns:
            dict with overall_score (0-100), dimension scores, markers,
                  findings list, and improved_prompt string.
        """
        if not isinstance(prompt_text, str):
            raise TypeError("prompt_text must be a string")

        text = prompt_text.strip()
        findings = []

        # ---- Length scoring ----
        char_count = len(text)
        word_count = len(text.split()) if text else 0

        if char_count < 30:
            length_score = 10.0
            findings.append({
                "finding": "Prompt is very short (< 30 characters). Lacks sufficient detail.",
                "severity": "critical",
                "suggested_fix": "Expand the prompt with context, constraints, and expected output format.",
            })
        elif char_count < 100:
            length_score = 30.0
            findings.append({
                "finding": "Prompt is short (< 100 characters). May lack context.",
                "severity": "warning",
                "suggested_fix": "Add specific instructions, context references, and output requirements.",
            })
        elif char_count < 300:
            length_score = 60.0
        elif char_count < 1000:
            length_score = 85.0
        else:
            length_score = 95.0

        # ---- Specificity scoring ----
        words_lower = {w.lower() for w in text.split()}
        tech_terms = words_lower & self.TECHNICAL_TERMS
        constraint_patterns = {
            r"\b(must|shall|required|need to|should|expected to)\b",
            r"\b(unless|except|excluding|without|not |no |avoid)\b",
            r"\b(maximum|minimum|at least|at most|limit|bound)\b",
            r"\b(if .+ then|when .+ then|only if)\b",
            r"\b(format|style|pattern|convention|standard)\b",
        }
        step_patterns = {
            r"^\d+[\.\)]\s",       # "1. " or "1) "
            r"\b(steps?|phases?|stages?|parts?|sections?)\b",
            r"\b(first|second|third|next|then|finally|lastly)\b",
            r"\b(step \d+|phase \d+|stage \d+)\b",
        }
        criteria_patterns = {
            r"\b(success criteria|acceptance criteria|definition of done|dod)\b",
            r"\b(pass|fail|threshold|benchmark|baseline|target)\b",
            r"\b(verify|validate|confirm|check|assert|ensure)\b",
            r"\b(expected (output|result|behavior|outcome))\b",
            r"\b(measurable|quantifiable|specific|concrete)\b",
        }

        specificity_markers = {
            "technical_terms": len(tech_terms) >= 2,
            "constraints": any(
                re.search(p, text, re.IGNORECASE) for p in constraint_patterns
            ),
            "steps": any(
                re.search(p, text, re.IGNORECASE | re.MULTILINE) for p in step_patterns
            ),
            "success_criteria": any(
                re.search(p, text, re.IGNORECASE) for p in criteria_patterns
            ),
        }

        spec_count = sum(1 for v in specificity_markers.values() if v)
        specificity_score = (spec_count / 4.0) * 100.0

        if spec_count <= 1:
            findings.append({
                "finding": "Low specificity. Few or no technical terms, constraints, steps, or success criteria.",
                "severity": "warning",
                "suggested_fix": "Add technical terms, explicit constraints, numbered steps, and measurable success criteria.",
            })

        # ---- Context scoring ----
        context_markers = {
            "file_refs": bool(
                re.search(r"\b(file|path|\.\w{2,4})\b", text, re.IGNORECASE)
            ),
            "skill_memory_refs": bool(
                re.search(
                    r"\b(skill|memory|agent|context|previous|prior|history)\b",
                    text, re.IGNORECASE,
                )
            ),
            "prior_work_refs": bool(
                re.search(
                    r"\b(previous|prior|last|before|iteration|revision|update|"
                    r"continu(e|ation)|follow[-\s]?up)\b",
                    text, re.IGNORECASE,
                )
            ),
        }

        ctx_count = sum(1 for v in context_markers.values() if v)
        context_score = (ctx_count / 3.0) * 100.0

        if ctx_count == 0:
            findings.append({
                "finding": "No context markers detected. Prompt lacks file, skill, or prior work references.",
                "severity": "critical",
                "suggested_fix": "Reference specific files (#file), skills, or prior work to ground the prompt.",
            })
        elif ctx_count == 1:
            findings.append({
                "finding": "Minimal context. Only one type of context reference found.",
                "severity": "info",
                "suggested_fix": "Consider adding file references and references to prior work or skills.",
            })

        # ---- Spec-driven scoring ----
        spec_driven = specificity_markers["success_criteria"] and (
            specificity_markers["constraints"] or specificity_markers["steps"]
        )
        spec_score = 100.0 if spec_driven else (
            50.0 if specificity_markers["success_criteria"] else 0.0
        )

        if not spec_driven:
            findings.append({
                "finding": "Prompt is not spec-driven. Missing success criteria or constraints.",
                "severity": "warning",
                "suggested_fix": "Define explicit success criteria and constraints so the output is verifiable.",
            })

        # ---- Verification scoring ----
        verification = self._detect_verification(text)
        verification_score = 100.0 if verification else 0.0

        if not verification:
            findings.append({
                "finding": "No verification instructions detected. Output won't be validated.",
                "severity": "warning",
                "suggested_fix": "Add verification steps: 'Verify the output by ...', 'Check that ...', or 'Assert ...'.",
            })

        # ---- RIG doctrine scoring ----
        rig_terms_found = words_lower & self._rig_terms
        rig_doctrine = len(rig_terms_found) >= 2
        rig_score = 100.0 if rig_doctrine else (
            50.0 if len(rig_terms_found) >= 1 else 0.0
        )
        if not rig_doctrine:
            findings.append({
                "finding": "RIG doctrine adherence low. Few or no RIG-specific terms.",
                "severity": "info",
                "suggested_fix": (
                    "Reference RIG concepts: harness, ProofPacket, lattice altitude, "
                    "IQRSQPI, or skill invocation."
                ),
            })

        # ---- Overall score ----
        overall_score = (
            length_score * 0.10
            + specificity_score * 0.20
            + context_score * 0.25
            + spec_score * 0.20
            + verification_score * 0.15
            + rig_score * 0.10
        )
        overall_score = round(min(max(overall_score, 0), 100), 1)

        # ---- Improved prompt ----
        improved_prompt = self._generate_improved(
            text, findings, specificity_markers, context_markers,
            spec_driven, verification,
        )

        return {
            "overall_score": overall_score,
            "length_score": round(length_score, 1),
            "specificity_score": round(specificity_score, 1),
            "context_score": round(context_score, 1),
            "spec_score": round(spec_score, 1),
            "verification_score": round(verification_score, 1),
            "specificity_markers": specificity_markers,
            "context_markers": context_markers,
            "spec_driven": spec_driven,
            "verification": verification,
            "findings": findings,
            "improved_prompt": improved_prompt,
        }

    def score_with_rig(
        self,
        harness_count: int,
        dominant_harness: str = "",
        anti_patterns: list | None = None,
    ) -> dict:
        """Return RIG-specific scoring overlay.

        Args:
            harness_count: Number of distinct harnesses the prompt has crossed.
            dominant_harness: Name of the most-used harness (e.g. 'hermes').
            anti_patterns: List of anti-pattern strings detected.

        Returns:
            dict with cross_harness_silo_penalty, skill_use_bonus,
                  rig_score, anti_patterns list.
        """
        if anti_patterns is None:
            anti_patterns = []

        # Cross-harness silo penalty: >80% in one harness = penalty
        silo_penalty = 0.0
        if harness_count > 0 and dominant_harness:
            silo_ratio = 1.0 - (1.0 / max(harness_count, 1))
            if silo_ratio > 0.8:
                silo_penalty = round((silo_ratio - 0.8) * 50, 1)

        # Skill use bonus: fewer anti-patterns = higher bonus
        skill_bonus = max(0, 20 - len(anti_patterns) * 5)

        rig_score = round(max(0, 100 - silo_penalty + skill_bonus), 1)

        return {
            "cross_harness_silo_penalty": silo_penalty,
            "skill_use_bonus": skill_bonus,
            "rig_score": rig_score,
            "anti_patterns": anti_patterns,
        }

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _detect_verification(text: str) -> bool:
        """Check if the prompt contains verification/validation instructions."""
        patterns = [
            r"\b(verify|validate|confirm|check|assert|ensur(e|ing))\b",
            r"\b(test|evaluate|audit|review|inspect)\b",
            r"\b(pass|fail|assertion|assert that|expect that)\b",
            r"\b(success criteria|acceptance criteria|definition of done)\b",
            r"\b(output should|result should|expected)\b",
            r"\b(proofpacket|artifact)\b",
        ]
        return any(re.search(p, text, re.IGNORECASE) for p in patterns)

    @staticmethod
    def _generate_improved(
        text: str,
        findings: list,
        specificity_markers: dict,
        context_markers: dict,
        spec_driven: bool,
        verification: bool,
    ) -> str:
        """Generate a rewritten improved version of the prompt."""
        if not text:
            return ""

        lines = text.split("\n")
        severity_map = {"critical": 3, "warning": 2, "info": 1}
        severity = max(
            (severity_map.get(f["severity"], 0) for f in findings),
            default=0,
        )

        if severity == 0:
            return text  # Already good

        improved = []
        improved.append(text.rstrip())
        improved.append("")

        # Append missing sections based on findings
        if not specificity_markers["steps"]:
            improved.append("[STEPS]")
            improved.append("1. <first step>")
            improved.append("2. <second step>")
            improved.append("3. <third step>")
            improved.append("")

        if not specificity_markers["constraints"]:
            improved.append("[CONSTRAINTS]")
            improved.append("- <constraint 1>")
            improved.append("- <constraint 2>")
            improved.append("")

        if not specificity_markers["success_criteria"]:
            improved.append("[SUCCESS CRITERIA]")
            improved.append("- <criteria 1>")
            improved.append("- <criteria 2>")
            improved.append("")

        if not context_markers.get("file_refs"):
            improved.append("[CONTEXT]")
            improved.append("- Files: <file paths>")
            improved.append("")

        if not verification:
            improved.append("[VERIFICATION]")
            improved.append("- <how to verify the output>")
            improved.append("")

        if not spec_driven:
            improved.append("[SPECIFICATION]")
            improved.append("- <explicit specification of what to build/do>")
            improved.append("")

        return "\n".join(improved)


# ------------------------------------------------------------------ #
#  Module-level convenience
# ------------------------------------------------------------------ #

def score_prompt(prompt_text: str) -> dict:
    """One-shot convenience wrapper."""
    return PromptScorer().score(prompt_text)


if __name__ == "__main__":
    import json

    scorer = PromptScorer()
    test_prompts = [
        "hi",
        "Write a Python script",
        (
            "Implement a function to calculate fibonacci numbers. "
            "Must handle n=0 and n=1. Verify with test cases. "
            "Output as a single file. Reference skill: python-dev."
        ),
    ]
    for p in test_prompts:
        result = scorer.score(p)
        print(f"\nPrompt: {p[:60]}...")
        print(f"  Overall: {result['overall_score']}")
        print(f"  Findings: {len(result['findings'])}")
        print(f"  Spec-driven: {result['spec_driven']}")
        print(f"  Verification: {result['verification']}")
