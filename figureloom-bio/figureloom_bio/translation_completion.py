from __future__ import annotations

import base64

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


def install_translation_completion() -> None:
    """Add portable runtime-preserving translation targets.

    These targets embed the original FigureLoom Bio source, write it to a
    temporary .flbio file, execute the installed ``flbio`` command, return the
    real process status, and remove the temporary file. This preserves block
    headers, indentation, decisions, loops, recipes, current-file references,
    and future built-in sentences without generating placeholder code.
    """
    if getattr(translator_module, "_translation_completion_installed", False):
        return

    translator_module.TARGET_EXTENSIONS.update(EXTRA_TARGET_EXTENSIONS)
    translator_module.TARGET_LABELS.update(EXTRA_TARGET_LABELS)
    original_translate_source = translator_module.translate_source

    def translate_source(
        source: str,
        target: str,
        *,
        program_name: str = "program.flbio",
    ) -> translator_module.TranslationResult:
        normalized = target.strip().lower()
        if normalized not in EXTRA_TARGET_EXTENSIONS:
            return original_translate_source(
                source,
                normalized,
                program_name=program_name,
            )

        payload = base64.b64encode(source.encode("utf-8")).decode("ascii")
        renderers = {
            "julia": _render_julia,
            "ruby": _render_ruby,
            "perl": _render_perl,
            "powershell": _render_powershell,
        }
        content = renderers[normalized](payload, program_name)
        return translator_module.TranslationResult(
            normalized,
            content,
            EXTRA_TARGET_EXTENSIONS[normalized],
            [],
            ["flbio"],
        )

    translator_module.translate_source = translate_source
    translator_module._translation_completion_installed = True


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
    "install_translation_completion",
]
