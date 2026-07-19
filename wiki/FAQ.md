# FAQ

## Do I need an account?

No. Local projects, autosave, backups, imports, exports, and most editing features work without an account.

An account adds encrypted cloud projects, sharing, roles, persistent collaboration comments, presence, and live updates.

## Is FigureLoom free?

Yes. FigureLoom is free and open source under AGPL-3.0-only.

## Where are local projects stored?

In the browser profile on the current device.

They do not automatically follow you to another device. Download `.figureloom` backups.

## What is a `.figureloom` file?

It is the complete editable project backup. Use it to reopen, archive, or move a project.

It is not the same as a PNG, SVG, or PowerPoint export.

## Are older project backups supported?

Yes. Import the older backup, check the project, and download a new `.figureloom` copy.

## Can FigureLoom work offline?

Much of the editor can work offline after the application shell and required files are cached.

Cloud features, outside libraries, authentication, collaboration, MathJax, and optional providers can require a connection.

## Is it an AI image generator?

No. FigureLoom is an editor.

Loomy is an optional helper that creates an editable starting layout from normal FigureLoom objects. The editor does not depend on it.

## Does Loomy flatten the result?

No. The result is intended to remain editable.

Check the scientific accuracy and layout yourself.

## Can I use FigureLoom on a phone?

Yes. Phone mode uses a compact header, scrollable tabs, full-screen Add panel, bottom dock, touch-friendly sheets, safe areas, and mobile canvas controls.

Dense poster work and advanced path editing are still easier on a larger screen.

## Can I force the desktop interface on a phone?

Yes. Open Settings and select Desktop and tablet. Phone mode also includes a quick **Use desktop and tablet interface** action in More.

## Can I move a project between devices?

Yes. Download the `.figureloom` backup on the first device and import it on the second.

Local imported fonts may need to be imported again.

## Does autosave mean I never need a backup?

No. Autosave belongs to the browser. Download backups outside the browser.

## Can I open PowerPoint files?

FigureLoom can import many common PowerPoint elements. Complex slides can require correction or flattening.

Always compare the import with the original.

## Can I export PowerPoint?

Yes. Multi-page projects can be exported to `.pptx`.

The compatibility path can place each page as a high-resolution image on a slide. Not every object becomes a native PowerPoint shape.

## Can I import Excel files?

Yes. Common workbook and delimited formats are supported through the office and data tools.

Macros do not run, and formulas should be recalculated before import.

## Does FigureLoom calculate statistics?

No. It can create editable charts and specialist plot layouts, but statistical analysis should be completed and validated in appropriate software.

## Can I make equations?

Yes. Use quick notation helpers for short labels or the MathJax TeX workspace for rendered SVG equations with retained source.

## Can I edit SVG paths?

Yes, within the supported path-command editor. It can inspect commands, change coordinates, select anchors, and break compound artwork apart.

It is not a full desktop Bézier editor.

## Can I make maps?

Yes. Map Studio supports world and country maps, study-site locators, and GeoJSON import.

It is not a replacement for GIS analysis.

## Are scientific illustrations free to use?

Built-in and outside assets have their own source and licensing conditions.

Review the metadata and license for the exact asset. FigureLoom can collect attribution information where available.

## Does FigureLoom add a watermark?

No.

## Can I use custom fonts?

Yes, supported local font files can be imported.

The font may not be available on another device, and font licensing still applies.

## Can I collaborate live?

Yes, in a configured cloud deployment. Roles control viewing, commenting, editing, broadcasting, and access management.

## Are cloud projects encrypted?

Editable payloads and persistent comment bodies are encrypted in the browser before storage.

The system uses application-layer encryption, not zero-knowledge encryption. Gallery and permission metadata remains visible.

## Can a collaborator keep a copy after access is removed?

Yes. Access removal cannot delete exports or backups already downloaded by that person.

## Can FigureLoom guarantee journal compliance?

No. It provides generic presets and readiness checks. Verify the current journal, conference, or printer requirements.

## Can it export PDF or TIFF directly?

The current main workflows focus on SVG, PNG, PowerPoint, project backups, reports, and pathway exchange. Use another trusted application to convert a validated export when PDF or TIFF is required.

## Why does a project look different on another device?

Common causes include missing local fonts, browser differences, stale cached app files, unavailable outside assets, or a different interface mode.

## Why is the favicon still old on Safari?

Safari can keep a site icon cached separately from normal page files. The editor itself can update while an old icon remains. Closing all tabs, restarting Safari, or waiting for Safari's icon cache to refresh can be necessary.

## Where should I report a bug?

Use the GitHub repository issue tracker. Include exact steps, device, browser, interface mode, and a minimal non-confidential example.