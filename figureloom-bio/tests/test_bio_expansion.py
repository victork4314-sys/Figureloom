from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from figureloom_bio import Runner
from figureloom_bio.bio_expansion import EXPANSION, parse_expanded_instruction
from figureloom_bio.parser import parse


CASES = {
    "Count DNA words 5 bases long.": "count_kmers",
    "Count the contigs.": "count_contigs",
    "Total the genes.": "count_genes",
    "Count the proteins.": "count_proteins",
    "Find open reading frames.": "find_orfs",
    "Find single base changes.": "find_snps",
    "Detect small insertions and deletions.": "find_indels",
    "Find primer pairs.": "find_primers",
    "Check contamination.": "check_contamination",
    "Check duplicate names.": "check_duplicate_names",
    "Inspect read pairs.": "check_read_pairs",
    "Keep variants with quality at least 30.": "keep_variant_quality",
    "Keep pass variants.": "keep_pass_variants",
    "Remove variants with quality under 20.": "remove_low_quality_variants",
    "Annotate variants using reference.csv.": "annotate_variants",
    "Label genes using genes.csv.": "annotate_genes",
    "Summarize variants.": "summarize_variants",
    "Describe gene expression.": "summarize_expression",
    "Summarize the alignment.": "summarize_alignment",
    "Extract features.": "extract_features",
    "Create a heatmap.": "create_heatmap",
    "Make a PCA plot.": "create_pca_plot",
    "Plot an MA chart.": "create_ma_plot",
    "Create a box plot.": "create_box_plot",
}


class BioExpansionTests(unittest.TestCase):
    def test_every_capability_has_a_simple_parsing_example(self) -> None:
        declared = {rule["action"] for rule in EXPANSION["capabilities"]}
        self.assertEqual(set(CASES.values()), declared)
        for source, action in CASES.items():
            with self.subTest(source=source):
                node = parse_expanded_instruction(source[:-1])
                self.assertEqual(node.action, action)
                self.assertTrue(node.operation)
                self.assertTrue(node.targets)

    def test_every_declared_word_is_recognized_inside_its_group(self) -> None:
        for category in ("operations", "targets", "comparisons", "roles", "modifiers"):
            for canonical, forms in EXPANSION[category].items():
                for form in forms:
                    with self.subTest(category=category, canonical=canonical, form=form):
                        self.assertTrue(form.strip())
                        self.assertEqual(form, form.lower())
                        self.assertNotRegex(form, r"[{}\[\];]")

    def test_python_public_parser_uses_the_expansion(self) -> None:
        instructions = parse("\n".join(CASES))
        self.assertEqual([item.action for item in instructions], list(CASES.values()))

    def test_fasta_expansion_executes(self) -> None:
        with tempfile.TemporaryDirectory() as folder_name:
            folder = Path(folder_name)
            (folder / "reads.fasta").write_text(">a\nATGAAATAA\n>b\nATGCCCTAG\n", encoding="utf-8")
            program = folder / "program.flbio"
            instructions = parse(
                "Open the file reads.fasta.\n"
                "Find open reading frames.\n"
            )
            output = Runner(program).run(instructions)
            self.assertIn("Open reading frames", output.render())

    def test_variant_table_expansion_executes(self) -> None:
        with tempfile.TemporaryDirectory() as folder_name:
            folder = Path(folder_name)
            (folder / "variants.csv").write_text(
                "id,REF,ALT,QUAL,FILTER\n"
                "v1,A,G,40,PASS\n"
                "v2,A,AT,10,Low\n"
                "v3,C,T,35,PASS\n",
                encoding="utf-8",
            )
            program = folder / "program.flbio"
            instructions = parse(
                "Open the file variants.csv.\n"
                "Keep variants with quality at least 30.\n"
                "Keep pass variants.\n"
                "Find single base changes.\n"
                "Summarize variants.\n"
            )
            runner = Runner(program)
            output = runner.run(instructions)
            self.assertEqual(len(runner.table.rows), 2)
            self.assertIn("Variant summary", output.render())


if __name__ == "__main__":
    unittest.main()
