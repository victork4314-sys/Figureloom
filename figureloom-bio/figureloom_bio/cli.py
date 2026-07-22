from __future__ import annotations

import argparse
from pathlib import Path
import sys

from .errors import FigureLoomBioError
from .parser import parse
from .runtime import Runner
from .streaming_fasta import run_streaming_if_needed
from .translators import (
    TARGET_EXTENSIONS,
    TARGET_LABELS,
    default_output_path,
    translate_source,
)


def _read_program(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"I could not find {path}.", file=sys.stderr)
    except OSError as error:
        print(f"I could not open {path}.\n\n{error}", file=sys.stderr)
    return None


def run_program(path: Path, *, allow_tools: bool = False) -> int:
    source = _read_program(path)
    if source is None:
        return 1

    try:
        instructions = parse(source)
        has_tool_command = any(item.action == "run_tool" for item in instructions)
        output = None if has_tool_command else run_streaming_if_needed(path.resolve(), instructions)
        if output is None:
            runner = Runner(path.resolve())
            runner.allow_tools = allow_tools
            output = runner.run(instructions)
    except FigureLoomBioError as error:
        print(error.plain_message(), file=sys.stderr)
        return 1

    print(output.render(), end="")
    return 0


def translate_program(
    path: Path,
    target: str,
    *,
    output_path: Path | None = None,
) -> int:
    source = _read_program(path)
    if source is None:
        return 1

    try:
        translated = translate_source(source, target, program_name=path.name)
    except (FigureLoomBioError, ValueError) as error:
        if isinstance(error, FigureLoomBioError):
            print(error.plain_message(), file=sys.stderr)
        else:
            print(str(error), file=sys.stderr)
        return 1

    destination = output_path or default_output_path(path, target)
    try:
        destination.write_text(translated.content, encoding="utf-8")
    except OSError as error:
        print(f"I could not save {destination}.\n\n{error}", file=sys.stderr)
        return 1

    print(f"Saved {TARGET_LABELS[target]} translation as {destination}.")
    if translated.requirements:
        print("Required commands: " + ", ".join(translated.requirements))
    if translated.warnings:
        print("Review these translated steps:")
        for warning in translated.warnings:
            print(f"- {warning}")
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
        help="Allow reviewed 'Run the tool ...' instructions to launch installed programs.",
    )

    translate = subcommands.add_parser(
        "translate",
        help="Translate a .flbio program into a common workflow language.",
    )
    translate.add_argument("program", type=Path)
    translate.add_argument(
        "--to",
        required=True,
        choices=tuple(TARGET_EXTENSIONS),
        help="Translation target.",
    )
    translate.add_argument(
        "--output",
        type=Path,
        help="Optional output filename.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.command == "run":
        raise SystemExit(run_program(arguments.program, allow_tools=arguments.allow_tools))
    if arguments.command == "translate":
        raise SystemExit(
            translate_program(
                arguments.program,
                arguments.to,
                output_path=arguments.output,
            )
        )
    parser.print_help()
    raise SystemExit(0)


if __name__ == "__main__":
    main()
