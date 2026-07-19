# Supported formats and limitations

This page separates normal supported workflows from areas that still require another tool or careful validation.

## Project files

### Supported

- Complete editable `.figureloom` backup download
- Import of current `.figureloom` projects
- Import of older FigureLoom project backups
- Local autosave
- Recovery snapshots
- Named checkpoints

### Important limitation

A visual export such as PNG, SVG, or PowerPoint is not a replacement for the editable project backup.

## Image import

### Supported

- PNG
- JPEG and JPG
- WebP
- SVG

### Limitations

Complex SVG filters, masks, external styles, linked images, scripts, or unusual font handling can change during sanitization and import.

FigureLoom is not a full raster-image editor. Perform scientific image processing and analysis elsewhere.

## SVG editing

### Supported

- Normal object transforms
- Whole-object recoloring where possible
- Path command inspection and editing
- Anchor selection
- Breaking compound SVG artwork into independent SVG objects

### Limitations

- Not a complete Illustrator-style Bézier-handle system
- Advanced arbitrary Boolean operations may require a dedicated vector editor
- Complex imported SVG behavior can vary

## Font import

### Supported

- WOFF
- WOFF2
- TTF
- OTF

### Limitations

Imported fonts are local to the browser or device unless the deployment and project workflow explicitly preserves them. Test projects after moving them.

## Spreadsheet import

### Supported

- XLSX
- XLS
- XLSM workbook reading
- ODS
- CSV
- TSV
- Pasted comma-separated or tab-separated data

### Limitations

- Macros are not executed
- FigureLoom is not a spreadsheet calculation engine
- Cached formula results can be stale
- Complex formatting and merged cells can change
- Very large workbooks can make projects slow

## PowerPoint import

### Supported

Many common slide elements, including:

- Text
- Basic shapes
- Images
- Tables
- Groups
- Basic charts

### Limitations

Complex slide masters, SmartArt, WordArt, animations, transitions, embedded media, theme behavior, nested transformations, and advanced chart features may not convert exactly.

## Chart and table objects

### Supported

Editable tables and many plot starters, including:

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

### Limitations

FigureLoom is not statistical-analysis software. Calculate and validate statistics in an appropriate analysis environment.

Specialist plot starters may require prepared values rather than raw data.

## Equations

### Supported

- Quick scientific notation helpers
- Greek symbols
- Superscript and subscript
- Practical lightweight equation commands
- MathJax TeX rendering to retained-source SVG

### Limitations

- Quick notation is not full TeX
- TeX rendering loads on demand
- Very advanced packages or custom macros may not work
- Accessibility descriptions still need manual review

## Maps

### Supported

- World and country maps
- Study-site locators
- Natural Earth boundary workflows
- GeoJSON import

### Limitations

FigureLoom is not a GIS. It does not replace spatial analysis, projection management, geoprocessing, or survey-grade measurement.

## Scientific illustrations

### Supported

- Built-in editable artwork
- On-demand compatible outside libraries
- Search and aliases
- Source and attribution metadata where available
- Automatic reference collection where metadata exists

### Limitations

- Search results require scientific review
- Outside assets keep their own licenses
- Metadata can be incomplete
- Not every asset can be recolored in the same way

## Export

### Supported

- SVG
- Standard PNG
- High-resolution or print PNG
- PowerPoint
- Complete editable project backup
- Reference and attribution output
- Publication readiness report
- Presentation mode
- Starter SBGN-ML, BioPAX, and SBML pathway exchange

### Limitations

- Compatibility PowerPoint output can use a high-resolution page image rather than native PowerPoint objects
- Not every editable-first export element remains native
- PDF and TIFF may require opening an SVG, PNG, or PowerPoint in another application
- Pathway exchange requires specialist validation
- Journal acceptance is never guaranteed

## Collaboration

### Supported

- Local projects without an account
- Email and password accounts
- Encrypted cloud gallery
- Owner, editor, reviewer, and viewer roles
- Pending email invitations
- Expiring share links
- Authenticated presence and remote cursors
- Encrypted edit broadcasts
- Persistent review comments
- Conflict controls

### Limitations

- Application-layer encryption is not zero knowledge
- Project titles and permission metadata remain visible
- Offline users cannot synchronize
- Removing access cannot delete files already downloaded by a collaborator

## Offline use

### Supported

- Versioned offline application shell
- Local editing after required files are cached
- Local autosave and backups

### Limitations

- Cloud, authentication, collaboration, outside libraries, MathJax, and optional providers may need network access
- Browser storage can be removed by cleanup or eviction

## Phone mode

### Supported

- Phone-specific layout
- Touch-friendly panels
- Safe areas
- Bottom dock
- Canvas zoom and pan
- Object movement
- Full-screen Add and Export surfaces
- Accessible passive guide controls

### Limitations

A phone screen is still small. Large poster work, dense layer management, and detailed path editing are easier on a tablet or desktop.

## Browser support

Use a current browser with support for modern JavaScript, SVG, IndexedDB, service workers, and browser downloads.

Browser-specific behavior can affect file downloads, font loading, clipboard access, and installed web-app caching.

## Publication limits

FigureLoom can check common problems and provide generic physical presets.

It cannot guarantee:

- Journal compliance
- Printer acceptance
- Statistical correctness
- Image-integrity compliance
- Accessibility compliance in every final format
- Correct licensing for every user-supplied asset

The user must verify the final output and current submission requirements.