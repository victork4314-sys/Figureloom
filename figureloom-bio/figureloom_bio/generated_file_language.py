from __future__ import annotations

from pathlib import Path
import shutil
from typing import Any

from .errors import FigureLoomBioError
from .parser import Instruction


def install_generated_file_language(runner_class: type[Any]) -> None:
    if getattr(runner_class, "_generated_file_language_installed", False):
        return
    original_run_instruction = runner_class._run_instruction

    def run_instruction(self: Any, instruction: Instruction) -> None:
        generated = getattr(self, "current_generated_file", None)
        action = instruction.action
        if generated and action in {"check_file", "count_file"}:
            path = self._path(generated)
            if not path.exists():
                raise FigureLoomBioError(f"I could not find {generated}.")
            if action == "check_file":
                self.output.add(
                    "File check",
                    generated,
                    "",
                    "Type",
                    path.suffix.lstrip(".").upper() or "file",
                    "",
                    "Size",
                    f"{path.stat().st_size:,} bytes",
                )
            else:
                self.output.add("File size", f"{path.stat().st_size:,}", "bytes")
            return
        if generated and action in {"copy_file", "rename_file"}:
            requested = instruction.values[0]
            source = self._path(generated)
            target_name = self._numbered_output_name(requested)
            target = self._path(target_name)
            if source.suffix.casefold() != target.suffix.casefold():
                verb = "Copy" if action == "copy_file" else "Rename"
                raise FigureLoomBioError(
                    f"{verb} this generated file with a {source.suffix or 'matching'} filename."
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            if source.resolve() != target.resolve():
                shutil.copyfile(source, target)
                if action == "rename_file":
                    source.unlink()
            self.current_generated_file = target_name
            self.output.add(
                "Copied the file" if action == "copy_file" else "Renamed the file",
                target_name,
            )
            return
        original_run_instruction(self, instruction)

    runner_class._run_instruction = run_instruction
    runner_class._generated_file_language_installed = True


__all__ = ["install_generated_file_language"]
