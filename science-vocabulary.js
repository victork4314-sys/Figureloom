const specialistScienceAssets = [
  { id:"bacterium", name:"Escherichia coli", category:"Microbiology", tags:"e coli escherichia gram negative rod enterobacterales model organism", fill:"#ef9a8b", organism:"Escherichia coli" },
  { id:"bacterium", name:"Pseudomonas aeruginosa", category:"Microbiology", tags:"p aeruginosa gram negative rod biofilm opportunistic pathogen", fill:"#7fc8a9", organism:"Pseudomonas aeruginosa" },
  { id:"bacterium", name:"Bacillus species", category:"Microbiology", tags:"bacillus gram positive rod spore sporulation", fill:"#d7a86e", organism:"Bacillus spp." },
  { id:"bacterium", name:"Clostridium species", category:"Microbiology", tags:"clostridium anaerobe gram positive rod endospore", fill:"#c593d8", organism:"Clostridium spp." },
  { id:"bacterium", name:"Listeria monocytogenes", category:"Microbiology", tags:"listeria gram positive rod intracellular pathogen", fill:"#8fb7e8", organism:"Listeria monocytogenes" },
  { id:"bacterium", name:"Mycobacterium", category:"Microbiology", tags:"mycobacteria acid fast bacillus tuberculosis cell envelope", fill:"#e3bd66", organism:"Mycobacterium spp." },
  { id:"bacterium", name:"Vibrio bacterium", category:"Microbiology", tags:"vibrio curved rod cholera flagellum", fill:"#6fc9d3", organism:"Vibrio spp." },
  { id:"bacterium", name:"Persister bacterium", category:"Microbiology", tags:"persister dormant antibiotic tolerance antimicrobial resistance", fill:"#9ba4b5" },
  { id:"bacterium", name:"Conjugating bacterium", category:"Microbiology", tags:"conjugation horizontal gene transfer plasmid pilus donor recipient", fill:"#dc8a93" },
  { id:"coccus", name:"Staphylococcal cluster", category:"Microbiology", tags:"staphylococcus cocci cluster gram positive", fill:"#d898c7", organism:"Staphylococcus spp." },
  { id:"coccus", name:"Streptococcal chain", category:"Microbiology", tags:"streptococcus cocci chain gram positive", fill:"#a99bd9", organism:"Streptococcus spp." },
  { id:"coccus", name:"Diplococci", category:"Microbiology", tags:"diplococcus neisseria pneumococcus paired cocci", fill:"#e7a46e" },
  { id:"biofilm", name:"Mature bacterial biofilm", category:"Microbiology", tags:"mature biofilm extracellular polymeric substance eps matrix", fill:"#66b79b" },
  { id:"biofilm", name:"Early biofilm attachment", category:"Microbiology", tags:"initial adhesion surface colonization microcolony", fill:"#7ea9db" },
  { id:"biofilm", name:"Biofilm dispersal", category:"Microbiology", tags:"dispersal detachment planktonic cells", fill:"#c49ad8" },

  { id:"virus", name:"Coronavirus-like virion", category:"Virology", tags:"coronavirus sars cov spike enveloped positive sense rna", fill:"#e88873" },
  { id:"virus", name:"Influenza virion", category:"Virology", tags:"influenza flu orthomyxovirus hemagglutinin neuraminidase enveloped", fill:"#82aee0" },
  { id:"virus", name:"HIV-like virion", category:"Virology", tags:"hiv retrovirus lentivirus envelope reverse transcriptase", fill:"#c184ca" },
  { id:"virus", name:"Herpesvirus-like virion", category:"Virology", tags:"herpesvirus dsDNA enveloped capsid", fill:"#a6a0df" },
  { id:"virus", name:"Flavivirus-like virion", category:"Virology", tags:"flavivirus dengue zika yellow fever enveloped rna", fill:"#e2b45f" },
  { id:"virus", name:"Viral entry particle", category:"Virology", tags:"viral entry receptor binding fusion endocytosis", fill:"#db7f91" },
  { id:"phage", name:"T4-like bacteriophage", category:"Virology", tags:"t4 phage myovirus contractile tail bacteriophage", fill:"#759bd5" },
  { id:"phage", name:"Lambda-like bacteriophage", category:"Virology", tags:"lambda phage siphovirus lysogeny lytic cycle", fill:"#9e82d1" },
  { id:"phage", name:"Phage infection", category:"Virology", tags:"bacteriophage adsorption injection infection", fill:"#e18c77" },

  { id:"cell", name:"Macrophage", category:"Cell biology", tags:"macrophage phagocyte innate immune phagocytosis host pathogen", fill:"#8eb7e8", organism:"Mammalian cell" },
  { id:"cell", name:"Neutrophil", category:"Cell biology", tags:"neutrophil granulocyte innate immune netosis", fill:"#b49ad9", organism:"Mammalian cell" },
  { id:"cell", name:"Dendritic cell", category:"Cell biology", tags:"dendritic antigen presenting cell apc innate adaptive", fill:"#83c4b2", organism:"Mammalian cell" },
  { id:"cell", name:"T lymphocyte", category:"Cell biology", tags:"t cell lymphocyte cd4 cd8 adaptive immunity", fill:"#8aa7dd", organism:"Mammalian cell" },
  { id:"cell", name:"B lymphocyte", category:"Cell biology", tags:"b cell lymphocyte plasma cell antibody adaptive immunity", fill:"#d99ac2", organism:"Mammalian cell" },
  { id:"cell", name:"Epithelial cell", category:"Cell biology", tags:"epithelium barrier polarized host cell", fill:"#e8b58d", organism:"Mammalian cell" },
  { id:"cell", name:"Fibroblast", category:"Cell biology", tags:"fibroblast extracellular matrix connective tissue", fill:"#93c9b1", organism:"Mammalian cell" },
  { id:"cell", name:"Yeast cell", category:"Cell biology", tags:"yeast saccharomyces candida fungus budding", fill:"#d7ad73", organism:"Fungal cell" },
  { id:"cell", name:"Infected host cell", category:"Cell biology", tags:"infected host intracellular pathogen virus bacteria", fill:"#e18d8d", organism:"Mammalian cell" },
  { id:"mitochondrion", name:"Damaged mitochondrion", category:"Cell biology", tags:"mitochondrial damage stress depolarization mitophagy ros", fill:"#d97f73" },
  { id:"mitochondrion", name:"Mitochondrial network", category:"Cell biology", tags:"mitochondrial dynamics fusion fission network cristae", fill:"#e3a85e" },
  { id:"membrane", name:"Gram-negative outer membrane", category:"Cell biology", tags:"outer membrane lipopolysaccharide lps gram negative envelope", fill:"#7fa9dd" },
  { id:"membrane", name:"Phospholipid bilayer", category:"Cell biology", tags:"lipid bilayer membrane phospholipid hydrophobic", fill:"#8ea0ff" },
  { id:"membrane", name:"Membrane receptor platform", category:"Cell biology", tags:"receptor membrane signaling transmembrane", fill:"#a68bd9" },

  { id:"dna", name:"Genomic double-stranded DNA", category:"Molecular biology", tags:"genomic dsDNA chromosome double stranded dna", fill:"#6f8fd8" },
  { id:"dna", name:"RNA-like nucleic acid", category:"Molecular biology", tags:"rna mrna transcript nucleic acid single strand", fill:"#55ad91" },
  { id:"dna", name:"CRISPR guide and target", category:"Molecular biology", tags:"crispr cas9 guide rna target dna editing", fill:"#c28ad8" },
  { id:"plasmid", name:"Expression plasmid", category:"Molecular biology", tags:"expression vector promoter gene insert selectable marker", fill:"#6a91d8" },
  { id:"plasmid", name:"Cloning vector", category:"Molecular biology", tags:"cloning vector plasmid origin resistance multiple cloning site", fill:"#61b08e" },
  { id:"plasmid", name:"CRISPR plasmid", category:"Molecular biology", tags:"crispr cas plasmid guide rna editing vector", fill:"#aa80d2" },
  { id:"protein", name:"Enzyme", category:"Molecular biology", tags:"enzyme catalyst active site substrate product", fill:"#74b9a2" },
  { id:"protein", name:"Cell-surface receptor", category:"Molecular biology", tags:"receptor ligand binding signaling transmembrane", fill:"#8a9fdf" },
  { id:"protein", name:"Protein complex", category:"Molecular biology", tags:"multiprotein complex interaction assembly", fill:"#c290d2" },
  { id:"protein", name:"Ribosome-like complex", category:"Molecular biology", tags:"ribosome translation protein synthesis rrna", fill:"#dfaa70" },
  { id:"protein", name:"Cytokine", category:"Molecular biology", tags:"cytokine chemokine interleukin signaling immune", fill:"#e17f92" },

  { id:"antibody", name:"IgG antibody", category:"Immunology", tags:"igg immunoglobulin antibody fc fab", fill:"#e5b84e" },
  { id:"antibody", name:"Neutralizing antibody", category:"Immunology", tags:"neutralizing antibody virus blockade epitope", fill:"#70b99b" },
  { id:"antibody", name:"Antibody–antigen binding", category:"Immunology", tags:"antigen epitope antibody binding immune complex", fill:"#8da8de" },
  { id:"protein", name:"Complement protein", category:"Immunology", tags:"complement innate immunity c3 c5 cascade", fill:"#a78bd5" },
  { id:"protein", name:"Pattern-recognition receptor", category:"Immunology", tags:"prr toll like receptor tlr innate sensing pamp", fill:"#e38a76" },

  { id:"petri", name:"Agar culture plate", category:"Laboratory", tags:"agar plate bacterial culture colonies microbiology", fill:"#e8c276" },
  { id:"petri", name:"Colony-counting plate", category:"Laboratory", tags:"colony count cfu agar dilution", fill:"#dba96d" },
  { id:"petri", name:"Assay plate", category:"Laboratory", tags:"well plate assay 96 well screening", fill:"#8fb7e2" },
  { id:"pipette", name:"Single-channel micropipette", category:"Laboratory", tags:"p20 p200 p1000 pipette liquid handling", fill:"#73b99f" },
  { id:"pipette", name:"Multichannel pipette", category:"Laboratory", tags:"multichannel pipette well plate liquid handling", fill:"#8f9fda" },
  { id:"tube", name:"PCR tube", category:"Laboratory", tags:"pcr tube thermocycler amplification sample", fill:"#8dbbe1" },
  { id:"tube", name:"Microcentrifuge tube", category:"Laboratory", tags:"eppendorf microcentrifuge tube pellet supernatant", fill:"#87c7b3" },
  { id:"tube", name:"Culture tube", category:"Laboratory", tags:"culture tube broth bacterial growth", fill:"#e4b568" },
  { id:"microscope", name:"Fluorescence microscope", category:"Laboratory", tags:"fluorescence microscopy imaging fluorophore", fill:"#9a86d5" },
  { id:"microscope", name:"Confocal microscope", category:"Laboratory", tags:"confocal microscopy z stack laser imaging", fill:"#7e9ed9" }
];

scienceAssets.push(...specialistScienceAssets);

const vocabularyBaseAddScienceAsset = addScienceAsset;
addScienceAsset = function addMetadataRichScienceAsset(asset) {
  vocabularyBaseAddScienceAsset(asset);
  const item = selectedObject();
  if (!item) return;
  if (asset.fill) item.fill = asset.fill;
  item.metadata = {
    scientificName: asset.organism || "",
    organism: asset.organism || "",
    identifier: "",
    notes: `Library concept: ${asset.name}`,
    source: "SciCanvas original programmatic SVG",
    license: "Original project artwork"
  };
  render();
  scheduleSave();
};

const libraryCount = scienceDrawer.querySelector(".science-head span");
libraryCount.textContent = `${scienceAssets.length} searchable scientific concepts`;
document.getElementById("scienceSearch").dispatchEvent(new Event("input"));
