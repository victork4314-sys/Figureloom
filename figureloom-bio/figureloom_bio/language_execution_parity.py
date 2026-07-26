from __future__ import annotations


def install_language_execution_parity() -> None:
    """Retained as a no-op for installer compatibility.

    Execution parity is now enforced by the shared semantic grammar rather than
    by reordering sentence patterns.
    """
    return


__all__ = ["install_language_execution_parity"]
