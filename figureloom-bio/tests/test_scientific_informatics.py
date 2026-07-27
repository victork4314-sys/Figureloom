from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from figureloom_bio import Runner
from figureloom_bio.bio_expansion import EXPANSION
from figureloom_bio.parser import parse


ACTIONS = [
    "calculate_codon_use", "calculate_gc_skew", "find_sequence_repeats", "find_telomeres", "summarize_copy_number", "find_structural_variants",
    "normalize_expression", "summarize_differential_expression", "find_marker_genes", "summarize_splicing", "count_isoforms", "calculate_gene_correlation",
    "calculate_protein_weight", "count_peptides", "summarize_protein_coverage", "find_protein_domains", "find_missed_cleavages", "create_peptide_length_plot",
    "summarize_taxa", "calculate_richness", "calculate_shannon_diversity", "find_resistance_genes", "summarize_abundance", "find_unclassified_reads",
    "count_tree_tips", "summarize_branch_lengths", "find_long_branches", "create_distance_matrix", "summarize_phylogenetic_tree", "compare_phylogenetic_trees",
    "summarize_methylation", "find_methylated_sites", "summarize_peaks", "find_promoter_peaks", "calculate_peak_widths", "summarize_chromatin_accessibility",
    "summarize_cells", "count_umis", "summarize_cell_clusters", "find_doublets", "summarize_mitochondrial_reads", "normalize_single_cell_counts",
    "calculate_allele_frequency", "calculate_heterozygosity", "count_haplotypes", "summarize_populations", "find_rare_variants", "summarize_genotypes",
    "count_residues", "count_protein_chains", "find_residue_contacts", "summarize_secondary_structure", "find_surface_residues", "summarize_coordinates",
]


def _pick(group: str, key: str, index: int) -> str:
    values = EXPANSION[group][key]
    return values[index % len(values)]


def _number_for(action: str, index: int) -> str:
    values = {
        "find_long_branches": "0.5",
        "find_methylated_sites": "0.7",
        "find_doublets": "0.5",
        "find_rare_variants": "0.05",
        "find_residue_contacts": "8",
        "find_surface_residues": "20",
    }
    return values.get(action, str(5 + index))


def _source_for(rule: dict, index: int) -> str:
    pieces = [
        _pick("operations", rule["operation"], index),
        _pick("targets", rule["target"], index + 1),
    ]
    if rule.get("needs_number"):
        pieces.append(_number_for(rule["action"], index))
    if rule.get("needs_file"):
        pieces.extend([_pick("roles", "using", index), "other-tree.csv"])
    source = " ".join(pieces)
    return source[:1].upper() + source[1:] + "."


class ScientificInformaticsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name)
        self.program = self.folder / "program.flbio"
        self._write_inputs()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _write_inputs(self) -> None:
        (self.folder / "dna.fasta").write_text(
            ">dna_a\nATGATGATGTTAGGGTTAGGGCCCTAA\n"
            ">dna_b\nATGCCCGGGAAATAGTAA\n"
            ">dna_c\nACGTACGTACGT\n",
            encoding="utf-8",
        )
        (self.folder / "protein.fasta").write_text(
            ">protein_a\nMKWVTFISLLFLFSSAYSR\n"
            ">protein_b\nMKRPTKRRK\n",
            encoding="utf-8",
        )
        (self.folder / "variants.csv").write_text(
            "chrom,pos,ref,alt,svtype,copy_number,AC,AN,population,sample_a,sample_b\n"
            "1,100,A,G,,2,1,4,north,0/1,0/0\n"
            "1,200,A,<DEL>,DEL,1,3,4,south,1/1,0/1\n"
            "2,300,C,T,,4,0,4,north,0/0,0/0\n",
            encoding="utf-8",
        )
        (self.folder / "expression.csv").write_text(
            "gene,sample_a,sample_b,log2fc,padj,event,psi,isoform,transcript_id\n"
            "g1,10,20,2.1,0.01,SE,0.8,i1,t1\n"
            "g2,30,15,-1.5,0.03,A5SS,0.4,i2,t2\n"
            "g3,5,5,0.1,0.9,SE,0.5,i3,t3\n",
            encoding="utf-8",
        )
        (self.folder / "proteins.csv").write_text(
            "protein,coverage,domain\n"
            "p1,80,PF00001\n"
            "p2,55,\n",
            encoding="utf-8",
        )
        (self.folder / "metagenome.csv").write_text(
            "read,taxon,abundance,gene,product,classification\n"
            "r1,Escherichia coli,40,blaTEM,beta-lactam resistance,classified\n"
            "r2,Bacillus subtilis,20,abc,enzyme,classified\n"
            "r3,unclassified,5,,,unclassified\n",
            encoding="utf-8",
        )
        (self.folder / "tree.csv").write_text(
            "parent,child,branch_length\n"
            "root,clade_a,0.2\n"
            "clade_a,tip_1,0.8\n"
            "clade_a,tip_2,0.3\n",
            encoding="utf-8",
        )
        (self.folder / "other-tree.csv").write_text(
            "parent,child,branch_length\n"
            "root,tip_1,0.4\n"
            "root,tip_3,0.6\n",
            encoding="utf-8",
        )
        (self.folder / "epigenome.csv").write_text(
            "chrom,start,end,methylation,annotation,accessibility\n"
            "1,100,180,0.9,promoter,25\n"
            "1,220,270,0.3,enhancer,10\n",
            encoding="utf-8",
        )
        (self.folder / "single-cell.csv").write_text(
            "cell,cluster,umis,doublet_score,percent_mt,gene_a,gene_b\n"
            "c1,0,1000,0.1,4,10,2\n"
            "c2,1,2000,0.8,12,3,20\n",
            encoding="utf-8",
        )
        (self.folder / "structure.csv").write_text(
            "chain,residue,x,y,z,secondary_structure,sasa\n"
            "A,1,0,0,0,helix,35\n"
            "A,2,3,0,0,helix,10\n"
            "B,3,6,0,0,sheet,45\n",
            encoding="utf-8",
        )

    def _file_for(self, action: str) -> str:
        groups = {
            "dna.fasta": {
                "calculate_codon_use", "calculate_gc_skew", "find_sequence_repeats", "find_telomeres", "create_distance_matrix", "count_haplotypes",
            },
            "protein.fasta": {
                "calculate_protein_weight", "count_peptides", "find_missed_cleavages", "create_peptide_length_plot", "count_residues",
            },
            "proteins.csv": {"summarize_protein_coverage", "find_protein_domains"},
            "variants.csv": {
                "summarize_copy_number", "find_structural_variants", "calculate_allele_frequency", "calculate_heterozygosity", "summarize_populations", "find_rare_variants", "summarize_genotypes",
            },
            "expression.csv": {
                "normalize_expression", "summarize_differential_expression", "find_marker_genes", "summarize_splicing", "count_isoforms", "calculate_gene_correlation",
            },
            "metagenome.csv": {
                "summarize_taxa", "calculate_richness", "calculate_shannon_diversity", "find_resistance_genes", "summarize_abundance", "find_unclassified_reads",
            },
            "tree.csv": {
                "count_tree_tips", "summarize_branch_lengths", "find_long_branches", "summarize_phylogenetic_tree", "compare_phylogenetic_trees",
            },
            "epigenome.csv": {
                "summarize_methylation", "find_methylated_sites", "summarize_peaks", "find_promoter_peaks", "calculate_peak_widths", "summarize_chromatin_accessibility",
            },
            "single-cell.csv": {
                "summarize_cells", "count_umis", "summarize_cell_clusters", "find_doublets", "summarize_mitochondrial_reads", "normalize_single_cell_counts",
            },
            "structure.csv": {
                "count_protein_chains", "find_residue_contacts", "summarize_secondary_structure", "find_surface_residues", "summarize_coordinates",
            },
        }
        for filename, actions in groups.items():
            if action in actions:
                return filename
        self.fail(f"No execution input for {action}")

    def test_all_actions_are_generated_from_grammar_and_parsed(self) -> None:
        rules = [rule for rule in EXPANSION["capabilities"] if rule["action"] in ACTIONS]
        self.assertEqual(len(rules), len(ACTIONS))
        sources = [_source_for(rule, index) for index, rule in enumerate(rules)]
        self.assertEqual(len(set(sources)), len(sources))
        self.assertTrue(all(source not in json.dumps(EXPANSION) for source in sources))
        instructions = parse("\n".join(sources))
        self.assertEqual([instruction.action for instruction in instructions], [rule["action"] for rule in rules])

    def test_every_generated_action_executes_in_python(self) -> None:
        rules = [rule for rule in EXPANSION["capabilities"] if rule["action"] in ACTIONS]
        for index, rule in enumerate(rules):
            with self.subTest(action=rule["action"]):
                source = _source_for(rule, index)
                filename = self._file_for(rule["action"])
                program_source = f"Open the file {filename}.\n{source}\n"
                output = Runner(self.program).run(parse(program_source))
                self.assertTrue(output.sections, rule["action"])


if __name__ == "__main__":
    unittest.main()
