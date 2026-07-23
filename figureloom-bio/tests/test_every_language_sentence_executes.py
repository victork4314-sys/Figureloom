from __future__ import annotations

import os
from pathlib import Path
from tempfile import TemporaryDirectory
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
        command_id = identity.removeprefix("wording:")
        special = self._special_source(command_id, sentence, action_hint)
        if special is not None:
            return self._try_source(special)

        try:
            instructions = parse(sentence)
        except Exception as error:
            return f"parse failed: {error}"
        if len(instructions) != 1:
            return f"parsed into {len(instructions)} instructions instead of one"
        action = action_hint or instructions[0].action

        errors: list[str] = []
        for prelude in self._candidate_preludes(action, command_id):
            source = "\n".join(part for part in (prelude, sentence) if part).rstrip() + "\n"
            error = self._try_source(source)
            if not error:
                return ""
            errors.append(error)
        compact: list[str] = []
        for error in errors:
            one_line = " ".join(part.strip() for part in error.splitlines() if part.strip())
            if one_line and one_line not in compact:
                compact.append(one_line)
        return "; ".join(compact[:6]) or "execution failed without an error message"

    def _special_source(self, command_id: str, sentence: str, action: str) -> str | None:
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
        if action == "call_result" or command_id == "call_result":
            return f"Open the file sequences.fasta.\n{sentence}\n"
        if action == "use_result" or lowered.startswith("use the result "):
            name = sentence.rstrip(".").split("result", 1)[1].strip()
            return f"Open the file sequences.fasta.\nCall the result {name}.\n{sentence}\n"
        if action == "use_recipe" or lowered.startswith("use the recipe "):
            name = sentence.rstrip(".").split("recipe", 1)[1].strip()
            return f"Make a recipe called {name}:\n    Say The recipe worked.\n{sentence}\n"
        if action == "open_all_files" or command_id == "open_all_files":
            return sentence + "\n"
        if action == "open_sample" or lowered == "open the sample.":
            return (
                "Open all FASTQ files as samples.\n"
                "For every sample in samples:\n"
                f"    {sentence}\n"
            )
        if action == "make_sure" or command_id == "make_sure":
            return f"Open the file reads.fastq.\n{sentence}\n"
        if action == "show_warning" or command_id == "show_warning":
            return sentence + "\n"
        if action == "mark_review" or command_id == "mark_review":
            return f"Open the file sequences.fasta.\n{sentence}\n"
        if action == "stop_program" or command_id == "stop_program":
            return sentence + "\n"
        if command_id == "rename_column":
            return f"Open the file rename-source.csv.\n{sentence}\n"
        return None

    @staticmethod
    def _candidate_preludes(action: str, command_id: str) -> tuple[str, ...]:
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
            "assemble_current_bacterial_genome": ("Open the file reads.fastq.",),
            "annotate_current_file": ("Open the file sequences.fasta.",),
            "find_resistance_current_file": ("Open the file sequences.fasta.",),
            "find_virulence_current_file": ("Open the file sequences.fasta.",),
            "identify_current_file": ("Open the file reads.fastq.",),
            "find_plasmids_current_file": ("Open the file sequences.fasta.",),
        }
        command_targeted: dict[str, tuple[str, ...]] = {
            "assemble_current_file": ("Open the file reads.fastq.",),
            "annotate_current_file": ("Open the file sequences.fasta.",),
            "find_resistance_current_file": ("Open the file sequences.fasta.",),
            "find_virulence_current_file": ("Open the file sequences.fasta.",),
            "identify_current_file": ("Open the file reads.fastq.",),
            "find_plasmids_current_file": ("Open the file sequences.fasta.",),
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
        return targeted.get(action, ()) + command_targeted.get(command_id, ()) + generic

    def _try_source(self, source: str) -> str:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            self._write_fixtures(root)
            tool_folder = self._write_fake_tools(root)
            program = root / "audit.flbio"
            program.write_text(source, encoding="utf-8")
            old_path = os.environ.get("PATH", "")
            os.environ["PATH"] = str(tool_folder) + os.pathsep + old_path
            try:
                if uses_control_flow(source):
                    run_flow_program(program, source, allow_tools=True)
                    return ""
                instructions = expand_capabilities(parse(source))
                streaming = normalize_streaming_instructions(instructions)
                output = run_streaming_if_needed(program.resolve(), streaming)
                if output is None:
                    runner = Runner(program.resolve())
                    runner.allow_external_tools = True
                    runner.run(instructions)
                return ""
            except FigureLoomBioError as error:
                location = f"Line {error.line_number}: " if error.line_number is not None else ""
                return location + error.message
            except Exception as error:
                return f"{type(error).__name__}: {error}"
            finally:
                os.environ["PATH"] = old_path

    @staticmethod
    def _write_fake_tools(root: Path) -> Path:
        folder = root / "fake-tools"
        folder.mkdir()
        script = r'''#!/usr/bin/env python3
from pathlib import Path
import os
import sys

name = Path(sys.argv[0]).name
args = sys.argv[1:]

def value(flag, default=""):
    try:
        return args[args.index(flag) + 1]
    except (ValueError, IndexError):
        return default

def fasta(path):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(">contig-1\nATGGCCGCCGCCTAA\n>contig-2\nATGAAATAG\n", encoding="utf-8")

if name in {"spades.py", "spades"}:
    output = Path(value("-o", "assembly"))
    output.mkdir(parents=True, exist_ok=True)
    fasta(output / "contigs.fasta")
    print("SPAdes assembly completed")
elif name in {"quast.py", "quast"}:
    output = Path(value("-o", "assembly-quality"))
    output.mkdir(parents=True, exist_ok=True)
    (output / "report.tsv").write_text("Assembly\t# contigs\nassembly\t2\n", encoding="utf-8")
    print("QUAST report completed")
elif name == "prokka":
    output = Path(value("--outdir", "annotation"))
    output.mkdir(parents=True, exist_ok=True)
    (output / "PROKKA.gff").write_text("##gff-version 3\ncontig-1\tProkka\tgene\t1\t9\t.\t+\t.\tID=gene-1\n", encoding="utf-8")
    print("Prokka annotation completed")
elif name == "abricate":
    print("#FILE\tSEQUENCE\tSTART\tEND\tGENE\t%COVERAGE\t%IDENTITY")
    print("assembly.fasta\tcontig-1\t1\t9\ttest-gene\t100\t100")
elif name == "kraken2":
    report = Path(value("--report", "kraken-report.txt"))
    output = Path(value("--output", "kraken-output.txt"))
    report.write_text("100.00\t3\t3\tS\t562\tEscherichia coli\n", encoding="utf-8")
    output.write_text("C\tread-01\t562\t160\t562:160\n", encoding="utf-8")
    print("Kraken classification completed")
elif name == "mob_recon":
    output = Path(value("--outdir", "plasmids"))
    output.mkdir(parents=True, exist_ok=True)
    fasta(output / "plasmid_contigs.fasta")
    (output / "contig_report.txt").write_text("contig_id\tmolecule_type\ncontig-1\tplasmid\n", encoding="utf-8")
    print("MOB-recon completed")
elif name == "seqkit":
    print("file\tformat\ttype\tnum_seqs\tsum_len\nreads.fasta\tFASTA\tDNA\t5\t1000")
else:
    print(f"{name} completed")
'''
        for name in ("spades.py", "spades", "quast.py", "quast", "prokka", "abricate", "kraken2", "mob_recon", "seqkit"):
            path = folder / name
            path.write_text(script, encoding="utf-8")
            path.chmod(0o755)
        return folder

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
        (root / "rename-source.csv").write_text(
            "old_name,condition,status\nalpha,treated,passed\nbeta,control,failed\n",
            encoding="utf-8",
        )

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
            "@read-04\n" + ("GATTACA" * 18) + "\n+\n" + ("I" * 126) + "\n"
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
