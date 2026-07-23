from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import tempfile
from typing import Iterable

from . import Runner
from .capabilities import expand_capabilities
from .control_flow import run_flow_program, uses_control_flow
from .errors import FigureLoomBioError
from .language_aliases import RULES, normalize_source
from .language_manifest import LanguageCommand, LanguageManifest, language_manifest
from .output import PlainOutput, Section
from .parser import parse
from .streaming_fasta import run_streaming_if_needed
from .translators import TARGET_EXTENSIONS, TARGET_LABELS, TranslationResult, translate_source
from .workflow_expansion import normalize_streaming_instructions


PROGRAM_SUFFIXES = (".flbio", ".flbio.txt")
TEXT_SUFFIXES = {
    ".flbio", ".txt", ".csv", ".tsv", ".fa", ".fasta", ".fna", ".ffn",
    ".faa", ".frn", ".fq", ".fastq", ".svg", ".nwk", ".newick", ".vcf",
    ".gff", ".gff3", ".bed", ".json", ".yaml", ".yml", ".md", ".log",
}

EXAMPLE_PROGRAM = """Say Starting the example.
Open the file example-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the file.
Save the file as example-result.csv.
Say The example is finished.
"""

EXAMPLE_TABLE = """sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
sample-05,control,failed
"""

EXAMPLE_FASTQ_PROGRAM = """Say Cleaning the reads.
Open the file example-reads.fastq.
Keep reads with average quality at least 20.
Remove reads shorter than 8 bases.
Trim 2 bases from the start.
Count the reads.
Calculate the GC content.
Save the reads as cleaned-reads.fastq.
Say The reads are ready.
"""

EXAMPLE_FASTQ = """@read-01
ACGTACGTACGT
+
IIIIIIIIIIII
@read-02
ACGTNN
+
!!!!!!
@read-03
TTGCAACGTTAA
+
HHHHHHHHHHHH
"""

EXAMPLE_FASTA_PROGRAM = """Say Preparing the sequences.
Open the file example-sequences.fasta.
Remove sequences containing N.
Keep sequences at least 8 bases long.
Calculate the GC content.
Show the file.
Save the sequences as prepared-sequences.fasta.
"""

EXAMPLE_FASTA = """>sample-01
ATGCGTACGTAA
>sample-02
ATGCNNNN
>sample-03
TTGCAACGTTAA
"""

DEFAULT_FILES = {
    "example.flbio": EXAMPLE_PROGRAM,
    "example-samples.csv": EXAMPLE_TABLE,
    "fastq-example.flbio": EXAMPLE_FASTQ_PROGRAM,
    "example-reads.fastq": EXAMPLE_FASTQ,
}

EXAMPLE_SETS = {
    "Table cleaning": {
        "table-cleaning.flbio": EXAMPLE_PROGRAM,
        "example-samples.csv": EXAMPLE_TABLE,
    },
    "FASTQ quality cleaning": {
        "fastq-cleaning.flbio": EXAMPLE_FASTQ_PROGRAM,
        "example-reads.fastq": EXAMPLE_FASTQ,
    },
    "FASTA preparation": {
        "fasta-preparation.flbio": EXAMPLE_FASTA_PROGRAM,
        "example-sequences.fasta": EXAMPLE_FASTA,
    },
}

THEME_BY_ACTION = {
    "say": "program", "show_warning": "program",
    "open_file": "files", "show_file": "files", "show_result": "files",
    "save_file": "files", "check_file": "files", "count_file": "files",
    "copy_file": "files", "rename_file": "files",
    "keep_rows": "tables", "remove_rows": "tables", "keep_columns": "tables",
    "order_rows": "tables", "largest_first": "tables", "smallest_first": "tables",
    "remove_duplicates": "tables", "replace_empty": "tables",
    "keep_min_length": "sequences", "remove_shorter": "sequences",
    "keep_strict_length": "sequences", "find_open_reading_frames": "sequences",
    "find_palindromes": "sequences", "find_repeated_sequences": "sequences",
    "join_sequences": "sequences", "compare_current_sequences": "alignment",
    "show_alignment": "alignment", "read_statistic": "fastq",
    "check_quality": "fastq", "show_quality_report": "fastq",
    "remove_low_quality_default": "fastq", "trim_start": "fastq", "trim_end": "fastq",
    "builtin_microbiology_prepare_reads": "microbiology",
    "assemble_current_bacterial_genome": "microbiology",
    "annotate_current_file": "microbiology", "find_resistance_current_file": "microbiology",
    "find_virulence_current_file": "microbiology", "identify_current_file": "microbiology",
    "find_plasmids_current_file": "microbiology", "find_variants": "variants",
    "show_variants": "variants", "find_genes": "genes", "show_genes": "genes",
    "find_signal_peptides": "proteins", "find_transmembrane_regions": "proteins",
    "find_pcr_primers": "pcr", "check_primers": "pcr", "show_primers": "pcr",
    "build_phylogenetic_tree": "phylogenetics", "show_tree": "phylogenetics",
    "summary_statistic": "statistics", "calculate_minimum": "statistics",
    "calculate_maximum": "statistics", "normalize_counts": "statistics",
    "compare_groups": "statistics", "permutation_p_value": "statistics",
    "histogram": "figures", "create_histogram": "figures", "bar_chart": "figures",
    "create_bar_chart": "figures", "scatter_plot": "figures",
    "create_scatter_plot": "figures", "grouped_box_plot": "figures",
    "box_plot": "figures", "heat_map_columns": "figures", "heat_map": "figures",
    "pca_plot": "figures", "volcano_plot": "figures",
}


@dataclass(frozen=True)
class VocabularyEntry:
    id: str
    theme: str
    theme_title: str
    example: str
    accepted_wording: bool = False


@dataclass
class NativeRunResult:
    sections: list[Section]
    generated_files: dict[str, str]
    folder: Path


@dataclass
class LocalProject:
    id: str
    title: str
    updated_at: str
    files: dict[str, str]
    active_file: str


def application_data_folder() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        folder = base / "FigureLoom Bio"
    elif sys_platform() == "darwin":
        folder = Path.home() / "Library" / "Application Support" / "FigureLoom Bio"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
        folder = base / "figureloom-bio"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def sys_platform() -> str:
    import sys
    return sys.platform


def workspace_path() -> Path:
    override = os.environ.get("FIGURELOOM_NATIVE_WORKSPACE")
    return Path(override) if override else application_data_folder() / "workspace.json"


def gallery_path() -> Path:
    override = os.environ.get("FIGURELOOM_NATIVE_GALLERY")
    return Path(override) if override else application_data_folder() / "projects.json"


def looks_like_program(name: str) -> bool:
    return name.casefold().endswith(PROGRAM_SUFFIXES)


def normalize_program_name(name: str) -> str:
    value = (name or "new-program").strip()
    if value.casefold().endswith(".flbio.txt"):
        return value[:-4]
    if value.casefold().endswith(".flbio"):
        return value
    if "." in Path(value).name:
        value = str(Path(value).with_suffix(""))
    return f"{value or 'new-program'}.flbio"


def file_kind(name: str) -> str:
    lower = name.casefold()
    if looks_like_program(name):
        return "Program"
    if lower.endswith(".csv"):
        return "CSV file"
    if lower.endswith(".tsv"):
        return "TSV file"
    if lower.endswith((".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn")):
        return "FASTA file"
    if lower.endswith((".fq", ".fastq")):
        return "FASTQ file"
    if lower.endswith(".svg"):
        return "SVG figure"
    if lower.endswith((".nwk", ".newick")):
        return "Phylogenetic tree"
    return "Text file"


class NativeWorkspace:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or workspace_path()
        self.files: dict[str, str] = {}
        self.active_file = ""
        self.load()

    def load(self) -> None:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            files = payload.get("files")
            self.files = {str(name): str(content) for name, content in files.items()} if isinstance(files, dict) else {}
            self.active_file = str(payload.get("active_file") or "")
        except (OSError, ValueError, TypeError, AttributeError):
            self.files = {}
            self.active_file = ""
        if not self.files:
            self.files = dict(DEFAULT_FILES)
        if self.active_file not in self.files:
            self.active_file = self.first_file()
        self.save()

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"version": 1, "files": self.files, "active_file": self.active_file}
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(self.path)

    def first_file(self) -> str:
        names = sorted(self.files, key=lambda name: (not looks_like_program(name), name.casefold()))
        return names[0] if names else self.new_program(activate=False)

    def unique_name(self, requested: str) -> str:
        existing = {name.casefold() for name in self.files}
        if requested.casefold() not in existing:
            return requested
        path = Path(requested)
        stem = path.stem
        suffix = path.suffix
        number = 2
        while True:
            candidate = f"{stem}-{number}{suffix}"
            if candidate.casefold() not in existing:
                return candidate
            number += 1

    def new_program(self, activate: bool = True) -> str:
        name = self.unique_name("new-program.flbio")
        self.files[name] = "Say Starting the analysis.\n"
        if activate:
            self.active_file = name
        self.save()
        return name

    def set_content(self, name: str, content: str) -> None:
        self.files[name] = content
        self.save()

    def activate(self, name: str) -> None:
        if name not in self.files:
            raise KeyError(name)
        self.active_file = name
        self.save()

    def rename(self, old_name: str, requested: str) -> str:
        if old_name not in self.files:
            raise KeyError(old_name)
        name = normalize_program_name(requested) if looks_like_program(old_name) else requested.strip()
        if not name:
            raise ValueError("Enter a filename.")
        collision = next((item for item in self.files if item.casefold() == name.casefold() and item != old_name), None)
        if collision:
            raise ValueError("This filename is already being used.")
        content = self.files.pop(old_name)
        self.files[name] = content
        if self.active_file == old_name:
            self.active_file = name
        self.save()
        return name

    def delete(self, name: str) -> None:
        if name in self.files:
            del self.files[name]
        if not self.files:
            self.new_program(activate=False)
        if self.active_file not in self.files:
            self.active_file = self.first_file()
        self.save()

    def import_paths(self, paths: Iterable[Path]) -> list[str]:
        imported: list[str] = []
        for path in paths:
            source = path.read_text(encoding="utf-8", errors="replace")
            requested = path.name
            if requested.casefold().endswith(".flbio.txt"):
                requested = requested[:-4]
            name = self.unique_name(requested)
            self.files[name] = source
            imported.append(name)
        if imported:
            programs = [name for name in imported if looks_like_program(name)]
            self.active_file = programs[0] if programs else imported[0]
            self.save()
        return imported

    def add_example_set(self, title: str) -> list[str]:
        example = EXAMPLE_SETS[title]
        names: list[str] = []
        for requested, content in example.items():
            name = self.unique_name(requested)
            self.files[name] = content
            names.append(name)
        program = next((name for name in names if looks_like_program(name)), names[0])
        self.active_file = program
        self.save()
        return names

    def export_file(self, name: str, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(self.files[name], encoding="utf-8")
        return destination


def vocabulary_entries() -> tuple[VocabularyEntry, ...]:
    manifest = language_manifest()
    themes = {theme.id: theme.title for theme in manifest.themes}
    canonical_examples = {command.example.casefold() for command in manifest.commands}
    entries = [
        VocabularyEntry(command.id, command.theme, themes.get(command.theme, command.theme), command.example)
        for command in manifest.commands
    ]
    for rule in RULES:
        theme = THEME_BY_ACTION.get(str(rule.get("action", "")), "program")
        for index, raw in enumerate(rule.get("examples", ())):
            example = str(raw)
            if example.casefold() in canonical_examples:
                continue
            entries.append(
                VocabularyEntry(
                    f"wording-{rule.get('id', 'alias')}-{index + 1}",
                    theme,
                    themes.get(theme, theme.title()),
                    example,
                    accepted_wording=True,
                )
            )
    return tuple(entries)


def tidy_source(source: str) -> str:
    lines: list[str] = []
    for raw in source.splitlines():
        stripped = raw.strip()
        indent = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if not stripped or stripped.startswith("#"):
            lines.append(raw.rstrip())
            continue
        if stripped.endswith(('.', ':')):
            lines.append(indent + stripped)
        elif stripped.casefold().startswith(("if ", "otherwise", "for every ", "make a recipe called ")):
            lines.append(indent + stripped + ":")
        else:
            lines.append(indent + stripped + ".")
    return normalize_source("\n".join(lines)).rstrip() + "\n"


def run_workspace(files: dict[str, str], active_file: str, *, allow_tools: bool = False) -> NativeRunResult:
    if active_file not in files:
        raise FigureLoomBioError("Choose a FigureLoom Bio program before running.")
    if not looks_like_program(active_file):
        raise FigureLoomBioError("Open a .flbio program before pressing Run.")

    runtime_root = application_data_folder() / "runs"
    runtime_root.mkdir(parents=True, exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix="run-", dir=runtime_root))
    initial_names = set(files)
    for name, content in files.items():
        target = folder / Path(name).name
        target.write_text(content, encoding="utf-8")

    program = folder / Path(active_file).name
    source = program.read_text(encoding="utf-8")
    try:
        if uses_control_flow(source):
            output = run_flow_program(program, source, allow_tools=allow_tools)
        else:
            instructions = expand_capabilities(parse(source))
            streaming = normalize_streaming_instructions(instructions)
            output = run_streaming_if_needed(program.resolve(), streaming)
            if output is None:
                runner = Runner(program.resolve())
                runner.allow_external_tools = allow_tools
                output = runner.run(instructions)
    except FigureLoomBioError:
        raise
    except Exception as error:
        raise FigureLoomBioError(str(error)) from error

    generated: dict[str, str] = {}
    for path in sorted(folder.iterdir()):
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="strict")
        except (OSError, UnicodeError):
            continue
        original = files.get(path.name)
        if path.name not in initial_names or original != content:
            generated[path.name] = content
    return NativeRunResult(list(output.sections), generated, folder)


def translate_text(source: str, target: str, program_name: str) -> TranslationResult:
    return translate_source(source, target, program_name=program_name)


def target_options() -> tuple[tuple[str, str, str], ...]:
    return tuple((key, TARGET_LABELS[key], TARGET_EXTENSIONS[key]) for key in TARGET_LABELS)


def load_local_projects() -> list[LocalProject]:
    try:
        payload = json.loads(gallery_path().read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return []
    output: list[LocalProject] = []
    for item in payload if isinstance(payload, list) else []:
        try:
            output.append(LocalProject(
                id=str(item["id"]),
                title=str(item["title"]),
                updated_at=str(item["updated_at"]),
                files={str(name): str(content) for name, content in dict(item["files"]).items()},
                active_file=str(item["active_file"]),
            ))
        except (KeyError, TypeError, ValueError):
            continue
    return output


def save_local_projects(projects: Iterable[LocalProject]) -> None:
    payload = [project.__dict__ for project in projects]
    path = gallery_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload[:100], ensure_ascii=False, indent=2), encoding="utf-8")


def save_workspace_to_gallery(workspace: NativeWorkspace, title: str) -> LocalProject:
    projects = load_local_projects()
    project = LocalProject(
        id=os.urandom(16).hex(),
        title=title.strip() or workspace.active_file or "Untitled Bio program",
        updated_at=datetime.now(timezone.utc).isoformat(),
        files=dict(workspace.files),
        active_file=workspace.active_file,
    )
    projects.insert(0, project)
    save_local_projects(projects)
    return project


def delete_local_project(project_id: str) -> None:
    save_local_projects(project for project in load_local_projects() if project.id != project_id)


def restore_local_project(workspace: NativeWorkspace, project: LocalProject) -> None:
    workspace.files = dict(project.files)
    workspace.active_file = project.active_file if project.active_file in workspace.files else workspace.first_file()
    workspace.save()


def manifest_summary() -> tuple[LanguageManifest, int]:
    manifest = language_manifest()
    return manifest, len(vocabulary_entries())
