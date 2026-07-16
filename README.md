# SciCanvas

SciCanvas is a local-first scientific illustration and figure editor designed to feel familiar to people who know Microsoft Office or Apple Keynote.

This repository contains a functional web application rather than a static mock-up. It is dependency-light, runs locally, and deploys directly to GitHub Pages. PowerPoint generation loads the official PptxGenJS browser bundle only when requested.

## What works now

- Searchable built-in scientific asset library with original programmatic SVG artwork
- Deduplicated expanded search across built-in artwork, Water 32, Bioicons, Healthicons, and Tabler
- Complete Bioicons index with 2,829 individually licensed SVG illustrations
- Secure embedding of selected external SVGs with author, licence, source, and attribution metadata
- Thirty-two original water, wastewater, hydrology, monitoring, pollution, marine, and treatment vectors
- Map Studio for world maps, country silhouettes, highlighted-country maps, locator maps, and imported GeoJSON
- Upload PNG, JPEG, WebP, and SVG images into a reusable device-local library
- Import SVG files as reusable vector objects that remain resizable, rotatable, layered, recolorable, and independently exportable
- Continuous local autosave using IndexedDB with a localStorage fallback
- Manual and automatic recovery snapshots
- Multiple editable pages
- Screen, A4, A3, A2, A1, A0, square, custom, and publication/presentation formats
- Portrait/landscape geometry with real millimetre dimensions
- Adaptive millimetre grids, grid snapping, object snapping, and smart alignment guides
- Hand-tool panning, hold-Space panning, middle-button panning, pinch zoom, pointer-centred wheel zoom, fit, actual size, and a movable/closable navigator
- Per-page solid, gradient, transparent, preset, and randomized backgrounds
- Twelve project color themes and optional project-only heading/body font pairs
- Layers with visibility, mouse/touch reordering, keyboard reordering, duplication, renaming, locking, and deletion
- On-canvas resizing, rotation, recoloring, opacity, inspector fields, and click/tap quick actions
- Multi-selection by Shift-click or marquee drag
- Grouping, shared movement and resizing, alignment, equal distribution, and simple shape combinations
- Anchored connectors that follow the objects they connect
- Editable text, rectangles, ellipses, arrows, inhibition lines, charts, tables, maps, annotations, uploaded images, and reusable components
- Thirty-eight bundled/open/system font choices plus local `.woff`, `.woff2`, `.ttf`, and `.otf` import
- Private no-API Figure Assistant that assembles editable scientific figures from a written description and the full available illustration search
- Editable templates for graphical abstracts, workflows, pathways, host-pathogen interactions, and publication panels
- CSV/TSV Data Lab with bar, line, scatter, box, heatmap, and table objects
- Scientific annotation tools for callouts, scale bars, measurements, panel labels, significance brackets, legends, equations, Greek symbols, superscripts, and subscripts
- Reusable project components with update-all-instances behavior
- Image crop, flip, rounded mask, and circular mask tools
- Page/object comments, DOI/source records, automatic reference collection, and downloadable reference lists
- Named version checkpoints with added/changed object highlighting
- Alt text, long descriptions, automatic description drafts, contrast checks, small-text checks, and color-vision previews
- Generic journal/presentation physical presets, publication-readiness reports, and fullscreen presentation mode
- Format-aware PNG, physical-size SVG, print PNG, PowerPoint `.pptx`, and complete `.scicanvas` project exports
- Offline application shell through a registered service worker
- Simple and Advanced interface modes
- GitHub Actions workflows for JavaScript syntax, architecture, offline-shell, and GitHub Pages validation

## Pro Tools without interface chaos

Open **Pro tools** to access six focused workspaces:

1. Arrange & group
2. Data & charts
3. Scientific annotation
4. Components & objects
5. Review & references
6. Publish & present

The advanced controls stay hidden until their workspace is opened. The ordinary ribbon, Science library, Insert panel, Canvas Design, and Export menu remain uncluttered.

See [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md) for detailed behavior and limitations.

## Illustration packs

Open **Science → ≈10k Library** to search complementary science, health, and general diagram collections. Results are streamed on demand rather than downloading thousands of SVGs at startup. Duplicate names and common style variants are normalized before display.

Bioicons retains its individual author and licence metadata. Healthicons and Tabler results retain source and licence information when embedded.

See [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md) for sources and licensing behavior.

## Water and wastewater library

Open **Science → 🌊 Water 32** for dedicated editable water, treatment, infrastructure, monitoring, pollution, and marine vectors. The Figure Assistant can use these assets alongside the rest of the library.

## Map Studio

Open **Insert → Maps** for:

- World political maps
- Country silhouettes
- Country highlights on a world map
- City or study-site locator maps
- Imported GeoJSON for streets, districts, routes, watersheds, coastlines, and research boundaries

World and country boundaries use Natural Earth public-domain data. User-supplied GeoJSON retains a reminder to verify its original source licence.

## Canvas navigation and page formats

Open **Design → Canvas and poster size** to select Screen, A4–A0, square, or custom millimetre dimensions. The project uses one physical format so every page and export remains consistent.

Use the Hand tool, Space, or middle mouse button to pan. The navigator can be dragged, docked, hidden, and reopened. Pinch with two fingers to zoom on touch devices.

The adaptive grid can use automatic physical spacing or explicit 2, 5, 10, 20, 25, 50, or 100 mm divisions.

## Editable SVG behavior

Use **Export → Editable SVG library** to import SVGs into the reusable local vector vault. Imported SVGs keep their vector markup and can be moved, resized, rotated, layered, switched between original colors and whole-object recoloring, and downloaded again.

Individual imported path-node editing and breaking one imported SVG into separate canvas paths are not implemented. Boolean operations currently apply to SciCanvas rectangles and ellipses rather than arbitrary imported SVG paths.

## Figure Assistant

Use **✨ Figure Assistant** and describe a scientific figure. It searches built-in science artwork, Water 32, and—when online—the deduplicated Bioicons, Healthicons, and Tabler sources. It creates movable, resizable, layered objects rather than a flattened AI image.

It is a private rule-based layout assistant, not a diffusion model or cloud API.

## Fonts and theme typography

Use **Fonts** to browse the font catalogue, set a project default, apply a font to all text, or import a local font file. Imported font files remain stored on the current device and are not embedded into PowerPoint exports.

## Export behavior

PowerPoint export creates slides matching the selected physical project size. Each slide contains high-resolution rendered page artwork. Individual SciCanvas objects are not converted into native editable PowerPoint shapes.

See [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md) for details.

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data safety

Projects, uploads, editable SVGs, imported fonts, comments, references, components, and checkpoints are stored locally in the browser. Download `.scicanvas` backups for storage outside the browser.

Browser storage is not a substitute for authenticated cloud backup. Account-based encrypted synchronization and shared lab workspaces require a future backend.

## Asset licensing

Built-in scientific illustrations and Water 32 are original programmatic SVG drawings created for this project. External assets preserve their available source and licence metadata. Users remain responsible for verifying the licences of uploaded files, imported GeoJSON, fonts, and external source material.

## Remaining major limitations

1. Browser-level automated interaction tests are still limited compared with the static validation suite.
2. Account-based encrypted cloud storage and real-time collaboration are not implemented.
3. Imported SVG path-node editing and breaking SVGs into independent paths are not implemented.
4. PowerPoint export does not create native editable PowerPoint shapes.
5. Equation support is a practical subset rather than a complete TeX engine.
6. PDF, TIFF, SBGN, BioPAX, and SBML export are not implemented.
7. The Figure Assistant is rule-based rather than a local generative language or diffusion model.