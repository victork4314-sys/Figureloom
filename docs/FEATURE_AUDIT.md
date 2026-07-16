# SciCanvas feature audit

This document maps major product requirements to the current implementation. It is intentionally explicit so the repository does not claim features that are only planned.

## Scientific illustration library

- **Built-in editable scientific objects:** Implemented.
- **Specialist search terms and organism aliases:** Implemented.
- **Distinct built-in previews rather than repeated aliases:** Implemented.
- **Water and wastewater vector family:** Implemented with 32 original assets.
- **Large external scientific package:** Implemented through Bioicons with 2,829 entries.
- **Expanded deduplicated search:** Implemented across built-in artwork, Water 32, Bioicons, Healthicons, and Tabler.
- **Search by name/category and source metadata:** Implemented.
- **Per-item attribution metadata:** Implemented where source metadata is available.
- **Automatic attribution/reference collection:** Implemented.
- **Map assets:** Implemented through Map Studio with Natural Earth boundaries and imported GeoJSON.

## Asset handling and data safety

- **Upload PNG, JPEG, WebP, and SVG:** Implemented.
- **Reusable personal upload library:** Implemented with IndexedDB.
- **Reusable editable SVG library:** Implemented beside Export.
- **Imported SVG resize, rotation, layering, opacity, original colors, whole-object recoloring, and SVG re-export:** Implemented.
- **SVG path-node editing and breaking imported SVGs apart:** Not implemented.
- **Continuous autosave:** Implemented with IndexedDB and localStorage fallback.
- **Manual and automatic recovery snapshots:** Implemented.
- **Complete editable project download/import:** Implemented.
- **Registered offline application shell:** Implemented.
- **True account-based cloud backup:** Not implemented.
- **Shared lab libraries and real-time collaboration:** Not implemented.

## Canvas, navigation, and page formats

- **Optional line/dot grid:** Implemented.
- **Adaptive physical grid spacing:** Implemented for automatic or explicit millimetre spacing.
- **Grid and object snapping:** Implemented.
- **Smart alignment guides:** Implemented.
- **Move objects by dragging:** Implemented.
- **Position and size fields:** Implemented.
- **Eight on-canvas resize handles:** Implemented.
- **Rotation, opacity, fill, and stroke:** Implemented.
- **Layer visibility, locking, drag/touch reordering, and keyboard reordering:** Implemented.
- **Undo and redo:** Implemented.
- **Multiple pages:** Implemented.
- **Screen, A4, A3, A2, A1, A0, square, and custom physical formats:** Implemented.
- **Generic journal and presentation physical presets:** Implemented.
- **Portrait/landscape geometry and millimetre SVG export:** Implemented.
- **Format-aware PNG and 150-DPI print export:** Implemented.
- **Per-page solid, gradient, transparent, preset, and randomized backgrounds:** Implemented.
- **Project-only color themes and font pairs:** Implemented.
- **Hand/Space/middle-button panning:** Implemented.
- **Touch pinch zoom:** Implemented.
- **Movable, dockable, closable navigator:** Implemented.

## Multi-selection, grouping, and layout

- **Shift-click multi-selection:** Implemented.
- **Marquee selection:** Implemented.
- **Move and resize a selection together:** Implemented.
- **Group and ungroup:** Implemented with persistent group relationships.
- **Align left/center/right/top/middle/bottom:** Implemented.
- **Equal horizontal/vertical distribution:** Implemented.
- **Anchored object-to-object connectors:** Implemented.
- **Simple rectangle/ellipse union, intersection, and subtraction:** Implemented as compound objects.
- **Arbitrary imported-SVG Boolean path operations:** Not implemented.

## Data and scientific annotations

- **CSV and tab-separated spreadsheet paste:** Implemented.
- **Editable bar, line, scatter, box, heatmap, and table objects:** Implemented.
- **Reopen chart/table source data by double-clicking:** Implemented.
- **Panel labels, callouts, scale bars, measurements, grouping brackets, numbered markers, legends, and significance brackets:** Implemented.
- **Greek symbols, superscript, subscript, and chemical-number formatting:** Implemented.
- **Practical LaTeX-like equation commands:** Implemented as a limited browser-safe subset.
- **Complete TeX/MathJax-quality equation engine:** Not implemented.

## Components and object editing

- **Save selection as reusable component:** Implemented.
- **Insert multiple component instances:** Implemented.
- **Update all project instances from a revised selection:** Implemented.
- **Image horizontal/vertical flip:** Implemented.
- **Percentage crop:** Implemented.
- **Rectangle, rounded, and circular image masks:** Implemented.
- **Imported SVG path-node editing:** Not implemented.

## Review, references, and accessibility

- **Comments attached to objects or pages:** Implemented.
- **Resolve, reopen, navigate to, and delete comments:** Implemented.
- **DOI, creator, URL, licence, attribution, and notes records:** Implemented.
- **Automatic reference collection from used assets:** Implemented.
- **Downloadable reference list:** Implemented.
- **Named version checkpoints:** Implemented.
- **Added/changed object comparison highlighting:** Implemented.
- **Overall alt text and long descriptions:** Implemented.
- **Automatic description draft from page layers:** Implemented.
- **Contrast and small-text checks:** Implemented.
- **Grayscale/protanopia/deuteranopia/tritanopia previews:** Implemented as editor previews.
- **Real-time multi-user commenting:** Not implemented.

## Publication and presentation

- **Generic single-column, double-column, full-page, square, 16:9, and 4:3 presets:** Implemented.
- **Automated readiness checks:** Implemented for unresolved comments, missing alt text, off-canvas objects, small print text, broken connectors, external images, and reference workflow.
- **Downloadable publication-readiness report:** Implemented.
- **Fullscreen multi-page presentation mode:** Implemented.
- **Journal-specific guaranteed compliance:** Not claimed; users must verify current venue rules.

## Figure Assistant

- **Written-description figure generation without an API:** Implemented as a private in-browser rule-based layout assistant.
- **Search across local and expanded illustration libraries:** Implemented.
- **Workflow, comparison, cycle, wastewater, host-pathogen, PCR, CRISPR, sequencing, biofilm, and general figures:** Implemented.
- **Generated output remains editable:** Implemented.
- **Flattened diffusion image generation:** Not implemented by design.
- **Optional practical local language model:** Not implemented.

## Text and fonts

- **Editable text content, family, size, bold, italic, and species styling:** Implemented.
- **Searchable font catalogue:** Implemented with 38 bundled/open/system options.
- **Local `.woff`, `.woff2`, `.ttf`, and `.otf` import:** Implemented.
- **Project default and apply-to-all fonts:** Implemented.
- **Embedding imported font binaries in project/PowerPoint exports:** Not implemented.

## Export

- **Editable SVG export:** Implemented.
- **Poster-ready physical-size SVG:** Implemented.
- **Standard/high-resolution/print PNG:** Implemented.
- **Optional exported grid:** Implemented.
- **Complete editable `.scicanvas` project export:** Implemented.
- **Attribution and reference reports:** Implemented.
- **PowerPoint `.pptx` export:** Implemented with one high-resolution page image per slide.
- **Native editable PowerPoint shapes:** Not implemented.
- **PDF and TIFF export:** Not implemented.
- **SBGN/BioPAX/SBML export:** Not implemented.

## Interface architecture

- **Microsoft-style ribbon and Keynote-style inspector:** Implemented.
- **Simple and Advanced modes:** Implemented.
- **Focused Pro Tools hub:** Implemented with Arrange, Data, Annotate, Components, Review, and Publish workspaces.
- **Progressive disclosure instead of permanent control overload:** Implemented.
- **Responsive science/upload/water drawers:** Implemented.

## Remaining priority areas

1. Browser-level automated interaction and visual-regression tests.
2. Account-based encrypted cloud storage and shared lab workspaces.
3. Imported SVG path-node editing and arbitrary vector Boolean operations.
4. Native editable PowerPoint-object export.
5. Full TeX-quality mathematics and richer gene/protein formatting rules.
6. PDF, TIFF, SBGN, BioPAX, and SBML export.
7. Optional small local model-assisted prompt interpretation when practical.