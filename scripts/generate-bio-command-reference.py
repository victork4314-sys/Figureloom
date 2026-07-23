from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "figureloom-bio"))

from figureloom_bio.language_manifest import language_manifest  # noqa: E402
from figureloom_bio.native_core import vocabulary_entries  # noqa: E402


DEFAULT_OUTPUT = ROOT / "wiki" / "FigureLoom-Bio-Command-Reference.md"


def render() -> str:
    manifest = language_manifest()
    entries = vocabulary_entries()
    canonical = list(manifest.commands)
    alternatives = [entry for entry in entries if entry.accepted_wording]

    commands_by_theme = defaultdict(list)
    alternatives_by_theme = defaultdict(list)
    for command in canonical:
        commands_by_theme[command.theme].append(command)
    for entry in alternatives:
        alternatives_by_theme[entry.theme].append(entry)

    lines = [
        "# FigureLoom Bio complete command reference",
        "",
        "This page is generated from the same language catalog used by the native desktop IDE, browser IDE, terminal runner, Blocks editor, Sentences library, and exhaustive execution audit. Do not edit the command lists by hand.",
        "",
        f"- **Canonical sentences:** {len(canonical):,}",
        f"- **Accepted alternate wordings:** {len(alternatives):,}",
        f"- **Total tested sentences shown here:** {len(canonical) + len(alternatives):,}",
        "",
        "Every normal instruction ends with a period. Decision, loop, and recipe headers end with a colon. Replace example filenames, column names, values, and numbers with the ones needed by the program.",
        "",
        "The execution audit runs every sentence on this page through the real FigureLoom Bio parser and runtime with suitable CSV, TSV, FASTA, FASTQ, control-flow, or installed-tool fixtures.",
        "",
    ]

    for theme in manifest.themes:
        commands = commands_by_theme.get(theme.id, [])
        accepted = alternatives_by_theme.get(theme.id, [])
        if not commands and not accepted:
            continue
        lines.extend([f"## {theme.title}", ""])
        if commands:
            lines.extend(["### Main sentences", ""])
            for command in commands:
                suffix = " *(block header)*" if command.kind == "header" else ""
                lines.append(f"- `{command.example}`{suffix}")
            lines.append("")
        if accepted:
            lines.extend([
                "### Accepted wording",
                "",
                "These sentences run as alternate wording for the same built-in operations.",
                "",
            ])
            for entry in accepted:
                lines.append(f"- `{entry.example}`")
            lines.append("")

    lines.extend([
        "## Installed-tool commands",
        "",
        "Approved microbiology sentences use fixed, validated command shapes. The general `Run the tool ...` sentence requires **Allow installed tools** in the desktop IDE or `--allow-tools` in the terminal. The requested program must also be installed on the computer.",
        "",
        "See [Install FigureLoom Bio](FigureLoom-Bio-Easy-Install) for the desktop downloads and [FigureLoom Bio](FigureLoom-Bio) for tutorials and complete workflow examples.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    output = args.output.resolve()

    if args.check:
        try:
            current = output.read_text(encoding="utf-8")
        except FileNotFoundError:
            print(f"Missing generated command reference: {output}", file=sys.stderr)
            return 1
        if current != expected:
            print(
                "The FigureLoom Bio command reference is out of date. Run:\n"
                "python3 scripts/generate-bio-command-reference.py",
                file=sys.stderr,
            )
            return 1
        print(f"Command reference is current: {output}")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(expected, encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
