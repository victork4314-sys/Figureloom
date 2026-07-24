from __future__ import annotations

from importlib.resources import files
import json
import unittest

import figureloom_bio  # noqa: F401 - installs the complete language before tests run
from figureloom_bio.control_flow import parse_program, uses_control_flow
from figureloom_bio.language_manifest import language_manifest
from figureloom_bio.parser import parse


DEFAULT_SENTENCES = {
    "open": "{word} the file samples.csv.",
    "keep": "{word} only sequences longer than 5 bases.",
    "remove": "{word} sequences containing N.",
    "show": "{word} the sequences.",
    "count": "{word} the sequences.",
    "save": "{word} the sequences as output.fasta.",
    "copy": "{word} the file as backup.fasta.",
    "use": "{word} the sequence named sample-1.",
    "rename": "{word} the column old to new.",
    "sort": "{word} the rows by score.",
    "replace": "{word} empty values under status with unknown.",
    "combine": "{word} the rows from more.csv.",
    "split": "{word} the sequences into files with 10 sequences each as part.fasta.",
    "convert": "{word} the DNA to RNA.",
    "calculate": "{word} the GC content.",
    "find": "{word} genes.",
    "create": "{word} a PCA plot.",
    "check": "{word} the sequences.",
    "compare": "{word} the sequences.",
    "trim": "{word} 5 bases from the start.",
    "normalize": "{word} the counts under count.",
    "prepare": "{word} bacterial reads.",
    "assemble": "{word} the bacterial genome.",
    "annotate": "{word} the file.",
    "translate": "{word} the sequences.",
    "say": "{word} Analysis started.",
    "run": "{word} this program 2 times.",
    "stop": "{word} the program.",
    "mark": "{word} the sample for review.",
    "warn": "{word} This sample needs review.",
}


FORM_SENTENCES = {
    ("show", "print"): "Print the sequences.",
    ("say", "print"): "Print Analysis started.",
    ("say", "write"): "Write Analysis started.",
    ("rename", "call"): "Call the column old to new.",
    ("find", "call"): "Call variants.",
    ("find", "design"): "Design PCR primers.",
    ("find", "classify"): "Classify the organism in the file using bacteria-reference.",
    ("find", "reconstruct"): "Reconstruct plasmids from the file.",
    ("continue", "continue"): "Continue with the next sample.",
    ("continue", "next"): "Next sample.",
    ("continue", "skip"): "Skip this sample.",
}


FLOW_ONLY_IDS = {
    "call_result",
    "use_result",
    "save_sample_result",
    "stop_program",
    "continue_sample",
    "skip_sample",
    "mark_review",
    "show_warning",
    "if_header",
    "otherwise_if_header",
    "otherwise_header",
    "for_every_header",
    "make_recipe_header",
    "use_recipe",
    "make_sure",
    "open_all_files",
    "open_sample",
}


class ExecutableLanguageContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        package = files("figureloom_bio")
        cls.vocabulary = json.loads(package.joinpath("language_vocabulary.json").read_text(encoding="utf-8"))
        cls.aliases = json.loads(package.joinpath("language_aliases.json").read_text(encoding="utf-8"))

    def test_every_advertised_operation_word_compiles_in_context(self) -> None:
        missing_templates = set(self.vocabulary["verbs"]) - set(DEFAULT_SENTENCES) - {"continue"}
        self.assertFalse(missing_templates, f"Missing executable templates for: {sorted(missing_templates)}")

        for canonical, forms in self.vocabulary["verbs"].items():
            for form in forms:
                with self.subTest(canonical=canonical, word=form):
                    sentence = FORM_SENTENCES.get((canonical, form))
                    if sentence is None:
                        template = DEFAULT_SENTENCES.get(canonical)
                        self.assertIsNotNone(template, f"No executable sentence for {canonical}/{form}")
                        sentence = template.format(word=form.capitalize())
                    instructions = parse(sentence)
                    self.assertEqual(
                        len(instructions),
                        1,
                        f"The advertised word {form!r} did not compile as one instruction: {sentence}",
                    )

    def test_every_alias_example_compiles(self) -> None:
        for rule in self.aliases["rules"]:
            for sentence in rule.get("examples", []):
                with self.subTest(rule=rule["id"], sentence=sentence):
                    instructions = parse(sentence)
                    self.assertEqual(len(instructions), 1)

    def test_every_manifest_instruction_is_executable_or_real_control_flow(self) -> None:
        for command in language_manifest().commands:
            with self.subTest(command=command.id, sentence=command.example):
                if command.kind == "header":
                    source = command.example + "\n    Say tested.\n"
                    if command.id.startswith("otherwise"):
                        source = "If false:\n    Say first.\n" + source
                    parse_program(source)
                    continue

                if command.id in FLOW_ONLY_IDS or uses_control_flow(command.example):
                    parse_program(command.example)
                    continue

                instructions = parse(command.example)
                self.assertEqual(len(instructions), 1)

    def test_plain_alternatives_for_technical_work_are_executable(self) -> None:
        sentences = (
            "Put the reads together into a genome.",
            "Find the genes in the genome.",
            "Find what organism the file is from using bacteria-reference.",
            "Make a family tree from the sequences.",
            "Show how spread out score is.",
        )
        for sentence in sentences:
            with self.subTest(sentence=sentence):
                self.assertEqual(len(parse(sentence)), 1)


if __name__ == "__main__":
    unittest.main()
