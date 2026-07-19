# Phone and tablet

FigureLoom uses one project format and one editor. Phone mode changes the layout, not the project data.

## Choosing an interface mode

Open **Settings** and choose one of these options:

- **Automatic** uses Phone mode on phone-sized touch devices and Desktop and tablet mode elsewhere.
- **Desktop and tablet** keeps the full multi-panel editor visible.
- **Phone** forces the touch-friendly layout even on a larger screen.

The setting applies immediately. Switching modes does not duplicate, convert, or flatten the project.

## Phone layout

Phone mode gives most of the screen to the canvas.

### Header

The compact header keeps these actions available:

- Project name
- Undo
- Redo
- Export

Other actions move into **More**.

### Main tabs

The normal tabs remain horizontally scrollable. This keeps their names and order familiar without squeezing every tab into the width of the phone.

### Bottom dock

The bottom dock contains:

- **Tools** for the current ribbon tools
- **Pages** for pages and layers
- **Edit** for the selected object's inspector
- **More** for projects, settings, account, templates, Loomy, Pro Tools, guide, sharing, and other less frequent actions

The dock remains available while ordinary editing sheets are open so you can move directly from Pages to Edit or Tools.

## Adding objects on a phone

Select **Add** from the tab row. Add opens its own full-screen insertion panel rather than a small sheet.

This gives enough room for:

- Text and shapes
- Lines, arrows, and connectors
- Images and files
- Templates
- Tables and charts
- Equations
- Code windows
- Other insertable objects

Close the panel to return to the canvas.

## Editing an object

1. Select the object on the canvas.
2. Tap **Edit** in the bottom dock.
3. Change the available properties.
4. Close the sheet or choose another dock section.

The inspector uses the same object controls as desktop, arranged vertically for a narrow screen.

## Pages and layers on a phone

Open **Pages**.

Page thumbnails appear in a horizontal row. Layers appear below them. You can switch pages, add pages, reorder pages, select layers, change visibility, lock objects, and change layer order.

## Zooming and panning

Use the canvas zoom buttons or pinch with two fingers.

Phone zoom scales the visible page without changing its real coordinate system or inventing extra canvas area. Objects remain tied to the same page bounds at every zoom level.

To move around a zoomed page:

- Use the Hand or navigation tool.
- Drag the workspace when panning mode is active.
- Use the navigator for a large poster or heavily zoomed page.

## Moving objects

Drag a selected object with one finger. The object should remain within the real page coordinate space even when the page is zoomed.

For exact movement, open **Edit** and enter position values.

## Long press

A long press on the canvas or an object can open the existing context-menu path when the current object supports it.

Do not hold a finger still when you intend to pan. Start the movement promptly so the gesture is treated as a drag rather than a long press.

## Safe areas

Phone mode respects the top status area, rounded corners, and the bottom browser or home-indicator area.

Dialogs, the passive guide, export controls, and bottom sheets should keep their important buttons above these areas.

## Turning Phone mode off quickly

Open **More** and choose **Use desktop and tablet interface**.

This switches the layout immediately. You can return to Automatic or Phone later in Settings.

## Tablet use

The normal desktop and tablet layout is designed to work well on larger touch screens. It keeps the left pages panel, center canvas, and right inspector visible together.

Use forced Phone mode on a tablet only when you prefer larger touch targets or want more room for the canvas.

## Browser advice

- Keep only one editing tab open for the same local project when possible.
- Let the page finish loading before importing a large file.
- On iPhone, closing and reopening the tab can clear a stale visual cache after a major app update.
- Download a `.figureloom` backup before clearing browser data.
- If the browser zoom level itself has changed, return the browser to its normal page zoom before diagnosing canvas scaling.