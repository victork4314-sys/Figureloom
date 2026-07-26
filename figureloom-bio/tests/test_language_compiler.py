from pathlib import Path
import tempfile
import unittest

from figureloom_bio.language_compiler import VOCABULARY, compile_sentence, lex
from figureloom_bio.language_compiler_extensions import compile_extended_sentence
from figureloom_bio.language_compiler_runtime import compile_for_runtime
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

    def test_semantic_compiler_preserves_established_runtime_contracts(self) -> None:
        cases = {
            'Open the files first.fasta and second.fasta together.': (
                'open_files_together',
                ('first.fasta and second.fasta',),
            ),
            'Merge the files first.fasta and second.fasta.': (
                'merge_files',
                ('first.fasta and second.fasta',),
            ),
            'Keep sequences with names containing sample.': (
                'keep_sequence_names_containing',
                ('sample',),
            ),
            'Remove sequences with names containing failed.': (
                'remove_sequence_names_containing',
                ('failed',),
            ),
            'Cut 10 bases from the beginning of each read.': ('cut_start', ('10',)),
            'Cut 5 bases from the end of each read.': ('cut_end', ('5',)),
            'Create a histogram of score.': ('histogram', ('score',)),
            'Create a scatter plot of x and y.': ('scatter_plot', ('x', 'y')),
            'Create a box plot from count.': ('create_box_plot', ('count',)),
            'Compare the file with reference.fasta.': ('compare_file', ('reference.fasta',)),
            'Find genes in the file.': ('find_genes_current_file', ()),
            'Find resistance genes in the file using card.': (
                'find_resistance_current_file',
                ('card',),
            ),
            'Find virulence genes in the file.': ('find_virulence_current_file', ()),
            'Identify the organism in the file using bacteria-reference.': (
                'identify_current_file',
                ('bacteria-reference',),
            ),
            'Find plasmids in the file into plasmid-results.': (
                'find_plasmids_current_file',
                ('plasmid-results',),
            ),
            'Find resistance genes in assembly/contigs.fasta using card.': (
                'builtin_microbiology_resistance',
                ('assembly/contigs.fasta', 'card'),
            ),
            'Find virulence genes in assembly/contigs.fasta.': (
                'builtin_microbiology_virulence',
                ('assembly/contigs.fasta',),
            ),
            'Identify the organism in sample.fastq.gz using kraken-db.': (
                'builtin_microbiology_classify',
                ('sample.fastq.gz', 'kraken-db'),
            ),
            'Find plasmids in assembly/contigs.fasta into plasmids.': (
                'builtin_microbiology_plasmids',
                ('assembly/contigs.fasta', 'plasmids'),
            ),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                instruction = parse(source)[0]
                self.assertEqual((instruction.action, instruction.values), expected)

    def test_every_advertised_verb_form_composes_in_new_sentences(self) -> None:
        templates = {
            'open': lambda verb: f'Please {verb} samples.csv.',
            'keep': lambda verb: f'Please {verb} sequences longer than 100 bases.',
            'remove': lambda verb: f'Please {verb} sequences shorter than 50 bases.',
            'show': lambda verb: f'Please {verb} the result.',
            'count': lambda verb: f'Please {verb} the rows.',
            'save': lambda verb: f'Please {verb} the result to output.csv.',
            'copy': lambda verb: f'Please {verb} the current file as backup.fasta.',
            'use': lambda verb: f'Please {verb} the sequence called sample-17.',
            'rename': lambda verb: f'Please {verb} the column old to new.',
            'sort': lambda verb: f'Please {verb} the rows by score.',
            'replace': lambda verb: f'Please {verb} empty values under status with unknown.',
            'combine': lambda verb: f'Please {verb} sequences with more.fasta.',
            'split': lambda verb: f'Please {verb} the sequences into files with 25 sequences each as part.fasta.',
            'convert': lambda verb: f'Please {verb} DNA into RNA.',
            'calculate': lambda verb: f'Please {verb} the average of score.',
            'find': lambda verb: f'Please {verb} genes.',
            'create': lambda verb: f'Please {verb} a volcano plot using effect and p_value.',
            'check': lambda verb: f'Please {verb} the file.',
            'compare': lambda verb: f'Please {verb} the sequences.',
            'trim': lambda verb: f'Please {verb} 5 bases from the start.',
            'normalize': lambda verb: f'Please {verb} the counts under count.',
            'prepare': lambda verb: f'Please {verb} bacterial reads.',
            'assemble': lambda verb: f'Please {verb} the bacterial genome.',
            'annotate': lambda verb: f'Please {verb} the genome.',
            'translate': lambda verb: f'Please {verb} the DNA to protein.',
            'say': lambda verb: f'Please {verb} Analysis started.',
            'run': lambda verb: f'Please {verb} this program 2 times.',
            'stop': lambda verb: f'Please {verb} the program.',
            'continue': lambda verb: f'Please {verb} with the next sample.',
            'skip': lambda verb: f'Please {verb} this sample.',
            'mark': lambda verb: f'Please {verb} the sample for review.',
            'warn': lambda verb: f'Please {verb} Sample needs review.',
        }
        expected_actions = {
            'open': 'open_file',
            'keep': 'keep_strict_length',
            'remove': 'remove_shorter',
            'show': 'show_result',
            'count': 'count_rows',
            'save': 'save_result',
            'copy': 'copy_file',
            'use': 'use_sequence',
            'rename': 'rename_column',
            'sort': 'order_rows',
            'replace': 'replace_empty',
            'combine': 'merge_sequences',
            'split': 'split_sequences',
            'convert': 'to_rna',
            'calculate': 'summary_statistic',
            'find': 'find_genes',
            'create': 'volcano_plot',
            'check': 'check_file',
            'compare': 'compare_current_sequences',
            'trim': 'trim_start',
            'normalize': 'normalize_counts',
            'prepare': 'builtin_microbiology_prepare_reads',
            'assemble': 'assemble_current_bacterial_genome',
            'annotate': 'annotate_current_file',
            'translate': 'translate',
            'say': 'say',
            'run': 'repeat_program',
            'stop': 'stop_program',
            'continue': 'continue_sample',
            'skip': 'skip_sample',
            'mark': 'mark_review',
            'warn': 'language_alias__warn_message',
        }

        tested = 0
        for canonical, forms in VOCABULARY['verbs'].items():
            self.assertIn(canonical, templates)
            self.assertIn(canonical, expected_actions)
            for form in forms:
                source = templates[canonical](form)
                with self.subTest(canonical=canonical, form=form, source=source):
                    compiled = compile_for_runtime(source)
                    self.assertIsNotNone(compiled)
                    self.assertEqual(compiled.action, expected_actions[canonical])
                tested += 1

        self.assertEqual(tested, sum(len(forms) for forms in VOCABULARY['verbs'].values()))
        self.assertGreaterEqual(tested, 98)

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
