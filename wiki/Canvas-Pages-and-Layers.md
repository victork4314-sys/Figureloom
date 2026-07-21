# Canvas, pages, and layers

The canvas is the active page. Pages collect objects, and layers control their order and visibility.

## Page bounds

Only content inside the page is included in normal exports.

Objects can temporarily sit partly outside the page while you work, but the publication check warns about off-canvas content.

The workspace outside the page is not extra page area. Zoom changes how large the page looks, not the page's real coordinate system.

## Page formats

FigureLoom supports screen, print, presentation, square, journal-style, and custom physical sizes.

Common presets include:

- 16:9 and 4:3 presentation
- A4, A3, A2, A1, and A0
- Square
- Single-column and double-column figure
- Full-page figure
- Custom width and height

Physical sizes use millimetre-aware geometry. Choose portrait or landscape as part of the page setup.

## Changing page format

Open **Format** or the page-size controls.

When changing an existing page:

1. Download a project backup.
2. Note the original size.
3. Choose the new preset or custom dimensions.
4. Check every edge for objects that moved outside the page.
5. Recheck text size and line thickness at the final physical size.

## Page backgrounds

Each page can have its own background.

Available choices include:

- Solid color
- Gradient
- Transparent
- Preset palette
- Randomized palette

Backgrounds are included in supported SVG exports. A transparent page remains transparent when the receiving application preserves SVG transparency.

## Adding pages

Open **Pages** and choose Add page.

A new page can be used for:

- Another figure panel
- A presentation slide
- A methods diagram
- A references or notes page
- Alternate versions
- Supplementary material

## Duplicating a page

Duplicate a page when the next page should share its layout.

This is useful for:

- Repeated experimental conditions
- Before and after comparisons
- A slide sequence with a stable header
- Several figures with the same journal dimensions

After duplication, rename or relabel the page content so the copies cannot be confused.

## Reordering pages

Drag page thumbnails or use the available reorder controls.

Page order affects:

- Project navigation
- **Export all pages as SVG**
- Presentation mode
- Multi-page reports

## Deleting a page

Deleting a page also removes its page objects. Make a backup or checkpoint first if the page may be needed later.

## Layers

Every object appears as a layer.

The layer list is useful when:

- Objects overlap
- A very small object is difficult to select
- A transparent object covers another object
- You need to lock a background element
- You want to rename objects for accessibility and organization

## Layer order

Objects higher in the layer order appear in front of objects below them.

Use layer dragging or arrange commands to:

- Bring to front
- Bring forward
- Send backward
- Send to back

For a complex figure, use consistent layer groups such as background, images, data, annotations, and labels.

## Visibility

Hide a layer to remove it from the canvas without deleting it.

Hidden objects stay in the project. Confirm whether the current export includes hidden objects before using visibility as a publication-state control.

## Locking

Lock a layer to prevent accidental movement or editing.

Good candidates for locking include:

- Page background artwork
- Imported reference images
- Completed panel frames
- Repeated headers and footers
- Alignment guides made from objects

Unlock the layer before changing its properties.

## Renaming layers

Descriptive layer names make complex projects easier to review.

Instead of leaving many objects named `Rectangle`, use names such as:

- Control group frame
- Mitochondrion illustration
- Panel B title
- Treatment arrow
- Scale bar 20 micrometres

Layer names can also help automatic description drafting.

## Grids

The page can show a line or dot grid.

Grid spacing can be automatic or set in physical units. The grid is an editor aid unless **Include editor grid** is explicitly enabled during SVG export.

Use a grid for:

- Posters
- Repeated panel layouts
- Tables built from shapes
- Precise scientific diagrams
- Consistent margins

## Snapping

Snapping helps objects line up with the grid, page, or other objects.

Temporarily disable snapping when you need a small offset that keeps jumping back to a guide.

## Smart guides

Smart guides appear when objects share an edge, center, or spacing relationship.

They are especially useful for aligning labels and distributing repeated panels without entering exact coordinates.

## Zoom

Zoom changes the visual scale of the page.

Use:

- Zoom out
- Zoom in
- Current zoom value
- Return to 100 percent
- Pinch zoom on touch devices

At high zoom, use Hand mode or the navigator to move around the page.

## Panning

Panning moves the view, not the objects.

Methods can include:

- Hand tool
- Holding Space while dragging
- Middle-button drag
- Touch navigation mode
- Navigator

If an object moves when you intended to pan, undo the movement and activate the Hand tool.

## Navigator

The navigator shows the visible region of a large or zoomed page.

It can be moved, docked, closed, or reopened. Use it for posters and detailed diagrams where the full page does not fit on screen.

## Multi-page presentation

Presentation mode shows pages in order without the editing panels.

Before presenting:

- Check the page order.
- Use a consistent aspect ratio.
- Make sure text is readable at the display distance.
- Test navigation in the browser you will use.
- Keep the exported SVG pages or a converted static file as a fallback when required.

See [Export, backup, and presentation](Export-Backup-and-Presentation).
