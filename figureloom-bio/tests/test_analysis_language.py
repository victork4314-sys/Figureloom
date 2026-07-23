from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio import Runner
from figureloom_bio.parser import parse


TABLE = """sample,group,score,effect,p_value,x,y,a,b
s1,treated,10,1.4,0.01,1,2,2,4
s2,treated,12,1.1,0.03,2,3,4,7
s3,treated,14,2.0,0.001,3,5,6,9
s4,control,4,-0.9,0.2,4,6,8,12
s5,control,6,-1.2,0.05,5,8,10,15
s6,control,8,-0.4,0.4,6,9,12,18
"""


class AnalysisLanguageTests(unittest.TestCase):
    def run_program(self, source: str) -> tuple[str, Path, TemporaryDirectory[str]]:
        temporary = TemporaryDirectory()
        folder = Path(temporary.name)
        (folder / "samples.csv").write_text(TABLE, encoding="utf-8")
        program = folder / "analysis.flbio"
        program.write_text(source, encoding="utf-8")
        output = Runner(program).run(parse(source)).render()
        return output, folder, temporary

    def test_summary_statistics_confidence_interval_and_p_value(self) -> None:
        output, _, temporary = self.run_program(
            """Open the file samples.csv.
Calculate the average of score.
Calculate the median of score.
Calculate the standard deviation of score.
Calculate the confidence interval of score.
Calculate the p value for score between treated and control under group.
"""
        )
        try:
            self.assertIn("Average of score", output)
            self.assertIn("9.000000", output)
            self.assertIn("Median of score", output)
            self.assertIn("Standard deviation of score", output)
            self.assertIn("95% confidence interval of score", output)
            self.assertIn("P value for score", output)
            self.assertIn("Permutation comparison: treated versus control", output)
        finally:
            temporary.cleanup()

    def test_every_native_figure_writes_a_real_svg(self) -> None:
        output, folder, temporary = self.run_program(
            """Open the file samples.csv.
Create a histogram of score.
Create a bar chart of group.
Create a scatter plot of x and y.
Create a box plot of score.
Create a heat map.
Create a PCA plot.
Create a volcano plot using effect and p_value.
"""
        )
        try:
            expected = {
                "histogram.svg": "Histogram of score",
                "bar-chart.svg": "Bar chart of group",
                "scatter-plot.svg": "x and y",
                "box-plot.svg": "Box plot of score",
                "heat-map.svg": "Heat map",
                "pca-plot.svg": "PCA plot",
                "volcano-plot.svg": "Volcano plot",
            }
            for name, title in expected.items():
                with self.subTest(name=name):
                    path = folder / name
                    self.assertTrue(path.exists(), name)
                    svg = path.read_text(encoding="utf-8")
                    self.assertTrue(svg.startswith("<svg"))
                    self.assertIn(title, svg)
                    self.assertNotIn("TODO", svg)
                    self.assertIn(name, output)
        finally:
            temporary.cleanup()

    def test_saved_complete_language_alignment_variants_and_tree(self) -> None:
        with TemporaryDirectory() as temporary_name:
            folder = Path(temporary_name)
            (folder / "sequences.fasta").write_text(
                ">first\nATGAAACCCGGGTTTTAA\n>second\nATGAAATCCGGGTTTTAA\n>third\nATGAAAACCGGGTTTTAA\n",
                encoding="utf-8",
            )
            program = folder / "sequences.flbio"
            source = """Open the file sequences.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as aligned.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
Open the file sequences.fasta.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
"""
            program.write_text(source, encoding="utf-8")
            output = Runner(program).run(parse(source)).render()
            self.assertIn("Sequence comparison", output)
            self.assertIn("Variants", output)
            self.assertIn("Phylogenetic tree", output)
            self.assertTrue((folder / "aligned.fasta").exists())
            self.assertTrue((folder / "variants.csv").exists())
            self.assertTrue((folder / "tree.nwk").exists())
            self.assertTrue((folder / "tree.nwk").read_text(encoding="utf-8").strip().endswith(";"))

    def test_saved_complete_language_genes_proteins_and_primers(self) -> None:
        with TemporaryDirectory() as temporary_name:
            folder = Path(temporary_name)
            (folder / "dna.fasta").write_text(
                ">dna\nATG" + "GCT" * 40 + "TAA" + "ACGT" * 20 + "\n",
                encoding="utf-8",
            )
            program = folder / "biology.flbio"
            source = """Open the file dna.fasta.
Find open reading frames.
Count the genes.
Show the genes.
Save the genes as genes.csv.
Open the file dna.fasta.
Find PCR primers.
Check the primers.
Show the primers.
"""
            program.write_text(source, encoding="utf-8")
            output = Runner(program).run(parse(source)).render()
            self.assertIn("Open reading frames", output)
            self.assertIn("PCR primers", output)
            self.assertIn("Primer check", output)
            self.assertTrue((folder / "genes.csv").exists())


if __name__ == "__main__":
    unittest.main()
