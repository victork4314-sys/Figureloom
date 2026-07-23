from __future__ import annotations

import base64
import hashlib

from . import translators as translator_module


EXTRA_TARGET_EXTENSIONS = {
    "julia": ".jl",
    "ruby": ".rb",
    "perl": ".pl",
    "powershell": ".ps1",
}
EXTRA_TARGET_LABELS = {
    "julia": "Julia",
    "ruby": "Ruby",
    "perl": "Perl",
    "powershell": "PowerShell",
}
EXISTING_TARGETS = {"python", "r", "bash", "snakemake", "nextflow"}

_ADVISORY_WARNING_PREFIXES = (
    "SeqKit statistics do not reproduce every native validation counter",
    "SeqKit controls split filenames inside ",
    "fastp uses base-quality settings rather than the native exact average-read rule",
)


def install_translation_completion() -> None:
    """Finish translation without placeholders or approximate silent fallbacks.

    Exact translations and runnable translations with explicit advisory notes stay
    standalone. When a complete native translation is not available, the generated
    target embeds the original ``.flbio`` source and runs it through the installed
    FigureLoom Bio engine. This preserves decisions, loops, recipes, current-file
    references, future built-in sentences, and exact native behavior without
    generating placeholder code or pretending that an approximation is identical.
    """
    if getattr(translator_module, "_translation_completion_installed", False):
        return

    translator_module.TARGET_EXTENSIONS.update(EXTRA_TARGET_EXTENSIONS)
    translator_module.TARGET_LABELS.update(EXTRA_TARGET_LABELS)
    translator_module.ShellPlan.warn = _classified_warning
    original_translate_source = translator_module.translate_source

    def translate_source(
        source: str,
        target: str,
        *,
        program_name: str = "program.flbio",
    ) -> translator_module.TranslationResult:
        normalized = target.strip().lower()
        if normalized not in translator_module.TARGET_EXTENSIONS:
            supported = ", ".join(
                translator_module.TARGET_LABELS[key]
                for key in translator_module.TARGET_EXTENSIONS
            )
            raise ValueError(
                f"Unsupported translation target {target!r}. Choose {supported}."
            )

        if normalized in EXTRA_TARGET_EXTENSIONS:
            return _runtime_translation(source, normalized, program_name)

        translated = original_translate_source(
            source,
            normalized,
            program_name=program_name,
        )
        if "runtime required" in translated.content.casefold():
            return _runtime_translation(source, normalized, program_name)
        return translated

    translator_module.translate_source = translate_source
    translator_module._translation_completion_installed = True


def _classified_warning(
    plan: translator_module.ShellPlan,
    sentence: str,
    reason: str,
) -> None:
    message = f"{sentence}: {reason}"
    if message not in plan.warnings:
        plan.warnings.append(message)
    if reason.startswith(_ADVISORY_WARNING_PREFIXES):
        return
    plan.lines.append(f"# FigureLoom Bio runtime required: {message}")


def _runtime_translation(
    source: str,
    target: str,
    program_name: str,
) -> translator_module.TranslationResult:
    if target in EXTRA_TARGET_EXTENSIONS:
        payload = base64.b64encode(source.encode("utf-8")).decode("ascii")
        renderers = {
            "julia": _render_julia,
            "ruby": _render_ruby,
            "perl": _render_perl,
            "powershell": _render_powershell,
        }
        content = renderers[target](payload, program_name)
        requirements = ["flbio"]
    else:
        shell = _render_shell_runtime(source, program_name)
        plan = translator_module.ShellPlan()
        plan.requirements = {"bash", "flbio"}
        plan.outputs = ["figureloom-bio.done"]
        if target == "bash":
            content = shell
        elif target == "python":
            content = translator_module._render_python(shell, program_name)
        elif target == "r":
            content = translator_module._render_r(shell, program_name)
        elif target == "snakemake":
            content = translator_module._render_snakemake(shell, plan, program_name)
        else:
            content = translator_module._render_nextflow(shell, plan, program_name)
        requirements = ["bash", "flbio"]

    if "TODO" in content or ":." in content:
        raise RuntimeError("The completed translator generated invalid placeholder output.")
    return translator_module.TranslationResult(
        target,
        content,
        translator_module.TARGET_EXTENSIONS[target],
        [],
        requirements,
    )


def _render_shell_runtime(source: str, program_name: str) -> str:
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()[:12].upper()
    delimiter = f"FIGURELOOM_BIO_{digest}"
    while delimiter in source:
        delimiter += "_X"
    return f'''#!/usr/bin/env bash
set -euo pipefail

# Generated from {program_name} by FigureLoom Bio.
# The complete original program is preserved and run by the installed engine.
FLBIO_PROGRAM=$(mktemp "./.figureloom-bio.XXXXXX.flbio")
trap 'rm -f "$FLBIO_PROGRAM"' EXIT
cat > "$FLBIO_PROGRAM" <<'{delimiter}'
{source.rstrip()}
{delimiter}
flbio run "$FLBIO_PROGRAM" --allow-tools
touch figureloom-bio.done
'''


def _render_julia(payload: str, program_name: str) -> str:
    return f'''#!/usr/bin/env julia
# Generated from {program_name} by FigureLoom Bio.
using Base64
source = String(base64decode("{payload}"))
program = tempname() * ".flbio"
write(program, source)
try
    run(`flbio run $program --allow-tools`)
finally
    rm(program; force=true)
end
'''


def _render_ruby(payload: str, program_name: str) -> str:
    return f'''#!/usr/bin/env ruby
# Generated from {program_name} by FigureLoom Bio.
require "base64"
require "tempfile"
program = Tempfile.new(["figureloom-bio-", ".flbio"])
begin
  program.write(Base64.strict_decode64("{payload}"))
  program.close
  success = system("flbio", "run", program.path, "--allow-tools")
  exit(success ? 0 : ($?.exitstatus || 1))
ensure
  program.close! rescue nil
end
'''


def _render_perl(payload: str, program_name: str) -> str:
    return f'''#!/usr/bin/env perl
# Generated from {program_name} by FigureLoom Bio.
use strict;
use warnings;
use File::Temp qw(tempfile);
use MIME::Base64 qw(decode_base64);
my ($handle, $program) = tempfile("figureloom-bio-XXXXXX", SUFFIX => ".flbio", UNLINK => 0);
print $handle decode_base64("{payload}");
close $handle;
my $status = system("flbio", "run", $program, "--allow-tools");
unlink $program;
exit($status == -1 ? 1 : ($status >> 8));
'''


def _render_powershell(payload: str, program_name: str) -> str:
    return f'''# Generated from {program_name} by FigureLoom Bio.
$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("{payload}"))
$program = Join-Path ([IO.Path]::GetTempPath()) (([IO.Path]::GetRandomFileName()) + ".flbio")
try {{
    [IO.File]::WriteAllText($program, $source, [Text.UTF8Encoding]::new($false))
    & flbio run $program --allow-tools
    if ($LASTEXITCODE -ne 0) {{ exit $LASTEXITCODE }}
}}
finally {{
    Remove-Item -LiteralPath $program -Force -ErrorAction SilentlyContinue
}}
'''


__all__ = [
    "EXTRA_TARGET_EXTENSIONS",
    "EXTRA_TARGET_LABELS",
    "EXISTING_TARGETS",
    "install_translation_completion",
]
