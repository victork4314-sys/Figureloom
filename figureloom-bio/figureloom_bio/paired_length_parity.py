from __future__ import annotations

from typing import Any

from .runtime_extensions import _filter_pair_length


def install_paired_length_parity(runner_class: type[Any]) -> None:
    """Keep canonical and natural minimum-length wording paired-read safe."""
    if getattr(runner_class, "_paired_length_parity_installed", False):
        return

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Any) -> None:
        if (
            getattr(self, "sequence_pair", None) is not None
            and instruction.action == "keep_min_length"
        ):
            _filter_pair_length(self, int(instruction.values[0]))
            return
        original_run_instruction(self, instruction)

    runner_class._run_instruction = run_instruction
    runner_class._paired_length_parity_installed = True
