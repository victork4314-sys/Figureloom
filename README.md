# SciCanvas

SciCanvas is a local-first scientific illustration and figure editor designed to feel familiar to people who know Microsoft Office or Apple Keynote.

This repository contains a functional MVP rather than a static mock-up. It is a dependency-light web app that can run locally or deploy directly to GitHub Pages. PowerPoint generation loads the official PptxGenJS browser bundle only when requested.

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
- Import SVG files as reusable vector objects that remain resizable, rotatable, recolorable, and independently exportable
- Continuous local autosave using IndexedDB with a localStorage fallback
- Manual and automatic recovery snapshots
- Multiple editable pages
- Screen, A4, A3, A2, A1, A0, square, and custom project formats
- Portrait/landscape poster geometry with real millimetre dimensions
- Per-page solid, gradient, transparent, preset, and randomized backgrounds
- Twelve project color themes that recolor only page backgrounds and project artwork; the editor interface remains unchanged
- Layers with visibility, drag-and-drop/touch reordering, keyboard reordering, duplication, renaming, and deletion
- Optional grid, adjustable spacing and style, magnetic grid/object snapping, and alignment guides
- Move, resize with eight on-canvas handles or inspector fields, rotate, recolor, rename, and annotate objects
- Editable text, rectangles, ellipses, arrows, inhibition lines, attached object-to-object connectors, and tidy-up alignment
- Thirty-eight bundled/open/system font choices with searchable previews
- Local `.woff`, `.woff2`, `.ttf`, and `.otf` font import stored in the device vault
- Project-wide default fonts and one-click apply-to-all-text behavior
- Private no-API Figure Assistant that assembles editable scientific figures from a written description
- Dedicated editable wastewater, host-pathogen, PCR, CRISPR, sequencing, biofilm, and generic workflow generation paths
- Scientific metadata fields and general/detailed attribution reports
- Editable templates for graphical abstracts, workflows, pathways, host-pathogen interactions, and publication panels
- Format-aware PNG, physical-size SVG, print PNG, PowerPoint `.pptx`, and complete `.scicanvas` project exports
- Multi-page PowerPoint export with one visually preserved SciCanvas page per slide at the selected physical dimensions
- Offline application shell through a registered service worker
- Simple and Advanced interface modes
- GitHub Actions workflows for JavaScript syntax validation and GitHub Pages deployment

## Illustration packs

Open **Science → 2,829 SVGs** inside the app to browse licensed sources.

Bioicons is integrated directly: SciCanvas loads its complete machine-readable index, shows lazy-loaded previews, and embeds only the SVGs selected by the user. This keeps the full library searchable without forcing the browser to download thousands of illustrations at startup.

The Packs drawer also provides whole-package download links for Bioicons and the complete Servier Medical Art slide set. NIH BioArt Source and Reactome are linked as additional reputable sources because their entries require source-specific licence review.

See [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md) for sources and licensing behavior.

## Editable SVG behavior

Use **Export → Editable SVG library** to import an SVG into the reusable local SVG vault. Imported SVGs keep their vector structure and can be moved, resized, rotated, layered, switched between original colors and whole-object recoloring, and downloaded again as SVG.

Individual path-node editing, Boolean operations, masks, and breaking one imported SVG into multiple independent canvas objects are not implemented yet.

## Page and poster formats

Open **Layout → Page and poster size** to choose Screen, A4, A3, A2, A1, A0, square, or custom millimetre dimensions. The project uses one physical format so every page, SVG, PNG, and PowerPoint slide remains consistent.

Poster SVG export writes the selected physical dimensions into the SVG. **Print PNG · 150 DPI** uses the same millimetre size and warns before unusually large mobile-browser exports.

## Figure Assistant

Use **✨ Figure Assistant** beside Export and describe a figure such as “wastewater treatment with screening, bacteria, filtration, and clean effluent.” The assistant runs entirely in the browser and assembles movable, recolorable, resizable SciCanvas objects rather than generating a flattened raster image.

It is a private rule-based scientific layout assistant, not a downloaded diffusion model. This keeps the feature fast, editable, offline-capable, and practical on phones and tablets.

## Fonts

Use **Fonts** in the ribbon to browse the built-in font catalogue, select a project default, apply a font to all text, or import a local font file. Google Fonts load on demand. Imported font files remain stored only on the current device and are not embedded in `.scicanvas` or PowerPoint exports, so recipients must have the same font available for identical text rendering.

## Export behavior

PowerPoint export creates slides matching the selected physical project size. The complete figure is placed on each slide as high-resolution rendered artwork, preserving the visual output and page background. Individual SciCanvas objects are not yet converted into native editable PowerPoint shapes.

See [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md) for details.

## Requirement status

See [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md) for an explicit implemented/not-implemented audit against the original product requirements.

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data safety

Projects, uploaded images, reusable editable SVGs, and imported font files are stored locally in the browser's IndexedDB vault. The app also maintains a lightweight localStorage fallback when the project is small enough. Use **Create recovery snapshot** for named restore points and download a `.scicanvas` project backup for storage outside the browser.

Browser storage is not a substitute for true account-based cloud backup. A later backend phase should add authenticated encrypted synchronization and shared lab libraries.

## Asset licensing

The initial built-in scientific illustrations are original programmatic SVG drawings created for this project. External Bioicons retain their individual authors, licences, source URLs, and prepared attribution text inside the project. Servier Medical Art is linked under CC BY 4.0. NIH BioArt and Reactome assets must be checked individually before import and publication.

Users are responsible for the licences of uploaded SVGs, images, and font files. Attribution reports assist with recordkeeping but do not replace reviewing current source terms.

## Near-term roadmap

1. Browser-level interaction tests and automated deployment verification
2. Account-based encrypted cloud vault and shared lab workspaces
3. Configurable smart biological components with scientifically constrained variants
4. Grouping, multi-selection, SVG path-node editing, masking, Boolean operations, and richer vector editing
5. Native editable PowerPoint-object export
6. Better text layout, equations, chemical notation, and gene/protein formatting rules
7. Optional local model-assisted prompt interpretation after a practical small browser model becomes available
8. Collaborative comments and publication-figure review
9. Accessible figure descriptions and machine-readable pathway export
10. Additional normalized illustration-pack importers