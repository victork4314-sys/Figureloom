from pathlib import Path
import tempfile
import unittest

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.semantic_language import parse_instruction, parse_program, tokenize


class FigureLoomBioSemanticGrammarTests(unittest.TestCase):
    def test_tokenizer_reads_operations_values_numbers_and_files(self) -> None:
        tokens = tokenize("Please load reads.fastq and keep reads above 100 bases")
        self.assertIn(("reads.fastq", "filename"), [(token.text, token.kind) for token in tokens])
        self.assertIn(("100", "number"), [(token.text, token.kind) for token in tokens])
        self.assertTrue(any(("operation", "open") in token.tags for token in tokens))
        self.assertTrue(any(("operation", "keep") in token.tags for token in tokens))

    def test_independently_written_instructions_create_expected_ast(self) -> None:
        cases = {
            "Load reads.fastq.": ("open_file", ("reads.fastq",)),
            "Retain reads above 100 bases.": ("keep_strict_length", ("100",)),
            "Delete reads under 50 bases.": ("remove_shorter", ("50",)),
            "Turn DNA into RNA.": ("to_rna", ()),
            "Display sequence identifiers.": ("show_sequence_names", ()),
            "Detect ORFs.": ("find_open_reading_frames", ()),
            "Compute the mean for score.": ("summary_statistic", ("average", "score")),
            "Replace blank values in column status with unknown.": ("replace_empty", ("status", "unknown")),
            "Draw a volcano from effect and p_value.": ("volcano_plot", ("effect", "p_value")),
            "Warn Sample needs review.": ("show_warning", ("Sample needs review",)),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                node = parse_instruction(source)
                self.assertEqual((node.action, node.values), expected)
                self.assertEqual(node.source + ".", source)

    def test_context_resolves_ordinary_words_without_sentence_rewriting(self) -> None:
        cases = {
            "Change DNA into RNA.": ("to_rna", ()),
            "Change untreated to control under condition.": ("change_value", ("untreated", "control", "condition")),
            "Build the bacterial genome.": ("assemble_current_bacterial_genome", ()),
            "Print the result.": ("show_result", ()),
            "Print Analysis started.": ("say", ("Analysis started",)),
            "Write the result to clean.csv.": ("save_result", ("clean.csv",)),
            "Call variants.": ("find_variants", ()),
            "Call the column old to new.": ("rename_column", ("old", "new")),
            "Filter rows marked treated under condition.": ("keep_rows", ("treated", "condition")),
            "Filter out rows marked failed under status.": ("remove_rows", ("failed", "status")),
            "Look for genes.": ("find_genes", ()),
            "Get rid of gaps from the sequences.": ("remove_sequence_gaps", ()),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                instruction = parse(source)[0]
                self.assertEqual((instruction.action, instruction.values), expected)
                self.assertIsNotNone(instruction.node)

    def test_program_grammar_builds_real_control_flow_nodes(self) -> None:
        program = parse_program(
            "Make a recipe called clean:\n"
            "    Remove reads under 20 bases.\n"
            "If true:\n"
            "    Use the recipe clean.\n"
            "Otherwise:\n"
            "    Say Nothing changed.\n"
            "For every sample in samples:\n"
            "    Say Processing sample.\n"
        )
        self.assertEqual(program.body[0].to_dict()["type"], "recipe")
        self.assertEqual(program.body[1].to_dict()["type"], "if")
        self.assertEqual(program.body[2].to_dict()["type"], "loop")
        self.assertEqual(program.body[1].branches[0].condition.kind, "literal")

    def test_named_sequence_values_do_not_include_target_nouns(self) -> None:
        rename = parse("Rename the sequence sample-17 to chosen.")[0]
        self.assertEqual(rename.action, "rename_sequence")
        self.assertEqual(rename.values, ("sample-17", "chosen"))
        self.assertEqual(rename.node.roles["source_value"], "sample-17")

        use = parse("Use the sequence called sample-17.")[0]
        self.assertEqual(use.action, "use_sequence")
        self.assertEqual(use.values, ("sample-17",))

    def test_freely_worded_table_program_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,status\n"
                "one,treated,passed\n"
                "two,control,passed\n"
                "three,treated,failed\n",
                encoding="utf-8",
            )
            program = root / "free-wording.flbio"
            program.write_text(
                "Please load samples.csv.\n"
                "Filter rows marked treated under condition.\n"
                "Filter out rows marked failed under status.\n"
                "Total the records.\n"
                "Print the output.\n"
                "Write the output to clean.csv.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()

            self.assertIn("Rows\n\n1", output)
            self.assertIn("one", output)
            self.assertNotIn("three", output)
            self.assertEqual(
                (root / "clean.csv").read_text(encoding="utf-8"),
                "sample,condition,status\none,treated,passed\n",
            )


if __name__ == "__main__":
    unittest.main()
