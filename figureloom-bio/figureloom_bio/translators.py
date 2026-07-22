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
TARGET_LABELS = {
    "python": "Python",
    "r": "R",
    "bash": "Bash",
    "snakemake": "Snakemake",
    "nextflow": "Nextflow",
}


@dataclass
class TranslationResult:
    target: str
    content: str
    extension: str
    warnings: list[str] = field(default_factory=list)
    requirements: list[str] = field(default_factory=list)


@dataclass
class ShellPlan:
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
    step: int = 0
    repeat_count: int = 1

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

    def set_current(self, value: str, *, kind: str | None = None) -> None:
        self.current = value
        if kind is not None:
            self.current_kind = kind
        self.current_extension = _extension_for(value) or self.current_extension

    def need_current(self, sentence: str) -> bool:
        if self.current is not None or self.forward is not None:
            return True
        self.warn(sentence, "there is no open file before this instruction")
        return False


class ShellCompiler:
    def __init__(self, instructions: list[Instruction]) -> None:
        self.instructions = instructions
        self.plan = ShellPlan()

    def compile(self) -> ShellPlan:
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
            self._input(values[0])
            self._input(values[1])
            self.plan.add(f"FORWARD={_q(values[0])}")
            self.plan.add(f"REVERSE={_q(values[1])}")
            return
        if action in {"open_files_together", "merge_files"}:
            files = _natural_list(values[0])
            if not files:
                self.plan.warn(sentence, "no files were named")
                return
            self._open(files[0])
            for name in files[1:]:
                self._merge(name, sentence)
            return
        if action in {"merge_result", "append_rows", "merge_sequences"}:
            self._merge(values[0], sentence, rows_only=action == "append_rows")
            return
        if action == "run_tool":
            self.plan.add(f"{_q(values[0])} {values[1]}")
            self.plan.require(values[0])
            return

        if not self.plan.need_current(sentence):
            return

        if action in {"keep_rows", "remove_rows"}:
            self._table_filter(values[0], values[1], remove=action == "remove_rows")
        elif action == "keep_columns":
            next_path = self.plan.temp(".csv")
            columns = ",".join(_natural_list(values[0]))
            self.plan.add(f"csvcut -c {_q(columns)} \"$CURRENT\" > \"{next_path}\"")
            self.plan.add(f"CURRENT=\"{next_path}\"")
            self.plan.require("csvcut")
        elif action == "rename_column":
            self._pandas_transform(f"df = df.rename(columns={{{values[0]!r}: {values[1]!r}}})")
        elif action in {"order_rows", "largest_first", "smallest_first"}:
            column = values[0]
            reverse = action == "largest_first"
            flag = " -r" if reverse else ""
            next_path = self.plan.temp(".csv")
            self.plan.add(f"csvsort -c {_q(column)}{flag} \"$CURRENT\" > \"{next_path}\"")
            self.plan.add(f"CURRENT=\"{next_path}\"")
            self.plan.require("csvsort")
        elif action == "remove_duplicates":
            self._pandas_transform(f"df = df.drop_duplicates(subset=[{values[0]!r}], keep='first')")
        elif action == "replace_empty":
            column, replacement = values
            self._pandas_transform(f"df[{column!r}] = df[{column!r}].replace('', pd.NA).fillna({replacement!r})")
        elif action == "combine_file":
            self._pandas_join(values[0], values[1])
        elif action == "change_value":
            old, new, column = values
            self._pandas_transform(f"df.loc[df[{column!r}] == {old!r}, {column!r}] = {new!r}")
        elif action == "count_rows":
            self.plan.add("csvstat --count \"$CURRENT\"")
            self.plan.require("csvstat")
        elif action in {"count_sequences", "count_bases"}:
            self.plan.add("seqkit stats -T \"$CURRENT\"")
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
            self._seqkit_transform(f"seq -m {minimum}")
        elif action in {"keep_motif", "remove_motif"}:
            invert = " -v" if action == "remove_motif" else ""
            self._seqkit_transform(f"grep -s{invert} -p {_q(values[0])}")
        elif action in {"use_sequence", "remove_named_sequence"}:
            invert = " -v" if action == "remove_named_sequence" else ""
            self._seqkit_transform(f"grep -n{invert} -p {_q(values[0])}")
        elif action == "rename_sequence":
            self._seqkit_transform(f"replace -n -p {_q('^' + re.escape(values[0]) + '$')} -r {_q(values[1])}")
        elif action == "prefix_sequence_names":
            self._seqkit_transform(f"replace -n -p '^' -r {_q(values[0])}")
        elif action == "suffix_sequence_names":
            self._seqkit_transform(f"replace -n -p '$' -r {_q(values[0])}")
        elif action == "remove_duplicate_sequences":
            self._seqkit_transform("rmdup -s")
        elif action in {"shortest_sequences_first", "longest_sequences_first"}:
            reverse = " -r" if action == "longest_sequences_first" else ""
            two_pass = " -2" if self.plan.current_kind == "fasta" else ""
            self._seqkit_transform(f"sort -l{reverse}{two_pass}")
        elif action == "show_sequence_lengths":
            self.plan.add("seqkit fx2tab -n -l \"$CURRENT\" | head -n 100")
            self.plan.require("seqkit")
        elif action in {"find_shortest_sequence", "find_longest_sequence"}:
            reverse = " -r" if action == "find_longest_sequence" else ""
            self.plan.add(f"seqkit sort -l{reverse} \"$CURRENT\" | seqkit head -n 1")
            self.plan.require("seqkit")
        elif action == "keep_base_range":
            self._seqkit_transform(f"subseq -r {int(values[0])}:{int(values[1])}")
        elif action in {"trim_start", "cut_start"}:
            self._seqkit_transform(f"subseq -r {int(values[0]) + 1}:-1")
        elif action in {"trim_end", "cut_end"}:
            self._seqkit_transform(f"subseq -r 1:{-(int(values[0]) + 1)}")
        elif action == "to_rna":
            self._seqkit_transform("seq --dna2rna")
        elif action == "to_dna":
            self._seqkit_transform("seq --rna2dna")
        elif action == "reverse_complement":
            self._seqkit_transform("seq -r -p")
        elif action == "translate":
            self._seqkit_transform("translate")
            self.plan.current_extension = ".fasta"
            self.plan.current_kind = "fasta"
        elif action == "gc_content":
            self.plan.add("seqkit fx2tab -n -l -g \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "sequence_statistics":
            self.plan.add("seqkit stats -a -T \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "validate_sequences":
            self.plan.add("seqkit stats -a -T \"$CURRENT\"")
            self.plan.warn(sentence, "SeqKit statistics do not reproduce every native validation counter")
            self.plan.require("seqkit")
        elif action == "remove_sequence_gaps":
            self._seqkit_transform("seq -g")
        elif action in {"keep_sequence_names_containing", "remove_sequence_names_containing"}:
            invert = " -v" if action == "remove_sequence_names_containing" else ""
            self._seqkit_transform(f"grep -n -r{invert} -p {_q(values[0])}")
        elif action == "make_sequence_names_unique":
            self._seqkit_transform("rename")
        elif action == "remove_ambiguous_sequences":
            self._seqkit_transform("grep -s -v -r -p '[^ACGTUacgtu]'")
        elif action == "keep_max_ambiguous":
            self.plan.warn(sentence, "the exact ambiguous-base count needs a small target-specific helper")
        elif action == "split_sequences":
            count, requested = values
            folder = self.plan.temp("-split")
            self.plan.add(f"mkdir -p \"{folder}\"")
            self.plan.add(f"seqkit split2 -s {int(count)} -O \"{folder}\" \"$CURRENT\"")
            self.plan.warn(sentence, f"SeqKit controls split filenames inside {folder}; rename them to match {requested} if needed")
            self.plan.require("seqkit")
        elif action == "remove_adapters":
            self._fastp_transform("--detect_adapter_for_pe" if self.plan.forward else "")
        elif action in {"keep_min_quality", "remove_low_quality", "remove_low_quality_default"}:
            threshold = float(values[0]) if values else 20.0
            self._fastp_transform(f"--qualified_quality_phred {threshold:g}")
            self.plan.warn(sentence, "fastp uses base-quality settings rather than the native exact average-read rule")
        elif action in {"check_quality", "show_quality_report"}:
            self.plan.add("seqkit stats -T \"$CURRENT\"")
            self.plan.require("seqkit")
        elif action == "compare_sequences":
            self.plan.warn(sentence, "named sequence comparison needs a target-specific helper")
        elif action in {"save_result", "save_sequences"}:
            self._save(values[0])
        elif action == "save_pair":
            self._save_pair(values[0], values[1])
        else:
            self.plan.warn(sentence, "this command does not have a translator rule yet")

    def _input(self, name: str) -> None:
        if name not in self.plan.inputs:
            self.plan.inputs.append(name)

    def _open(self, name: str) -> None:
        self._input(name)
        self.plan.set_current(name, kind=_kind_for(name))
        self.plan.forward = None
        self.plan.reverse = None
        self.plan.add(f"CURRENT={_q(name)}")
        self.plan.add("test -f \"$CURRENT\"")

    def _merge(self, name: str, sentence: str, *, rows_only: bool = False) -> None:
        if not self.plan.need_current(sentence):
            return
        self._input(name)
        other_kind = _kind_for(name)
        if rows_only or self.plan.current_kind == "table":
            next_path = self.plan.temp(".csv")
            self.plan.add(f"csvstack \"$CURRENT\" {_q(name)} > \"{next_path}\"")
            self.plan.add(f"CURRENT=\"{next_path}\"")
            self.plan.current_kind = "table"
            self.plan.current_extension = ".csv"
            self.plan.require("csvstack")
            return
        if self.plan.current_kind in {"fasta", "fastq"} and other_kind in {"fasta", "fastq"}:
            if self.plan.current_kind != other_kind:
                self.plan.warn(sentence, "the sequence file types differ; convert them to one format first")
                return
            next_path = self.plan.temp(self.plan.current_extension)
            self.plan.add(f"cat \"$CURRENT\" {_q(name)} > \"{next_path}\"")
            self.plan.add(f"CURRENT=\"{next_path}\"")
            return
        self.plan.warn(sentence, "the files do not have a clearly compatible translated type")

    def _table_filter(self, value: str, column: str, *, remove: bool) -> None:
        next_path = self.plan.temp(".csv")
        invert = " -i" if remove else ""
        self.plan.add(f"csvgrep -c {_q(column)} -m {_q(value)}{invert} \"$CURRENT\" > \"{next_path}\"")
        self.plan.add(f"CURRENT=\"{next_path}\"")
        self.plan.require("csvgrep")

    def _pandas_transform(self, operation: str) -> None:
        next_path = self.plan.temp(".csv")
        code = (
            "import pandas as pd,sys; "
            "src,dst=sys.argv[1:3]; "
            "df=pd.read_csv(src,sep='\\t' if src.lower().endswith('.tsv') else ','); "
            f"{operation}; "
            "df.to_csv(dst,index=False)"
        )
        self.plan.add(f"python3 -c {_q(code)} \"$CURRENT\" \"{next_path}\"")
        self.plan.add(f"CURRENT=\"{next_path}\"")
        self.plan.require("python3", "pandas")

    def _pandas_join(self, other: str, column: str) -> None:
        next_path = self.plan.temp(".csv")
        code = (
            "import pandas as pd,sys; "
            "left,right,dst,key=sys.argv[1:5]; "
            "a=pd.read_csv(left,sep='\\t' if left.lower().endswith('.tsv') else ','); "
            "b=pd.read_csv(right,sep='\\t' if right.lower().endswith('.tsv') else ','); "
            "a.merge(b,on=key,how='left',suffixes=('','_incoming')).to_csv(dst,index=False)"
        )
        self.plan.add(f"python3 -c {_q(code)} \"$CURRENT\" {_q(other)} \"{next_path}\" {_q(column)}")
        self.plan.add(f"CURRENT=\"{next_path}\"")
        self._input(other)
        self.plan.require("python3", "pandas")

    def _seqkit_transform(self, arguments: str) -> None:
        next_path = self.plan.temp(self.plan.current_extension)
        self.plan.add(f"seqkit {arguments} \"$CURRENT\" -o \"{next_path}\"")
        self.plan.add(f"CURRENT=\"{next_path}\"")
        self.plan.require("seqkit")

    def _fastp_transform(self, arguments: str) -> None:
        if self.plan.forward and self.plan.reverse:
            next_forward = self.plan.temp(".fastq")
            next_reverse = self.plan.temp(".fastq")
            self.plan.add(f"fastp -i \"$FORWARD\" -I \"$REVERSE\" -o \"{next_forward}\" -O \"{next_reverse}\" {arguments}".rstrip())
            self.plan.add(f"FORWARD=\"{next_forward}\"")
            self.plan.add(f"REVERSE=\"{next_reverse}\"")
        else:
            next_path = self.plan.temp(".fastq")
            self.plan.add(f"fastp -i \"$CURRENT\" -o \"{next_path}\" {arguments}".rstrip())
            self.plan.add(f"CURRENT=\"{next_path}\"")
        self.plan.require("fastp")

    def _save(self, requested: str) -> None:
        if requested not in self.plan.outputs:
            self.plan.outputs.append(requested)
        self.plan.add(f"OUTPUT=$(flbio_numbered_output {_q(requested)})")
        self.plan.add("cp \"$CURRENT\" \"$OUTPUT\"")
        self.plan.add("printf 'Saved %s\\n' \"$OUTPUT\"")

    def _save_pair(self, forward: str, reverse: str) -> None:
        if not self.plan.forward or not self.plan.reverse:
            self.plan.warn(f"Save the pair as {forward} and {reverse}", "there is no translated paired result")
            return
        for name in (forward, reverse):
            if name not in self.plan.outputs:
                self.plan.outputs.append(name)
        self.plan.add(f"OUT_FORWARD=$(flbio_numbered_output {_q(forward)})")
        self.plan.add(f"OUT_REVERSE=$(flbio_numbered_output {_q(reverse)})")
        self.plan.add("cp \"$FORWARD\" \"$OUT_FORWARD\"")
        self.plan.add("cp \"$REVERSE\" \"$OUT_REVERSE\"")


def translate_source(source: str, target: str, *, program_name: str = "program.flbio") -> TranslationResult:
    normalized = target.strip().lower()
    if normalized not in TARGET_EXTENSIONS:
        supported = ", ".join(TARGET_LABELS[key] for key in TARGET_EXTENSIONS)
        raise ValueError(f"Unsupported translation target {target!r}. Choose {supported}.")
    plan = ShellCompiler(parse(source)).compile()
    shell = _render_shell(plan, program_name)
    if normalized == "bash":
        content = shell
    elif normalized == "python":
        content = _render_python(shell, program_name)
    elif normalized == "r":
        content = _render_r(shell, program_name)
    elif normalized == "snakemake":
        content = _render_snakemake(shell, plan, program_name)
    else:
        content = _render_nextflow(shell, plan, program_name)
    return TranslationResult(normalized, content, TARGET_EXTENSIONS[normalized], plan.warnings, sorted(plan.requirements))


def default_output_path(program: Path, target: str) -> Path:
    return program.with_suffix(TARGET_EXTENSIONS[target.lower()])


def _render_shell(plan: ShellPlan, program_name: str) -> str:
    requirements = ", ".join(sorted(plan.requirements))
    body = "\n".join(f"  {line}" for line in plan.lines) or "  :"
    warnings = "\n".join(f"# WARNING: {warning}" for warning in plan.warnings)
    if warnings:
        warnings += "\n"
    return f"""#!/usr/bin/env bash
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
"""


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


def _render_snakemake(shell: str, plan: ShellPlan, program_name: str) -> str:
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


def _render_nextflow(shell: str, plan: ShellPlan, program_name: str) -> str:
    placeholders: dict[str, str] = {}
    prepared = shell
    for index, name in enumerate(plan.inputs):
        token = f"@@FLBIO_INPUT_{index}@@"
        placeholders[token] = f'"${{launchDir}}/{name}"'
        prepared = prepared.replace(_q(name), token)
    prepared = prepared.replace("$", "\\$")
    for token, replacement in placeholders.items():
        prepared = prepared.replace(token, replacement)
    outputs = "\n".join(f"    path {value!r}, optional: true" for value in (plan.outputs or ["figureloom-bio.done"]))
    return f'''nextflow.enable.dsl=2

// Generated from {program_name} by FigureLoom Bio.
process FIGURELOOM_BIO {{
  output:
{outputs}

  script:
  """
{prepared}
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
    compressed = name.lower().endswith(".gz")
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
