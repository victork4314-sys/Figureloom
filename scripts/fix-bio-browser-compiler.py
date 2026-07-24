from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ide" / "ide-language-compiler.js"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    if old not in source:
        raise SystemExit(f"Could not patch browser compiler: missing {label} anchor.")
    return source.replace(old, new, 1)


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")

    compatibility = r'''  function establishedGrammarAccepts(text) {
    const core = phrase(text);
    const aliases = window.FigureLoomBioLanguageAliases;
    try {
      if (aliases?.recognizes?.(core)) return true;
    } catch {}

    try {
      if (window.FigureLoomBioCompleteLanguage?.uses?.(text)) return true;
    } catch {}

    try {
      const current = window.FigureLoomBioCurrentFile;
      if (current?.normalizeSource && current.normalizeSource(text) !== text) return true;
    } catch {}

    for (const recognizer of window.FigureLoomBioStatementRecognizers || []) {
      try {
        if (recognizer(text) || recognizer(core)) return true;
      } catch {}
    }

    const manifest = window.FigureLoomBioLanguage;
    if (manifest?.commands?.some((command) => String(command.example).toLowerCase() === text.toLowerCase())) return true;
    return false;
  }

'''
    source = replace_once(
        source,
        "  function compileLine(raw) {\n",
        compatibility + "  function compileLine(raw) {\n",
        "compileLine",
    )

    source = replace_once(
        source,
        "    if (!text || text.startsWith('#') || text.endsWith(':') || !text.endsWith('.')) return original;\n\n    const source = phrase(text);",
        "    if (!text || text.startsWith('#') || text.endsWith(':') || !text.endsWith('.')) return original;\n    if (establishedGrammarAccepts(text)) return original;\n\n    const source = phrase(text);",
        "established grammar precedence",
    )

    source = replace_once(
        source,
        "    if (op === 'replace') {\n      const column = after(source, 'under', 'in column');\n      const replacement = after(source, 'with', 'to');",
        "    if (op === 'replace') {\n      const replacement = after(source, 'with', 'to');\n      const column = has(lower, 'empty', 'missing', 'blank')\n        ? between(source, ['under', 'in column'], ['with', 'to'])\n        : after(source, 'under', 'in column');",
        "replace grammar",
    )

    source = replace_once(
        source,
        "    if (op === 'convert') {\n      if (term(lower, 'rna')) output = 'Convert the DNA to RNA.';\n      else if (term(lower, 'dna')) output = 'Convert the RNA to DNA.';\n    }",
        "    if (op === 'convert') {\n      const target = after(source, 'to', 'into', 'as').toLowerCase();\n      if (/\\brna\\b/.test(target)) output = 'Convert the DNA to RNA.';\n      else if (/\\bdna\\b/.test(target)) output = 'Convert the RNA to DNA.';\n    }",
        "conversion target",
    )

    TARGET.write_text(source, encoding="utf-8")
    print("Browser compiler now preserves established grammar and compiles only new wording.")


if __name__ == "__main__":
    main()
