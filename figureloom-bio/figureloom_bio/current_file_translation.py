from __future__ import annotations

from pathlib import Path
from typing import Any

from .parser import Instruction


def _pair_names(requested: str) -> tuple[str, str]:
    path = Path(requested)
    suffix = path.suffix or ".fastq"
    stem = path.name[: -len(suffix)] if suffix else path.name
    folder = path.parent if str(path.parent) != "." else Path()
    return (
        str(folder / f"{stem}-forward{suffix}"),
        str(folder / f"{stem}-reverse{suffix}"),
    )


def install_current_file_translation() -> None:
    from . import translators

    compiler_class = translators.ShellCompiler
    if getattr(compiler_class, "_current_file_translation_installed", False):
        return

    original_instruction = compiler_class._instruction

    def current_instruction(self: Any, instruction: Instruction) -> None:
        action = instruction.action
        values = instruction.values
        plan = self.plan

        if action == "check_file":
            if plan.forward and plan.reverse:
                plan.add('seqkit stats -T "$FORWARD" "$REVERSE"')
                plan.require("seqkit")
            elif plan.current_kind == "table":
                plan.add('csvstat "$CURRENT"')
                plan.require("csvstat")
            else:
                plan.add('seqkit stats -a -T "$CURRENT"')
                plan.require("seqkit")
            return

        if action == "count_file":
            if plan.forward and plan.reverse:
                plan.add('seqkit stats -T "$FORWARD" "$REVERSE"')
                plan.require("seqkit")
            elif plan.current_kind == "table":
                plan.add('csvstat --count "$CURRENT"')
                plan.require("csvstat")
            else:
                plan.add('seqkit stats -T "$CURRENT"')
                plan.require("seqkit")
            return

        if action == "save_file":
            requested = values[0]
            if plan.forward and plan.reverse:
                forward, reverse = _pair_names(requested)
                self._save_pair(forward, reverse)
            else:
                self._save(requested)
            return

        if action == "compare_file":
            original_instruction(
                self,
                Instruction("compare_sequences", instruction.line_number, values),
            )
            return

        if action == "assemble_current_bacterial_genome":
            if plan.forward and plan.reverse:
                plan.add('spades.py --isolate -1 "$FORWARD" -2 "$REVERSE" -o assembly')
            elif plan.current:
                plan.add('spades.py --isolate -s "$CURRENT" -o assembly')
            else:
                plan.warn("Assemble the bacterial genome", "there is no open read file")
                return
            plan.require("spades.py")
            plan.forward = None
            plan.reverse = None
            plan.add('CURRENT="assembly/contigs.fasta"')
            plan.set_current("assembly/contigs.fasta", kind="fasta")
            return

        if action in {"annotate_current_file", "find_genes_current_file"}:
            if not plan.need_current("Annotate the file"):
                return
            plan.add('prokka --outdir annotation "$CURRENT"')
            plan.require("prokka")
            return

        if action == "find_resistance_current_file":
            if not plan.need_current("Find resistance genes in the file"):
                return
            database = values[0] if values and values[0] else "resistance-markers"
            plan.add(f'abricate --db {translators._q(database)} "$CURRENT"')
            plan.require("abricate")
            return

        if action == "find_virulence_current_file":
            if not plan.need_current("Find virulence genes in the file"):
                return
            plan.add('abricate --db vfdb "$CURRENT"')
            plan.require("abricate")
            return

        if action == "identify_current_file":
            if not plan.need_current("Identify the organism in the file"):
                return
            database = values[0]
            plan.add(
                f'kraken2 --db {translators._q(database)} '
                '--report file-kraken-report.txt '
                '--output file-kraken-output.txt "$CURRENT"'
            )
            plan.require("kraken2")
            return

        if action == "find_plasmids_current_file":
            if not plan.need_current("Find plasmids in the file"):
                return
            folder = values[0] if values and values[0] else "plasmids"
            plan.add(
                f'mob_recon --infile "$CURRENT" --outdir {translators._q(folder)}'
            )
            plan.require("mob_recon")
            return

        original_instruction(self, instruction)

    compiler_class._instruction = current_instruction
    compiler_class._current_file_translation_installed = True
