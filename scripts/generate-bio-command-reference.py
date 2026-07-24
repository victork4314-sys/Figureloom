from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOCABULARY_PATH = ROOT / "figureloom-bio" / "figureloom_bio" / "language_vocabulary.json"
MANIFEST_PATH = ROOT / "figureloom-bio" / "figureloom_bio" / "language_manifest.json"
OUTPUT_PATH = ROOT / "wiki" / "FigureLoom-Bio-Command-Reference.md"

GROUPS = (
    ("verbs", "Operations"),
    ("terms", "Biology and data terms"),
    ("flow", "If, else, loops, and recipes"),
    ("logic", "Boolean logic"),
    ("booleans", "True and false"),
    ("conditions", "Decision terms"),
    ("roles", "Role words"),
    ("comparators", "Comparisons"),
    ("file_types", "File types"),
    ("fillers", "Optional plain-English words"),
)


def concepts_for(vocabulary: dict, key: str) -> dict[str, list[str]]:
    source = vocabulary.get(key, {})
    if isinstance(source, list):
        return {str(value): [str(value)] for value in source}
    if not isinstance(source, dict):
        return {}
    return {
        str(concept): [str(value) for value in values]
        for concept, values in source.items()
    }


def render() -> str:
    vocabulary = json.loads(VOCABULARY_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    forms = {
        str(value).casefold()
        for key, _ in GROUPS
        for values in concepts_for(vocabulary, key).values()
        for value in values
    }

    lines = [
        "# FigureLoom Bio language reference",
        "",
        "## Compiler model",
        "",
        "FigureLoom Bio is a programming language with a lexer, grammar parser, compiled instructions, validation, and a runtime. It is not a whitelist of complete sentences.",
        "",
        f"**Grammar families:** {len(GROUPS)}",
        f"**Vocabulary forms:** {len(forms)}",
        f"**Learning examples:** {len(manifest.get('commands', []))}",
        "",
        "Examples are examples, not a whitelist. You can write your own instruction by combining operations, targets, values, role words, comparisons, and Boolean logic in a form the grammar can resolve unambiguously.",
        "",
        "Normal instructions end with a period. Block headers end with a colon. The current result is called `the file`.",
        "",
    ]

    for key, title in GROUPS:
        lines.extend([f"## {title}", "", "| Concept | Words and terms |", "| --- | --- |"])
        for concept, values in concepts_for(vocabulary, key).items():
            shown = ", ".join(f"`{value}`" for value in values)
            lines.append(f"| {concept.replace('_', ' ')} | {shown} |")
        lines.append("")

    theme_titles = {item["id"]: item["title"] for item in manifest.get("themes", [])}
    lines.extend([
        "## Learning examples",
        "",
        "These examples teach common structures and feed the visual builder. They do not define all legal programs.",
        "",
    ])
    grouped: dict[str, list[str]] = {}
    for command in manifest.get("commands", []):
        grouped.setdefault(command["theme"], []).append(command["example"])
    for theme, examples in grouped.items():
        lines.extend([f"### {theme_titles.get(theme, theme)}", ""])
        lines.extend(f"- `{example}`" for example in examples)
        lines.append("")

    lines.extend([
        "## Free-form examples compiled by the grammar",
        "",
        "```flbio",
        "Please load samples.csv.",
        "If true and not false:",
        "    Retain records where condition equals treated.",
        "Else:",
        "    Discard records where status equals failed.",
        "Total the records.",
        "Display the output.",
        "Write the output to clean.csv.",
        "```",
        "",
        "The program above does not copy the learning-example wording. The compiler resolves the words and their grammatical roles into the same runtime operations.",
        "",
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    OUTPUT_PATH.write_text(render(), encoding="utf-8")
