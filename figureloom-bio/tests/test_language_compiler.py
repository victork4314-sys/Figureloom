from pathlib import Path
import tempfile
import unittest

from figureloom_bio.language_compiler import compile_sentence, lex
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class FigureLoomBioCompilerTests(unittest.TestCase):
    def test_lexer_reads_words_values_numbers_and_files(self) -> None:
        tokens = lex('Please load reads.fastq and keep reads above 100 bases')
        self.assertIn(('reads.fastq', 'filename'), [(token.text, token.kind) for token in tokens])
        self.assertIn(('100', 'number'), [(token.text, token.kind) for token in tokens])
        self.assertIn('keep', [token.normalized for token in tokens])

    def test_programs_are_compiled_from_words_and_terms(self) -> None:
        cases = {
            'Load reads.fastq.': ('open_file', ('reads.fastq',)),
            'Retain reads above 100 bases.': ('keep_strict_length', ('100',)),
            'Delete reads under 50 bases.': ('remove_shorter', ('50',)),
            'Turn DNA into RNA.': ('to_rna', ()),
            'Turn RNA into DNA.': ('to_dna', ()),
            'Display sequence identifiers.': ('show_sequence_names', ()),
            'Detect ORFs.': ('find_open_reading_frames', ()),
            'Compute the mean for score.': ('summary_statistic', ('average', 'score')),
            'Compute the p value for score between treated and control under group.': (
                'permutation_p_value',
                ('score', 'treated', 'control', 'group'),
            ),
            'Fill empty values under status with unknown.': (
                'replace_empty',
                ('status', 'unknown'),
            ),
            'Draw a volcano from effect and p_value.': ('volcano_plot', ('effect', 'p_value')),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                instruction = parse(source)[0]
                self.assertEqual((instruction.action, instruction.values), expected)

    def test_examples_do_not_define_legality(self) -> None:
        compiled = compile_sentence('Keep rows where condition is treated')
        self.assertIsNotNone(compiled)
        self.assertEqual(compiled.action, 'keep_rows')
        self.assertEqual(compiled.values, ('treated', 'condition'))

    def test_freely_worded_table_program_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'samples.csv').write_text(
                'sample,condition,status\n'
                'one,treated,passed\n'
                'two,control,passed\n'
                'three,treated,failed\n',
                encoding='utf-8',
            )
            program = root / 'free-wording.flbio'
            program.write_text(
                'Please load samples.csv.\n'
                'Retain rows where condition is treated.\n'
                'Discard rows where status equals failed.\n'
                'Total the records.\n'
                'Display the output.\n'
                'Write the output to clean.csv.\n',
                encoding='utf-8',
            )

            output = Runner(program).run(parse(program.read_text(encoding='utf-8'))).render()

            self.assertIn('Rows\n\n1', output)
            self.assertIn('one', output)
            self.assertNotIn('three', output)
            self.assertEqual(
                (root / 'clean.csv').read_text(encoding='utf-8'),
                'sample,condition,status\none,treated,passed\n',
            )


if __name__ == '__main__':
    unittest.main()
