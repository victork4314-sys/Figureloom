# Scientific illustrations and maps

FigureLoom combines built-in editable artwork with outside libraries that load when needed.

## Opening the illustration library

Select **Illustrations**.

On a phone, the library opens in a phone-safe full-screen panel. On desktop and tablet, it can open as a larger drawer or workspace.

## Searching

Use plain scientific terms, common names, categories, or organism aliases.

Examples:

- cell
- mitochondrion
- bacterium
- mouse
- zebrafish
- DNA
- pipette
- reactor
- pump
- wastewater
- tree
- soil

Search results can come from several sources. Similar results may use different visual styles or licenses.

## Built-in artwork

Built-in artwork is created from editable vector instructions and is designed to work directly with FigureLoom styling and export.

Many built-in objects can be:

- Moved
- Resized
- Rotated
- Recolored
- Layered
- Combined with labels and connectors

## Outside libraries

FigureLoom can load compatible libraries such as Bioicons, Healthicons, and Tabler-style artwork on demand.

Outside assets keep their own license and attribution requirements. FigureLoom stores source metadata when it is available, but the user remains responsible for checking whether the final use is permitted.

## Water and wastewater artwork

The water and wastewater family includes specialist objects for environmental and treatment-system diagrams.

Possible searches include:

- aeration
- clarifier
- sludge
- filtration
- pump
- tank
- wastewater
- water treatment
- pipe
- biofilm

Use connectors and labels to turn the artwork into a process flow.

## Inserting an illustration

1. Search for an object.
2. Inspect its preview and source information.
3. Select the item.
4. Insert it onto the active page.
5. Resize and position it.
6. Add labels, connectors, or annotations.
7. Check the reference or attribution record if one was created.

## Recoloring

Built-in artwork often supports direct recoloring.

Outside SVG artwork can vary. A single color action may recolor the whole object, or the SVG may need to be broken apart before individual parts can be changed.

Use color consistently across a figure. Avoid using color as the only way to distinguish conditions.

## Attribution and references

When an illustration includes creator, source, license, or attribution metadata, FigureLoom can collect it automatically.

Before publication:

1. Open the references workspace.
2. Review the automatically collected entries.
3. Add missing DOI, URL, creator, or license information.
4. Download the reference or attribution list.
5. Follow the source license's placement requirements.

## Map Studio

Map Studio supports world maps, country maps, study-site locators, and imported GeoJSON.

Map data can use Natural Earth boundaries and user-supplied geographic files.

## Creating a locator map

1. Open Map Studio.
2. Choose a world or regional base map.
3. Select the country or area of interest.
4. Add one or more study-site markers.
5. Set marker labels and colors.
6. Insert the map onto the page.
7. Add a scale or north indicator only when it is appropriate for the map and projection.

## Country maps

Country maps can be used for:

- Study-site figures
- Sampling regions
- Epidemiology summaries
- Environmental monitoring locations
- Fieldwork overview panels

Confirm that the boundary data and labeling are suitable for the publication context.

## GeoJSON import

GeoJSON can contain points, lines, polygons, and multi-part geographic features.

To import GeoJSON:

1. Open Map Studio.
2. Choose the GeoJSON import action.
3. Select the file.
4. Inspect the geometry.
5. Choose styling and labels.
6. Insert the map.

Very detailed files can create heavy projects. Simplify geographic geometry before import when small boundary details are not visible at the final figure size.

## Map limitations

FigureLoom is intended for figure layout and locator maps. It is not a full geographic information system.

Use dedicated GIS software when you need:

- Spatial analysis
- Projection transformation control
- Raster geoprocessing
- Complex joins
- Statistical mapping
- Survey-grade measurements

Prepare the geographic result in GIS software, then import a suitable SVG, image, or GeoJSON output into FigureLoom.

## Building a pathway with illustrations

A common workflow is:

1. Insert the major biological or environmental objects.
2. Put them in approximate order.
3. Add anchored connectors.
4. Add short labels.
5. Group repeated node designs.
6. Align and distribute the layout.
7. Add a legend for line and color meanings.
8. Check references and alt text.

See [Tutorials](Tutorials) for a full pathway walkthrough.

## Creating a microscopy layout

Use the Advanced Science microscopy workspace or build the layout manually.

A good microscopy panel usually includes:

- Consistent image dimensions
- Channel labels
- Treatment labels
- Scale bars
- Panel letters
- A clear statement of merged channels
- Accessible color choices

Keep source images and analysis records outside FigureLoom.

## Asset quality checklist

Before final export, confirm:

- The illustration is sharp at the final size.
- The visual style is consistent enough for the figure.
- Labels do not overlap the artwork.
- Recoloring did not remove important distinctions.
- License and attribution requirements are satisfied.
- Alt text identifies the scientific role of the artwork, not only its appearance.