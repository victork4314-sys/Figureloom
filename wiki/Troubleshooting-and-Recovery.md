# Troubleshooting and recovery

Start by protecting the project. If the editor still responds, download a `.figureloom` backup before trying destructive fixes.

## The app will not finish loading

Try these in order:

1. Wait for the loading screen to finish once.
2. Reload the tab.
3. Close duplicate FigureLoom tabs.
4. Check the network connection.
5. Disable aggressive content blocking for the site temporarily.
6. Open the browser console only if you are comfortable reading errors.
7. Try a current version of another supported browser.

Do not clear site data before downloading local project backups.

## The interface looks like an older version

A service worker or browser cache may still have an old build.

Try:

1. Close every FigureLoom tab.
2. Open a new tab to figureloom.org.
3. Reload once.
4. Wait for the stable build to finish loading.
5. On a phone, fully close and reopen the browser if necessary.

If the project is important, download a backup before changing site storage or service-worker settings.

## A local project is missing

Check:

- The correct browser and browser profile
- The correct device
- The local project gallery
- Open project tabs
- Recovery snapshots
- Download folders for `.figureloom` backups
- Cloud gallery if the project was explicitly saved there

Local projects do not automatically follow an account to another device.

## A project opens blank

1. Wait for assets to finish loading.
2. Check Pages for another active page.
3. Check whether layers are hidden.
4. Zoom out.
5. Use the navigator.
6. Check recovery snapshots.
7. Import the latest project backup into a new project.

Do not overwrite a cloud project with a blank state until the cause is understood.

## Autosave appears stuck

Large images, workbooks, or imports can make saving slower.

- Stop making changes for a moment.
- Wait for the save indicator.
- Download a backup when the project becomes responsive.
- Remove unused large assets later.
- Avoid closing the tab during the save.

## Undo or redo behaves unexpectedly

Some actions create several internal changes. Undo may step through them separately.

If the result is unclear:

- Stop editing.
- Download a backup.
- Use a named checkpoint or recovery snapshot.
- Reload only after confirming that the current state has been saved or backed up.

## An object cannot be selected

- Select it in Layers.
- Unlock the layer.
- Show the layer if hidden.
- Hide a covering transparent object.
- Bring the object forward.
- Exit Hand mode.
- Zoom in.

## An object cannot move

- Check whether the layer is locked.
- Check whether several objects are grouped.
- Clear multi-selection.
- Confirm that the drag begins on the object.
- On a phone, open Edit and change X or Y to test the object.

## Phone zoom creates strange movement

Canvas zoom should scale the real page without creating false page area.

If the page looks wrong:

1. Return to 100 percent.
2. Close and reopen the project.
3. Confirm that browser page zoom is normal.
4. Switch to Desktop and tablet mode, then back to Phone.
5. Reload the current app build.

## Phone controls cover a dialog

The passive guide, export screen, and phone sheets should keep actions above the safe area and bottom dock.

If a control is still covered:

- Rotate back to portrait.
- Close the browser keyboard.
- Scroll inside the dialog, not the page behind it.
- Close and reopen the dialog.
- Reload to get the latest layout fix.

Report the device, browser version, orientation, and a screenshot.

## Text does not wrap

- Resize the text box.
- Check for a long unbroken URL or code string.
- Use a code window for code.
- Replace unusual spaces copied from another application.
- Recreate the text object if pasted formatting is corrupted.

## A font changed

The original font may be missing.

- Import the local font again when permitted.
- Choose a bundled font.
- Check every line break.
- Avoid relying on a device-only font for shared projects.

## An image disappeared

- Check the layer visibility.
- Check project asset diagnostics.
- Reload after the save completes.
- Reimport the original file.
- Open a project backup to see whether the asset was embedded.

## SVG import looks wrong

Simplify the SVG in the source application.

Common troublemakers include:

- External style sheets
- Unsupported filters
- Complex masks
- Embedded fonts
- Linked images
- Advanced clipping
- Scripted SVG

Try exporting a plain SVG with embedded styles and no scripts.

## A chart shows incorrect data

- Reopen the chart source.
- Compare values with the original table.
- Check decimal separators.
- Check category order.
- Recalculate workbook formulas before importing.
- Confirm that the object is editable rather than a flattened image.

## PowerPoint import is distorted

- Check the source slide size.
- Check missing fonts.
- Simplify SmartArt, WordArt, animations, and complex groups.
- Import critical slides as SVG or images when exact appearance matters more than editability.

## PowerPoint export looks blurry

The compatibility export uses a page image on each slide.

- Increase the source page quality.
- Avoid scaling the slide image far beyond its intended size.
- Use SVG for vector publication output.
- Check the PowerPoint in the intended presentation application.

## Export does nothing

- Check the browser download list.
- Allow downloads for the site.
- Wait for a large export.
- Check device storage.
- Try one page.
- Try SVG or standard PNG first.
- Reload after downloading a project backup.

## Export panel is difficult to leave

Use **Back to editor** or the close control. On a phone, it should remain visible above the safe area.

## Cloud save fails

- Confirm that you are signed in.
- Check the network connection.
- Check whether the project is owned or shared with edit permission.
- Download a local backup.
- Retry once after the connection returns.
- Do not create many repeated cloud copies while diagnosing the issue.

## Invitation does not work

- Confirm the exact email address.
- Confirm that the recipient signed in with that address.
- Check the assigned role.
- Create a new expiring link if the original expired.
- Ask the owner to revoke old links after testing.

## Remote update conflict

Choose deliberately between the remote update and local state.

Before choosing, download a backup of the local state when possible. If both versions contain useful changes, preserve both and merge manually.

## Loomy does not generate anything

- Use a simpler structured prompt.
- State stages and direction.
- Confirm the selected provider.
- Try the deterministic helper.
- Check provider availability.
- Remember that the ordinary editor works without Loomy.

## The passive guide cannot be closed

The current guide keeps Close, Back, and Next in a sticky action area.

If an old cached guide still covers the controls:

- Close all FigureLoom tabs.
- Reopen the site.
- Reload once.
- Rotate the phone to portrait.
- Close the on-screen keyboard.

## Recovery procedure after a serious problem

1. Stop editing.
2. Download the current project if possible.
3. Record the project name, device, browser, and time.
4. Open recovery snapshots.
5. Restore the newest known-good snapshot into a separate project.
6. Compare it with the damaged state.
7. Import the latest external backup if needed.
8. Save the recovered project under a new name.
9. Download a fresh backup.

## Reporting a bug

Include:

- What you expected
- What happened
- Exact steps
- Device and operating system
- Browser and version
- Interface mode
- Portrait or landscape
- Whether the project was local or cloud
- A screenshot or short recording
- Whether it happens in a new empty project

Do not attach confidential project files publicly. Create a minimal example when possible.