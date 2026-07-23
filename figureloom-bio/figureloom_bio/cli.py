from __future__ import annotations

import argparse
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
import platform
import shutil
import sys

from .capabilities import expand_capabilities
from .control_flow import run_flow_program, uses_control_flow
from .errors import FigureLoomBioError
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


def show_sentences(theme_name: str | None = None) -> int:
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
                f"I could not find the {theme_name} theme.\n\nAvailable themes:\n{available}",
                file=sys.stderr,
            )
            return 1
        print(theme.title)
        print()
        for command in manifest.commands_for_theme(theme.id):
            print(command.example)
        return 0

    print("FigureLoom Bio built-in sentence themes\n")
    for theme in manifest.themes:
        count = len(manifest.commands_for_theme(theme.id))
        print(f"{theme.title} ({count})")
    print(f"\n{len(manifest.commands)} canonical built-in entries are listed in the shared language manifest.")
    print("Everything listed is part of one language. Nothing needs to be installed or enabled inside a program.")
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
    print(f"Language manifest: {manifest.version} ({len(manifest.commands)} entries)")
    print("Translation targets: " + ", ".join(TARGET_LABELS[key] for key in TARGET_LABELS))
    print("\nOptional installed tools:")
    for tool in OPTIONAL_TOOLS:
        location = shutil.which(tool)
        print(f"- {tool}: {location or 'not installed'}")
    print("\nMissing optional tools do not stop the built-in language. They are needed only for workflows that launch those tools.")
    return 0


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

    sentences = subcommands.add_parser(
        "sentences",
        help="List built-in sentence themes or print one theme.",
    )
    sentences.add_argument("theme", nargs="?", help="Theme name, such as Microbiology")

    subcommands.add_parser(
        "doctor",
        help="Verify the installation and show optional bioinformatics tools.",
    )

    # Older scripts may still call this name. It now shows the same built-in manifest.
    legacy = subcommands.add_parser("addons", help=argparse.SUPPRESS)
    legacy.add_argument("theme", nargs="?")
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.command == "run":
        raise SystemExit(run_program(arguments.program, allow_tools=arguments.allow_tools))
    if arguments.command == "translate":
        raise SystemExit(translate_program(arguments.program, arguments.to, arguments.output))
    if arguments.command in {"sentences", "addons"}:
        raise SystemExit(show_sentences(arguments.theme))
    if arguments.command == "doctor":
        raise SystemExit(doctor())
    parser.print_help()
    raise SystemExit(0)


if __name__ == "__main__":
    main()
