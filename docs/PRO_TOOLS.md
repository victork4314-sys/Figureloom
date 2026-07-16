# SciCanvas Pro Tools

SciCanvas keeps advanced features behind one **Pro tools** entry so the normal editor remains calm. The hub now contains fourteen focused workspaces rather than adding every control to the ribbon.

## Arrange & group

- Shift-click and marquee selection
- Multi-object movement and corner resizing
- Group and ungroup
- Align and distribute
- Smart alignment guides and edge snapping
- Anchored connectors that follow their source and destination objects

Grouped objects remain separate editable layers. Grouping stores a relationship ID rather than flattening the artwork.

## Data & charts

Paste CSV or tab-separated spreadsheet data to create bar, line, scatter, box, heatmap and editable table objects. Double-click a chart or table to reopen its source data, visual type and title.

## Scientific annotation

Panel labels, callouts, scale bars, measurement lines, significance/grouping brackets, numbered markers, legends and practical equation/chemical notation.

For full TeX rendering, use the dedicated **TeX typesetting** workspace.

## Components & objects

- Reusable project components and instances
- Crop, flip and mask uploaded images
- Union, intersection and subtraction for native shapes

## Review & references

- Object/page comments and resolve states
- DOI, creator, source, licence and attribution records
- Automatic reference collection
- Named version checkpoints and change highlighting
- Alt-text drafting
- Contrast, tiny-text, grayscale and color-vision previews

## Publish & present

- Generic publication-size presets
- Publication-readiness reports
- Fullscreen multi-page presentation
- Export diagnostics and compatibility reporting

Always verify the current requirements of the specific journal, conference, printer or institution.

## Office bridge

- Import PPTX slides, common text/shapes/images/tables/groups and basic charts
- Import XLSX, XLS, XLSM, ODS, CSV and TSV
- Insert editable tables/charts and retain embedded workbook data
- Export editable-first or visual-compatibility PowerPoint files

## Workspace & recovery

- Move/copy objects between pages
- Project asset management and broken-asset checks
- Rotating recovery snapshots
- Pre-export diagnostics
- Workspace reset and shortcut reference

## Advanced Science

Publication plot starters, sequence/protein-domain tracks, phylogenetic trees, gel/blot lanes and microscopy channel layouts.

## Accounts & gallery

- Local project gallery without an account
- Email/password accounts and recovery email flow
- Sign in with Apple and Microsoft when provider credentials are deployed
- Owned/shared cloud gallery
- Explicit encrypted cloud saves

Cloud features remain disabled gracefully until [`CLOUD_SETUP.md`](CLOUD_SETUP.md) is deployed.

## Live collaboration

- Owner/editor/reviewer/viewer roles
- Private authenticated presence and remote cursors
- Encrypted project broadcasts for editors
- Encrypted persistent review comments
- Email invitations
- Incoming-update pause while the local user is typing or dragging

## SVG path editor

- Inspect and edit SVG path commands and coordinates
- Select anchors on the canvas
- Break compound SVG artwork into independent editable SVG objects

This edits path command data; it is not a full Illustrator-style Bézier-handle suite.

## TeX typesetting

- MathJax TeX rendering to embedded SVG
- Editable retained TeX source
- Display/inline mode and color controls
- Double-click or inspector editing after insertion

MathJax loads on demand. Rendered equations are embedded into the project as vector artwork.

## Pathway exchange

Export the active page as:

- SBGN-ML
- BioPAX RDF/XML
- SBML Level 3 XML

Exports map SciCanvas objects/connectors into machine-readable starter structures. Domain-specific validation in specialist pathway tools is still recommended.

## Optional local prompt interpretation

When the browser exposes a supported on-device language-model API, Figure Assistant can locally restructure vague prompts into explicit workflow/comparison/cycle instructions. Nothing is sent to a SciCanvas server, and the ordinary deterministic assistant remains the fallback.

## Interface philosophy

Advanced workspaces are progressively disclosed. The ordinary ribbon, Science library, Insert panel, Canvas Design and Export menu remain usable without opening Pro Tools. This avoids turning the application into a wall of permanently visible controls.
