# Export, backup, and presentation

Export creates files for publication, sharing, printing, presentation, or continued editing.

A complete project backup is different from a visual export. Keep both when the work matters.

## Before exporting

1. Confirm the final page size.
2. Run Check or publication readiness.
3. Resolve off-canvas objects and broken connectors.
4. Review small text and contrast warnings.
5. Check references and attribution.
6. Add alt text and a long description where needed.
7. Download a `.figureloom` backup.
8. Export the output format.
9. Open the exported file outside FigureLoom.

## Editable project backup

The complete project download uses the `.figureloom` extension.

It preserves editable project information such as:

- Pages
- Objects
- Layers
- Text
- Styles
- Chart and table data
- Comments
- References
- Components
- Project settings
- Embedded assets

Use this file to reopen the project later or move it to another device.

## SVG export

SVG is a vector format and is often the best choice for editable scientific artwork.

Use SVG when:

- The publication system accepts vector files.
- Lines and text must remain sharp.
- Another vector editor will be used later.
- Physical dimensions matter.

FigureLoom can export page geometry using physical-size information for poster and print workflows.

### SVG checks

Open the SVG in a second browser or vector editor and check:

- Fonts
- Text wrapping
- Clipping
- Gradients
- Images
- Equations
- Line widths
- Transparency

## PNG export

PNG is a raster image.

Use standard PNG for:

- Web pages
- Draft review
- Documents that do not accept SVG
- Quick sharing

Use the higher-resolution or print option when the output needs more pixels.

### PNG transparency

A transparent page can produce a transparent PNG when the export option and content support it.

Check the PNG against both light and dark backgrounds.

## Print PNG

Print PNG uses a larger raster output based on page size and the available print export setting.

Raster export still has a fixed pixel resolution. For very large posters, SVG is usually safer when the printer accepts it.

## Exporting the grid

The editor grid is normally an editing aid. Enable exported grid only when the grid is intentionally part of the figure.

## PowerPoint export

PowerPoint export creates a `.pptx` with one project page per slide.

The normal compatibility export places a high-resolution image of each page onto a matching slide. This preserves appearance but does not convert every FigureLoom object into a native PowerPoint shape.

Use PowerPoint export for:

- Presentations
- Coauthor review
- Slide-based distribution
- Import into Keynote, LibreOffice Impress, or Google Slides

### PowerPoint checks

Open the file in the intended presentation application and check:

- Slide order
- Page aspect ratio
- Image sharpness
- Backgrounds
- Transparency
- Fonts in any separately editable content

## Editable-first PowerPoint options

The Office bridge can provide editable-first or visual-compatibility export paths depending on the current tool and content.

Complex SVG, chart, equation, or imported objects may still be flattened for compatibility. Inspect the file instead of assuming every element is editable.

## Presentation mode

Presentation mode shows project pages full-screen in order.

Use it for:

- Lab meetings
- Teaching
- Conference practice
- Reviewing a multi-page figure set

Before presenting:

- Test page navigation.
- Hide editing panels.
- Check text from the expected viewing distance.
- Keep a PowerPoint or static image fallback.
- Avoid relying on a network connection for assets that have not loaded yet.

## Reference and attribution export

The review workspace can download collected references and attribution information.

Check the file before publication. Automatic metadata can be incomplete or require reformatting.

## Publication readiness report

The report records warnings such as missing alt text, unresolved comments, small text, off-canvas objects, broken connectors, external assets, and incomplete reference workflow.

A clean report does not guarantee acceptance by a journal or printer.

## Pathway exchange export

The active page can be mapped to starter structures such as:

- SBGN-ML
- BioPAX RDF/XML
- SBML Level 3 XML

Open the result in a specialist pathway tool and validate it. FigureLoom diagrams are visually flexible, so not every object has a precise domain model.

## Exporting several pages

PowerPoint and presentation mode preserve page order.

For separate SVG or PNG files, export each page and use a consistent naming pattern:

```text
Study-overview-page-01.svg
Study-overview-page-02.svg
Study-overview-page-03.svg
```

## File naming

Use names that identify the content and version.

Examples:

```text
Figure-3-host-pathogen-final.svg
Conference-poster-print.png
Study-workflow-review.pptx
Study-workflow-source.figureloom
```

Avoid filenames such as `final-final-2-really-final`.

## Export privacy

Exports can contain project text, images, references, comments, metadata, or embedded data depending on format.

Before sharing:

- Remove hidden sensitive content.
- Check notes and comments.
- Check filenames.
- Check image metadata where relevant.
- Open the final file independently.

## Browser download problems

If a download does not appear:

- Check the browser download list.
- Allow downloads for the site.
- Try the action again once.
- Avoid repeated rapid presses.
- Check available device storage.
- On a phone, look in the Files app or browser download folder.

## Export appears stuck

Large projects can take time.

Wait for the export to complete before switching tabs. If it repeatedly fails:

1. Download a project backup.
2. Reload FigureLoom.
3. Try one page.
4. Remove unused large assets.
5. Try SVG or standard PNG before a very large raster export.

## Final export checklist

- Correct page and page order
- Correct physical size
- Correct background
- No clipped objects
- No broken connectors
- Readable text
- Correct data
- Complete legend
- References checked
- Alt text prepared
- Backup downloaded
- Export opened in another application