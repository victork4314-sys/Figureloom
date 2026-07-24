from __future__ import annotations

from importlib.resources import files
import json
import unittest

import figureloom_bio  # noqa: F401 - installs the complete language before tests run
from figureloom_bio.language_aliases import normalize_sentence
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


# Ambiguous words need a sentence that makes the intended operation unmistakable.
# Each entry includes the user's wording and the plain canonical wording it must equal.
FORM_SENTENCES = {
    ("show", "print"): ("Print the sequences.", "Show the sequences."),
    ("say", "print"): ("Print Analysis started.", "Say Analysis started."),
    ("say", "write"): ("Write Analysis started.", "Say Analysis started."),
    ("rename", "call"): ("Call the column old to new.", "Rename the column old to new."),
    ("find", "call"): ("Call variants.", "Find variants."),
    ("find", "design"): ("Design PCR primers.", "Find PCR primers."),
    (
        "find",
        "classify",
    ): (
        "Classify the organism in the file using bacteria-reference.",
        "Identify the organism in the file using bacteria-reference.",
    ),
    ("find", "reconstruct"): ("Reconstruct plasmids from the file.", "Find plasmids in the file."),
    ("continue", "continue"): ("Continue with the next sample.", "Continue with the next sample."),
    ("continue", "next"): ("Next sample.", "Continue with the next sample."),
    ("continue", "skip"): ("Skip this sample.", "Skip this sample."),
}


class ExecutableLanguageContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        package = files("figureloom_bio")
        cls.vocabulary = json.loads(package.joinpath("language_vocabulary.json").read_text(encoding="utf-8"))
        cls.aliases = json.loads(package.joinpath("language_aliases.json").read_text(encoding="utf-8"))

    @staticmethod
    def _one_instruction(sentence: str, *, lower_aliases: bool = False):
        source = normalize_sentence(sentence) if lower_aliases else sentence
        instructions = parse(source)
        if len(instructions) != 1:
            raise AssertionError(f"Expected one instruction from {sentence!r}, got {len(instructions)}")
        return instructions[0]

    def test_every_advertised_operation_word_reaches_the_proven_runtime_action(self) -> None:
        missing_templates = set(self.vocabulary["verbs"]) - set(DEFAULT_SENTENCES) - {"continue"}
        self.assertFalse(missing_templates, f"Missing executable templates for: {sorted(missing_templates)}")

        for canonical, forms in self.vocabulary["verbs"].items():
            for form in forms:
                with self.subTest(canonical=canonical, word=form):
                    custom = FORM_SENTENCES.get((canonical, form))
                    if custom is not None:
                        sentence, canonical_sentence = custom
                    else:
                        template = DEFAULT_SENTENCES.get(canonical)
                        self.assertIsNotNone(template, f"No executable sentence for {canonical}/{form}")
                        sentence = template.format(word=form.capitalize())
                        canonical_sentence = template.format(word=canonical.capitalize())

                    actual = self._one_instruction(sentence, lower_aliases=True)
                    expected = self._one_instruction(canonical_sentence, lower_aliases=True)
                    self.assertEqual(
                        (actual.action, actual.values),
                        (expected.action, expected.values),
                        f"The advertised word {form!r} did not reach the same runtime instruction as {canonical!r}.",
                    )

    def test_every_alias_example_reaches_an_executable_instruction(self) -> None:
        for rule in self.aliases["rules"]:
            for sentence in rule.get("examples", []):
                with self.subTest(rule=rule["id"], sentence=sentence):
                    self._one_instruction(sentence)

    def test_plain_alternatives_for_technical_work_reach_the_same_actions(self) -> None:
        pairs = (
            ("Put the reads together into a genome.", "Assemble the bacterial genome."),
            ("Find the genes in the genome.", "Annotate the file."),
            (
                "Find what organism the file is from using bacteria-reference.",
                "Identify the organism in the file using bacteria-reference.",
            ),
            ("Make a family tree from the sequences.", "Build a phylogenetic tree."),
            ("Show how spread out score is.", "Calculate the standard deviation of score."),
        )
        for simple, technical in pairs:
            with self.subTest(simple=simple):
                actual = self._one_instruction(simple, lower_aliases=True)
                expected = self._one_instruction(technical, lower_aliases=True)
                self.assertEqual((actual.action, actual.values), (expected.action, expected.values))


if __name__ == "__main__":
    unittest.main()
