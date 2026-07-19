# Importing PowerPoint and spreadsheets

FigureLoom can import common office files to reduce the amount of work that must be rebuilt manually.

Import is a conversion process. Always compare the imported result with the original file.

## Before importing

1. Keep the original file unchanged.
2. Download a backup of the current FigureLoom project.
3. Remove unnecessary slides, sheets, or hidden data from a copy of the source file.
4. Confirm that the source file opens normally in its original application.
5. Import into a new or expendable FigureLoom project first.

## PowerPoint import

Supported PowerPoint import can recover many common elements, including:

- Slide size and page structure
- Text
- Basic shapes
- Images
- Tables
- Groups
- Basic charts

Complex features can require manual correction.

## Importing a PowerPoint file

1. Open Pro Tools.
2. Open **Office bridge**.
3. Choose PowerPoint import.
4. Select the `.pptx` file.
5. Wait for parsing to finish.
6. Review the imported pages.
7. Compare text, images, shapes, charts, and grouping with the original.
8. Save a `.figureloom` backup.

## PowerPoint features that may change

Check these carefully:

- Unsupported fonts
- Theme fonts and theme colors
- SmartArt
- WordArt
- Embedded video or audio
- Complex charts
- Slide masters
- Animations and transitions
- Advanced gradients and effects
- Cropping and masks
- Group transformations
- Linked files
- Equations

A visually complex slide may import more reliably as an image or SVG if editability is not required.

## Imported fonts

If a PowerPoint uses a font that is not available in the browser, FigureLoom may substitute another font.

Options include:

- Import the font file when licensing permits.
- Choose a bundled font.
- Convert critical text to vector artwork before import.
- Recheck line wrapping after substitution.

## Imported charts

Basic charts can be converted into FigureLoom chart objects or retained visual content, depending on the source.

Compare values, labels, axes, colors, and legends with the original. Do not assume that a successful visual import proves that the data model is identical.

## Imported groups

Groups can contain nested transformations that do not map perfectly to the browser editor.

After import:

- Move the group slightly and undo to test it.
- Inspect layer order.
- Ungroup only after making a backup.
- Confirm that connectors and masks still behave correctly.

## Spreadsheet formats

The office workspace can accept common workbook and delimited formats such as:

- XLSX
- XLS
- XLSM
- ODS
- CSV
- TSV

Macros are not executed by FigureLoom.

## Importing a workbook

1. Open Pro Tools.
2. Open **Office bridge** or Data.
3. Choose workbook import.
4. Select the file.
5. Choose the relevant sheet or range.
6. Insert an editable table or chart.
7. Verify the values.
8. Save the project.

## Formulas

Imported workbook values may be based on cached formula results. FigureLoom is not a spreadsheet calculation engine.

Before import:

- Recalculate the workbook in a spreadsheet application.
- Save the file.
- Confirm that formula results are current.
- Consider exporting a clean values-only sheet for important figures.

## Macros

XLSM files may be readable as workbooks, but macros do not run in FigureLoom.

Do not rely on a macro to calculate or transform data during import.

## Dates and decimal formats

Dates and decimals can be interpreted differently across locales.

Check:

- Day and month order
- Decimal comma versus decimal point
- Thousands separators
- Time zones
- Scientific notation
- Percent values

Convert ambiguous dates to an unambiguous format before import.

## Merged cells

Merged cells can make table import unpredictable.

For a clean editable table:

- Remove merged cells.
- Use one header row.
- Keep each variable in its own column.
- Put notes outside the data range.

## Large workbooks

A workbook with many sheets, images, formulas, or styles can be slow and make the project large.

Create a smaller copy containing only the needed data.

## CSV and TSV

CSV and TSV are usually the most reliable formats for simple data.

Use TSV when values or labels contain commas. Use a consistent text encoding such as UTF-8.

## Importing as data versus image

Choose editable data when:

- Values may change.
- Chart type may change.
- Labels need editing.
- The table must remain accessible.

Choose an image or SVG when:

- The source application created a highly specialized visualization.
- Exact appearance matters more than editability.
- The visual has already been validated.

## Quality-control checklist

After import:

- Compare every page or sheet with the source.
- Check page dimensions.
- Check fonts and wrapping.
- Check image crops.
- Check chart values.
- Check table values.
- Check group behavior.
- Check layer order.
- Check references and alt text.
- Download a `.figureloom` backup.

## Common problems

### The import appears blank

- Confirm that the source file is not encrypted or password-protected.
- Save a new copy from the original application.
- Remove unsupported content.
- Try a smaller file.

### Text overlaps after PowerPoint import

The source font may be unavailable or the text-box metrics may differ. Import the font, widen the box, or restyle the text.

### A workbook imports old values

Open it in a spreadsheet application, recalculate formulas, save it, and import again.

### A chart is flattened

The chart type may not map to an editable FigureLoom chart. Keep it as visual content or recreate it from the underlying data.

### The project becomes slow

Remove unused imported assets, simplify the source file, or split the work into several projects or pages.