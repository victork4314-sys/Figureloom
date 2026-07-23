from __future__ import annotations

import hashlib

from .control_flow import uses_control_flow
from . import translators as translator_module


def translate_flow_source(
    source: str,
    target: str,
    *,
    program_name: str = "program.flbio",
):
    normalized = target.strip().lower()
    if normalized not in translator_module.TARGET_EXTENSIONS:
        supported = ", ".join(
            translator_module.TARGET_LABELS[key]
            for key in translator_module.TARGET_EXTENSIONS
        )
        raise ValueError(
            f"Unsupported translation target {target!r}. Choose {supported}."
        )

    shell = _shell_wrapper(source, program_name)
    plan = translator_module.ShellPlan()
    plan.requirements = {"bash", "flbio"}

    if normalized == "bash":
        content = shell
    elif normalized == "python":
        content = translator_module._render_python(shell, program_name)
    elif normalized == "r":
        content = translator_module._render_r(shell, program_name)
    elif normalized == "snakemake":
        content = translator_module._render_snakemake(shell, plan, program_name)
    else:
        content = translator_module._render_nextflow(shell, plan, program_name)

    return translator_module.TranslationResult(
        normalized,
        content,
        translator_module.TARGET_EXTENSIONS[normalized],
        [],
        ["bash", "flbio"],
    )


def _shell_wrapper(source: str, program_name: str) -> str:
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:12].upper()
    delimiter = f"FIGURELOOM_BIO_{digest}"
    while delimiter in source:
        delimiter += "_X"
    return f"""#!/usr/bin/env bash
set -euo pipefail

# Generated from {program_name} by FigureLoom Bio.
# Decisions, loops, named results, and recipes remain plain FigureLoom Bio.
FLBIO_FLOW_PROGRAM=$(mktemp "./.figureloom-flow.XXXXXX.flbio")
trap 'rm -f "$FLBIO_FLOW_PROGRAM"' EXIT
cat > "$FLBIO_FLOW_PROGRAM" <<'{delimiter}'
{source.rstrip()}
{delimiter}
flbio run "$FLBIO_FLOW_PROGRAM" --allow-tools
"""


__all__ = ["translate_flow_source", "uses_control_flow"]
