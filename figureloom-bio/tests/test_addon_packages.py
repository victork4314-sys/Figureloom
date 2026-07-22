import unittest

from figureloom_bio.addon_packages import addon_catalog, expand_addons
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.translators import translate_source


class AddonPackageTests(unittest.TestCase):
    def test_microbiology_synonym_expands_to_core_read_cleanup(self) -> None:
        instructions = expand_addons(
            parse(
                "Use .microbiology.\n"
                "Clean bacterial reads.\n"
            )
        )
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

    def test_package_declaration_can_come_before_repeat(self) -> None:
        instructions = expand_addons(
            parse(
                "Use the .microbiology add-on.\n"
                "Run this program 3 times.\n"
                "Prepare bacterial reads.\n"
            )
        )
        self.assertEqual(instructions[0].action, "repeat_program")
        self.assertEqual(instructions[0].values, ("3",))

    def test_microbiology_command_requires_package_declaration(self) -> None:
        with self.assertRaisesRegex(FigureLoomBioError, r"Use \.microbiology"):
            expand_addons(parse("Prepare bacterial reads.\n"))

    def test_paired_bacterial_assembly_expands_to_spades(self) -> None:
        instructions = expand_addons(
            parse(
                "Install .microbiology.\n"
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
            parse(
                "Use .microbiology.\n"
                "Identify the organism in sample.fastq.gz using kraken-db.\n"
            )
        )
        self.assertEqual(instructions[0].values[0], "kraken2")
        self.assertIn("sample-kraken-report.txt", instructions[0].values[1])
        self.assertIn("sample-kraken-output.txt", instructions[0].values[1])

    def test_planned_package_is_visible_but_not_runnable(self) -> None:
        names = {package.name: package.status for package in addon_catalog()}
        self.assertEqual(names["microbiology"], "ready")
        self.assertEqual(names["genomics"], "core")
        self.assertEqual(names["virology"], "planned")
        with self.assertRaisesRegex(FigureLoomBioError, "not ready yet"):
            expand_addons(parse("Use .virology.\n"))

    def test_translation_expands_microbiology_before_compiling(self) -> None:
        translated = translate_source(
            "Use .microbiology.\n"
            "Assemble the bacterial genome from left.fastq and right.fastq into assembly.\n",
            "bash",
            program_name="bacteria.flbio",
        )
        self.assertIn("spades.py", translated.content)
        self.assertIn("--isolate -1 left.fastq -2 right.fastq -o assembly", translated.content)
        self.assertIn("spades.py", translated.requirements)

    def test_unknown_addon_has_a_plain_error(self) -> None:
        with self.assertRaisesRegex(FigureLoomBioError, "could not find"):
            expand_addons(parse("Use .definitely-not-real.\n"))


if __name__ == "__main__":
    unittest.main()
