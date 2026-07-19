# FigureLoom

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-663399.svg)](LICENSE)
[![Open FigureLoom](https://img.shields.io/badge/open-figureloom.org-0c2e28.svg)](https://figureloom.org/)
[![Free and open source](https://img.shields.io/badge/free%20%26%20open%20source-yes-2ea44f.svg)](LICENSE)

**A free, local-first editor for scientific figures, diagrams, posters, and presentations.**

FigureLoom runs in the browser. You can open it, make something, save it locally, and export it without creating an account. There is no paywall, watermark, or institutional pricing maze.

The interface should feel familiar to anyone who has used PowerPoint, Keynote, or another office-style editor. The difference is that FigureLoom is built around scientific work, so pathways, equations, plots, maps, microscopy layouts, references, annotations, and publication checks are part of the editor rather than an afterthought.

Try it at [figureloom.org](https://figureloom.org/).

## What it can do

- Multi-page, layer-based vector editing
- Local autosave, recovery snapshots, and downloadable `.figureloom` project backups
- Text, shapes, arrows, connectors, groups, grids, smart guides, alignment, and distribution
- Poster, print, screen, presentation, square, and custom physical page sizes
- Editable charts and tables made from pasted spreadsheet data
- Bar, line, scatter, box, violin, volcano, heatmap, PCA-style, Kaplan-Meier, forest, radar, bubble, Gantt, timeline, and flow-cytometry-style plots
- TeX equations rendered as editable SVG artwork
- SVG path editing and break-apart tools
- World maps, country maps, study-site locators, and GeoJSON import
- Code windows for instructions, methods, examples, and technical notes
- PowerPoint and spreadsheet import and export tools
- Contrast checks, tiny-text warnings, grayscale and color-vision previews, alt text, references, attribution, and journal sizing checks
- Fullscreen multi-page presentation mode

Older project backups are still accepted, so updating FigureLoom does not strand files made with earlier versions.

## Desktop, tablet, and phone

The desktop and tablet interface keeps the full editor visible. Phone mode rearranges the same tools into touch-friendly panels so the canvas still has room to breathe.

Automatic mode chooses the phone interface on phone-sized touch devices. You can also force Phone or Desktop and tablet mode in Settings. Switching the interface does not create a second project format or change the contents of a figure.

## Scientific artwork

FigureLoom includes original programmatic artwork and can load outside libraries such as Bioicons, Healthicons, and other compatible packs when they are needed.

A lot of the artwork is drawn from compact vector instructions or fetched on demand. That keeps the repository smaller and avoids shipping a giant pile of images with every page load.

Imported SVG files are sanitized before they are added. When creator, source, license, or attribution information is available, FigureLoom keeps it attached to the artwork.

## Loomy is optional

Loomy is a small helper for getting a first draft onto the canvas. You can describe a pathway, cycle, workflow, comparison, environmental system, or laboratory process, and it can assemble a starting layout from normal FigureLoom objects.

The result is editable. Objects can be moved, resized, recolored, relabeled, deleted, or rearranged like anything else in the editor.

You can also ignore Loomy completely. The editor, drawing tools, templates, imports, and exports do not depend on it.

## Projects and collaboration

An account is optional.

Without signing in, projects can remain in browser storage. With an account, FigureLoom can provide:

- An encrypted cloud project gallery
- Owned and shared projects
- Owner, editor, reviewer, and viewer roles
- Named live presence and remote cursors
- Encrypted project broadcasts and review comments
- Conflict controls that avoid silently overwriting active work

Project contents are encrypted in the browser before cloud storage. Titles, ownership, timestamps, roles, and revision metadata remain visible so the gallery can function. This is application-layer encryption, not a zero-knowledge system.

Deployment details are in [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md).

## Privacy

Local projects, uploads, fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, gallery copies, and preferences stay in browser storage unless the user deliberately saves a cloud copy or shares something.

The browser receives the public Supabase URL and publishable key only. Service-role keys, database passwords, SMTP credentials, and other server secrets do not belong in client code.

For important work, keep a downloaded project backup. Browser storage is useful, but it should not be the only copy of something that took three weeks to make.

## Run it locally

There is no build step for the basic app.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

Most editor features work locally. Cloud authentication redirects need the local URL added to the Supabase allow list.

## Testing

Pull requests run syntax and browser checks for the parts of the app they touch. The current test coverage includes:

- JavaScript syntax and script wiring
- Duplicate IDs and required assets
- Offline cache behavior
- Desktop and phone interface regressions
- Phone safe areas, touch targets, zoom, panels, and guide controls
- Visible FigureLoom branding
- Account, gallery, collaboration, TeX, pathway, and export wiring

The repository still has an older validation workflow with a few legacy assumptions. New focused browser tests are used for the current phone interface and other recently rebuilt areas.

## Contributing

Bug fixes, scientific artwork, accessibility work, import and export improvements, and very specific research-tool ideas are welcome.

Please keep changes focused and readable. Preserve source and license metadata for outside artwork. Avoid turning the interface into a cockpit unless the cockpit is genuinely necessary.

## License

FigureLoom's original code and project-authored artwork are released under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`).

[Read the full license](LICENSE).

People may use, study, modify, and share FigureLoom. When someone operates a modified version over a network, the AGPL requires that version's corresponding source code to be made available to its users.

Outside asset packs keep their own licenses and attribution requirements. Read [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md) before publishing work that uses them.

## More documentation

- [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md)
- [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md)
- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md)
- [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md)
- [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md)
