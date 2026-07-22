from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import re
import shlex
from typing import Iterable

from .parser import Instruction, parse


TARGET_EXTENSIONS = {
    "python": ".py",
    "r": ".R",
    "bash": ".sh",
    "snakemake": ".smk",
    "nextflow": ".nf",
}
TARGET_LABELS = {key: key.capitalize() for key in TARGET_EXTENSIONS}
TARGET_LABELS.update({"snakemake": "Snakemake", "nextflow": "Nextflow"})


@dataclass
class TranslationResult:
    target: str
    content: str
    extension: str
    warnings: list[str] = field(default_factory=list)
    requirements: list[str] = field(default_factory=list)


@dataclass
class Plan:
    lines: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    requirements: set[str] = field(default_factory=lambda: {"bash"})
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    current: str | None = None
    current_kind: str | None = None
    current_extension: str = ".tmp"
    forward: str | None = None
    reverse: str | None = None
    repeat_count: int = 1
    step: int = 0

    def add(self, line: str) -> None:
        self.lines.append(line)

    def require(self, *names: str) -> None:
        self.requirements.update(names)

    def warn(self, sentence: str, reason: str) -> None:
        message = f"{sentence}: {reason}"
        if message not in self.warnings:
            self.warnings.append(message)
        self.lines.append(f"# TODO: {message}")

    def temp(self, extension: str | None = None) -> str:
        self.step += 1
        suffix = extension or self.current_extension or ".tmp"
        if suffix and not suffix.startswith("."):
            suffix = f".{suffix}"
        return f"$FLBIO_WORKDIR/step-{self.step:03d}{suffix}"


class Compiler:
    def __init__(self, instructions: list[Instruction]) -> None:
        self.instructions = instructions
        self.plan = Plan()

    def compile(self) -> Plan:
        for instruction in self.instructions:
            self._instruction(instruction)
        return self.plan

    def _instruction(self, instruction: Instruction) -> None:
        action = instruction.action
        values = instruction.values
        sentence = _sentence(action, values)

        if action == "repeat_program":
            self.plan.repeat_count = int(values[0])
            return
        if action == "say":
            self.plan.add(f"printf '%s\\n' {_q(values[0])}")
            return
        if action == "open_file":
            self._open(values[0])
            return
        if action == "open_pair":
            self.plan.forward, self.plan.reverse = values
            self.plan.current = None
            self.plan.current_kind = "fastq-pair"
            self._remember_inputs(values)
            self.plan.add(f"FORWARD={_q(values[0])}")
            self.plan.add(f"REVERSE={_q(values[1])}")
            return
        if action == "merge_files":
            names = _natural_list(values[0])
            if len(names) < 2:
                self.plan.warn(sentence, "name at least two files")
                return
            self._open(names[0])
            for name in names[1:]:
                self._merge(name, sentence)
            return
        if action in {"merge_sequences", "append_rows"}:
            self._merge(values[0], sentence, rows_only=action == "append_rows")
            return
        if action == "run_tool":
            self.plan.add(f"{_q(values[0])} {values[1]}")
            self.plan.require(values[0])
            return

        if self.plan.current is None and self.plan.forward is None:
            self.plan.warn(sentence, "there is no open file before this instruction")
            return

        if action in {"keep_rows", "remove_rows"}:
            invert = " -i" if action == "remove_rows" else ""
            next_path = self.plan.temp(".csv")
            self.plan.add(
                f"csvgrep{invert} -c {_q(values[1])} -m {_q(values[0])} \"$CURRENT\" > \"{next_path}\""
            )
            self._set_current(next_path, kind="table")
            self.plan.require("csvgrep")
        elif action == "keep_columns":
            next_path = self.plan.temp(".csv")
            self.plan.add(f"csvcut -c {_q(','.join(_natural_list(values[0])))} \"$CURRENT\" > \"{next_path}\"")
            self._set_current(next_path, kind="table")
            self.plan.require("csvcut")
        elif action == "rename_column":
            self._pandas(f"df=df.rename(columns={{{values[0]!r}:{values[1]!r}}})")
        elif action in {"order_rows", "largest_first", "smallest_first"}:
            reverse = " -r" if action == "largest_first" else ""
            next_path = self.plan.temp(".csv")
            self.plan.add(f"csvsort{reverse} -c {_q(values[0])} \"$CURRENT\" > \"{next_path}\"")
            self._set_current(next_path, kind="table")
            self.plan.require("csvsort")
        elif action == "remove_duplicates":
            self._pandas(f"df=df.drop_duplicates(subset=[{values[0]!r}],keep='first')")
        elif action == "replace_empty":
            self._pandas(
                f"df[{values[0]!r}]=df[{values[0]!r}].replace('',pd.NA).fillna({values[1]!r})"
            )
        elif action == "combine_file":
            self._join(values[0], values[1])
        elif action == "change_value":
            self._pandas(
                f"df.loc[df[{values[2]!r}]=={values[0]!r},{values[2]!r}]={values[1]!r}"
            )
        elif action == "count_rows":
            self.plan.add("csvstat --count \"$CURRENT\"")
            self.plan.require("csvstat")
        elif action in {"count_sequences", "count_bases", "sequence_statistics"}:
            flags = " -a" if action == "sequence_statistics" else ""
            self.plan.add(f"seqkit stats{flags} -T \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "show_sequence_names":
            self.plan.add("seqkit seq -n \"$CURRENT\" | head -n 100")
            self.plan.require("seqkit")
        elif action == "show_first_sequences":
            self.plan.add(f"seqkit head -n {int(values[0])} \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action in {"show_sequences", "show_result", "show_file"}:
            self.plan.add("seqkit head -n 100 \"$CURRENT\" 2>/dev/null || head -n 101 \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action in {"keep_strict_length", "keep_min_length", "remove_shorter"}:
            minimum = int(values[0]) + (1 if action == "keep_strict_length" else 0)
            self._seqkit(f"seq -m {minimum}")
        elif action in {"keep_motif", "remove_motif"}:
            invert = " -v" if action == "remove_motif" else ""
            self._seqkit(f"grep -s{invert} -p {_q(values[0])}")
        elif action in {"use_sequence", "remove_named_sequence"}:
            invert = " -v" if action == "remove_named_sequence" else ""
            self._seqkit(f"grep{invert} -p {_q(values[0])}")
        elif action == "rename_sequence":
            self._seqkit(f"replace -n -p {_q('^' + re.escape(values[0]) + '$')} -r {_q(values[1])}")
        elif action == "prefix_sequence_names":
            self._seqkit(f"replace -n -p '^' -r {_q(values[0])}")
        elif action == "suffix_sequence_names":
            self._seqkit(f"replace -n -p '$' -r {_q(values[0])}")
        elif action == "remove_duplicate_sequences":
            self._seqkit("rmdup -s")
        elif action in {"shortest_sequences_first", "longest_sequences_first"}:
            reverse = " -r" if action == "longest_sequences_first" else ""
            two_pass = " -2" if self.plan.current_kind == "fasta" else ""
            self._seqkit(f"sort -l{reverse}{two_pass}")
        elif action == "show_sequence_lengths":
            self.plan.add("seqkit fx2tab -n -l \"$CURRENT\" | head -n 100")
            self.plan.require("seqkit")
        elif action in {"find_shortest_sequence", "find_longest_sequence"}:
            reverse = " -r" if action == "find_longest_sequence" else ""
            self.plan.add(f"seqkit sort -l{reverse} \"$CURRENT\" | seqkit head -n 1")
            self.plan.require("seqkit")
        elif action == "keep_base_range":
            self._seqkit(f"subseq -r {int(values[0])}:{int(values[1])}")
        elif action in {"trim_start", "cut_start"}:
            self._seqkit(f"subseq -r {int(values[0]) + 1}:-1")
        elif action in {"trim_end", "cut_end"}:
            self._seqkit(f"subseq -r 1:{-(int(values[0]) + 1)}")
        elif action == "to_rna":
            self._seqkit("seq --dna2rna")
        elif action == "to_dna":
            self._seqkit("seq --rna2dna")
        elif action == "reverse_complement":
            self._seqkit("seq -r -p")
        elif action == "translate":
            self._seqkit("translate", extension=".fasta")
        elif action == "gc_content":
            self.plan.add("seqkit fx2tab -n -l -g \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "remove_sequence_gaps":
            self._seqkit("seq -g")
        elif action in {"keep_sequence_names_containing", "remove_sequence_names_containing"}:
            invert = " -v" if action == "remove_sequence_names_containing" else ""
            pattern = f".*{re.escape(values[0])}.*"
            self._seqkit(f"grep -i -r{invert} -p {_q(pattern)}")
        elif action == "make_sequence_names_unique":
            self._seqkit("rename")
        elif action == "remove_ambiguous_sequences":
            self._seqkit("grep -s -r -v -p '[^ACGTUacgtu]'")
        elif action == "keep_max_ambiguous":
            self.plan.warn(sentence, "review this ambiguity-count filter in the translated workflow")
        elif action == "validate_sequences":
            self.plan.add("seqkit stats -a -T \"$CURRENT\"")
            self.plan.require("seqkit")
            self.plan.warn(sentence, "SeqKit statistics are generated, but the full FigureLoom validation report needs review")
        elif action == "split_sequences":
            requested = Path(values[1])
            out_dir = f"{requested.stem}-parts"
            self.plan.add(
                f"seqkit split2 -s {int(values[0])} -O {_q(out_dir)} -P {_q(requested.stem)} \"$CURRENT\""
            )
            self.plan.require("seqkit")
            self.plan.outputs.append(out_dir)
        elif action == "remove_adapters":
            self._fastp("--detect_adapter_for_pe" if self.plan.forward else "")
        elif action in {"keep_min_quality", "remove_low_quality", "remove_low_quality_default"}:
            threshold = float(values[0]) if values else 20.0
            self._fastp(f"--qualified_quality_phred {threshold:g}")
            self.plan.warn(sentence, "fastp uses a base-quality threshold; review it against the original average-read rule")
        elif action in {"check_quality", "show_quality_report"}:
            self.plan.add("seqkit stats -a -T \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "compare_sequences":
            self.plan.warn(sentence, "sequence-name comparison needs a target-specific implementation")
        elif action in {"save_result", "save_sequences"}:
            self._save(values[0])
        elif action == "save_pair":
            self._save_pair(values[0], values[1])
        else:
            self.plan.warn(sentence, "this command does not have a translator rule yet")

    def _open(self, name: str) -> None:
        self._remember_inputs((name,))
        self.plan.current = name
        self.plan.current_kind = _kind_for(name)
        self.plan.current_extension = _extension_for(name)
        self.plan.forward = self.plan.reverse = None
        self.plan.add(f"CURRENT={_q(name)}")
        self.plan.add("test -f \"$CURRENT\"")

    def _merge(self, name: str, sentence: str, *, rows_only: bool = False) -> None:
        if self.plan.current is None:
            self.plan.warn(sentence, "there is no open file before the merge")
            return
        self._remember_inputs((name,))
        if rows_only or self.plan.current_kind == "table":
            next_path = self.plan.temp(".csv")
            self.plan.add(f"csvstack \"$CURRENT\" {_q(name)} > \"{next_path}\"")
            self._set_current(next_path, kind="table")
            self.plan.require("csvstack")
            return
        other_kind = _kind_for(name)
        if self.plan.current_kind in {"fasta", "fastq"} and other_kind == self.plan.current_kind:
            next_path = self.plan.temp(self.plan.current_extension)
            self.plan.add(f"cat \"$CURRENT\" {_q(name)} > \"{next_path}\"")
            self._set_current(next_path)
            return
        self.plan.warn(sentence, "the files are not clearly compatible")

    def _set_current(self, value: str, *, kind: str | None = None) -> None:
        self.plan.current = value
        if kind is not None:
            self.plan.current_kind = kind
        self.plan.current_extension = _extension_for(value)
        self.plan.add(f"CURRENT=\"{value}\"")

    def _seqkit(self, arguments: str, *, extension: str | None = None) -> None:
        next_path = self.plan.temp(extension or self.plan.current_extension)
        self.plan.add(f"seqkit {arguments} \"$CURRENT\" -o \"{next_path}\"")
        self._set_current(next_path)
        self.plan.require("seqkit")

    def _fastp(self, arguments: str = "") -> None:
        if self.plan.forward and self.plan.reverse:
            left = self.plan.temp(".fastq")
            right = self.plan.temp(".fastq")
            self.plan.add(
                f"fastp -i \"$FORWARD\" -I \"$REVERSE\" -o \"{left}\" -O \"{right}\" {arguments}".rstrip()
            )
            self.plan.add(f"FORWARD=\"{left}\"")
            self.plan.add(f"REVERSE=\"{right}\"")
        else:
            next_path = self.plan.temp(".fastq")
            self.plan.add(f"fastp -i \"$CURRENT\" -o \"{next_path}\" {arguments}".rstrip())
            self._set_current(next_path, kind="fastq")
        self.plan.require("fastp")

    def _pandas(self, operation: str) -> None:
        next_path = self.plan.temp(".csv")
        code = (
            "import pandas as pd,sys; src,dst=sys.argv[1:3]; "
            "df=pd.read_csv(src,sep='\\t' if src.lower().endswith('.tsv') else ','); "
            f"{operation}; df.to_csv(dst,index=False)"
        )
        self.plan.add(f"python3 -c {_q(code)} \"$CURRENT\" \"{next_path}\"")
        self._set_current(next_path, kind="table")
        self.plan.require("python3", "pandas")

    def _join(self, other: str, column: str) -> None:
        next_path = self.plan.temp(".csv")
        code = (
            "import pandas as pd,sys; a,b,d,k=sys.argv[1:5]; "
            "x=pd.read_csv(a,sep='\\t' if a.lower().endswith('.tsv') else ','); "
            "y=pd.read_csv(b,sep='\\t' if b.lower().endswith('.tsv') else ','); "
            "x.merge(y,on=k,how='left',suffixes=('','_incoming')).to_csv(d,index=False)"
        )
        self.plan.add(f"python3 -c {_q(code)} \"$CURRENT\" {_q(other)} \"{next_path}\" {_q(column)}")
        self._set_current(next_path, kind="table")
        self._remember_inputs((other,))
        self.plan.require("python3", "pandas")

    def _save(self, requested: str) -> None:
        self.plan.outputs.append(requested) if requested not in self.plan.outputs else None
        self.plan.add(f"OUTPUT=$(flbio_numbered_output {_q(requested)})")
        self.plan.add("cp \"$CURRENT\" \"$OUTPUT\"")
        self.plan.add("printf 'Saved %s\\n' \"$OUTPUT\"")

    def _save_pair(self, forward: str, reverse: str) -> None:
        if not self.plan.forward or not self.plan.reverse:
            self.plan.warn(f"Save the pair as {forward} and {reverse}", "there is no paired result")
            return
        self.plan.outputs.extend(name for name in (forward, reverse) if name not in self.plan.outputs)
        self.plan.add(f"OUT_FORWARD=$(flbio_numbered_output {_q(forward)})")
        self.plan.add(f"OUT_REVERSE=$(flbio_numbered_output {_q(reverse)})")
        self.plan.add("cp \"$FORWARD\" \"$OUT_FORWARD\"")
        self.plan.add("cp \"$REVERSE\" \"$OUT_REVERSE\"")

    def _remember_inputs(self, names: Iterable[str]) -> None:
        for name in names:
            if name not in self.plan.inputs:
                self.plan.inputs.append(name)


def translate_source(source: str, target: str, *, program_name: str = "program.flbio") -> TranslationResult:
    normalized = target.strip().lower()
    if normalized not in TARGET_EXTENSIONS:
        supported = ", ".join(TARGET_LABELS[key] for key in TARGET_EXTENSIONS)
        raise ValueError(f"Unsupported translation target {target!r}. Choose {supported}.")
    plan = Compiler(parse(source)).compile()
    shell = _render_shell(plan, program_name)
    renderers = {
        "bash": lambda: shell,
        "python": lambda: _render_python(shell, program_name),
        "r": lambda: _render_r(shell, program_name),
        "snakemake": lambda: _render_snakemake(shell, plan, program_name),
        "nextflow": lambda: _render_nextflow(shell, plan, program_name),
    }
    return TranslationResult(
        target=normalized,
        content=renderers[normalized](),
        extension=TARGET_EXTENSIONS[normalized],
        warnings=plan.warnings,
        requirements=sorted(plan.requirements),
    )


def default_output_path(program: Path, target: str) -> Path:
    return program.with_suffix(TARGET_EXTENSIONS[target.lower()])


def _render_shell(plan: Plan, program_name: str) -> str:
    requirements = ", ".join(sorted(plan.requirements))
    warnings = "\n".join(f"# WARNING: {value}" for value in plan.warnings)
    if warnings:
        warnings += "\n"
    body = "\n".join(f"  {line}" for line in plan.lines) or "  :"
    return f'''#!/usr/bin/env bash
set -euo pipefail

# Generated from {program_name} by FigureLoom Bio.
# Required commands: {requirements}
{warnings}FLBIO_TOTAL_RUNS={plan.repeat_count}
FLBIO_BASE_WORKDIR=${{FLBIO_BASE_WORKDIR:-$(mktemp -d "${{TMPDIR:-/tmp}}/figureloom-bio.XXXXXX")}}
trap 'rm -rf "$FLBIO_BASE_WORKDIR"' EXIT

flbio_numbered_output() {{
  local name=$1
  if [ "$FLBIO_TOTAL_RUNS" -le 1 ]; then printf '%s\\n' "$name"; return; fi
  local directory base stem extension
  directory=$(dirname "$name")
  base=$(basename "$name")
  if [[ "$base" == *.* ]]; then stem=${{base%.*}}; extension=.${{base##*.}}; else stem=$base; extension=; fi
  printf '%s/%s-%s%s\\n' "$directory" "$stem" "$FLBIO_RUN_INDEX" "$extension"
}}

for FLBIO_RUN_INDEX in $(seq 1 "$FLBIO_TOTAL_RUNS"); do
  FLBIO_WORKDIR="$FLBIO_BASE_WORKDIR/run-$FLBIO_RUN_INDEX"
  mkdir -p "$FLBIO_WORKDIR"
{body}
done
'''


def _render_python(shell: str, program_name: str) -> str:
    return f'''#!/usr/bin/env python3
"""Generated from {program_name} by FigureLoom Bio."""

import subprocess

WORKFLOW = {shell!r}
subprocess.run(["bash", "-lc", WORKFLOW], check=True)
'''


def _render_r(shell: str, program_name: str) -> str:
    escaped = shell.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'''#!/usr/bin/env Rscript
# Generated from {program_name} by FigureLoom Bio.
workflow <- "{escaped}"
status <- system2("bash", c("-lc", shQuote(workflow)))
if (status != 0) quit(status = status)
'''


def _render_snakemake(shell: str, plan: Plan, program_name: str) -> str:
    inputs = ", ".join(repr(value) for value in plan.inputs)
    outputs = ", ".join(repr(value) for value in plan.outputs) or repr("figureloom-bio.done")
    indented = "\n".join("        " + line for line in shell.splitlines())
    return f'''# Generated from {program_name} by FigureLoom Bio.
rule figureloom_bio:
    input: [{inputs}]
    output: [{outputs}]
    shell:
        r"""
{indented}
        """
'''


def _render_nextflow(shell: str, plan: Plan, program_name: str) -> str:
    outputs = "\n".join(f"    path {value!r}" for value in plan.outputs) or "    path 'figureloom-bio.done', optional: true"
    escaped = shell.replace("$", "\\$")
    return f'''nextflow.enable.dsl=2

// Generated from {program_name} by FigureLoom Bio.
process FIGURELOOM_BIO {{
  output:
{outputs}

  script:
  """
{escaped}
  """
}}

workflow {{
  FIGURELOOM_BIO()
}}
'''


def _kind_for(name: str) -> str:
    lower = name.lower()
    if lower.endswith(".gz"):
        lower = lower[:-3]
    if lower.endswith((".csv", ".tsv")):
        return "table"
    if lower.endswith((".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn")):
        return "fasta"
    if lower.endswith((".fq", ".fastq")):
        return "fastq"
    return "unknown"


def _extension_for(name: str) -> str:
    lower = name.lower()
    compressed = lower.endswith(".gz")
    base = name[:-3] if compressed else name
    suffix = Path(base).suffix or ".tmp"
    return suffix + (".gz" if compressed else "")


def _natural_list(text: str) -> list[str]:
    cleaned = text.strip().replace(", and ", ", ")
    if "," not in cleaned and " and " in cleaned:
        left, right = cleaned.rsplit(" and ", 1)
        cleaned = f"{left}, {right}"
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def _q(value: str) -> str:
    return shlex.quote(str(value))


def _sentence(action: str, values: Iterable[str]) -> str:
    return f"{action}({', '.join(values)})"
