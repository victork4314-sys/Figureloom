from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "figureloom-bio" / "figureloom_bio" / "language_compiler.py"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    if old not in source:
        raise SystemExit(f"Could not patch Python compiler: missing {label} anchor.")
    return source.replace(old, new, 1)


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")

    source = replace_once(
        source,
        '''def _compile_replace(statement: Statement) -> CompiledInstruction:\n    column = statement.after("under", "in column")\n    replacement = statement.after("with", "to")\n    if statement.has("empty", "missing", "blank"):\n        return CompiledInstruction("replace_empty", (_need(column, "Replacing empty values needs a column name."), _need(replacement, "Replacing empty values needs a replacement value.")))\n''',
        '''def _compile_replace(statement: Statement) -> CompiledInstruction:\n    replacement = statement.after("with", "to")\n    column = (\n        statement.between(("under", "in column"), ("with", "to"))\n        if statement.has("empty", "missing", "blank")\n        else statement.after("under", "in column")\n    )\n    if statement.has("empty", "missing", "blank"):\n        return CompiledInstruction("replace_empty", (_need(column, "Replacing empty values needs a column name."), _need(replacement, "Replacing empty values needs a replacement value.")))\n''',
        "replace-empty roles",
    )

    source = replace_once(
        source,
        '''def _compile_convert(statement: Statement) -> CompiledInstruction:\n    if statement.has_term("rna"):\n        return CompiledInstruction("to_rna")\n    if statement.has_term("dna"):\n        return CompiledInstruction("to_dna")\n    raise CompileError("Convert needs a target such as DNA or RNA.")\n''',
        '''def _compile_convert(statement: Statement) -> CompiledInstruction:\n    target = (statement.after("to", "into", "as") or "").casefold()\n    if re.search(r"\\brna\\b", target):\n        return CompiledInstruction("to_rna")\n    if re.search(r"\\bdna\\b", target):\n        return CompiledInstruction("to_dna")\n    raise CompileError("Convert needs a target such as DNA or RNA.")\n''',
        "conversion target",
    )

    TARGET.write_text(source, encoding="utf-8")
    print("Python compiler value roles and conversion targets are fixed.")


if __name__ == "__main__":
    main()
