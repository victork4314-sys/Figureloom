# Text, shapes, arrows, and connectors

These are the basic building blocks for most FigureLoom projects.

## Selecting objects

Select an object on the canvas or choose it in the Layers list.

A selected object can show:

- Resize handles
- Rotation control
- Selection outline
- Context actions
- Inspector properties

Select several objects with Shift-click, marquee selection, or the multi-selection tools in Pro Tools.

## Moving objects

Drag an object to move it.

For exact placement, enter X and Y values in the inspector. Exact values are useful for repeated panels, aligned labels, and publication layouts.

Smart guides and snapping can help with alignment. Disable snapping temporarily when it prevents a small intended offset.

## Resizing

Drag a corner or edge handle.

Use the inspector when an object needs an exact width or height. Maintain the aspect ratio for images and scientific artwork unless distortion is intentional.

## Rotation

Use the rotation handle or enter a rotation value.

For labels, multiples of 90 degrees are usually easier to keep consistent. For arrows and diagrams, free rotation may be more useful.

## Fill, stroke, and opacity

Most native shapes support:

- Fill color
- Stroke color
- Stroke width
- Opacity
- Corner radius where relevant

Use consistent line widths and a small color palette across a figure.

## Text

Add a text object from **Add** or Home.

Text controls include:

- Font family
- Font size
- Bold and italic
- Alignment
- Fill color
- Species styling
- Superscript and subscript helpers
- Greek and scientific symbols

Text wraps inside its text box. Resize the box to change line wrapping without changing the font size.

### Editing text

Double-click or use the text edit action. On a phone, select the text and open **Edit** if direct editing controls are not visible.

### Fonts

FigureLoom includes bundled, open, and system font choices. Local font files can also be imported in supported formats.

A local imported font may not exist on another device. Test the project after moving it and keep a record of the font files used.

### Text size for print

The appropriate size depends on the final physical dimensions. A label that looks large on screen can become too small after a poster or figure is reduced.

Use the small-text check at the final page size.

## Shapes

Common shapes include:

- Rectangle
- Rounded rectangle
- Ellipse
- Circle
- Polygon and specialist native shapes where available

Shapes can be used as panel frames, backgrounds, legends, labels, masks, and diagram nodes.

## Lines

Lines are independent objects with stroke controls.

Use them for:

- Measurements
- Dividers
- Plot annotations
- Scale bars
- Underlines
- Manual pathway edges

For relationships between moving objects, use anchored connectors instead of plain lines.

## Arrows

Arrows can represent direction, movement, activation, inhibition, sequence, or flow.

Keep arrow meaning consistent. If several arrow styles have different meanings, explain them in a legend.

## Connectors

Anchored connectors attach to source and destination objects. When either object moves, the connector follows.

### Creating a connector

1. Insert or select the connector tool.
2. Choose the source object.
3. Choose the destination object.
4. Set line and arrow styling.
5. Move both objects to confirm that the connection remains attached.

### Broken connectors

A connector can become broken if its source or destination no longer exists or if imported content lost the original relationship.

Run the project check before export. Reconnect or replace any broken connector.

## Grouping

Grouping stores a relationship between objects without flattening them.

Use a group when several objects should move or resize together.

### Group

1. Select several objects.
2. Open Arrange or Pro Tools.
3. Choose Group.

### Ungroup

Select the group and choose Ungroup. The original objects become independently selectable again.

## Aligning

Alignment commands include:

- Left
- Horizontal center
- Right
- Top
- Vertical middle
- Bottom

Choose the objects first. The result is based on the selected objects and the current alignment behavior.

## Distribution

Distribution creates equal spacing between selected objects horizontally or vertically.

For predictable results:

1. Put the first and last objects where they belong.
2. Select the entire set.
3. Apply horizontal or vertical distribution.

## Boolean operations

Native rectangle and ellipse shapes can support simple operations such as:

- Union
- Intersection
- Subtraction

These create compound objects. Imported SVG artwork may require the SVG path tools and does not behave like a full desktop vector editor.

## Copy, duplicate, and paste

Use duplicate for repeated objects that should remain in the same project.

For a repeated element used throughout the project, consider saving it as a component. Components are easier to update consistently.

## Moving objects between pages

Use the workspace tools to move or copy selected objects to another page.

Copy keeps the original. Move removes it from the current page after creating it on the target page.

## Layer order

Use Bring forward, Bring to front, Send backward, or Send to back when objects overlap.

For complicated figures, use the Layers list rather than repeatedly clicking through overlapping objects.

## Context menu

Right-click on desktop or use long press on supported touch devices to open object actions.

The available actions depend on the object type.

## Common mistakes

### The object will not move

- Check whether the layer is locked.
- Confirm that Hand mode is not active.
- Select the object in Layers.
- Check whether another transparent object is covering it.

### Text will not wrap correctly

- Resize the text box rather than the font.
- Confirm that the text contains normal spaces.
- Remove pasted formatting by retyping a small section if necessary.

### A connector does not follow an object

It may be a plain line or arrow rather than an anchored connector. Replace it with a connector and assign both endpoints.

### Several objects move unexpectedly

They may be grouped or part of a multi-selection. Ungroup or clear the selection before editing one object.