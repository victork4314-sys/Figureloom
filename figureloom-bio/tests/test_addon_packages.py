import unittest

from figureloom_bio.addon_packages import addon_catalog, expand_addons
from figureloom_bio.parser import parse
from figureloom_bio.translators import translate_source


class BuiltInCapabilityTests(unittest.TestCase):
    def test_microbiology_sentence_expands_without_declaration(self) -> None:
        instructions = expand_addons(parse("Clean bacterial reads.\n"))
        self.assertEqual(
            [instruction.action for instruction in instructions],
            [
                "check_quality",
                "remove_adapters",
                "remove_low_quality_default",
                "remove_shorter",
                "check_quality",
            ],
        )
        self.assertEqual(instructions[3].values, ("50",))

    def test_old_declaration_is_ignored_for_saved_programs(self) -> None:
        instructions = expand_addons(
            parse(
                "Use .microbiology.\n"
                "Run this program 3 times.\n"
                "Prepare bacterial reads.\n"
            )
        )
        self.assertEqual(instructions[0].action, "repeat_program")
        self.assertEqual(instructions[0].values, ("3",))
        self.assertNotIn("legacy_capability_declaration", [item.action for item in instructions])

    def test_paired_bacterial_assembly_expands_to_spades(self) -> None:
        instructions = expand_addons(
            parse(
                "Assemble the bacterial genome from left.fastq and right.fastq into assembly.\n"
            )
        )
        self.assertEqual(len(instructions), 1)
        self.assertEqual(instructions[0].action, "run_tool")
        self.assertEqual(instructions[0].values[0], "spades.py")
        self.assertEqual(
            instructions[0].values[1],
            "--isolate -1 left.fastq -2 right.fastq -o assembly",
        )

    def test_taxonomy_command_creates_readable_output_names(self) -> None:
        instructions = expand_addons(
            parse("Identify the organism in sample.fastq.gz using kraken-db.\n")
        )
        self.assertEqual(instructions[0].values[0], "kraken2")
        self.assertIn("sample-kraken-report.txt", instructions[0].values[1])
        self.assertIn("sample-kraken-output.txt", instructions[0].values[1])

    def test_catalog_is_organized_as_built_in_themes(self) -> None:
        themes = {theme.name: theme for theme in addon_catalog()}
        self.assertIn("sequences", themes)
        self.assertIn("fastq", themes)
        self.assertIn("microbiology", themes)
        self.assertTrue(themes["microbiology"].commands)
        self.assertFalse(hasattr(themes["microbiology"], "status"))

    def test_translation_expands_microbiology_without_declaration(self) -> None:
        translated = translate_source(
            "Assemble the bacterial genome from left.fastq and right.fastq into assembly.\n",
            "bash",
            program_name="bacteria.flbio",
        )
        self.assertIn("spades.py", translated.content)
        self.assertIn("--isolate -1 left.fastq -2 right.fastq -o assembly", translated.content)
        self.assertIn("spades.py", translated.requirements)


if __name__ == "__main__":
    unittest.main()
