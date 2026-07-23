from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio import Runner
from figureloom_bio.parser import parse
from figureloom_bio.translators import translate_source


FASTQ = "@read-1\n" + ("ACGT" * 20) + "\n+\n" + ("I" * 80) + "\n"


class CurrentFileLanguageTests(unittest.TestCase):
    def test_every_current_file_sentence_parses(self) -> None:
        source = """Check the file.
Count the file.
Save the file as clean.fasta.
Compare the file with reference.fasta.
Assemble the bacterial genome.
Annotate the file.
Find genes in the file.
Find resistance genes in the file.
Find resistance genes in the file using card.
Find virulence genes in the file.
Identify the organism in the file using bacteria-reference.
Find plasmids in the file.
Find plasmids in the file into plasmid-results.
"""
        actions = [instruction.action for instruction in parse(source)]
        self.assertEqual(
            actions,
            [
                "check_file",
                "count_file",
                "save_file",
                "compare_file",
                "assemble_current_bacterial_genome",
                "annotate_current_file",
                "find_genes_current_file",
                "find_resistance_current_file",
                "find_resistance_current_file",
                "find_virulence_current_file",
                "identify_current_file",
                "find_plasmids_current_file",
                "find_plasmids_current_file",
            ],
        )

    def test_check_count_show_and_save_the_file(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(FASTQ, encoding="utf-8")
            program = root / "program.flbio"
            source = """Open the file reads.fastq.
Check the file.
Count the file.
Show the file.
Save the file as clean.fastq.
"""
            output = Runner(program).run(parse(source)).render()
            self.assertIn("Quality report", output)
            self.assertIn("Sequences", output)
            self.assertTrue((root / "clean.fastq").exists())
            self.assertEqual((root / "clean.fastq").read_text(encoding="utf-8"), FASTQ)

    def test_saving_a_paired_file_creates_natural_names(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "forward.fastq").write_text(FASTQ, encoding="utf-8")
            (root / "reverse.fastq").write_text(FASTQ, encoding="utf-8")
            program = root / "program.flbio"
            source = """Open the files forward.fastq and reverse.fastq as a pair.
Save the file as clean-reads.fastq.
"""
            Runner(program).run(parse(source))
            self.assertTrue((root / "clean-reads-forward.fastq").exists())
            self.assertTrue((root / "clean-reads-reverse.fastq").exists())

    def test_table_check_uses_the_current_table(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,status\na,passed\nb,\n",
                encoding="utf-8",
            )
            output = Runner(root / "program.flbio").run(
                parse("Open the file samples.csv.\nCheck the file.\nCount the file.\n")
            ).render()
            self.assertIn("File check", output)
            self.assertIn("Empty values", output)
            self.assertIn("Rows", output)

    def test_translation_uses_the_current_file_without_repeated_paths(self) -> None:
        translated = translate_source(
            """Open the files forward.fastq and reverse.fastq as a pair.
Prepare bacterial reads.
Assemble the bacterial genome.
Annotate the file.
Find resistance genes in the file.
Find virulence genes in the file.
Identify the organism in the file using bacteria-reference.
Find plasmids in the file.
""",
            "bash",
            program_name="current-file.flbio",
        )
        self.assertIn('spades.py --isolate -1 "$FORWARD" -2 "$REVERSE" -o assembly', translated.content)
        self.assertIn('prokka --outdir annotation "$CURRENT"', translated.content)
        self.assertIn('abricate --db resistance-markers "$CURRENT"', translated.content)
        self.assertIn('abricate --db vfdb "$CURRENT"', translated.content)
        self.assertIn('kraken2 --db bacteria-reference', translated.content)
        self.assertIn('mob_recon --infile "$CURRENT" --outdir plasmids', translated.content)
        for tool in ("spades.py", "prokka", "abricate", "kraken2", "mob_recon"):
            self.assertIn(tool, translated.requirements)


if __name__ == "__main__":
    unittest.main()
