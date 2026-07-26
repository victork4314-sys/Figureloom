from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner
from figureloom_bio.semantic_language import parse_instruction


class SemanticLanguageTests(unittest.TestCase):
    def test_required_structured_examples(self) -> None:
        cases = {
            "Keep sequences over 500 bases.": ("keep_strict_length", ("500",)),
            "Keep only the sequences that are longer than 500 bases.": ("keep_strict_length", ("500",)),
            "Retain every sequence above 500 bases.": ("keep_strict_length", ("500",)),
            "Select sequences with more than 500 bases.": ("keep_strict_length", ("500",)),
            "Remove every read under 20 bases.": ("remove_shorter", ("20",)),
            "Delete reads shorter than 20 bases.": ("remove_shorter", ("20",)),
            "Show me the names of all sequences.": ("show_sequence_names", ()),
            "List every sequence name.": ("show_sequence_names", ()),
            "Write the cleaned reads into results.fastq.": ("save_sequences", ("results.fastq",)),
            "Save cleaned reads to results.fastq.": ("save_sequences", ("results.fastq",)),
            "Change failed to rejected in the status column.": ("change_value", ("failed", "rejected", "status")),
            "Replace failed with rejected under status.": ("change_value", ("failed", "rejected", "status")),
            "Find genes in sample.fasta.": ("find_genes", ()),
            "Look for genes inside sample.fasta.": ("find_genes", ()),
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                node = parse_instruction(source)
                self.assertEqual((node.action, tuple(node.arguments["runtime_values"])), expected)
                self.assertEqual(node.source + ".", source)

        changed = parse_instruction("Change failed to rejected in the status column.")
        self.assertEqual(changed.roles["source_value"], "failed")
        self.assertEqual(changed.roles["destination_value"], "rejected")
        self.assertEqual(changed.roles["column"], "status")

        comparison = parse_instruction("Remove every read under 20 bases.")
        self.assertEqual(comparison.comparison["operator"], "less")
        self.assertNotIn("column", comparison.roles)

        column = parse_instruction("Replace failed with rejected under status.")
        self.assertEqual(column.roles["column"], "status")
        self.assertIsNone(column.comparison)

        source_file = parse_instruction("Find genes in sample.fasta.")
        self.assertEqual(source_file.roles["source"], "sample.fasta")
        self.assertNotIn("destination", source_file.roles)

    def test_browser_and_python_structures_agree_for_required_examples(self) -> None:
        sources = [
            "Keep sequences over 500 bases.",
            "Keep only the sequences that are longer than 500 bases.",
            "Retain every sequence above 500 bases.",
            "Select sequences with more than 500 bases.",
            "Remove every read under 20 bases.",
            "Delete reads shorter than 20 bases.",
            "Show me the names of all sequences.",
            "List every sequence name.",
            "Write the cleaned reads into results.fastq.",
            "Save cleaned reads to results.fastq.",
            "Change failed to rejected in the status column.",
            "Replace failed with rejected under status.",
            "Find genes in sample.fasta.",
            "Look for genes inside sample.fasta.",
        ]
        node_source = r"""
import fs from 'node:fs';
import vm from 'node:vm';
const grammar=JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_grammar.json','utf8'));
const code=fs.readFileSync('ide/ide-semantic-language.js','utf8');
const sandbox={window:{dispatchEvent(){}},CustomEvent:class{},fetch:async()=>({ok:true,json:async()=>grammar}),console};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const api=await sandbox.window.FigureLoomBioSemanticLanguageReady;
const sources=JSON.parse(fs.readFileSync(0,'utf8'));
const output=sources.map((source)=>api.parseSemanticInstruction(source.slice(0,-1),1));
process.stdout.write(JSON.stringify(output));
"""
        repository_root = Path(__file__).resolve().parents[2]
        completed = subprocess.run(
            ["node", "--input-type=module", "-e", node_source],
            input=json.dumps(sources),
            text=True,
            capture_output=True,
            check=True,
            cwd=repository_root,
        )
        browser_nodes = json.loads(completed.stdout)
        for source, browser in zip(sources, browser_nodes, strict=True):
            with self.subTest(source=source):
                python = parse_instruction(source).to_dict()
                self.assertEqual(browser["operation"], python["operation"])
                self.assertEqual(browser["action"], python["action"])
                self.assertEqual(set(browser["targets"]), set(python["targets"]))
                self.assertEqual(browser["arguments"]["runtime_values"], python["arguments"]["runtime_values"])
                for role in {"source", "destination", "column", "source_value", "destination_value"}:
                    self.assertEqual(browser["roles"].get(role), python["roles"].get(role))

    def test_direct_runtime_dispatch_without_rewriting(self) -> None:
        with tempfile.TemporaryDirectory() as folder_name:
            folder = Path(folder_name)
            program = folder / "program.flbio"
            table = folder / "samples.csv"
            table.write_text(
                "sample,status\n"
                "sample-1,failed\n"
                "sample-2,passed\n",
                encoding="utf-8",
            )
            source = (
                "Open samples.csv.\n"
                "Change failed to rejected in the status column.\n"
                "Save the result to cleaned.csv.\n"
            )
            instructions = parse(source)
            self.assertEqual([item.action for item in instructions], ["open_file", "change_value", "save_result"])
            self.assertEqual(instructions[1].node.source, "Change failed to rejected in the status column")
            Runner(program).run(instructions)
            self.assertEqual(
                (folder / "cleaned.csv").read_text(encoding="utf-8"),
                "sample,status\nsample-1,rejected\nsample-2,passed\n",
            )


if __name__ == "__main__":
    unittest.main()
