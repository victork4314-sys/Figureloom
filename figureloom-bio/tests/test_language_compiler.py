from pathlib import Path
import tempfile
import unittest

from figureloom_bio.language_compiler import compile_sentence, lex
from figureloom_bio.language_compiler_extensions import compile_extended_sentence
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
            'Replace blank values in column status with unknown.': (
                'replace_empty',
                ('status', 'unknown'),
            ),
            'Draw a volcano from effect and p_value.': ('volcano_plot', ('effect', 'p_value')),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                instruction = parse(source)[0]
                self.assertEqual((instruction.action, instruction.values), expected)

    def test_ambiguous_everyday_words_use_the_sentence_context(self) -> None:
        cases = {
            'Change DNA into RNA.': ('to_rna', ()),
            'Build the bacterial genome.': ('assemble_current_bacterial_genome', ()),
            'Print the result.': ('show_result', ()),
            'Print Analysis started.': ('say', ('Analysis started',)),
            'Write the result to clean.csv.': ('save_result', ('clean.csv',)),
            'Write Analysis started.': ('say', ('Analysis started',)),
            'Call variants.': ('find_variants', ()),
            'Call the column old to new.': ('rename_column', ('old', 'new')),
            'Filter rows marked treated under condition.': ('keep_rows', ('treated', 'condition')),
            'Filter out rows marked failed under status.': ('remove_rows', ('failed', 'status')),
            'Look for genes.': ('find_genes', ()),
            'Get rid of gaps from the sequences.': ('remove_sequence_gaps', ()),
            'Label the genome.': ('annotate_current_file', ()),
            'Build a relationship tree.': ('build_phylogenetic_tree', ()),
            'Calculate the spread of score.': ('summary_statistic', ('standard deviation', 'score')),
            'Calculate the confidence range of score.': ('summary_statistic', ('confidence interval', 'score')),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                instruction = parse(source)[0]
                self.assertEqual((instruction.action, instruction.values), expected)

    def test_remaining_official_operation_words_compile(self) -> None:
        cases = {
            'Copy the current file as backup.fasta.': ('copy_file', ('backup.fasta',)),
            'Split the reads into files with 25 reads each as part.fastq.': (
                'split_sequences',
                ('25', 'part.fastq'),
            ),
            'Use the sequence called sample-17.': ('use_sequence', ('sample-17',)),
            'Mark the sample for review.': ('mark_review', ()),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                compiled = compile_extended_sentence(source)
                self.assertIsNotNone(compiled)
                self.assertEqual((compiled.action, compiled.values), expected)

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
                'Filter rows marked treated under condition.\n'
                'Filter out rows marked failed under status.\n'
                'Total the records.\n'
                'Print the output.\n'
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
