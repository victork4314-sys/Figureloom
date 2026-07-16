# SciCanvas

**A local-first scientific illustration studio for figures, posters, data, maps, presentations, and gloriously specific scientific nonsense.**

SciCanvas is designed to feel familiar to people who know PowerPoint, Keynote, or office-style editors—without turning every advanced scientific feature into another permanent toolbar button. It runs directly in the browser, works well on touch devices, and keeps project data local unless the user explicitly exports or shares it.

## The experience

The interface uses a calm editorial-laboratory aesthetic: luminous neutral surfaces, restrained botanical and spectral accents, clear typography, frosted drawers, responsive cards, and subtle motion. It is intentionally polished without becoming pink, toy-like, or visually noisy.

On first launch, SciCanvas asks what it should call the user. The name is stored only in that browser and appears as a small editable greeting in the title bar. The welcome then leads into an expanded **passive** tour: the guide highlights visible controls but never opens panels, scrolls the workspace, selects objects, or changes the project.

The permanent `?` button replays the guide at any time.

## Core capabilities

- Local-first multi-page scientific figure editor
- Continuous autosave with synchronous save-before-refresh/suspension
- Last-known-good fallback plus rotating recovery snapshots
- Downloadable `.scicanvas` project backups
- Screen, A4, A3, A2, A1, A0, square, and custom physical formats
- Portrait and landscape projects with millimetre-aware export geometry
- Movable and collapsible canvas control bubble
- Hand-tool panning, hold-Space panning, navigator, fit, actual size, wheel zoom, and two-finger pinch zoom
- Adaptive page-aware grid, object snapping, and smart alignment guides
- Multiple pages with rename, reorder, move/copy objects, and protected page deletion
- Layers with visibility, locking, naming, touch/keyboard reordering, and duplication
- Multi-selection, marquee selection, grouping, alignment, distribution, and shared resizing
- Attached connectors that remain anchored when objects move
- Refresh-safe restoration after every module has initialized

## Scientific illustration library

SciCanvas combines complementary sources while loading results on demand rather than downloading thousands of SVGs at startup:

- Original built-in programmatic scientific artwork
- **Water 32** for water, wastewater, hydrology, pollution, monitoring, marine systems, and treatment processes
- Bioicons
- Healthicons
- Tabler diagram symbols
- Reusable user uploads and editable SVG vaults

Search results are normalized and deduplicated before display. External SVGs are sanitized, validated, embedded into the project, and retain available source, creator, licence, and attribution metadata.

Clearly inappropriate general-library terms are filtered, and broken previews are disabled instead of offering a dead Add button.

## Figure Assistant

The private no-API Figure Assistant accepts a description such as a pathway, comparison, workflow, cycle, environmental system, or laboratory process and assembles an editable figure from the available illustration libraries.

It does not generate a flattened AI picture. It creates movable, recolorable, resizable SciCanvas objects that remain editable and exportable.

## Data, charts, and advanced science

Paste spreadsheet or CSV data to create editable data objects. Double-click a chart/table—or use **Edit chart or table data** in the inspector or quick menu—to reopen its source data and settings.

Supported visual and scientific starters include:

- Bar, line, scatter, box, heatmap, and table
- Histogram, violin, volcano, PCA-style scatter, Kaplan–Meier, and forest plots
- Radar, bubble, Gantt, timeline, and flow-cytometry-style plots
- Trendlines and logarithmic axes
- Sequence and protein-domain tracks
- Phylogenetic-tree starters
- Gel/blot lane layouts
- Microscopy-channel layouts

Charts remain compact editable data objects rather than exploding into hundreds of separate layers.

## Maps

**Insert → Maps** opens Map Studio for:

- World political maps
- Country silhouettes
- Highlighted-country maps
- City or study-site locator maps
- Imported GeoJSON streets, districts, watersheds, routes, coastlines, and research boundaries

Maps are inserted as editable vector objects with appropriate source metadata.

## Pro Tools without cockpit syndrome

Advanced functionality lives behind one **Pro tools** entry instead of crowding the ordinary ribbon:

- Arrange and group
- Data and charts
- Scientific annotations
- Components and object operations
- Review, references, accessibility, and version checkpoints
- Publish and present
- Office bridge
- Workspace and recovery
- Advanced Science

Use `Ctrl/⌘ K` to open command search rather than hunting through drawers.

## Office bridge

### PowerPoint export

SciCanvas offers:

- **Editable-first PowerPoint export** for supported text, shapes, arrows, charts, and tables
- Vector/image placement for supported artwork
- A flattened compatibility copy when visual fidelity matters more than editability
- An Office compatibility report showing native, vector/image, and flattened fallbacks

### PowerPoint import

PPTX import reconstructs common slides, text, pictures, shapes, tables, groups, and basic charts. SmartArt, unusual masters, animations, 3D effects, and highly specialized PowerPoint behavior may simplify rather than being falsely advertised as perfectly reversible.

### Spreadsheet import

The Office bridge accepts `.xlsx`, `.xls`, `.xlsm`, `.ods`, `.csv`, and `.tsv` files. Users can choose a sheet, preview it, insert an editable table/chart, embed source workbook bytes in the project, refresh from an updated file, and export selected data back to `.xlsx`.

## Scientific annotations and review

- Panel labels
- Callouts and numbered markers
- Scale bars and measurement lines
- Grouping and significance brackets
- Legends
- Greek symbols, subscripts, superscripts, and practical equation notation
- Object/page comments with resolve states
- DOI, source, author, licence, and attribution records
- Automatic attribution collection
- Named checkpoints with visual change highlighting
- Alt-text drafting
- Contrast, tiny-text, grayscale, and color-vision previews
- Publication-readiness reports and journal-size presets

## Reusable components and object editing

- Save selections as reusable project components
- Insert multiple instances
- Update instances from a revised component
- Crop, flip, and mask images
- Union, intersect, and subtract native shapes

Imported SVG artwork remains vector and supports whole-object recoloring, but arbitrary path-node surgery and breaking a compound SVG into independent path objects remain future work.

## Touch and navigation

- Pinch with two fingers to zoom around the gesture midpoint
- Use the Hand tool or hold Space to pan
- Drag the canvas control bubble by its grip
- Collapse or reopen the bubble
- Move or close the navigator
- Horizontally scroll responsive ribbons and control strips rather than crushing buttons
- Open Pages or Format as mobile overlays on narrow screens

## Refresh and recovery safety

Before refresh, tab suspension, or page close, SciCanvas synchronously saves the active page into the complete multi-page project. Saved data is validated before replacing the primary copy, and the previous valid project is retained as a last-known-good fallback.

After every project module loads, a final authoritative restore runs using the current multi-page format. This avoids older one-page startup logic overwriting newer project structures.

For important work, also download a `.scicanvas` backup. Browser storage is not a substitute for account-based cloud backup.

## Personalization and accessibility

- First-run local display name
- Editable title-bar greeting
- Expanded twelve-step passive tour
- Simple and Advanced interface modes
- Reduced-motion support
- Color-vision previews and contrast checks
- Alt-text tools
- Responsive touch targets
- Clear error and recovery messages

The saved display name never leaves the browser and is not included in exported project artwork.

## Small hidden delights

SciCanvas includes two optional Easter eggs:

- The classic Konami sequence releases a brief DNA animation.
- Open command search with `Ctrl/⌘ K`, type `microscope`, and press Enter to toggle a dark cyan laboratory interface mode. The project canvas and exports remain unchanged.

These effects respect the device’s reduced-motion preference.

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Testing

GitHub Actions validates:

- JavaScript syntax
- Required application files
- Script dependency order
- Duplicate static IDs
- Offline-shell completeness
- Asset trust and SVG validation markers
- Refresh-safe restoration
- Personalized welcome and passive-tour guarantees
- Desktop and iPhone-sized Chromium interaction smoke tests

Browser-test failures upload compact results, screenshots, and Playwright traces.

## Data and privacy

Projects, pages, uploaded images, editable SVGs, imported fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, display name, and interface preferences are stored locally in browser storage.

No account or API key is required. External illustration indexes and optional web fonts require internet access when first requested.

## Asset licensing

Original SciCanvas and Water 32 artwork is project-authored programmatic SVG. External assets retain available source, creator, licence, and attribution information. Users remain responsible for reviewing current source terms before publication.

See:

- [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md)
- [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md)
- [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md)
- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md)

## Remaining roadmap

1. Account-based encrypted cloud vault and shared laboratory workspaces
2. Arbitrary SVG path-node editing and break-apart operations
3. Full TeX-quality typesetting
4. Real-time collaborative comments and review sessions
5. Machine-readable pathway export such as SBGN, BioPAX, or SBML
6. Optional local model-assisted prompt interpretation when a practical browser model is available