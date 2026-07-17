# Figureloom

**A local-first scientific illustration studio for figures, posters, data, maps, presentations, collaborative review, and gloriously specific scientific nonsense.**

Figureloom feels familiar to people who know PowerPoint, Keynote, or office-style editors, while keeping scientific tools editable and progressively disclosed. It runs in the browser, supports touch devices, and remains usable without an account.

## The experience

The interface uses a calm editorial-laboratory aesthetic: luminous neutral surfaces, restrained botanical and spectral accents, clear typography, frosted drawers, responsive cards, and subtle motion. It is polished without becoming toy-like or visually noisy.

On first launch, Figureloom asks what it should call the user. The locally stored name appears as an editable title-bar greeting and leads into a passive tour that highlights visible controls without opening panels, scrolling the workspace, selecting objects, or modifying the project.

## Core editor

- Local-first multi-page scientific figure editor
- Continuous autosave with synchronous save-before-refresh/suspension
- Last-known-good fallback and rotating recovery snapshots
- Downloadable `.scicanvas` project backups
- Screen, print, poster, square, presentation, and custom physical formats
- Portrait/landscape projects with millimetre-aware export geometry
- Movable and collapsible canvas control bubble
- Hand-tool panning, hold-Space panning, navigator, fit, actual size, wheel zoom, and pinch zoom
- Adaptive grids, object snapping, smart guides, alignment, distribution, grouping, and shared resizing
- Multiple pages with rename, reorder, move/copy objects, and protected deletion
- Layers with visibility, locking, naming, reordering, and duplication
- Anchored connectors that follow their source and destination objects
- Refresh-safe restoration after every project module has initialized

## Live email accounts and project gallery

**Pro Tools → Accounts & gallery** is connected to the Figureloom Supabase project.

It provides:

- A local project gallery that works without signing in
- Email/password account creation and sign-in
- Email confirmation and confirmation resend
- Forgot-password links delivered by email
- An in-app two-field new-password form after the recovery redirect
- A gallery of owned and shared cloud projects
- Save, open, duplicate, and owner-only deletion
- Owner, editor, reviewer, and viewer roles
- Browser-side AES-GCM encryption before cloud storage

Figureloom deliberately uses **email and password only**. Apple, Microsoft, and other social sign-in providers are not included.

The browser contains only the Supabase project URL and publishable key. Database access is enforced through Row Level Security. No service-role key, database password, SMTP credential, or server secret belongs in browser code.

Project payloads are encrypted before storage. Cloud thumbnails are not stored; titles, ownership, timestamps, roles, and revisions remain visible metadata so the project gallery can work. The encryption design is application-layer rather than zero-knowledge: a privileged database operator can derive project keys.

See [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md) and [`supabase/schema.sql`](supabase/schema.sql).

## Live collaboration

**Pro Tools → Live collaboration** adds:

- Private authenticated Realtime sessions
- Named presence and remote cursors
- Encrypted whole-project broadcasts
- Encrypted persistent review comments
- Owner, editor, reviewer, and viewer permissions
- A conflict pause when an incoming revision arrives while the local user is typing or dragging
- Explicit **Apply remote update** and **Keep mine** controls

Project owners grant access by email:

- Existing accounts receive access immediately.
- Unknown emails become pending invitations.
- Access activates automatically when that exact email creates an account.

Figureloom currently reserves collaboration access but does not send a separate collaboration-invitation email. Owners should share the app link themselves. Supabase Auth still sends normal account-confirmation and password-recovery emails.

The collaboration model favors understandable conflict handling over pretending to be a CRDT. Whole-project revisions are encrypted, revision-tracked, and never silently applied over an active local interaction.

## Scientific illustration libraries

Figureloom combines complementary sources while loading results on demand:

- Original built-in programmatic scientific artwork
- **Water 32** for water, wastewater, hydrology, pollution, monitoring, marine systems, and treatment
- Bioicons
- Healthicons
- Tabler diagram symbols
- Reusable user uploads and editable SVG vaults

Search results are normalized and deduplicated. External SVGs are sanitized, validated, embedded into the project, and retain available source, creator, licence, and attribution metadata. Clearly inappropriate general-library terms are filtered, and broken previews are disabled instead of offering a dead Add button.

## Figure Assistant

The private Figure Assistant accepts a description of a pathway, comparison, workflow, cycle, environmental system, or laboratory process and assembles an editable figure from available libraries.

It does not generate a flattened picture. It creates movable, recolorable, resizable Figureloom objects.

When a compatible browser exposes an on-device language-model API, an optional local interpreter can restructure vague prompts and suggest an automatic, workflow, comparison, or cycle layout. The deterministic assistant remains the fallback.

## Data and advanced science

Paste spreadsheet or delimited data to create editable data objects. Double-click charts/tables to reopen their source.

Supported starters include:

- Bar, line, scatter, box, heatmap, and table
- Histogram, violin, volcano, PCA-style scatter, Kaplan–Meier, and forest plots
- Radar, bubble, Gantt, timeline, and flow-cytometry-style plots
- Trendlines and logarithmic axes
- Sequence and protein-domain tracks
- Phylogenetic trees
- Gel/blot lanes
- Microscopy-channel layouts

Charts remain compact data objects rather than exploding into hundreds of canvas layers.

## TeX vector equations

**Pro Tools → TeX typesetting** loads MathJax on demand and converts TeX source into embedded SVG artwork.

- TeX source remains editable
- Equations scale as vectors
- Display and inline rendering are supported
- AMS mathematics and chemistry notation are enabled
- Color remains editable
- Double-clicking reopens the source

MathJax needs internet access the first time its runtime is requested. The rendered SVG is then stored inside the project.

## SVG path editing

**Pro Tools → SVG path editor** supports:

- `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, and `Z` commands
- Numeric command editing, including relative commands
- Draggable absolute anchors and curve controls
- Raw path-data editing
- Adding/deleting paths
- Breaking compound SVG artwork into independent editable SVG objects
- Preserving viewBoxes, definitions, metadata, and ancestor transforms

## Pathway exchange

**Pro Tools → Pathway exchange** exports the active page as:

- SBGN-ML Process Description
- BioPAX Level 3 RDF/XML
- SBML Level 3 Version 2

Visible objects become entities/species and anchored connectors become interactions/reactions. Exports are interoperable starting models and should be validated in specialist pathway software before deposition.

## Maps

**Insert → Maps** provides world maps, country silhouettes, highlighted-country maps, study-site locators, and imported GeoJSON for streets, districts, watersheds, routes, coastlines, and research boundaries.

Maps are inserted as editable vector objects with source metadata.

## Office bridge

### PowerPoint

- Editable-first export for supported text, shapes, arrows, charts, and tables
- Vector/image placement for supported artwork
- Flattened compatibility export when fidelity matters more than editability
- Compatibility report for native, vector/image, and flattened fallbacks
- Import of common slides, text, pictures, shapes, tables, groups, and basic charts

SmartArt, unusual masters, animation, 3D effects, and specialized PowerPoint behavior may simplify rather than being falsely advertised as perfectly reversible.

### Spreadsheets

The Office bridge accepts `.xlsx`, `.xls`, `.xlsm`, `.ods`, `.csv`, and `.tsv`. Users can choose sheets, preview data, insert editable tables/charts, embed source workbook bytes, refresh from an updated file, and export selected data back to `.xlsx`.

## Review and publication

- Panel labels, callouts, numbered markers, legends, brackets, scale bars, and measurement lines
- Object/page comments with resolve states
- Encrypted shared-project comments
- DOI, source, author, licence, and attribution records
- Automatic attribution collection
- Named checkpoints and visual comparisons
- Alt-text drafting
- Contrast, tiny-text, grayscale, and color-vision previews
- Publication-readiness reports and journal-size presets
- Fullscreen multi-page presentation mode

## Touch and navigation

- Pinch to zoom around the gesture midpoint
- Use the Hand tool or hold Space to pan
- Drag/collapse the canvas control bubble
- Move or close the navigator
- Horizontally scroll narrow control strips instead of crushing buttons
- Open Pages or Format as mobile overlays

## Refresh and recovery

Before refresh, tab suspension, or page close, Figureloom synchronously saves the active page into the complete multi-page project. Data is validated before replacing the primary copy, and the previous valid project remains a fallback.

After all modules load, a final authoritative restore runs using the current multi-page format. For irreplaceable work, also download a `.scicanvas` backup.

## Personalization and small delights

- First-run local display name
- Editable greeting
- Expanded passive tour
- Simple and Advanced interface modes
- Reduced-motion support
- Responsive touch targets
- Konami-code DNA animation
- `Ctrl/⌘ K` → `microscope` dark cyan laboratory interface mode

The greeting and interface effects never appear in exported artwork.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

Local editor features need no build step. Cloud email redirects require the local URL to be added to the Supabase Auth redirect allow list.

## Testing

Normal pushes and pull requests run the fast validation suite:

- JavaScript syntax
- Required files and script order
- Duplicate IDs
- Offline-shell completeness
- Asset/SVG trust markers
- Refresh-safe restoration
- Live email account, gallery, and collaboration wiring
- SVG path, TeX, pathway, and local-model wiring

Desktop and iPhone-sized Chromium tests remain available through manual `workflow_dispatch`; ordinary pushes do not launch the long browser suite.

## Data and privacy

Local projects, uploads, fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, the local display name, gallery copies, and preferences stay in browser storage until the user explicitly saves a cloud copy.

When signed in, encrypted project payloads and encrypted comment bodies are stored in Supabase. Cloud titles and access metadata remain plaintext. Read the deployment/security details in [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md).

## Roadmap status

The former roadmap is implemented:

1. Email-account encrypted cloud gallery and shared workspaces
2. SVG path/node editing and break-apart operations
3. TeX-quality SVG typesetting
4. Realtime collaborative review
5. SBGN, BioPAX, and SBML export
6. Optional browser-local prompt interpretation

Remaining work is operational: configure the production Auth Site URL/redirect allow list, add production SMTP, test email delivery, monitor the service, maintain backups, publish privacy/account-deletion policies, and validate pathway exports with specialist tools.

## Licensing

Original Figureloom and Water 32 artwork is project-authored programmatic SVG. External assets retain available source, creator, licence, and attribution information. Users remain responsible for reviewing current source terms before publication.

See also:

- [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md)
- [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md)
- [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md)
- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md)
- [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md)