# SciCanvas feature audit

This document maps the original product requirements to the current implementation. It is intentionally explicit so that the repository does not claim features that are only planned.

## Scientific illustration library

- **Built-in editable scientific objects:** Implemented.
- **Basic biology and microbiology objects:** Implemented.
- **Specialist search terms and organism aliases:** Implemented.
- **Distinct built-in previews rather than repeated aliases:** Implemented by collapsing shared visual concepts while preserving aliases in search.
- **Large external scientific package:** Implemented through the complete Bioicons index with 2,829 individually licensed SVG entries.
- **Whole-package downloads:** Implemented for Bioicons source ZIP and the Servier Medical Art complete slide-set ZIP.
- **Additional reputable sources:** NIH BioArt Source and Reactome are linked with licence warnings.
- **Search by name, category, author, and licence:** Implemented for Bioicons.
- **Per-item attribution metadata:** Implemented for Bioicons imports.
- **Automatic detailed attribution report:** Implemented.

## Asset handling and data safety

- **Upload PNG, JPEG, WebP, and SVG:** Implemented.
- **Reusable personal upload library:** Implemented with IndexedDB.
- **Reusable editable SVG library:** Implemented with IndexedDB and placed beside Export.
- **Imported SVGs remain vector objects:** Implemented for resize, rotation, layering, opacity, original colors, whole-object recoloring, and SVG re-export.
- **SVG path-node editing and breaking apart imported SVGs:** Not implemented.
- **Project embeds selected external SVGs:** Implemented.
- **Continuous autosave:** Implemented with IndexedDB and a localStorage fallback.
- **Manual recovery snapshots:** Implemented.
- **Automatic recovery snapshots:** Implemented.
- **Complete editable project download/import:** Implemented.
- **Persistent-storage request:** Implemented where supported by the browser.
- **Registered offline application shell:** Implemented.
- **True account-based cloud backup:** Not implemented; requires a backend and authentication.
- **Shared lab libraries and collaboration:** Not implemented.

## Canvas, page formats, and editing

- **Optional grid:** Implemented.
- **Adjustable grid spacing and line/dot style:** Implemented.
- **Grid snapping:** Implemented.
- **Magnetic object edge/centre snapping:** Implemented.
- **Alignment guides:** Implemented.
- **Move objects by dragging:** Implemented.
- **Position and size fields:** Implemented.
- **Eight on-canvas resize handles:** Implemented, including Shift-constrained corner resizing.
- **Rotation:** Implemented.
- **Opacity, fill, and stroke controls:** Implemented.
- **Layer visibility and ordering:** Implemented.
- **Layer drag-and-drop reordering:** Implemented for mouse and touch/pointer input.
- **Keyboard layer reordering:** Implemented with arrow keys on the layer grip.
- **Duplicate, rename, delete, and tidy:** Implemented.
- **Undo and redo:** Implemented.
- **Attached arrows and inhibition connectors:** Implemented.
- **Multiple pages:** Implemented.
- **Screen, A4, A3, A2, A1, A0, square, and custom formats:** Implemented as project-wide physical dimensions.
- **Portrait and landscape poster geometry:** Implemented.
- **Physical millimetre dimensions in SVG export:** Implemented.
- **Format-aware standard, 2×, and 150-DPI print PNG export:** Implemented.
- **Independent per-page solid, gradient, and transparent backgrounds:** Implemented.
- **Background presets and randomized palette selection:** Implemented.
- **Twelve project color themes:** Implemented.
- **Themes recolor project artwork and page backgrounds without recoloring the editor interface:** Implemented.
- **Zoom and format-aware fit:** Implemented.
- **Grouping and multi-selection:** Not implemented.
- **Freeform vector node editing, masks, and Boolean operations:** Not implemented.

## Local Figure Assistant

- **Written-description figure generation without an API:** Implemented as a private in-browser rule-based layout assistant.
- **Wastewater-treatment figure generation:** Implemented with editable treatment stages, labels, arrows, bacteria, filtration, and effluent elements.
- **Host-pathogen, PCR, CRISPR, sequencing, biofilm, and general workflows:** Implemented.
- **Generated output remains movable, resizable, recolorable, layered, and exportable:** Implemented.
- **Flattened text-to-image diffusion generation:** Not implemented by design; the current assistant prioritizes scientific editability and mobile/browser practicality.
- **Optional local model-assisted language interpretation:** Not implemented.

## Text and scientific formatting

- **Text boxes:** Implemented.
- **Editable text content:** Implemented.
- **Font family, size, bold, and italic controls:** Implemented.
- **Expanded searchable font catalogue:** Implemented with 38 bundled/open/system font choices.
- **On-demand open web fonts:** Implemented.
- **Local `.woff`, `.woff2`, `.ttf`, and `.otf` imports:** Implemented with IndexedDB storage.
- **Project default font and apply-to-all-text:** Implemented.
- **Embedding imported font binaries in project/PowerPoint exports:** Not implemented; imported fonts remain device-local.
- **Species-name italic style helper:** Implemented.
- **Scientific metadata fields:** Implemented.
- **Equation editor, chemical notation, superscript/subscript, and automatic gene/protein rules:** Not implemented.
- **Labels physically attached to arbitrary objects:** Not implemented as a dedicated object relationship.

## Templates and interface

- **Blank canvas:** Implemented.
- **Graphical abstract template:** Implemented.
- **Experimental workflow template:** Implemented.
- **Host-pathogen template:** Implemented.
- **Molecular pathway template:** Implemented.
- **Publication panel template:** Implemented.
- **Microsoft-style ribbon:** Implemented.
- **Keynote-style right inspector:** Implemented.
- **Simple and Advanced modes:** Implemented.
- **Large labelled controls for less technical users:** Implemented in the MVP layout.

## Export

- **Editable SVG export:** Implemented.
- **Poster-ready physical-size SVG export:** Implemented.
- **Standard and high-resolution PNG export:** Implemented with the selected canvas aspect ratio.
- **Print PNG at 150 DPI:** Implemented from the selected physical project dimensions.
- **Optional grid in exported graphics:** Implemented.
- **Transparent figure export option:** Implemented for PowerPoint slide art.
- **Complete editable project export:** Implemented.
- **Detailed attribution report:** Implemented.
- **PowerPoint `.pptx` export:** Implemented with one visually preserved high-resolution SciCanvas page per slide at the selected project dimensions.
- **Native editable PowerPoint shapes:** Not implemented; current PowerPoint slides contain flattened high-resolution page artwork.
- **PDF and TIFF export:** Not implemented.
- **Machine-readable SBGN/BioPAX/SBML export:** Not implemented.

## Next priority areas

1. Browser-level interaction tests and automated deployment verification.
2. Account-based encrypted cloud storage.
3. Grouping, multi-selection, SVG node editing, masks, Boolean operations, and richer vector editing.
4. Native editable PowerPoint-object export.
5. Equations, chemical notation, and scientific text rules.
6. A normalized import pipeline for additional licensed packs.
7. Optional small local model-assisted prompt interpretation when practical browser models mature.
8. Collaborative lab workspaces, comments, and review history.
9. Accessible figure descriptions and standards-based pathway export.