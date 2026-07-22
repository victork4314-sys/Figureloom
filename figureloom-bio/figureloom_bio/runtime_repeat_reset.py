from __future__ import annotations

from typing import Any

from .errors import FigureLoomBioError


def install_repeat_reset(runner_class: type[Any]) -> None:
    """Reset paired FASTQ state at the beginning of every repeated run."""
    if getattr(runner_class, "_paired_repeat_reset_installed", False):
        return

    def run(self: Any, instructions: list[Any]) -> Any:
        repeat_count, program = self._prepare_repetition(instructions)
        self.total_runs = repeat_count

        for run_number in range(1, repeat_count + 1):
            self.run_number = run_number
            self.file_name = None
            self.table = None
            self.sequences = None
            self.sequence_format = None
            self.sequence_pair = None
            self.quality_report = None
            if repeat_count > 1:
                self.output.add(f"Run {run_number} of {repeat_count}", "Starting")

            for instruction in program:
                try:
                    self._run_instruction(instruction)
                except FigureLoomBioError as error:
                    if error.line_number is None:
                        error.line_number = instruction.line_number
                    raise

        return self.output

    runner_class.run = run
    runner_class._paired_repeat_reset_installed = True
