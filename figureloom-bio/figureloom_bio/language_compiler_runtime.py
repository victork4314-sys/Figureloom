from __future__ import annotations

from .language_compiler import CompiledInstruction, compile_sentence


def compile_for_runtime(sentence: str) -> CompiledInstruction:
    """Return the executable action/arguments produced by the shared grammar."""
    return compile_sentence(sentence)


def install_language_compiler() -> None:
    """No installation is required; the parser calls the shared grammar directly."""


__all__ = ["compile_for_runtime", "install_language_compiler"]
