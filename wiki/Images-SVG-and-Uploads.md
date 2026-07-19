# Images, SVG, and uploads

FigureLoom accepts raster images, SVG artwork, local fonts, office files, spreadsheets, and complete project backups.

## Supported image files

Common image uploads include:

- PNG
- JPEG or JPG
- WebP
- SVG

Raster images are made from pixels. SVG files are vector artwork and can remain sharp at different sizes.

## Adding an image

1. Open **Add**.
2. Choose the image or file upload action.
3. Select the file.
4. Wait for the image to appear on the canvas.
5. Resize and position it.

Large files can take longer to decode and save. Let the save indicator finish before closing the tab.

## Raster image editing

Uploaded raster images support normal object controls such as:

- Move
- Resize
- Rotate
- Layer order
- Opacity
- Horizontal and vertical flip
- Crop
- Rectangle, rounded, and circular masks

## Cropping

Use the image crop controls in the inspector or Components and objects workspace.

FigureLoom uses percentage-based crop values. Keep an uncropped copy when the image may need to be reframed later.

## Masks

Masks can display an image inside:

- Rectangle
- Rounded rectangle
- Circle

Masks do not permanently edit the original image data stored in the project.

## Scientific image panels

For microscopy, gels, and similar images:

- Keep image aspect ratios unless distortion is scientifically justified.
- Add scale bars with the annotation tools.
- State whether contrast or color mapping was changed.
- Use consistent crop dimensions for comparable panels.
- Keep original source images outside FigureLoom.

FigureLoom is a layout and figure editor, not a replacement for image-analysis software.

## SVG import

SVG files are sanitized before insertion. Unsafe script and unsupported active content are removed.

Imported SVG artwork can support:

- Resize
- Rotation
- Opacity
- Layer order
- Original colors
- Whole-object recoloring where possible
- SVG re-export
- Path command inspection and editing
- Breaking compound artwork into separate SVG objects

Complex SVG features may not survive every import. Inspect the result closely.

## SVG path editor

Open the SVG path workspace in Pro Tools for supported imported SVG objects.

The path editor can:

- Show path commands and coordinates
- Select anchors on the canvas
- Change path command values
- Break compound SVG artwork into independent editable SVG objects

It is not a full Illustrator-style Bézier-handle editor. Curves that depend on advanced handles may be easier to edit in a dedicated vector application and reimport.

## Recoloring SVG artwork

Some SVG files use direct fills and strokes that can be recolored as a whole. Others contain many independent colors, gradients, masks, or embedded styles.

When recoloring does not produce the expected result:

1. Try the whole-object color action.
2. Break the SVG apart if the artwork supports it.
3. Edit individual resulting objects.
4. Reimport a simplified SVG if necessary.

## Personal upload library

Uploaded artwork can be saved into a reusable personal library stored in the browser.

This is useful for:

- Lab logos
- Repeated equipment diagrams
- Approved institutional marks
- Common microscopy frames
- Reusable icons

Browser data cleanup can remove this library. Keep the original files elsewhere.

## Reusable SVG library

Editable SVG artwork can also be stored in the reusable SVG library near the Export area.

Use clear names and preserve source and license details.

## Asset metadata

When available, FigureLoom keeps information such as:

- Creator
- Source
- License
- Attribution
- URL
- Notes

Metadata supports automatic reference and attribution collection.

Do not assume that an asset is free to publish just because it can be imported. Check the source license.

## External images

The publication check can warn about external images or assets that may not be fully embedded.

Before final export:

- Confirm that every image appears after a reload.
- Download and reopen a project backup.
- Test the export in a separate viewer.
- Keep original image files.

## Local fonts

Supported local font file types can include:

- WOFF
- WOFF2
- TTF
- OTF

Imported fonts are stored in the browser for local use.

A font imported on one device may not exist on another. After moving a project, import the font again or replace it with a bundled or system font.

## File privacy

Local uploads remain in browser storage unless the user explicitly saves a cloud project or shares the project.

A cloud project can contain uploaded assets inside the encrypted project payload. Metadata needed for the gallery and permissions remains visible to the cloud service.

## Troubleshooting image imports

### The image is blank

- Confirm the file opens normally outside FigureLoom.
- Try a PNG or simplified SVG copy.
- Remove unsupported filters or external links from the SVG.
- Reload the project after the save completes.

### The SVG looks different

- Check fonts, clipping paths, filters, masks, gradients, and external style sheets.
- Convert text to paths in the source application when licensing and editability requirements allow it.
- Simplify the SVG and import again.

### The project became very large

- Resize very large raster images before importing.
- Avoid storing several unused high-resolution copies.
- Remove unused project assets through the workspace tools.
- Download a backup before cleaning assets.

### The image cannot be selected

- Choose it from Layers.
- Unlock the layer.
- Move covering objects backward or hide them temporarily.