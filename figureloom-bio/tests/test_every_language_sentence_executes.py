from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import shutil
import unittest

from figureloom_bio import Runner
from figureloom_bio.capabilities import expand_capabilities
from figureloom_bio.control_flow import run_flow_program, uses_control_flow
from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.language_aliases import RULES
from figureloom_bio.language_manifest import LanguageCommand, language_manifest
from figureloom_bio.parser import parse
from figureloom_bio.streaming_fasta import run_streaming_if_needed
from figureloom_bio.workflow_expansion import normalize_streaming_instructions


DNA_LONG = "ATG" + ("GCC" * 210) + "TAA"
DNA_TWO = "ATG" + ("GCT" * 80) + "GTC" + ("GCC" * 80) + "TAG"
PROTEIN = "MKKLLLLLLLLLLAAAAGGGGVVVVVVVVVVVVVVVVVVVV"


class EveryLanguageSentenceExecutesTests(unittest.TestCase):
    """The public vocabulary is executable, not merely searchable or parseable."""

    def test_every_manifest_sentence_parses_and_executes(self) -> None:
        failures: list[str] = []
        for command in language_manifest().commands:
            with self.subTest(command=command.id, sentence=command.example):
                error = self._exercise_manifest_command(command)
                if error:
                    failures.append(f"{command.id}: {command.example}\n  {error}")
        self.assertFalse(
            failures,
            "Documented FigureLoom Bio sentences that did not execute:\n\n" + "\n\n".join(failures),
        )

    def test_every_accepted_wording_executes(self) -> None:
        failures: list[str] = []
        for rule in RULES:
            for sentence in rule.get("examples", ()):
                with self.subTest(rule=rule["id"], sentence=sentence):
                    error = self._exercise_instruction(
                        str(sentence),
                        action_hint=str(rule.get("action", "")),
                        identity=f"wording:{rule['id']}",
                    )
                    if error:
                        failures.append(f"{rule['id']}: {sentence}\n  {error}")
        self.assertFalse(
            failures,
            "Accepted FigureLoom Bio wording that did not execute:\n\n" + "\n\n".join(failures),
        )

    def _exercise_manifest_command(self, command: LanguageCommand) -> str:
        if command.kind == "header":
            return self._exercise_header(command)
        return self._exercise_instruction(command.example, identity=command.id)

    def _exercise_header(self, command: LanguageCommand) -> str:
        sentence = command.example
        if command.id == "if_header":
            source = "Open the file samples.csv.\n" + sentence + "\n    Say The If block worked.\n"
        elif command.id == "otherwise_if_header":
            source = (
                "Open the file samples.csv.\n"
                "If the result is empty:\n"
                "    Say The first branch ran.\n"
                f"{sentence}\n"
                "    Say The Otherwise if block worked.\n"
            )
        elif command.id == "otherwise_header":
            source = (
                "Open the file samples.csv.\n"
                "If the result is empty:\n"
                "    Say The first branch ran.\n"
                f"{sentence}\n"
                "    Say The Otherwise block worked.\n"
            )
        elif command.id == "for_every_header":
            source = (
                "Open all FASTQ files as samples.\n"
                f"{sentence}\n"
                "    Open the sample.\n"
                "    Count the reads.\n"
            )
        elif command.id == "recipe_header":
            name = sentence.removeprefix("Make a recipe called ").removesuffix(":")
            source = f"{sentence}\n    Say The recipe worked.\nUse the recipe {name}.\n"
        else:
            return "No execution fixture exists for this documented block header."
        return self._try_source(source)

    def _exercise_instruction(self, sentence: str, *, action_hint: str = "", identity: str = "") -> str:
        try:
            instructions = parse(sentence)
        except Exception as error:  # the report must retain the exact rejected sentence
            return f"parse failed: {error}"
        if len(instructions) != 1:
            return f"parsed into {len(instructions)} instructions instead of one"
        action = action_hint or instructions[0].action

        special = self._special_source(identity, sentence, action)
        if special is not None:
            return self._try_source(special)

        errors: list[str] = []
        for prelude in self._candidate_preludes(action):
            source = "\n".join(part for part in (prelude, sentence) if part).rstrip() + "\n"
            error = self._try_source(source)
            if not error:
                return ""
            errors.append(error)
        compact: list[str] = []
        for error in errors:
            first = error.splitlines()[0].strip()
            if first and first not in compact:
                compact.append(first)
        return "; ".join(compact[:6]) or "execution failed without an error message"

    def _special_source(self, identity: str, sentence: str, action: str) -> str | None:
        command_id = identity.removeprefix("wording:")
        lowered = sentence.casefold()
        if action == "repeat_program" or command_id == "repeat_program":
            return f"{sentence}\nSay The repeated program worked.\n"
        if action in {"continue_sample", "skip_sample"} or command_id in {"continue_sample", "skip_sample"}:
            return (
                "Open all FASTQ files as samples.\n"
                "For every sample in samples:\n"
                "    Open the sample.\n"
                f"    {sentence}\n"
            )
        if action == "save_sample_result" or command_id == "save_sample_result":
            return (
                "Open all FASTQ files as samples.\n"
                "For every sample in samples:\n"
                "    Open the sample.\n"
                f"    {sentence}\n"
            )
        if action == "use_result" or lowered.startswith("use the result "):
            name = sentence.rstrip(".").split("result", 1)[1].strip()
            return f"Open the file sequences.fasta.\nCall the result {name}.\n{sentence}\n"
        if action == "use_recipe" or lowered.startswith("use the recipe "):
            name = sentence.rstrip(".").split("recipe", 1)[1].strip()
            return f"Make a recipe called {name}:\n    Say The recipe worked.\n{sentence}\n"
        if action == "open_sample" or lowered == "open the sample.":
            return (
                "Open all FASTQ files as samples.\n"
                "For every sample in samples:\n"
                f"    {sentence}\n"
            )
        if action == "mark_review" or command_id == "mark_review":
            return f"Open the file sequences.fasta.\n{sentence}\n"
        if action == "stop_program" or command_id == "stop_program":
            return sentence + "\n"
        if sentence.endswith(":"):
            return None
        return None

    @staticmethod
    def _candidate_preludes(action: str) -> tuple[str, ...]:
        targeted: dict[str, tuple[str, ...]] = {
            "save_pair": ("Open the files forward.fastq and reverse.fastq as a pair.",),
            "check_quality": ("Open the file reads.fastq.",),
            "show_quality_report": ("Open the file reads.fastq.\nCheck the quality.",),
            "show_alignment": ("Open the file sequences.fasta.\nCompare the sequences.",),
            "save_alignment": ("Open the file sequences.fasta.\nCompare the sequences.",),
            "count_variants": ("Open the file sequences.fasta.\nFind variants.",),
            "show_variants": ("Open the file sequences.fasta.\nFind variants.",),
            "save_variants": ("Open the file sequences.fasta.\nFind variants.",),
            "count_genes": ("Open the file sequences.fasta.\nFind genes.",),
            "show_genes": ("Open the file sequences.fasta.\nFind genes.",),
            "save_genes": ("Open the file sequences.fasta.\nFind genes.",),
            "check_primers": ("Open the file sequences.fasta.\nFind PCR primers.",),
            "show_primers": ("Open the file sequences.fasta.\nFind PCR primers.",),
            "show_tree": ("Open the file sequences.fasta.\nBuild a phylogenetic tree.",),
            "save_tree": ("Open the file sequences.fasta.\nBuild a phylogenetic tree.",),
            "read_statistic": ("Open the file reads.fastq.",),
            "grouped_box_plot": ("Open the file samples.csv.",),
            "heat_map_columns": ("Open the file samples.csv.",),
        }
        generic = (
            "",
            "Open the file samples.csv.",
            "Open the file sequences.fasta.",
            "Open the file proteins.fasta.",
            "Open the file reads.fastq.",
            "Open the files forward.fastq and reverse.fastq as a pair.",
            "Open the file sequences.fasta.\nCompare the sequences.",
            "Open the file sequences.fasta.\nFind variants.",
            "Open the file sequences.fasta.\nFind genes.",
            "Open the file sequences.fasta.\nFind PCR primers.",
            "Open the file sequences.fasta.\nBuild a phylogenetic tree.",
            "Open the file samples.csv.\nCall the result current result.",
        )
        return targeted.get(action, ()) + generic

    def _try_source(self, source: str) -> str:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            self._write_fixtures(root)
            program = root / "audit.flbio"
            program.write_text(source, encoding="utf-8")
            try:
                if uses_control_flow(source):
                    run_flow_program(program, source, allow_tools=False)
                    return ""
                instructions = expand_capabilities(parse(source))
                streaming = normalize_streaming_instructions(instructions)
                output = run_streaming_if_needed(program.resolve(), streaming)
                if output is None:
                    runner = Runner(program.resolve())
                    runner.allow_external_tools = False
                    runner.run(instructions)
                return ""
            except FigureLoomBioError as error:
                return error.plain_message()
            except Exception as error:
                return f"{type(error).__name__}: {error}"

    @staticmethod
    def _write_fixtures(root: Path) -> None:
        table = (
            "sample,old_name,condition,status,age,score,count,group,x,y,effect,p_value,expression,fold_change,gene_a,gene_b\n"
            "sample-17,old,treated,passed,30,10,10,treated,1,2,2.0,0.01,10,2.0,4,8\n"
            "sample-18,old,treated,,40,20,20,treated,2,5,1.5,0.03,12,1.5,5,9\n"
            "sample-19,other,control,failed,25,5,5,control,3,7,-1.0,0.20,4,-1.0,2,3\n"
            "sample-19,other,control,passed,25,15,15,control,4,11,-1.4,0.40,5,-1.4,3,2\n"
        )
        for name in ("samples.csv", "metadata.csv", "more-samples.csv"):
            (root / name).write_text(table, encoding="utf-8")
        (root / "samples.tsv").write_text(table.replace(",", "\t"), encoding="utf-8")

        fasta = (
            f">sample-17 first sequence\n{DNA_LONG}\n"
            f">old-name second sequence\n{DNA_TWO}\n"
            ">failed-sample ambiguous sequence\nATGCNNNNATGC---ATGCGTACGTAA\n"
            ">duplicate-one\nATGCAT\n"
            ">duplicate-two\nATGCAT\n"
        )
        for name in (
            "sequences.fasta", "reference.fasta", "first.fasta", "second.fasta",
            "more.fasta", "more-sequences.fasta", "source.fasta", "reads.fasta",
        ):
            (root / name).write_text(fasta, encoding="utf-8")
        (root / "proteins.fasta").write_text(f">protein-one\n{PROTEIN}\n>protein-two\nMSTNPKPQRKTKRNTNRRPQDVKFVLLLLFFFVVVVVV\n", encoding="utf-8")

        fastq = (
            "@read-01\n" + ("ACGT" * 40) + "\n+\n" + ("I" * 160) + "\n"
            "@read-02\n" + ("TGCA" * 30) + "\n+\n" + ("H" * 120) + "\n"
            "@read-03\nACGTNNNNACGT\n+\n!!!!!!!!!!!!\n"
        )
        for name in ("reads.fastq", "forward.fastq", "reverse.fastq", "sample-a.fastq", "sample-b.fastq"):
            (root / name).write_text(fastq, encoding="utf-8")

        assembly = root / "assembly"
        assembly.mkdir()
        (assembly / "contigs.fasta").write_text(fasta, encoding="utf-8")
        (root / "variants.vcf").write_text("##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\nchr1\t2\t.\tT\tC\t60\tPASS\t.\n", encoding="utf-8")
        (root / "annotations.gff3").write_text("##gff-version 3\nchr1\tFigureLoom\tgene\t1\t9\t.\t+\t.\tID=gene-1\n", encoding="utf-8")
        (root / "regions.bed").write_text("chr1\t0\t9\tregion-1\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
