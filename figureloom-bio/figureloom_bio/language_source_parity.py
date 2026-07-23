from __future__ import annotations

from . import language_aliases


def install_language_source_parity() -> None:
    """Preserve the source's trailing line ending during alias normalization."""
    if getattr(language_aliases, "_language_source_parity_installed", False):
        return

    original_normalize_source = language_aliases.normalize_source

    def normalize_source(source: str) -> str:
        text = str(source)
        trailing = text[len(text.rstrip("\r\n")) :]
        normalized = original_normalize_source(text)
        return normalized.rstrip("\r\n") + trailing

    language_aliases.normalize_source = normalize_source
    language_aliases._language_source_parity_installed = True
