from __future__ import annotations

from itertools import product
import random
import unittest

from tests import test_every_language_sentence_executes as sentence_audit


TABLE_TRANSFORMS = (
    "Put the rows in order by sample.",
    "Put the largest score first.",
    "Put the smallest score first.",
    "Remove duplicate rows using sample.",
    "Replace empty values under status with unknown.",
    "Change untreated to control under condition.",
)

TABLE_ANALYSES = (
    "Count the rows.",
    "Calculate the average under score.",
    "Calculate the median under score.",
    "Calculate the standard deviation under score.",
    "Calculate the minimum under score.",
    "Calculate the maximum under score.",
    "Normalize the counts under count.",
    "Normalize the counts in expression.",
    "Compare treated and control under group.",
    "Calculate the confidence interval of score.",
    "Calculate the p value for score between treated and control under group.",
    "Create a histogram from score.",
    "Create a bar chart from sample and score.",
    "Create a scatter plot from x and y.",
    "Create a box plot from score.",
    "Create a heat map.",
    "Create a PCA plot.",
    "Create a volcano plot using effect and p_value.",
)

SEQUENCE_TRANSFORMS = (
    "Remove gaps from the sequences.",
    "Make duplicate sequence names unique.",
    "Add sample- to the start of every sequence name.",
    "Add -clean to the end of every sequence name.",
    "Remove duplicate sequences.",
    "Put the shortest sequences first.",
    "Put the longest sequences first.",
    "Remove sequences containing ambiguous bases.",
    "Keep sequences with at most 2 ambiguous bases.",
    "Remove sequences with names containing failed.",
    "Keep sequences with names containing sample.",
)

SEQUENCE_INSPECTORS = (
    "Count the sequences.",
    "Count the bases.",
    "Show the sequence names.",
    "Show the sequence lengths.",
    "Find the shortest sequence.",
    "Find the longest sequence.",
    "Calculate the GC content.",
    "Calculate sequence statistics.",
    "Validate the sequences.",
)

FASTQ_TRANSFORMS = (
    "Keep reads with average quality at least 20.",
    "Remove reads with average quality below 20.",
    "Remove reads with low quality.",
    "Remove adapter sequences.",
    "Cut 5 bases from the beginning of each read.",
    "Cut 5 bases from the end of each read.",
    "Trim 5 bases from the start.",
    "Trim 5 bases from the end.",
)

FASTQ_INSPECTORS = (
    "Count the reads.",
    "Count the bases.",
    "Check the quality.",
    "Show the quality report.",
)

STATEFUL_WORKFLOWS = (
    """Open the file sequences.fasta.
Call the result original sequences.
Remove sequences containing ambiguous bases.
Use the result original sequences.
Count the sequences.
""",
    """Open the file samples.csv.
Call the result original table.
Remove rows marked failed under status.
Use the result original table.
Count the rows.
""",
    """Open the files forward.fastq and reverse.fastq as a pair.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
""",
    """Open the files first.fasta and second.fasta together.
Merge the result with more-sequences.fasta.
Save the sequences as combined.fasta.
""",
    """Open the file sequences.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as aligned.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
""",
    """Open the file sequences.fasta.
Find genes.
Count the genes.
Show the genes.
Save the genes as genes.csv.
Find PCR primers.
Check the primers.
Show the primers.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
""",
    """Assemble the bacterial genome from forward.fastq and reverse.fastq into assembly-new.
Check the assembly assembly-new/contigs.fasta into assembly-quality-new.
Annotate the bacterial genome assembly-new/contigs.fasta into annotation-new.
Find resistance genes in assembly-new/contigs.fasta using card.
Find virulence genes in assembly-new/contigs.fasta.
Find plasmids in assembly-new/contigs.fasta into plasmids-new.
""",
)

CONTROL_FLOW_WORKFLOWS = (
    """Make a recipe called Prepare one sample:
    Remove reads with low quality.
    Count the reads.

Open all FASTQ files as samples.
For every sample in samples:
    Open the sample.
    If the result is not empty:
        Use the recipe Prepare one sample.
        Save the reads using the sample name.
    Otherwise:
        Skip this sample.
""",
    """Open the file reads.fastq.
Call the result original reads.
If fewer than 5 reads remain and not the result is empty:
    Remove reads with low quality.
    If the result is not empty:
        Count the reads.
    Otherwise:
        Show a warning saying No reads remain.
Otherwise if the result is empty:
    Stop the program.
Otherwise:
    Use the result original reads.
""",
    """Make a recipe called Inspect sequences:
    If the result is not empty:
        Calculate the GC content.
        Count the sequences.
    Otherwise:
        Show a warning saying No sequences were found.

Open the file sequences.fasta.
Use the recipe Inspect sequences.
""",
    """Open the file reads.fastq.
If the result is not empty:
    Open all FASTQ files as samples.
    For every sample in samples:
        Open the sample.
        Count the reads.
""",
)


class LanguageProgramCombinationTests(unittest.TestCase):
    """Exercise composition, not only one public sentence at a time."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.audit = sentence_audit.EveryLanguageSentenceExecutesTests(methodName="runTest")

    def assert_program_runs(self, source: str, label: str) -> None:
        error = self.audit._try_source(source)
        self.assertFalse(error, f"{label}\n\n{source}\n\n{error}")

    def test_every_ordered_pair_of_table_transforms(self) -> None:
        for first, second in product(TABLE_TRANSFORMS, repeat=2):
            with self.subTest(first=first, second=second):
                self.assert_program_runs(
                    f"Open the file samples.csv.\n{first}\n{second}\nCount the rows.\n",
                    "Table transform pair failed.",
                )

    def test_every_table_transform_before_every_table_analysis(self) -> None:
        for transform, analysis in product(TABLE_TRANSFORMS, TABLE_ANALYSES):
            with self.subTest(transform=transform, analysis=analysis):
                self.assert_program_runs(
                    f"Open the file samples.csv.\n{transform}\n{analysis}\n",
                    "Table transform and analysis combination failed.",
                )

    def test_every_ordered_pair_of_sequence_transforms(self) -> None:
        for first, second in product(SEQUENCE_TRANSFORMS, repeat=2):
            with self.subTest(first=first, second=second):
                self.assert_program_runs(
                    f"Open the file sequences.fasta.\n{first}\n{second}\nCount the sequences.\n",
                    "Sequence transform pair failed.",
                )

    def test_every_sequence_transform_before_every_inspector(self) -> None:
        for transform, inspector in product(SEQUENCE_TRANSFORMS, SEQUENCE_INSPECTORS):
            with self.subTest(transform=transform, inspector=inspector):
                self.assert_program_runs(
                    f"Open the file sequences.fasta.\n{transform}\n{inspector}\n",
                    "Sequence transform and inspector combination failed.",
                )

    def test_every_ordered_pair_of_fastq_transforms(self) -> None:
        for first, second in product(FASTQ_TRANSFORMS, repeat=2):
            with self.subTest(first=first, second=second):
                self.assert_program_runs(
                    f"Open the file reads.fastq.\n{first}\n{second}\nCount the reads.\n",
                    "FASTQ transform pair failed.",
                )

    def test_every_fastq_transform_before_every_inspector(self) -> None:
        for transform, inspector in product(FASTQ_TRANSFORMS, FASTQ_INSPECTORS):
            with self.subTest(transform=transform, inspector=inspector):
                self.assert_program_runs(
                    f"Open the file reads.fastq.\n{transform}\n{inspector}\n",
                    "FASTQ transform and inspector combination failed.",
                )

    def test_named_results_derived_results_and_tool_pipelines(self) -> None:
        for index, source in enumerate(STATEFUL_WORKFLOWS, start=1):
            with self.subTest(workflow=index):
                self.assert_program_runs(source, f"Stateful workflow {index} failed.")

    def test_nested_control_flow_combinations(self) -> None:
        for index, source in enumerate(CONTROL_FLOW_WORKFLOWS, start=1):
            with self.subTest(workflow=index):
                self.assert_program_runs(source, f"Control-flow workflow {index} failed.")

    def test_long_seeded_programs_remain_reproducibly_composable(self) -> None:
        randomizer = random.Random(20260723)
        families = (
            ("Open the file samples.csv.", TABLE_TRANSFORMS, "Count the rows."),
            ("Open the file sequences.fasta.", SEQUENCE_TRANSFORMS, "Count the sequences."),
            ("Open the file reads.fastq.", FASTQ_TRANSFORMS, "Count the reads."),
        )
        for family_index, (opener, steps, closer) in enumerate(families, start=1):
            for program_index in range(40):
                chosen = [randomizer.choice(steps) for _ in range(randomizer.randint(3, 12))]
                source = "\n".join((opener, *chosen, closer)) + "\n"
                with self.subTest(family=family_index, program=program_index, steps=chosen):
                    self.assert_program_runs(source, "Seeded long program failed.")

    def test_comments_blank_lines_and_crlf_do_not_break_composition(self) -> None:
        source = (
            "# A complete ordinary workflow\r\n"
            "\r\n"
            "Open the file samples.csv.\r\n"
            "# Clean and inspect the table\r\n"
            "Replace empty values under status with unknown.\r\n"
            "Put the largest score first.\r\n"
            "\r\n"
            "Calculate the average under score.\r\n"
            "Create a histogram from score.\r\n"
        )
        self.assert_program_runs(source, "Comments, blank lines, or CRLF broke a valid program.")

    def test_declared_matrix_size_cannot_shrink_silently(self) -> None:
        ordered_pairs = (
            len(TABLE_TRANSFORMS) ** 2
            + len(SEQUENCE_TRANSFORMS) ** 2
            + len(FASTQ_TRANSFORMS) ** 2
        )
        transition_checks = (
            len(TABLE_TRANSFORMS) * len(TABLE_ANALYSES)
            + len(SEQUENCE_TRANSFORMS) * len(SEQUENCE_INSPECTORS)
            + len(FASTQ_TRANSFORMS) * len(FASTQ_INSPECTORS)
        )
        long_programs = 3 * 40
        explicit_workflows = len(STATEFUL_WORKFLOWS) + len(CONTROL_FLOW_WORKFLOWS) + 1
        total = ordered_pairs + transition_checks + long_programs + explicit_workflows
        self.assertGreaterEqual(total, 600)
        print(f"FigureLoom Bio composition audit executed {total} declared program combinations.")


if __name__ == "__main__":
    unittest.main()
