# Data, tables, and charts

FigureLoom can turn pasted spreadsheet data or imported workbooks into editable tables and chart objects.

## Ways to add data

You can:

- Paste comma-separated data
- Paste tab-separated spreadsheet cells
- Import CSV or TSV
- Import XLSX, XLS, XLSM, or ODS through the office tools
- Reopen an existing chart or table and replace its source data

## Preparing data

A clean table works best.

Use:

- One header row
- One variable or category per column
- Consistent decimal separators
- No merged cells
- No decorative blank rows
- Short, unique column names

Keep the original data file outside FigureLoom.

## Creating a chart from pasted data

1. Copy the cells from a spreadsheet.
2. Open the Data or chart insertion workspace.
3. Paste the data into the source editor.
4. Confirm the detected columns.
5. Choose a chart type.
6. Add a title if needed.
7. Insert the chart.
8. Edit colors, labels, axes, and size on the canvas.

## Reopening chart data

Double-click the chart or use **Edit chart or table data** in the inspector or context menu.

You can change:

- Source values
- Chart type
- Title
- Series selection
- Labels and visual settings supported by that chart

## Editable tables

Tables remain editable objects.

Use tables for:

- Small summary data sets
- Experimental conditions
- Abbreviation keys
- Sample details
- Statistical summaries

For a very large table, prepare it in a spreadsheet or document tool and import a suitable final representation.

## Chart types

Available chart and plot starters can include:

- Bar
- Line
- Scatter
- Box
- Violin
- Volcano
- Heatmap
- PCA-style
- Kaplan-Meier
- Forest
- Radar
- Bubble
- Gantt
- Timeline
- Flow-cytometry-style

Some specialist plots are starters rather than full statistical analysis systems. Calculate and validate the underlying statistics in appropriate analysis software.

## Bar charts

Use bar charts for summarized values, not as a substitute for showing distributions when individual observations matter.

Check:

- Baseline and axis range
- Error-bar meaning
- Group order
- Sample size
- Whether points should also be shown

## Line charts

Line charts are useful for time, ordered dose, or another meaningful sequence.

Do not connect categories with a line when the order has no scientific meaning.

## Scatter plots

Scatter plots show individual paired values.

Use clear markers, accessible colors, and axis labels with units. A trend line should be based on an appropriate analysis, not added only for decoration.

## Box and violin plots

These plots summarize distributions. Confirm the exact box, whisker, quartile, and density conventions used by the inserted object or your imported data workflow.

State the convention in the caption when it is not obvious.

## Heatmaps

Heatmaps use color to represent values.

Choose a palette that:

- Matches the data type
- Has enough contrast
- Remains understandable in grayscale when required
- Does not imply a false midpoint
- Has a labeled legend

## Volcano and PCA-style plots

These are visual layout tools. The statistical values should be calculated in dedicated software and then pasted or imported.

Include thresholds, axis meaning, and label selection rules in the caption or legend.

## Kaplan-Meier and forest plots

Use verified statistical outputs. FigureLoom can help assemble the visual object, but it does not replace survival analysis or meta-analysis software.

## Flow-cytometry-style plots

Use these for figure layout after gating and analysis have been completed in appropriate software.

Keep the original analysis files and document gating decisions separately.

## Axes and labels

Every plot should be checked for:

- Axis title
- Unit
- Category labels
- Tick readability
- Decimal precision
- Legend clarity
- Sample size where relevant
- Statistical notation

Avoid shrinking labels until they technically fit. Increase the chart size or shorten labels instead.

## Color and accessibility

Use the grayscale and color-vision previews before export.

Good alternatives to color-only distinction include:

- Marker shape
- Line pattern
- Direct labels
- Panel separation
- Light and dark value differences

## Editing chart appearance

Chart appearance controls depend on the chart type. Common options include:

- Series colors
- Title
- Axis labels
- Legend
- Stroke or marker styling
- Background
- Text size

For complex restyling, export the data from the analysis tool in a clean format and use FigureLoom mainly for final assembly and annotation.

## Spreadsheet import

Office import can read supported workbook formats and retain workbook data for inserted tables or charts.

A workbook with many sheets, formulas, macros, or unsupported formatting may need to be simplified first.

See [Importing PowerPoint and spreadsheets](Importing-PowerPoint-and-Spreadsheets).

## Export considerations

Charts are included in SVG, PNG, PowerPoint, presentation mode, and project backups.

Always inspect the final exported file. Text and thin lines can look different in another viewer.

## Data integrity checklist

Before publication:

- Compare the plotted values with the source data.
- Confirm category order.
- Confirm missing-value handling.
- Confirm statistical calculations outside FigureLoom.
- Label units.
- Define error bars.
- State sample sizes.
- Keep the original data and analysis code.
- Make sure decorative edits did not change the meaning.

## Common problems

### Pasted data appears in one column

Use tab-separated cells from a spreadsheet or check the delimiter in the source editor.

### Numbers are treated as text

Remove units and symbols from the numeric cells. Put units in the column header or axis label.

### The chart is too crowded

Reduce the number of labels, enlarge the page area, split the chart into panels, or use direct labels for only the important values.

### The chart will not update

Double-click the chart or use the inspector's data edit action. Confirm that the object is a FigureLoom chart rather than a flattened imported image.

### The imported workbook is too large

Create a smaller workbook containing only the sheets and values needed for the figure.