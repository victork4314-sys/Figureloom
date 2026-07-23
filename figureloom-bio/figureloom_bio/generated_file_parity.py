from __future__ import annotations

from pathlib import Path
import shutil
from typing import Any

from .errors import FigureLoomBioError
from .parser import Instruction


def install_generated_file_parity(runner_class: type[Any]) -> None:
    """Route current-file checks and file actions to a generated figure."""
    if getattr(runner_class, "_generated_file_parity_installed", False):
        return

    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Instruction) -> None:
        generated = getattr(self, "current_generated_file", None)
        if not generated or instruction.action not in {
            "check_file",
            "count_file",
            "copy_file",
            "rename_file",
        }:
            original_run_instruction(self, instruction)
            return

        source = self._path(generated)
        if not source.exists():
            self.current_generated_file = None
            original_run_instruction(self, instruction)
            return

        if instruction.action == "check_file":
            self.output.add(
                "File check",
                generated,
                "",
                "Type",
                source.suffix.lstrip(".").upper() or "file",
                "",
                "Size",
                f"{source.stat().st_size:,} bytes",
            )
            return

        if instruction.action == "count_file":
            self.output.add("File size", f"{source.stat().st_size:,}", "bytes")
            return

        requested = instruction.values[0]
        output_name = self._numbered_output_name(requested)
        target = self._path(output_name)
        if target.suffix.casefold() != source.suffix.casefold():
            verb = "copy" if instruction.action == "copy_file" else "rename"
            raise FigureLoomBioError(
                f"I cannot {verb} {generated} as {requested}.\n\n"
                f"Use a {source.suffix or 'matching'} filename."
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != target.resolve():
            shutil.copyfile(source, target)

        if instruction.action == "rename_file" and source.resolve() != target.resolve():
            source.unlink()
            self.output.add("Renamed the file", output_name)
        else:
            self.output.add("Copied the file", output_name)

        self.current_generated_file = output_name
        self.file_name = output_name

    runner_class._run_instruction = run_instruction
    runner_class._generated_file_parity_installed = True


__all__ = ["install_generated_file_parity"]
