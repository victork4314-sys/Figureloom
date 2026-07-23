from __future__ import annotations

from . import language_aliases
from . import translators as translator_module
from .translation_completion import EXTRA_TARGET_EXTENSIONS, _runtime_translation


def install_language_source_parity() -> None:
    """Preserve source line endings and exact runtime-wrapper source bytes."""
    if getattr(language_aliases, "_language_source_parity_installed", False):
        return

    original_normalize_source = language_aliases.normalize_source

    def normalize_source(source: str) -> str:
        text = str(source)
        trailing = text[len(text.rstrip("\r\n")) :]
        normalized = original_normalize_source(text)
        return normalized.rstrip("\r\n") + trailing

    language_aliases.normalize_source = normalize_source

    # Julia, Ruby, Perl, and PowerShell execute the installed flbio engine, which
    # understands accepted wording directly. Keep the user's source byte-for-byte
    # in those wrappers instead of sending it through alias normalization first.
    original_translate_source = translator_module.translate_source

    def translate_source(
        source: str,
        target: str,
        *,
        program_name: str = "program.flbio",
    ):
        normalized_target = target.strip().lower()
        if normalized_target in EXTRA_TARGET_EXTENSIONS:
            return _runtime_translation(str(source), normalized_target, program_name)
        return original_translate_source(
            source,
            target,
            program_name=program_name,
        )

    translator_module.translate_source = translate_source
    language_aliases._language_source_parity_installed = True
