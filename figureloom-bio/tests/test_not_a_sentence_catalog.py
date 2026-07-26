from __future__ import annotations

import json
import random
import subprocess
import tempfile
import unittest
from pathlib import Path

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.semantic_language import parse_instruction


REPO_ROOT = Path(__file__).resolve().parents[2]
TEXT_SUFFIXES = {'.py', '.js', '.json', '.md', '.html', '.yml', '.yaml', '.txt'}


def repository_text() -> str:
    chunks: list[str] = []
    for path in REPO_ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if '.git' in path.parts or '__pycache__' in path.parts:
            continue
        try:
            chunks.append(path.read_text(encoding='utf-8', errors='ignore'))
        except OSError:
            continue
    return '\n'.join(chunks)


class NotASentenceCatalogTests(unittest.TestCase):
    """Prove that instruction slots compose without storing each full sentence."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.seed = 20260727
        cls.random = random.Random(cls.seed)
        cls.repo_text = repository_text()

    def novel(self, prefix: str) -> str:
        return f"{prefix}_{self.random.randrange(100_000_000, 999_999_999)}"

    def generated_cases(self) -> list[tuple[str, str, list[str], dict[str, str]]]:
        cases: list[tuple[str, str, list[str], dict[str, str]]] = []
        for _ in range(40):
            old = self.novel('old')
            new = self.novel('new')
            column = self.novel('column')
            cases.append((
                f"Change {old} to {new} in the {column} column.",
                'change_value',
                [old, new, column],
                {'source_value': old, 'destination_value': new, 'column': column},
            ))

            value = self.novel('value')
            field = self.novel('field')
            cases.append((
                f"Keep only rows marked {value} under {field}.",
                'keep_rows',
                [value, field],
                {'value': value, 'column': field},
            ))

            rejected = self.novel('rejected')
            status = self.novel('status')
            cases.append((
                f"Remove rows marked {rejected} under {status}.",
                'remove_rows',
                [rejected, status],
                {'value': rejected, 'column': status},
            ))

            minimum = str(self.random.randrange(31, 997))
            cases.append((
                f"Keep sequences over {minimum} bases.",
                'keep_strict_length',
                [minimum],
                {},
            ))

            read_limit = str(self.random.randrange(7, 199))
            cases.append((
                f"Remove every read under {read_limit} bases.",
                'remove_shorter',
                [read_limit],
                {},
            ))

            fasta = f"{self.novel('genome')}.fasta"
            cases.append((
                f"Find genes in {fasta}.",
                'find_genes',
                [],
                {'source': fasta},
            ))

            output = f"{self.novel('result')}.fastq"
            cases.append((
                f"Write the cleaned reads into {output}.",
                'save_sequences',
                [output],
                {'destination': output},
            ))
        return cases

    def test_generated_sentences_are_absent_but_parse_by_slots(self) -> None:
        cases = self.generated_cases()
        self.assertGreaterEqual(len(cases), 250)
        for source, action, runtime_values, roles in cases:
            with self.subTest(source=source):
                self.assertNotIn(source, self.repo_text, 'Generated proof sentence already exists in the repository.')
                node = parse_instruction(source)
                self.assertEqual(node.action, action)
                self.assertEqual(node.arguments['runtime_values'], runtime_values)
                for role, expected in roles.items():
                    self.assertEqual(node.roles.get(role), expected)

    def test_changing_one_slot_changes_only_that_semantic_role(self) -> None:
        first = parse_instruction('Change copper_712941 to violet_842155 in the phenotype_661103 column.')
        second = parse_instruction('Change copper_712941 to amber_593827 in the phenotype_661103 column.')
        third = parse_instruction('Change copper_712941 to amber_593827 in the treatment_774209 column.')

        self.assertEqual(first.action, second.action)
        self.assertEqual(second.action, third.action)
        self.assertEqual(first.roles['source_value'], second.roles['source_value'])
        self.assertNotEqual(first.roles['destination_value'], second.roles['destination_value'])
        self.assertEqual(second.roles['destination_value'], third.roles['destination_value'])
        self.assertNotEqual(second.roles['column'], third.roles['column'])

    def test_browser_and_python_agree_on_generated_unstored_instructions(self) -> None:
        sources = [case[0] for case in self.generated_cases()[:120]]
        node_source = r"""
import fs from 'node:fs';
import vm from 'node:vm';
const grammar=JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_grammar.json','utf8'));
const code=fs.readFileSync('ide/ide-semantic-language.js','utf8');
const sandbox={window:{dispatchEvent(){}},CustomEvent:class{},fetch:async()=>({ok:true,json:async()=>grammar}),console};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const api=await sandbox.window.FigureLoomBioSemanticLanguageReady;
const sources=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(sources.map((source)=>api.parseSemanticInstruction(source.replace(/\.$/,''),1))));
"""
        completed = subprocess.run(
            ['node', '--input-type=module', '-e', node_source],
            input=json.dumps(sources),
            text=True,
            capture_output=True,
            check=True,
            cwd=REPO_ROOT,
        )
        browser_nodes = json.loads(completed.stdout)
        for source, browser in zip(sources, browser_nodes, strict=True):
            python = parse_instruction(source).to_dict()
            self.assertEqual(browser['action'], python['action'])
            self.assertEqual(browser['roles'], python['roles'])
            self.assertEqual(browser['arguments']['runtime_values'], python['arguments']['runtime_values'])

    def test_generated_unstored_program_executes_directly(self) -> None:
        column = 'phenotype_908173'
        old = 'copper_712941'
        new = 'violet_842155'
        input_name = 'specimens_550291.csv'
        output_name = 'converted_883104.csv'
        source = (
            f"Open the file {input_name}.\n"
            f"Change {old} to {new} in the {column} column.\n"
            f"Save the result to {output_name}.\n"
        )
        self.assertNotIn(source, self.repo_text)
        with tempfile.TemporaryDirectory() as folder_name:
            folder = Path(folder_name)
            (folder / input_name).write_text(
                f"sample,{column}\nalpha,{old}\nbeta,other_118205\n",
                encoding='utf-8',
            )
            program = folder / 'generated-proof.flbio'
            instructions = parse(source)
            self.assertEqual([item.action for item in instructions], ['open_file', 'change_value', 'save_result'])
            Runner(program).run(instructions)
            self.assertEqual(
                (folder / output_name).read_text(encoding='utf-8'),
                f"sample,{column}\nalpha,{new}\nbeta,other_118205\n",
            )

    def test_run_path_contains_no_canonical_sentence_bridge(self) -> None:
        index = (REPO_ROOT / 'ide' / 'index.html').read_text(encoding='utf-8')
        run_source = (REPO_ROOT / 'ide' / 'ide-app-v2.js').read_text(encoding='utf-8')
        authority = (REPO_ROOT / 'ide' / 'ide-semantic-run-authority.js').read_text(encoding='utf-8')
        semantic_position = index.index('ide-semantic-run-authority.js')
        app_position = index.index('ide-app-v2.js')
        self.assertLess(semantic_position, app_position)
        self.assertIn('api.parseProgram(elements.editor.value)', run_source)
        self.assertIn('semanticRuntime.createExecutor', run_source)
        self.assertNotIn('instructionPatterns', run_source)
        self.assertNotIn('compileLine', run_source)
        self.assertNotIn('canonicalSentence', run_source)
        self.assertIn('stopImmediatePropagation', authority)


if __name__ == '__main__':
    unittest.main()
