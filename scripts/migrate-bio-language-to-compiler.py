from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace(path: str, pairs: list[tuple[str, str]]) -> None:
    target = ROOT / path
    if not target.exists():
        return
    content = target.read_text(encoding="utf-8")
    for old, new in pairs:
        content = content.replace(old, new)
    target.write_text(content, encoding="utf-8")


DOC_REPLACEMENTS = [
    (
        "A searchable Sentences library generated from the canonical language catalog.",
        "A searchable Words & terms library generated from the compiler vocabulary.",
    ),
    (
        "The editor does not color a sentence as valid unless the release tests also exercise its parser or runtime path. The same catalog drives Sentences, Blocks, terminal help, documentation, and parity tests.",
        "The editor colors a line as valid only when the compiler can parse its words and grammar and the runtime has an execution path. The vocabulary drives Words & terms; examples drive the builder and tutorials.",
    ),
    (
        "searchable Sentences library",
        "searchable Words & terms library",
    ),
    (
        "sentence library generated from the canonical language catalog",
        "words and terms library generated from the compiler vocabulary",
    ),
    ("flbio sentences statistics", "flbio words terms"),
    ("flbio sentences figures", "flbio words operations"),
    ("flbio sentences", "flbio words"),
    ("Canonical sentences", "Learning examples"),
    ("canonical sentences", "learning examples"),
    ("canonical sentence", "example sentence"),
    ("canonical language catalog", "compiler vocabulary and grammar"),
    ("canonical built-in entries", "learning examples"),
    ("accepted alternate wordings", "vocabulary forms"),
]

for path in (
    "README.md",
    "figureloom-bio/README.md",
    "wiki/FigureLoom-Bio.md",
    "wiki/FigureLoom-Bio-Easy-Install.md",
    "figureloom-bio/linux/README.md",
):
    replace(path, DOC_REPLACEMENTS)

# Native and hosted labels must match the compiler architecture too.
for path in (
    "figureloom-bio/figureloom_bio/native_ide.py",
    "figureloom-bio/figureloom_bio/native_widgets.py",
    "figureloom-bio/figureloom_bio/native_dialogs.py",
    "figureloom-bio/figureloom_bio/native_desktop_exact.py",
    "figureloom-bio/figureloom_bio/native_web_parity.py",
    "wiki/wiki-bio-addons.js",
    "wiki/wiki-bio-decisions.js",
    "wiki/wiki-bio-workflows.js",
):
    replace(path, [
        ("Sentences", "Words & terms"),
        ("sentence library", "words and terms library"),
        ("built-in sentences", "built-in words and terms"),
        ("canonical sentence", "example sentence"),
        ("canonical language", "compiler language"),
        ("flbio sentences", "flbio words"),
    ])

GENERATOR = r'''from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOCABULARY_PATH = ROOT / "figureloom-bio" / "figureloom_bio" / "language_vocabulary.json"
MANIFEST_PATH = ROOT / "figureloom-bio" / "figureloom_bio" / "language_manifest.json"
OUTPUT_PATH = ROOT / "wiki" / "FigureLoom-Bio-Command-Reference.md"

GROUPS = (
    ("verbs", "Operations"),
    ("terms", "Biology and data terms"),
    ("roles", "Role words"),
    ("comparators", "Comparisons"),
)


def render() -> str:
    vocabulary = json.loads(VOCABULARY_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    forms = {
        str(value).casefold()
        for key, _ in GROUPS
        for values in vocabulary.get(key, {}).values()
        for value in values
    }

    lines = [
        "# FigureLoom Bio language reference",
        "",
        "## Compiler model",
        "",
        "FigureLoom Bio is a programming language with a lexer, grammar parser, compiled instructions, validation, and a runtime. It is not a whitelist of complete sentences.",
        "",
        "**Grammar families:** 4",
        f"**Vocabulary forms:** {len(forms)}",
        f"**Learning examples:** {len(manifest.get('commands', []))}",
        "",
        "Examples are examples, not a whitelist. You can write your own instruction by combining an operation, a target, values, and role words in a form the grammar can resolve unambiguously.",
        "",
        "Normal instructions end with a period. Block headers end with a colon. The current result is called `the file`.",
        "",
    ]

    for key, title in GROUPS:
        lines.extend([f"## {title}", "", "| Concept | Words and terms |", "| --- | --- |"])
        for concept, values in vocabulary.get(key, {}).items():
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
        "Retain rows where condition is treated.",
        "Discard rows where status equals failed.",
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
'''
write("scripts/generate-bio-command-reference.py", GENERATOR)
subprocess.run([sys.executable, str(ROOT / "scripts" / "generate-bio-command-reference.py")], check=True)

TEST_REFERENCE = r'''from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


class GeneratedCommandReferenceTests(unittest.TestCase):
    @property
    def root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def test_checked_in_reference_matches_the_compiler_vocabulary(self) -> None:
        script = self.root / "scripts" / "generate-bio-command-reference.py"
        spec = importlib.util.spec_from_file_location("generate_bio_command_reference", script)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        reference = self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md"
        self.assertEqual(reference.read_text(encoding="utf-8"), module.render())

    def test_reference_describes_a_compiler_not_a_sentence_whitelist(self) -> None:
        reference = (self.root / "wiki" / "FigureLoom-Bio-Command-Reference.md").read_text(encoding="utf-8")
        self.assertIn("## Compiler model", reference)
        self.assertIn("**Vocabulary forms:**", reference)
        self.assertIn("Examples are examples, not a whitelist.", reference)
        self.assertIn("`remove`", reference)
        self.assertIn("`sequence`", reference)
        self.assertIn("`below`", reference)
        self.assertNotIn("Canonical sentences", reference)


if __name__ == "__main__":
    unittest.main()
'''
write("figureloom-bio/tests/test_generated_command_reference.py", TEST_REFERENCE)

validator = read("scripts/validate-bio-documentation.mjs")
validator = re.sub(
    r"for \(const value of \[\n\s*'\*\*Canonical sentences:\*\* 161',[\s\S]*?\]\) requireText\('commandReference', files\.commandReference, value\);",
    "for (const value of [\n  '## Compiler model',\n  '**Vocabulary forms:**',\n  '**Grammar families:** 4',\n  'Examples are examples, not a whitelist.',\n  '`remove`',\n  '`sequence`',\n  '`below`',\n  '`Assemble the bacterial genome.`',\n]) requireText('commandReference', files.commandReference, value);",
    validator,
)
validator = validator.replace(
    "console.log('FigureLoom Bio documentation matches the 260-sentence execution audit, and installer links stay only under Download for your computer in the wiki.');",
    "for (const [name, content] of Object.entries({ mainReadme: files.mainReadme, packageReadme: files.packageReadme, wiki: files.wiki, commandReference: files.commandReference })) {\n  if (content.includes('Canonical sentences')) errors.push(`${name} still describes a canonical sentence whitelist.`);\n}\nconsole.log('FigureLoom Bio documentation matches the compiler vocabulary and grammar, and installer links stay only under Download for your computer in the wiki.');",
)
write("scripts/validate-bio-documentation.mjs", validator)

workflow = read(".github/workflows/validate-bio-flow.yml")
workflow = workflow.replace(
    "          node --check ide/ide-language-manifest.js\n",
    "          node --check ide/ide-language-manifest.js\n          node --check ide/ide-language-compiler.js\n",
)
workflow = workflow.replace(
    "          node --check ide/ide-language-catalog-ui.js\n",
    "          node --check ide/ide-language-catalog-ui.js\n          node --check ide/ide-vocabulary-ui-copy.js\n",
)
write(".github/workflows/validate-bio-flow.yml", workflow)

# Remove the exact sentence-whitelist wording from the old compatibility layer.
replace("figureloom-bio/figureloom_bio/language_aliases.py", [
    ("Translators receive canonical sentences", "Translators receive lowered compatibility instructions"),
    ("aliases never become unknown", "compatibility forms never become unknown"),
])

print("Migrated FigureLoom Bio documentation and labels to the compiler vocabulary model.")
