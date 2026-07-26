from __future__ import annotations

from . import language_compiler


def install_language_compiler_disambiguation() -> None:
    """Compatibility hook retained for older installations.

    Ambiguous words are now resolved inside Statement._find_verb from the whole
    sentence. This hook intentionally does not replace parser methods.
    """
    language_compiler.Statement._figureloom_disambiguation_installed = True


__all__ = ["install_language_compiler_disambiguation"]
