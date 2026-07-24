from __future__ import annotations

import argparse
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
import platform
import shutil
import sys

from .capabilities import expand_capabilities
from .control_flow import run_flow_program, uses_control_flow
from .desktop_tools import create_test_files, run_quick_test
from .errors import FigureLoomBioError
from .language_compiler import VOCABULARY
from .language_manifest import language_manifest
from .parser import parse
from .runtime import Runner
from .streaming_fasta import run_streaming_if_needed
from .translators import TARGET_LABELS, default_output_path, translate_source
from .workflow_expansion import normalize_streaming_instructions


OPTIONAL_TOOLS = (
    "seqkit",
    "fastp",
    "spades.py",
    "quast.py",
    "prokka",
    "abricate",
    "kraken2",
    "mob_recon",
)

VOCABULARY_GROUPS = {
    "operations": ("verbs", "Operations"),
    "terms": ("terms", "Biology and data terms"),
    "roles": ("roles", "Role words"),
    "comparisons": ("comparators", "Comparisons"),
}


def run_program(path: Path, *, allow_tools: bool = False) -> int:
    try:
        source = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"I could not find {path}.", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"I could not open {path}.\n\n{error}", file=sys.stderr)
        return 1

    try:
        if uses_control_flow(source):
            output = run_flow_program(path, source, allow_tools=allow_tools)
        else:
            instructions = expand_capabilities(parse(source))
            streaming_instructions = normalize_streaming_instructions(instructions)
            output = run_streaming_if_needed(path.resolve(), streaming_instructions)
            if output is None:
                runner = Runner(path.resolve())
                runner.allow_external_tools = allow_tools
                output = runner.run(instructions)
    except FigureLoomBioError as error:
        print(error.plain_message(), file=sys.stderr)
        return 1

    print(output.render(), end="")
    return 0


def translate_program(path: Path, target: str, output: Path | None) -> int:
    try:
        source = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"I could not find {path}.", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"I could not open {path}.\n\n{error}", file=sys.stderr)
        return 1

    try:
        translated = translate_source(source, target, program_name=path.name)
    except (FigureLoomBioError, ValueError) as error:
        message = error.plain_message() if isinstance(error, FigureLoomBioError) else str(error)
        print(message, file=sys.stderr)
        return 1

    destination = (output or default_output_path(path, translated.target)).resolve()
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(translated.content, encoding="utf-8")
    except OSError as error:
        print(f"I could not save {destination}.\n\n{error}", file=sys.stderr)
        return 1

    print(f"Translated {path.name} to {TARGET_LABELS[translated.target]}.")
    print(f"Saved: {destination}")
    if translated.requirements:
        print("Required tools: " + ", ".join(translated.requirements))
    if translated.warnings:
        print("\nTranslation warnings:", file=sys.stderr)
        for warning in translated.warnings:
            print(f"- {warning}", file=sys.stderr)
    return 0


def _vocabulary_forms() -> set[str]:
    forms: set[str] = set()
    for key, _ in VOCABULARY_GROUPS.values():
        for values in VOCABULARY.get(key, {}).values():
            forms.update(str(value) for value in values)
    return forms


def show_words(group_name: str | None = None) -> int:
    if group_name:
        wanted = group_name.strip().casefold()
        selected = next(
            (
                value
                for key, value in VOCABULARY_GROUPS.items()
                if key.casefold() == wanted or value[1].casefold() == wanted
            ),
            None,
        )
        if selected is None:
            available = "\n".join(f"- {title}" for _, title in VOCABULARY_GROUPS.values())
            print(
                f"I could not find the {group_name} vocabulary group.\n\nAvailable groups:\n{available}",
                file=sys.stderr,
            )
            return 1
        key, title = selected
        print(title)
        print()
        for concept, forms in VOCABULARY.get(key, {}).items():
            print(f"{concept.replace('_', ' ')}: {', '.join(str(value) for value in forms)}")
        return 0

    print("FigureLoom Bio words and terms\n")
    for key, title in VOCABULARY_GROUPS.values():
        concepts = VOCABULARY.get(key, {})
        forms = {str(value) for values in concepts.values() for value in values}
        print(f"{title}: {len(concepts)} concepts, {len(forms)} forms")
    print(f"\n{len(_vocabulary_forms())} unique word and term forms are built into the compiler vocabulary.")
    print("They combine through the grammar. They are not a list of complete allowed sentences.")
    return 0


def show_examples(theme_name: str | None = None) -> int:
    manifest = language_manifest()
    if theme_name:
        wanted = theme_name.strip().casefold()
        theme = next(
            (
                item
                for item in manifest.themes
                if item.id.casefold() == wanted or item.title.casefold() == wanted
            ),
            None,
        )
        if theme is None:
            available = "\n".join(f"- {item.title}" for item in manifest.themes)
            print(
                f"I could not find the {theme_name} example theme.\n\nAvailable themes:\n{available}",
                file=sys.stderr,
            )
            return 1
        print(theme.title)
        print()
        for command in manifest.commands_for_theme(theme.id):
            print(command.example)
        return 0

    print("FigureLoom Bio example themes\n")
    for theme in manifest.themes:
        count = len(manifest.commands_for_theme(theme.id))
        print(f"{theme.title} ({count})")
    print(f"\n{len(manifest.commands)} examples are available for learning and the visual builder.")
    print("Examples are not a whitelist and do not define which programs are legal.")
    return 0


def doctor() -> int:
    try:
        installed_version = version("figureloom-bio")
    except PackageNotFoundError:
        installed_version = "source checkout"

    manifest = language_manifest()
    print("FigureLoom Bio is ready.")
    print(f"Version: {installed_version}")
    print(f"Python: {platform.python_version()}")
    print(f"Package: {Path(__file__).resolve().parent}")
    print(f"Compiler vocabulary: {VOCABULARY.get('version', 1)} ({len(_vocabulary_forms())} word and term forms)")
    print(f"Learning examples: {len(manifest.commands)}")
    print("Translation targets: " + ", ".join(TARGET_LABELS[key] for key in TARGET_LABELS))
    print("\nOptional installed tools:")
    for tool in OPTIONAL_TOOLS:
        location = shutil.which(tool)
        print(f"- {tool}: {location or 'not installed'}")
    print("\nMissing optional tools do not stop the built-in language. They are needed only for workflows that launch those tools.")
    return 0


def make_test_files(folder: Path | None) -> int:
    try:
        destination = create_test_files(folder)
    except OSError as error:
        print(f"I could not create the test files.\n\n{error}", file=sys.stderr)
        return 1
    print("FigureLoom Bio test files are ready.")
    print(f"Folder: {destination}")
    print("Open quick-test.flbio in FigureLoom Bio IDE, or run: flbio quick-test")
    return 0


def quick_test(folder: Path | None) -> int:
    success, report, _ = run_quick_test(folder)
    stream = sys.stdout if success else sys.stderr
    print(report, file=stream, end="")
    return 0 if success else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="flbio",
        description="Run, translate, inspect, or verify FigureLoom Bio.",
    )
    subcommands = parser.add_subparsers(dest="command")

    run = subcommands.add_parser("run", help="Run a .flbio file.")
    run.add_argument("program", type=Path)
    run.add_argument(
        "--allow-tools",
        action="store_true",
        help="Allow explicit workflow instructions to launch installed local tools.",
    )

    target_names = ", ".join(TARGET_LABELS[key] for key in TARGET_LABELS)
    translate = subcommands.add_parser(
        "translate",
        help=f"Translate a .flbio file to {target_names}.",
    )
    translate.add_argument("program", type=Path)
    translate.add_argument("--to", required=True, choices=tuple(TARGET_LABELS))
    translate.add_argument("--output", "-o", type=Path)

    words = subcommands.add_parser(
        "words",
        help="List compiler words and terms or print one vocabulary group.",
    )
    words.add_argument("group", nargs="?", help="Operations, terms, roles, or comparisons")

    examples = subcommands.add_parser(
        "examples",
        help="List example themes or print one theme.",
    )
    examples.add_argument("theme", nargs="?", help="Theme name, such as Microbiology")

    test_files = subcommands.add_parser(
        "test-files",
        help="Put ready-to-use FigureLoom Bio test files on the desktop.",
    )
    test_files.add_argument("folder", nargs="?", type=Path)

    quick = subcommands.add_parser(
        "quick-test",
        help="Run a real CSV, FASTA, FASTQ, figure, alignment, and tree test.",
    )
    quick.add_argument("folder", nargs="?", type=Path)

    subcommands.add_parser(
        "doctor",
        help="Verify the installation and show optional bioinformatics tools.",
    )

    legacy_sentences = subcommands.add_parser("sentences", help=argparse.SUPPRESS)
    legacy_sentences.add_argument("theme", nargs="?")
    legacy_addons = subcommands.add_parser("addons", help=argparse.SUPPRESS)
    legacy_addons.add_argument("theme", nargs="?")
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.command == "run":
        raise SystemExit(run_program(arguments.program, allow_tools=arguments.allow_tools))
    if arguments.command == "translate":
        raise SystemExit(translate_program(arguments.program, arguments.to, arguments.output))
    if arguments.command == "words":
        raise SystemExit(show_words(arguments.group))
    if arguments.command == "examples":
        raise SystemExit(show_examples(arguments.theme))
    if arguments.command in {"sentences", "addons"}:
        raise SystemExit(show_examples(arguments.theme))
    if arguments.command == "test-files":
        raise SystemExit(make_test_files(arguments.folder))
    if arguments.command == "quick-test":
        raise SystemExit(quick_test(arguments.folder))
    if arguments.command == "doctor":
        raise SystemExit(doctor())
    parser.print_help()
