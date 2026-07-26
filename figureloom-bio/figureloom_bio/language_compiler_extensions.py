from __future__ import annotations

from .language_compiler import CompiledInstruction, compile_sentence


def compile_extended_sentence(sentence: str) -> CompiledInstruction:
    """Compatibility entry point routed to the shared grammar parser."""
    return compile_sentence(sentence)


__all__ = ["compile_extended_sentence"]
