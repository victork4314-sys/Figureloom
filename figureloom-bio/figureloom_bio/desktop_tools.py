from __future__ import annotations

from pathlib import Path
import os
import shutil

try:
    import pwd
except ImportError:  # Windows does not provide the Unix password database module.
    pwd = None  # type: ignore[assignment]

from .errors import FigureLoomBioError
from .parser import parse
from .runtime import Runner


QUICK_PROGRAM = """Say Starting the FigureLoom Bio quick test.

Open the file measurements.csv.
Calculate the average of score.
Calculate the median of score.
Normalize the counts under count.
Create a histogram of score.
Save the file as quick-histogram.svg.
Create a volcano plot using effect and p_value.
Save the file as quick-volcano.svg.

Open the file sequences.fasta.
Align the sequences.
Show the alignment.
Save the alignment as quick-alignment.fasta.
Create a phylogenetic tree.
Save the tree as quick-tree.nwk.

Open the file reads.fastq.
Calculate the average quality.
Calculate the median quality.
Calculate the standard deviation of quality.
Keep reads at least 100 bases.
Count the reads.

Say The FigureLoom Bio quick test is complete.
"""

MEASUREMENTS = """sample,group,score,count,effect,p_value
sample-a,treated,10,100,2.4,0.001
sample-b,treated,12,120,1.2,0.04
sample-c,control,4,40,-1.8,0.006
sample-d,control,6,60,-0.4,0.4
"""

SEQUENCES = """>sample-one
ATGGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCTAA
>sample-two
ATGGCCGCCGCCGCCGCCGCCGTCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCTAA
>sample-three
ATGGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTGCTTAA
"""

READS = """@read-one
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
+
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
@read-two
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
+
IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
"""

README = """FIGURELOOM BIO TEST FILES

Easy automatic check:

    flbio quick-test

Or double-click the desktop icon named:

    Test FigureLoom Bio

Manual IDE check:

1. Open FigureLoom Bio IDE from the desktop.
2. Press Open.
3. Select quick-test.flbio and the three data files in this folder.
4. Press Run.
5. The results should appear in separate readable sections.
6. The histogram and thresholded volcano plot should appear as visible figure previews.
7. The test should also create alignment and tree files.

You can recreate this entire folder at any time with:

    flbio test-files
"""

EXPECTED_OUTPUTS = (
    "quick-histogram.svg",
    "quick-volcano.svg",
    "quick-alignment.fasta",
    "quick-tree.nwk",
)


def user_home() -> Path:
    sudo_user = os.environ.get("SUDO_USER")
    if sudo_user and sudo_user != "root" and pwd is not None:
        try:
            return Path(pwd.getpwnam(sudo_user).pw_dir)
        except KeyError:
            pass
    return Path.home()


def default_test_folder() -> Path:
    return user_home() / "Desktop" / "FigureLoom Bio Test Files"


def create_test_files(destination: Path | None = None) -> Path:
    folder = (destination or default_test_folder()).expanduser().resolve()
    folder.mkdir(parents=True, exist_ok=True)
    files = {
        "quick-test.flbio": QUICK_PROGRAM,
        "measurements.csv": MEASUREMENTS,
        "sequences.fasta": SEQUENCES,
        "reads.fastq": READS,
        "README.txt": README,
    }
    for name, content in files.items():
        (folder / name).write_text(content, encoding="utf-8")
    return folder


def _check_output(path: Path) -> None:
    if not path.exists():
        raise FigureLoomBioError(f"The quick test did not create {path.name}.")
    if path.stat().st_size == 0:
        raise FigureLoomBioError(f"The quick test created an empty {path.name}.")
    text = path.read_text(encoding="utf-8", errors="replace")
    if "TODO" in text.upper():
        raise FigureLoomBioError(f"The quick test found placeholder text in {path.name}.")
    if path.suffix.casefold() == ".svg" and not text.lstrip().startswith("<svg"):
        raise FigureLoomBioError(f"The quick test did not create a real SVG in {path.name}.")
    if path.name == "quick-volcano.svg":
        required = ('data-significance="higher"', 'data-significance="lower"', "stroke-dasharray")
        missing = [value for value in required if value not in text]
        if missing:
            raise FigureLoomBioError(
                "The volcano plot is missing significance groups or threshold lines: " + ", ".join(missing)
            )
    if path.suffix.casefold() == ".nwk" and not text.strip().endswith(";"):
        raise FigureLoomBioError(f"The quick test did not create a valid-looking tree in {path.name}.")


def run_quick_test(destination: Path | None = None) -> tuple[bool, str, Path]:
    folder = create_test_files(destination)
    for name in EXPECTED_OUTPUTS:
        try:
            (folder / name).unlink()
        except FileNotFoundError:
            pass

    program = folder / "quick-test.flbio"
    try:
        source = program.read_text(encoding="utf-8")
        output = Runner(program).run(parse(source)).render()
        for name in EXPECTED_OUTPUTS:
            _check_output(folder / name)
        required_sections = (
            "Average of score",
            "Median of score",
            "Volcano plot",
            "Significantly higher",
            "Significantly lower",
            "Alignment",
            "Phylogenetic tree",
            "Average read quality",
            "Median read quality",
            "Standard deviation read quality",
        )
        missing = [section for section in required_sections if section not in output]
        if missing:
            raise FigureLoomBioError(
                "The quick test was missing these results: " + ", ".join(missing)
            )
    except (FigureLoomBioError, OSError, ValueError) as error:
        message = error.plain_message() if isinstance(error, FigureLoomBioError) else str(error)
        report = "FIGURELOOM BIO QUICK TEST FAILED\n\n" + message + "\n"
        (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
        return False, report, folder

    report = (
        "FIGURELOOM BIO QUICK TEST PASSED\n\n"
        "The language opened CSV, FASTA, and FASTQ data.\n"
        "It calculated statistics and read quality.\n"
        "It created a real thresholded volcano plot with higher and lower significance groups.\n"
        "It created a real histogram, alignment, and phylogenetic tree.\n"
        "No TODO or placeholder output was found.\n\n"
        f"Test folder: {folder}\n"
    )
    (folder / "TEST-RESULT.txt").write_text(report, encoding="utf-8")
    return True, report, folder


def copy_test_files(source: Path, destination: Path) -> Path:
    destination = destination.expanduser().resolve()
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)
    return destination
