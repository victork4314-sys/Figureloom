from __future__ import annotations

import argparse
from pathlib import Path
import sys

from .errors import FigureLoomBioError
from .parser import parse
from .runtime import Runner
from .streaming_fasta import run_streaming_if_needed
from .translators import TARGET_LABELS, default_output_path, translate_source
from .workflow_expansion import normalize_streaming_instructions


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
        instructions = parse(source)
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="flbio",
        description="Run or translate a FigureLoom Bio program written as plain instructions.",
    )
    subcommands = parser.add_subparsers(dest="command")

    run = subcommands.add_parser("run", help="Run a .flbio file.")
    run.add_argument("program", type=Path)
    run.add_argument(
        "--allow-tools",
        action="store_true",
        help="Allow explicit 'Run the tool ...' instructions to launch installed local tools.",
    )

    translate = subcommands.add_parser(
        "translate",
        help="Translate a .flbio file to Python, R, Bash, Snakemake, or Nextflow.",
    )
    translate.add_argument("program", type=Path)
    translate.add_argument("--to", required=True, choices=tuple(TARGET_LABELS))
    translate.add_argument("--output", "-o", type=Path)
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.command == "run":
        raise SystemExit(run_program(arguments.program, allow_tools=arguments.allow_tools))
    if arguments.command == "translate":
        raise SystemExit(translate_program(arguments.program, arguments.to, arguments.output))
    parser.print_help()
    raise SystemExit(0)


if __name__ == "__main__":
    main()
