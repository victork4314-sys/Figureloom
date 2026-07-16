# PowerPoint export and page backgrounds

## Page backgrounds

Each SciCanvas page can use an independent solid, gradient, or transparent background. Background settings are saved in the editable project and included in SVG, PNG, and PowerPoint output.

Use **Design → Page background** to select colors, gradient direction, a preset, or the random palette action.

## PowerPoint export

Use **Export → PowerPoint · all pages**. Each SciCanvas page is rendered at high resolution and placed on a matching 12 × 7.5 inch PowerPoint slide.

The exported `.pptx` is compatible with PowerPoint, Keynote, LibreOffice Impress, and Google Slides import. The figure on each slide is preserved visually as a high-resolution image; individual SciCanvas objects are not yet converted to native editable PowerPoint shapes.

PowerPoint generation uses the official PptxGenJS browser bundle, loaded on demand when the export action is selected.