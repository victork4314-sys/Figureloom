from __future__ import annotations

import argparse
from pathlib import Path
import sys

from .errors import FigureLoomBioError
from .parser import parse
from .runtime import Runner
from .streaming_fasta import run_streaming_if_needed


def run_program(path: Path) -> int:
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
        output = run_streaming_if_needed(path.resolve(), instructions)
        if output is None:
            output = Runner(path.resolve()).run(instructions)
    except FigureLoomBioError as error:
        print(error.plain_message(), file=sys.stderr)
        return 1

    print(output.render(), end="")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="flbio",
        description="Run a FigureLoom Bio program written as plain instructions.",
    )
    subcommands = parser.add_subparsers(dest="command")
    run = subcommands.add_parser("run", help="Run a .flbio file.")
    run.add_argument("program", type=Path)
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.command != "run":
        parser.print_help()
        raise SystemExit(0)
    raise SystemExit(run_program(arguments.program))


if __name__ == "__main__":
    main()
