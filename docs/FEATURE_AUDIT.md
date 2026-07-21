# FigureLoom feature audit

This document maps major product areas to the current implementation. It distinguishes working features from limitations so the repository does not claim features that are only planned or no longer exposed.

## Core editor

- **Browser-based local-first editor:** Implemented.
- **Editing without an account:** Implemented.
- **Multi-page projects and layer ordering:** Implemented.
- **Local autosave and recovery snapshots:** Implemented.
- **Complete editable `.figureloom` backup download and import:** Implemented.
- **Older FigureLoom backup import:** Implemented.
- **Project tabs with close controls inside each tab:** Implemented.
- **Light and dark appearance:** Implemented.

## Interface modes

- **Automatic mode:** Implemented.
- **Desktop mode:** Implemented as the compact mouse-and-keyboard layout.
- **Tablet mode:** Implemented as the full editor with roomier touch targets.
- **Phone mode:** Implemented with a compact header, dock, sheets, safe areas, and full-screen task panels.
- **Undo and Redo beside Delete on Desktop and Tablet:** Implemented.
- **Undo and Redo in the Phone header:** Implemented.
- **Movable desktop canvas navigation bar:** Implemented.

## Objects and layout

- **Text, shapes, arrows, lines, and connectors:** Implemented.
- **Text wrapping and editable text boxes:** Implemented.
- **Object movement, resize, rotation, opacity, fill, and stroke:** Implemented.
- **Shift-click, marquee, and touch multi-selection:** Implemented.
- **Group and ungroup:** Implemented with persistent object relationships.
- **Align and distribute:** Implemented.
- **Grid, snapping, and smart guides:** Implemented.
- **Anchored connectors that follow objects:** Implemented.
- **Layer visibility, locking, naming, and reordering:** Implemented.
- **Simple Boolean operations for native shapes:** Implemented.
- **Full Illustrator-style vector editing:** Not claimed.

## Text, equations, and code

- **Rich text controls, Greek symbols, superscript, and subscript:** Implemented.
- **Local WOFF, WOFF2, TTF, and OTF font import:** Implemented.
- **MathJax TeX rendering to retained-source SVG:** Implemented.
- **Code windows for instructions and technical examples:** Implemented.
- **Very advanced TeX packages and arbitrary custom macros:** Limited.
- **Portable embedding of every locally imported font across all external applications:** Not guaranteed.

## Scientific illustration and maps

- **Built-in editable scientific artwork:** Implemented.
- **Search, aliases, categories, and metadata:** Implemented.
- **On-demand compatible outside libraries:** Implemented where configured.
- **Source, license, author, and attribution metadata:** Retained where available.
- **Automatic reference collection from used assets:** Implemented where metadata exists.
- **World and country maps:** Implemented.
- **Study-site locators and manual markers:** Implemented.
- **GeoJSON import:** Implemented.
- **GIS analysis and survey-grade measurement:** Not claimed.

## SVG tools

- **SVG import and sanitization:** Implemented.
- **Whole-object SVG recoloring where supported:** Implemented.
- **SVG path command and coordinate editing:** Implemented.
- **Anchor selection:** Implemented.
- **Breaking compound SVG artwork into independent SVG objects:** Implemented.
- **Complete desktop-class Bezier handle editing and arbitrary Boolean path operations:** Not claimed.

## Data, tables, and charts

- **CSV and tab-separated paste:** Implemented.
- **XLSX, XLS, XLSM, ODS, CSV, and TSV import:** Implemented through office and data tools.
- **Editable tables:** Implemented.
- **Editable bar, line, scatter, box, violin, volcano, heatmap, PCA-style, Kaplan-Meier, forest, radar, bubble, Gantt, timeline, and flow-cytometry-style starters:** Implemented.
- **Reopening chart and table source data:** Implemented.
- **Statistical analysis or validation:** Not claimed.
- **Macro execution:** Not implemented by design.

## Review and accessibility

- **Comments attached to objects or pages:** Implemented.
- **Resolve, reopen, navigate to, and delete comments:** Implemented.
- **References and attribution records:** Implemented.
- **Named checkpoints and change highlighting:** Implemented.
- **Overall alt text and long descriptions:** Implemented.
- **Automatic description draft from page layers:** Implemented.
- **Contrast and small-text checks:** Implemented.
- **Grayscale and color-vision previews:** Implemented.
- **Guaranteed journal or accessibility compliance:** Not claimed.

## Publication and presentation

- **Generic publication and presentation page presets:** Implemented.
- **Physical-size SVG output:** Implemented.
- **Publication-readiness report:** Implemented.
- **Fullscreen multi-page presentation mode:** Implemented.
- **Starter SBGN-ML, BioPAX, and SBML pathway exchange:** Implemented and requires specialist validation.

## Current export

- **Editable SVG for the active page:** Implemented.
- **Export all pages as SVG:** Implemented with one editable SVG per page.
- **Optional physical print dimensions:** Implemented.
- **Optional exported editor grid:** Implemented.
- **Complete editable `.figureloom` backup:** Implemented.
- **Reference and attribution output:** Implemented where available.
- **Direct PNG export in the current finished panel:** Not exposed.
- **Direct PDF or TIFF export:** Not exposed.
- **Direct PowerPoint export in the current finished panel:** Not exposed.
- **External conversion from checked SVG:** Required when those formats are needed.

## PowerPoint and spreadsheet import

- **PowerPoint import:** Implemented for many common elements.
- **Spreadsheet import:** Implemented for supported workbook and delimited formats.
- **Exact conversion of complex masters, SmartArt, WordArt, animation, transitions, media, and advanced charts:** Not guaranteed.
- **PowerPoint import implying matching PowerPoint export:** Not claimed.

## Accounts and cloud projects

- **Email and password accounts:** Implemented.
- **Confirmation and password recovery:** Implemented.
- **Local gallery without an account:** Implemented.
- **Explicit encrypted cloud saves:** Implemented.
- **Owned and shared cloud gallery:** Implemented.
- **Owner, editor, reviewer, and viewer roles:** Implemented.
- **Apple, Microsoft, or other social sign-in:** Not used.
- **Zero-knowledge encryption:** Not claimed. The system uses application-layer encryption.

## Collaboration

- **Email-account invitations:** Implemented.
- **Expiring guest links:** Implemented.
- **Guest join with a display name and no email account:** Implemented when anonymous authentication is enabled.
- **Optional 4 to 12 digit guest-link PIN:** Implemented.
- **Named presence and remote cursors:** Implemented.
- **Encrypted project broadcasts and persistent review comments:** Implemented.
- **Incoming-update pause while typing or dragging:** Implemented.
- **Owner revocation of guest links:** Implemented.
- **Removing already downloaded files from another person's device:** Not possible.

## MCP and external assistants

- **Hosted project-specific MCP connection:** Implemented.
- **Private remote connection link:** Implemented.
- **Read-only and full editor access:** Implemented.
- **Separate destructive-action permission:** Implemented.
- **Command discovery from the open editor:** Implemented.
- **Normal history and durable save paths for successful writes:** Implemented.
- **Disconnect, reconnect, and revoke:** Implemented.
- **Automatic authorization transfer when switching projects:** Not allowed by design. The old project authorization is revoked.
- **MCP without a configured cloud backend:** Not available in the hosted workflow.

## Loomy

- **Editable starting layouts from written descriptions:** Implemented.
- **Deterministic in-browser builder:** Implemented.
- **Optional providers where configured:** Implemented according to deployment and provider availability.
- **FigureLoom as an AI-first editor:** Not the product direction.
- **Scientific accuracy without review:** Not claimed.

## Offline behavior

- **Versioned offline application shell:** Implemented.
- **Local editing after required files are cached:** Implemented.
- **Local autosave and backups while cloud services are unavailable:** Implemented.
- **Cloud projects, live collaboration, hosted MCP, outside libraries, MathJax, and optional providers while fully offline:** Limited or unavailable.

## Current limitations and review areas

1. Direct PNG, PDF, TIFF, and PowerPoint export are not exposed in the current finished export panel.
2. Imported fonts and complex SVG features can behave differently in another application.
3. Complex PowerPoint files require careful comparison with the original.
4. Statistical, GIS, image-analysis, pathway, journal, printer, and accessibility requirements must be validated in specialist tools or against current rules.
5. Cloud security depends on correct authentication, Row Level Security, private Realtime, encryption-key handling, and deployment configuration.
6. Browser storage is not a substitute for external `.figureloom` backups.
