from __future__ import annotations

from typing import Any

from .translators import ShellCompiler


def install_translator_compat() -> None:
    """Use official SeqKit rules for conversions and lower-memory FASTA sorting."""
    if getattr(ShellCompiler, "_figureloom_translator_compat", False):
        return

    original_instruction = ShellCompiler._instruction

    def instruction(self: ShellCompiler, value: Any) -> None:
        action = value.action
        values = value.values

        if action == "to_rna":
            if self.plan.need_current("Convert the DNA to RNA"):
                self._seqkit_transform("seq --dna2rna")
            return

        if action == "to_dna":
            if self.plan.need_current("Convert the RNA to DNA"):
                self._seqkit_transform("seq --rna2dna")
            return

        if action in {"shortest_sequences_first", "longest_sequences_first"}:
            if not self.plan.need_current(action):
                return
            reverse = " -r" if action == "longest_sequences_first" else ""
            two_pass = " -2" if self.plan.current_kind == "fasta" else ""
            self._seqkit_transform(f"sort -l{reverse}{two_pass}")
            return

        original_instruction(self, value)

    ShellCompiler._instruction = instruction
    ShellCompiler._figureloom_translator_compat = True
