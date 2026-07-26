from pathlib import Path
import tempfile
import unittest

from figureloom_bio.language_compiler import VOCABULARY, compile_sentence, lex
from figureloom_bio.language_compiler_extensions import compile_extended_sentence
from figureloom_bio.language_compiler_runtime import compile_for_runtime
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.semantic_language import tokenize


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
            'Change untreated to control under condition.': (
                'change_value',
                ('untreated', 'control', 'condition'),
            ),
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
                compiled = compile_for_runtime(source)
                self.assertIsNotNone(compiled)
                self.assertEqual((compiled.action, compiled.values), expected)

    def test_operation_words_tokenize_and_independent_programs_execute(self) -> None:
        conformance = {
            'open': ('Open samples.csv.', 'open_file'),
            'keep': ('Keep sequences longer than 100 bases.', 'keep_strict_length'),
            'remove': ('Remove sequences shorter than 50 bases.', 'remove_shorter'),
            'show': ('Show the result.', 'show_result'),
            'count': ('Count the rows.', 'count_rows'),
            'save': ('Save the result to output.csv.', 'save_result'),
            'copy': ('Copy the current file as backup.fasta.', 'copy_file'),
            'use': ('Use the sequence called sample-17.', 'use_sequence'),
            'rename': ('Rename the column old to new.', 'rename_column'),
            'sort': ('Sort the rows by score.', 'order_rows'),
            'replace': ('Replace empty values under status with unknown.', 'replace_empty'),
            'combine': ('Combine sequences with more.fasta.', 'merge_sequences'),
            'split': ('Split the sequences into files with 25 sequences each as part.fasta.', 'split_sequences'),
            'convert': ('Convert DNA into RNA.', 'to_rna'),
            'calculate': ('Calculate the average of score.', 'summary_statistic'),
            'find': ('Find genes.', 'find_genes'),
            'create': ('Create a volcano plot using effect and p_value.', 'volcano_plot'),
            'check': ('Check the file.', 'check_file'),
            'compare': ('Compare the sequences.', 'compare_current_sequences'),
            'trim': ('Trim 5 bases from the start.', 'trim_start'),
            'normalize': ('Normalize the counts under count.', 'normalize_counts'),
            'prepare': ('Prepare bacterial reads.', 'builtin_microbiology_prepare_reads'),
            'assemble': ('Assemble the bacterial genome.', 'assemble_current_bacterial_genome'),
            'annotate': ('Annotate the genome.', 'annotate_current_file'),
            'translate': ('Translate the DNA to protein.', 'translate'),
            'say': ('Say Analysis started.', 'say'),
            'run': ('Run this program 2 times.', 'repeat_program'),
            'stop': ('Stop the program.', 'stop_program'),
            'continue': ('Continue with the next sample.', 'continue_sample'),
            'skip': ('Skip this sample.', 'skip_sample'),
            'mark': ('Mark the sample for review.', 'mark_review'),
            'warn': ('Warn Sample needs review.', 'show_warning'),
            'assert': ('Make sure true.', 'make_sure'),
        }

        self.assertEqual(set(VOCABULARY['verbs']), set(conformance))
        for operation, forms in VOCABULARY['verbs'].items():
            for form in forms:
                with self.subTest(operation=operation, form=form):
                    tokens = tokenize(form)
                    self.assertTrue(
                        any(('operation', operation) in token.tags for token in tokens),
                        f'{form!r} must tokenize as the {operation!r} operation.',
                    )

        for operation, (source, expected_action) in conformance.items():
            with self.subTest(operation=operation, source=source):
                instruction = parse(source)[0]
                self.assertEqual(instruction.action, expected_action)

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
