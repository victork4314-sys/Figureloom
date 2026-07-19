# Keyboard shortcuts and touch gestures

FigureLoom supports keyboard, mouse, trackpad, pen, and touch input. Available shortcuts can depend on the selected object and browser.

Open the shortcut reference in the workspace tools for the current in-app list.

## Common keyboard actions

### Undo and redo

- Undo: `Ctrl+Z` or `Command+Z`
- Redo: the platform's normal redo shortcut, commonly `Ctrl+Y`, `Ctrl+Shift+Z`, or `Command+Shift+Z`

Use the visible Undo and Redo buttons when the browser intercepts a shortcut.

### Copy, cut, and paste

- Copy: `Ctrl+C` or `Command+C`
- Cut: `Ctrl+X` or `Command+X`
- Paste: `Ctrl+V` or `Command+V`

Browser clipboard permission and the selected object type can affect paste behavior.

### Delete

Use Delete or Backspace for a selected object when the editor focus is on the canvas.

Do not press Delete while editing text unless you intend to remove text.

### Multi-selection

Hold Shift while selecting objects to add or remove them from a multi-selection.

Marquee selection can select several objects in an area.

### Panning

Hold Space and drag to pan when the canvas supports it.

Middle-button drag can also pan on supported mice.

### Escape

Escape can close a menu, drawer, dialog, or active edit state where supported.

### Arrow keys

Arrow keys can move a selected object in small steps where supported. Modifier keys may change the step size.

Use exact X and Y values for reliable publication positioning.

## Text-editing focus

Keyboard shortcuts behave differently while a text field or text object is being edited.

Before using object shortcuts:

- Finish text editing.
- Select the object rather than the text cursor.
- Click the canvas or use the object selection control.

## Touch selection

Tap an object to select it.

If an object is difficult to select:

- Open Pages and Layers.
- Choose the object by layer name.
- Hide or lock covering layers.
- Zoom in.

## Touch movement

Drag a selected object with one finger.

The object uses the page's real coordinate system. Zoom changes the visual scale, not the object coordinates.

## Touch resizing

Drag a visible selection handle.

Phone mode enlarges touch handles where possible. For exact dimensions, use the Edit inspector.

## Touch rotation

Use the rotation handle when it is visible. Enter a rotation value in the inspector for exact angles.

## Pinch zoom

Use two fingers to pinch in or out.

The visible page scales while retaining the real page bounds. Pan the view to reach a different area of a zoomed page.

## Panning on touch

Use Hand or navigation mode to move the view without moving objects.

A common sequence is:

1. Activate Hand or Nav.
2. Drag the page view.
3. Return to selection mode.
4. Edit the object.

## Long press

A long press can open the object or canvas context-menu path.

To avoid triggering it accidentally, begin a drag promptly when you intend to move or pan.

## Phone bottom dock

Phone mode uses four main controls:

- Tools
- Pages
- Edit
- More

You can switch between these while a normal bottom sheet is open.

## Closing phone panels

Depending on the panel:

- Tap its Close button.
- Tap the sheet handle.
- Swipe down on the sheet.
- Use Back to editor.
- Press Escape with a connected keyboard.

## Browser gestures

The browser can reserve some edge gestures for back navigation, tab controls, or page scrolling.

Keep important dragging away from the extreme screen edge when possible.

## Trackpad advice

A trackpad can combine browser zoom, page scrolling, and canvas gestures.

If the entire browser page zoom changes, return the browser zoom to normal. Canvas zoom should be controlled through FigureLoom.

## Pen input

A stylus behaves mainly like a pointer. Pressure-sensitive freehand drawing is not the main FigureLoom editing model.

Use the pen for selection and dragging, then use inspector values for exact layout.

## Accessibility controls

Settings can increase control sizes and focus visibility. These options are useful with touch, motor difficulties, keyboard navigation, or a small screen.

## When a shortcut does not work

Check:

- Is a text field active?
- Is the browser using the shortcut?
- Is a modal or drawer open?
- Is the object locked?
- Is the canvas focused?
- Is the shortcut listed in the current in-app reference?

Use the visible button when in doubt.