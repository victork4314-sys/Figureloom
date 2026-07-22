from __future__ import annotations

from typing import Any

from .addon_packages import expand_addons
from .control_flow import uses_control_flow
from .control_flow_translation import translate_flow_source
from .parser import parse
from . import translators as translator_module


def install_addon_translation() -> None:
    if getattr(translator_module, "_addon_translation_installed", False):
        return

    def translate_source(
        source: str,
        target: str,
        *,
        program_name: str = "program.flbio",
    ) -> Any:
        if uses_control_flow(source):
            return translate_flow_source(
                source,
                target,
                program_name=program_name,
            )

        normalized = target.strip().lower()
        if normalized not in translator_module.TARGET_EXTENSIONS:
            supported = ", ".join(
                translator_module.TARGET_LABELS[key]
                for key in translator_module.TARGET_EXTENSIONS
            )
            raise ValueError(
                f"Unsupported translation target {target!r}. Choose {supported}."
            )

        instructions = expand_addons(parse(source))
        plan = translator_module.ShellCompiler(instructions).compile()
        shell = translator_module._render_shell(plan, program_name)
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
            plan.warnings,
            sorted(plan.requirements),
        )

    translator_module.translate_source = translate_source
    translator_module._addon_translation_installed = True
