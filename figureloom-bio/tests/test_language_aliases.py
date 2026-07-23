from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio import Runner
from figureloom_bio.language_aliases import RULES, normalize_source
from figureloom_bio.parser import parse
from figureloom_bio.translators import TARGET_LABELS, translate_source


class ExhaustiveLanguageAliasTests(unittest.TestCase):
    def test_every_concrete_wording_parses(self) -> None:
        seen: set[str] = set()
        for rule in RULES:
            self.assertTrue(rule.get("examples"), rule["id"])
            for example in rule["examples"]:
                with self.subTest(rule=rule["id"], example=example):
                    self.assertNotIn(example.casefold(), seen)
                    seen.add(example.casefold())
                    instructions = parse(example)
                    self.assertEqual(len(instructions), 1)
                    self.assertNotIn("TODO", instructions[0].action.upper())

    def test_every_wording_translates_to_every_target(self) -> None:
        for rule in RULES:
            for example in rule["examples"]:
                for target in TARGET_LABELS:
                    with self.subTest(rule=rule["id"], example=example, target=target):
                        translated = translate_source(example + "\n", target, program_name="vocabulary.flbio")
                        self.assertNotIn("TODO", translated.content.upper())
                        self.assertNotIn(":.", translated.content)
                        self.assertTrue(translated.content.strip())

    def test_screenshot_fastq_words_execute(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            self._write_fastq(root / "forward.fastq", [("r1", "A" * 120, "I" * 120), ("r2", "C" * 80, "I" * 80)])
            self._write_fastq(root / "reverse.fastq", [("r1", "T" * 120, "I" * 120), ("r2", "G" * 80, "I" * 80)])
            source = """Open the files forward.fastq and reverse.fastq as a pair.
Calculate the average quality.
Calculate the median quality.
Calculate the standard deviation of quality.
Keep reads at least 100 bases.
Count the reads.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            self.assertIn("Average read quality", output)
            self.assertIn("Median read quality", output)
            self.assertIn("Standard deviation read quality", output)
            self.assertIn("Read pairs", output)

    def test_alignment_and_tree_wording_execute(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">alpha\nATGAAATAG\n>beta\nATGAAAATG\n>gamma\nATGACAATG\n",
                encoding="utf-8",
            )
            source = """Open the file sequences.fasta.
Align the sequences.
Show the alignment.
Create a phylogenetic tree.
Display the tree.
Save the tree as result.nwk.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            self.assertIn("Alignment", output)
            self.assertIn("Phylogenetic tree", output)
            self.assertTrue((root / "result.nwk").read_text(encoding="utf-8").strip().endswith(";"))

    def test_statistics_figures_and_generated_current_file_execute(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "expression.csv").write_text(
                "sample,group,expression,fold_change,p_value,gene_a,gene_b\n"
                "a,treated,10,2.0,0.01,4,8\n"
                "b,treated,12,1.5,0.03,5,9\n"
                "c,control,4,-1.0,0.20,2,3\n"
                "d,control,5,-1.4,0.40,3,2\n",
                encoding="utf-8",
            )
            source = """Open the file expression.csv.
Find the mean of expression.
Calculate the median under expression.
Show the confidence interval for expression.
Normalize expression.
Calculate the p-value for expression between treated and control using group.
Create a box plot of expression under group.
Save the file as grouped.svg.
Check the file.
Count the file.
Show the file.
Copy the current file as grouped-copy.svg.
Rename the current file to grouped-final.svg.
Open the file expression.csv.
Create a heat map using expression and fold_change.
Save the current file as selected-heat-map.svg.
Open the file expression.csv.
Create a scatter plot using expression and fold_change.
Save the file as scatter-copy.svg.
Open the file expression.csv.
Make a histogram of expression.
Save the file as histogram-copy.svg.
Open the file expression.csv.
Make a bar chart of group.
Save the file as bar-copy.svg.
Open the file expression.csv.
Make a PCA plot.
Save the file as pca-copy.svg.
Open the file expression.csv.
Draw a volcano plot from fold_change and p_value.
Save the file as volcano-copy.svg.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            self.assertIn("Average", output)
            self.assertIn("95% confidence interval", output)
            self.assertIn("P value", output)
            self.assertIn("File check", output)
            self.assertIn("File size", output)
            for name in (
                "grouped-final.svg",
                "selected-heat-map.svg",
                "scatter-copy.svg",
                "histogram-copy.svg",
                "bar-copy.svg",
                "pca-copy.svg",
                "volcano-copy.svg",
            ):
                with self.subTest(name=name):
                    content = (root / name).read_text(encoding="utf-8")
                    self.assertTrue(content.lstrip().startswith("<svg"), name)
                    self.assertNotIn("TODO", content.upper())

    def test_normalization_keeps_block_colons_exact(self) -> None:
        source = """If the result is not empty:
    Print Data exists.
Otherwise:
    Warn This file is empty.
"""
        normalized = normalize_source(source)
        self.assertIn("If the result is not empty:", normalized)
        self.assertIn("Otherwise:", normalized)
        self.assertNotIn(":.", normalized)

    @staticmethod
    def _write_fastq(path: Path, records: list[tuple[str, str, str]]) -> None:
        lines: list[str] = []
        for name, sequence, quality in records:
            lines.extend([f"@{name}", sequence, "+", quality])
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
