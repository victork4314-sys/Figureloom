# SciCanvas

SciCanvas is a local-first scientific illustration and figure editor designed to feel familiar to people who know Microsoft Office or Apple Keynote.

This repository contains a functional MVP rather than a static mock-up. It is a dependency-free web app that can run locally or deploy directly to GitHub Pages.

## What works now

- Searchable built-in scientific asset library with original programmatic SVG artwork
- Complete in-app Bioicons browser with 2,829 online SVG illustrations
- Bioicons search by name, category, author, and licence
- Secure embedding of selected external SVGs into the editable project
- Per-item source, author, licence, and attribution metadata
- Complete-package download links for Bioicons and Servier Medical Art
- Links to NIH BioArt Source and Reactome with licence guidance
- Microbiology, virology, immunology, molecular biology, cell biology, laboratory equipment, pathway symbols, and specialist scientific search terms
- Add built-in assets to an editable SVG canvas
- Upload PNG, JPEG, WebP, and SVG images into a reusable personal library stored on the device
- Continuous local autosave using IndexedDB with a localStorage fallback
- Manual and automatic recovery snapshots
- Multiple editable pages
- Layers with visibility, ordering, duplication, renaming, and deletion
- Optional grid, adjustable spacing and style, magnetic grid/object snapping, and alignment guides
- Move, resize through the inspector, rotate, recolor, rename, and annotate objects
- Editable text, rectangles, ellipses, arrows, inhibition lines, attached object-to-object connectors, and tidy-up alignment
- Scientific metadata fields and general/detailed attribution reports
- Editable templates for graphical abstracts, workflows, pathways, host-pathogen interactions, and publication panels
- PNG, SVG, and complete `.scicanvas` project exports
- Offline application shell through a registered service worker
- Simple and Advanced interface modes
- GitHub Actions workflows for JavaScript syntax validation and GitHub Pages deployment

## Illustration packs

Open **Science → Packs** inside the app to browse licensed sources.

Bioicons is integrated directly: SciCanvas loads its complete machine-readable index, shows lazy-loaded previews, and embeds only the SVGs selected by the user. This keeps the full library searchable without forcing the browser to download thousands of illustrations at startup.

The Packs drawer also provides whole-package download links for Bioicons and the complete Servier Medical Art slide set. NIH BioArt Source and Reactome are linked as additional reputable sources because their entries require source-specific licence review.

See [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md) for sources and licensing behavior.

## Requirement status

See [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md) for an explicit implemented/not-implemented audit against the original product requirements.

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data safety

Projects and uploaded images are stored locally in the browser's IndexedDB vault. The app also maintains a lightweight localStorage fallback when the project is small enough. Use **Create recovery snapshot** for named restore points and download a `.scicanvas` project backup for storage outside the browser.

Browser storage is not a substitute for true account-based cloud backup. A later backend phase should add authenticated encrypted synchronization and shared lab libraries.

## Asset licensing

The initial built-in scientific illustrations are original programmatic SVG drawings created for this project. External Bioicons retain their individual authors, licences, source URLs, and prepared attribution text inside the project. Servier Medical Art is linked under CC BY 4.0. NIH BioArt and Reactome assets must be checked individually before import and publication.

Attribution reports assist with recordkeeping but do not replace reviewing current source terms.

## Near-term roadmap

1. Browser-level interaction tests and automated deployment verification
2. Account-based encrypted cloud vault and shared lab workspaces
3. Configurable smart biological components with scientifically constrained variants
4. Grouping, multi-selection, masking, and richer vector editing
5. Better text layout, equations, chemical notation, and gene/protein formatting rules
6. Collaborative comments and publication-figure review
7. Accessible figure descriptions and machine-readable pathway export
8. Additional normalized illustration-pack importers
