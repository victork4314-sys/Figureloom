# SciCanvas

**A local-first scientific illustration studio for figures, posters, data, maps, presentations, collaborative review, and gloriously specific scientific nonsense.**

SciCanvas is designed to feel familiar to people who know PowerPoint, Keynote, or office-style editors—without turning every advanced scientific feature into another permanent toolbar button. It runs directly in the browser, works well on touch devices, and remains fully usable without an account.

## The experience

The interface uses a calm editorial-laboratory aesthetic: luminous neutral surfaces, restrained botanical and spectral accents, clear typography, frosted drawers, responsive cards, and subtle motion. It is intentionally polished without becoming pink, toy-like, or visually noisy.

On first launch, SciCanvas asks what it should call the user. The name is stored in that browser and appears as a small editable greeting in the title bar. The welcome leads into an expanded passive tour: the guide highlights visible controls but never opens panels, scrolls the workspace, selects objects, or changes the project.

The permanent `?` button replays the guide at any time.

## Core capabilities

- Local-first multi-page scientific figure editor
- Continuous autosave with synchronous save-before-refresh/suspension
- Last-known-good fallback plus rotating recovery snapshots
- Downloadable `.scicanvas` project backups
- Optional account gallery and encrypted cloud vault
- Screen, A4, A3, A2, A1, A0, square, and custom physical formats
- Portrait and landscape projects with millimetre-aware export geometry
- Movable and collapsible canvas control bubble
- Hand-tool panning, hold-Space panning, navigator, fit, actual size, wheel zoom, and two-finger pinch zoom
- Adaptive page-aware grid, object snapping, and smart alignment guides
- Multiple pages with rename, reorder, move/copy objects, and protected page deletion
- Layers with visibility, locking, naming, touch/keyboard reordering, and duplication
- Multi-selection, marquee selection, grouping, alignment, distribution, and shared resizing
- Attached connectors that remain anchored when objects move
- Refresh-safe restoration after every project module has initialized

## Accounts, encrypted cloud vault and project gallery

**Pro Tools → Accounts & gallery** provides:

- A local project gallery that works without signing in
- Email/password signup and sign-in
- Password recovery links by email and in-app password replacement after the recovery redirect
- Sign in with Apple
- Sign in with Microsoft / Azure
- A gallery of owned and shared cloud projects
- Save, open, duplicate and delete cloud projects
- Shared laboratory workspaces with owner, editor, reviewer and viewer roles

Cloud support is backend-ready but intentionally disabled until a deployment supplies its own Supabase URL, browser-safe public key, database schema, Edge Functions, SMTP configuration and OAuth credentials. Empty values in `cloud-config.js` leave the app in local-only mode without breaking any editor feature.

Editable project payloads are encrypted in the browser with AES-GCM before database storage. An authenticated Edge Function derives a project-specific key from a server-only master secret, allowing email password recovery and OAuth accounts to continue working. This is application-layer encryption, not a zero-knowledge design; deployment operators must protect the master secret and follow the production checklist.

See [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md), [`supabase/schema.sql`](supabase/schema.sql), and the Edge Functions in [`supabase/functions`](supabase/functions).

## Live collaboration and review sessions

**Pro Tools → Live collaboration** adds:

- Collaborator invitations by email
- Owner, editor, reviewer and viewer permissions
- Authenticated Realtime presence
- Named remote cursors
- Encrypted persistent project comments
- Encrypted live project broadcasts
- A conflict pause when an incoming update arrives while the local user is typing or dragging
- Explicit **Apply remote update** and **Keep mine** controls instead of silent overwrites

Realtime editing currently uses encrypted whole-project revisions with last-applied revision tracking. It favors safety and understandable conflict handling over pretending to be a CRDT. The transport and permissions can later be upgraded without changing ordinary local projects.

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

## Figure Assistant and optional local model interpretation

The private Figure Assistant accepts a description such as a pathway, comparison, workflow, cycle, environmental system, or laboratory process and assembles an editable figure from the available illustration libraries.

It does not generate a flattened AI picture. It creates movable, recolorable, resizable SciCanvas objects that remain editable and exportable.

When a compatible browser exposes an on-device Prompt/Language Model API, the assistant can optionally restructure a vague request into a concise scientific prompt and suggest a workflow, comparison, cycle, or automatic layout. The prompt stays on the device. When no local model API exists, the ordinary deterministic assistant remains available and unchanged.

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

## TeX-quality vector equations

**Pro Tools → TeX typesetting** loads MathJax on demand and converts TeX source into embedded SVG artwork.

- The TeX source remains editable
- Equations scale as vectors
- Display and inline rendering are supported
- AMS mathematics and chemistry notation are enabled
- Equation color remains editable inside SciCanvas
- Double-clicking a TeX object reopens its source

MathJax requires internet access the first time its runtime is requested. The rendered SVG is then stored inside the project.

## Editable SVG paths and break-apart

**Pro Tools → SVG path editor** completes the advanced vector workflow:

- Parse and edit `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, and `Z` commands
- Edit every numeric command value, including relative commands
- Drag absolute anchors and curve controls on the canvas
- Add or delete paths
- Edit raw path data
- Break compound SVG artwork into independent editable SVG objects
- Preserve the original viewBox, reusable definitions, metadata and ancestor transforms during break-apart

Imported SVG artwork still remains a bounded SVG object; this is path-command editing rather than a full Illustrator-style mesh, paint-server or topology engine.

## Machine-readable pathway exchange

**Pro Tools → Pathway exchange** maps the active page into:

- SBGN-ML Process Description
- BioPAX Level 3 RDF/XML
- SBML Level 3 Version 2

Visible objects become entities/species, and anchored connectors become interactions/reactions. Standalone arrows are linked to nearby left/right entities when possible. The inspector provides pathway-role and machine-identifier overrides for proteins, nucleic acids, simple chemicals, complexes, compartments and annotation-only objects.

The export is an interoperable starting model. Users should validate biological semantics and identifiers in a dedicated pathway tool before deposition.

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
- Accounts and project gallery
- Live collaboration
- SVG path editor
- TeX typesetting
- Pathway exchange

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
- Greek symbols, subscripts, superscripts, practical equation notation and full TeX SVG objects
- Object/page comments with resolve states
- Encrypted shared-project comments
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
- Edit SVG path commands and node coordinates
- Break compound SVG artwork into independent objects

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

For important work, also download a `.scicanvas` backup. Cloud sync is optional and should not be the only copy of irreplaceable work.

## Personalization and accessibility

- First-run local display name
- Editable title-bar greeting
- Expanded passive tour
- Simple and Advanced interface modes
- Reduced-motion support
- Color-vision previews and contrast checks
- Alt-text tools
- Responsive touch targets
- Clear error and recovery messages

The local display name is not included in exported project artwork. Account profile data is separate and only exists after cloud auth is configured and used.

## Small hidden delights

SciCanvas includes two optional Easter eggs:

- The classic Konami sequence releases a brief DNA animation.
- Open command search with `Ctrl/⌘ K`, type `microscope`, and press Enter to toggle a dark cyan laboratory interface mode. The project canvas and exports remain unchanged.

These effects respect the device’s reduced-motion preference.

## Run locally

No build step is required for local-only features.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Cloud accounts and collaboration require the separate setup in [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md).

## Testing

GitHub Actions automatically runs the fast validation job for pushes and pull requests:

- JavaScript syntax
- Required application and backend files
- Script dependency order
- Duplicate static IDs
- Offline-shell completeness
- Asset trust and SVG validation markers
- Refresh-safe restoration
- Account/gallery/collaboration wiring
- SVG path, TeX, pathway and local-model wiring

Desktop and iPhone-sized Chromium interaction tests remain available through manual `workflow_dispatch`; ordinary code pushes do not launch the long browser suite.

## Data and privacy

Without cloud configuration, projects, pages, uploaded images, editable SVGs, imported fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, display name, gallery copies, and interface preferences stay in browser storage.

After cloud configuration and sign-in, users explicitly choose when to save an encrypted cloud copy or enter a shared review session. Cloud project titles and optional gallery thumbnails are stored as metadata; editable project payloads and collaboration-comment bodies are encrypted before database storage.

No service-role key or vault master secret belongs in the browser repository. See the deployment security checklist before enabling real accounts.

## Asset licensing

Original SciCanvas and Water 32 artwork is project-authored programmatic SVG. External assets retain available source, creator, licence, and attribution information. Users remain responsible for reviewing current source terms before publication.

See:

- [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md)
- [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md)
- [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md)
- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md)
- [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md)

## Roadmap status

The previous six-item roadmap is now implemented in the repository:

1. Account-based encrypted cloud vault and shared laboratory workspaces
2. SVG path-command/node editing and break-apart operations
3. TeX-quality SVG typesetting
4. Realtime collaborative comments and review sessions
5. SBGN, BioPAX and SBML pathway export
6. Optional browser-local model-assisted prompt interpretation

The account and collaboration code requires deployment configuration, provider credentials, SMTP, Edge Function secrets and database policies before it is live for real users. Remaining work is production operations rather than another hidden frontend feature: deploy the backend, test each OAuth provider, review security and privacy policies, configure monitoring/backups, and validate domain-specific pathway exports with specialist tools.
