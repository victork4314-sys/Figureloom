# Export, backup, and presentation

Export creates files for publication, sharing, printing, presentation, or continued editing.

A complete project backup is different from a visual export. Keep both when the work matters.

## Before exporting

1. Confirm the final page size.
2. Run Check or the available readiness checks.
3. Resolve off-canvas objects and broken connectors.
4. Review small text and contrast warnings.
5. Check references and attribution.
6. Add alt text and a long description where needed.
7. Download a `.figureloom` backup.
8. Export the required SVG output.
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

## Export all pages as SVG

**Export all pages as SVG** processes every project page in order and produces one editable SVG for each page. The browser may package the page files together for one download.

Use this option when:

- A project contains several figures or slides.
- Every page needs a separate editable vector file.
- Page order and consistent naming matter.
- A coauthor or publisher will open the pages in another vector application.

After downloading, confirm that the package contains the same number of SVG files as the project contains pages.

## Editable SVG for one page

**Editable SVG (per page)** exports the active page as an editable vector file.

Use it when:

- Only the current page is needed.
- You are testing an export before processing the entire project.
- Another vector editor will be used for final adjustments.

SVG keeps lines and text sharp, but another application can substitute fonts or interpret complex SVG features differently.

## Print page dimensions

Enable **Print page dimensions** when the SVG must carry the project's physical width and height for print or poster work.

Check the final dimensions in the program used by the printer or publisher. Browser display size is not the same as physical print size.

## Include editor grid

The grid is normally an editing aid and is not exported.

Enable **Include editor grid** only when the grid is intentionally part of the final figure. Do not enable it merely because snapping was used while editing.

## SVG checks

Open every SVG in a second browser or vector editor and check:

- Page count and page order
- Physical dimensions
- Fonts
- Text wrapping
- Text clipping
- Gradients
- Images
- Equations
- Line widths
- Transparency
- Background color

## Formats not produced directly by the current export panel

The current finished export path is centered on editable SVG and project backups. PNG, PDF, TIFF, and PowerPoint output may require opening the exported SVG in another application and saving or converting it there.

PowerPoint import remains separate from export. Import support does not mean that a matching PowerPoint export is available.

When converting elsewhere:

- Keep the original SVG files.
- Confirm the final pixel dimensions for raster output.
- Confirm the physical dimensions for PDF or print output.
- Recheck fonts and transparency.
- Open the converted file before submitting it.

## Presentation mode

Presentation mode shows project pages full-screen in order without changing the project files.

Use it for:

- Lab meetings
- Teaching
- Conference practice
- Reviewing a multi-page figure set

Before presenting:

- Test page navigation.
- Hide editing panels.
- Check text from the expected viewing distance.
- Keep exported SVG files or another static fallback.
- Avoid relying on a network connection for assets that have not loaded yet.

## Reference and attribution output

The review workspace can download collected references and attribution information where that tool is available.

Check the file before publication. Automatic metadata can be incomplete or require reformatting.

## Publication readiness report

The report can record warnings such as missing alt text, unresolved comments, small text, off-canvas objects, broken connectors, external assets, and incomplete reference workflow.

A clean report does not guarantee acceptance by a journal or printer.

## Pathway exchange export

The active page can be mapped to starter structures such as:

- SBGN-ML
- BioPAX RDF/XML
- SBML Level 3 XML

Open the result in a specialist pathway tool and validate it. FigureLoom diagrams are visually flexible, so not every object has a precise domain model.

## File naming

Use names that identify the content, page, and version.

Examples:

```text
Figure-3-host-pathogen-page-01.svg
Conference-poster-final.svg
Study-workflow-source.figureloom
```

Avoid filenames such as `final-final-2-really-final`.

## Export privacy

Exports can contain project text, images, references, comments, metadata, or embedded data depending on the workflow.

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
3. Test **Editable SVG (per page)** on one page.
4. Remove unused large assets.
5. Try **Export all pages as SVG** again.

## Final export checklist

- Correct number of pages
- Correct page order
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
