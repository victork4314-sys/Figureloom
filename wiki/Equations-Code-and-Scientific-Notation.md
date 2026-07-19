# Equations, code, and scientific notation

FigureLoom provides quick notation helpers, a TeX typesetting workspace, and code windows for technical instructions or examples.

## Quick notation tools

The normal text tools include practical helpers for:

- Greek letters
- Superscript
- Subscript
- Chemical-number formatting
- Species styling
- Common scientific symbols

Use these for short labels such as:

- CO₂
- H₂O
- 10⁶ cells
- α diversity
- p < 0.05

## Superscript and subscript

Select the relevant part of a text object and apply superscript or subscript.

Check the final text at export size. Very small subscripts can become unreadable when a figure is reduced.

## Chemical notation

Chemical formatting helpers are intended for labels and short formulas.

For a long or complex reaction, use TeX or create the notation in a dedicated chemistry tool and import an SVG.

## Quick equation input

The lightweight equation tools support a practical browser-safe subset of LaTeX-like commands.

They are useful for simple expressions, but they are not the same as full TeX rendering.

## TeX typesetting

Open **TeX typesetting** in Pro Tools for MathJax-based rendering.

The workflow is:

1. Enter TeX source.
2. Choose inline or display mode.
3. Choose the equation color.
4. Render the equation.
5. Insert it onto the canvas.

The result is embedded SVG artwork with the TeX source retained for later editing.

## Editing a TeX equation

Double-click the equation or use the inspector edit action.

Change the retained source, render it again, and replace the visual result.

## Example TeX

```tex
E = mc^2
```

```tex
\frac{dN}{dt} = rN\left(1-\frac{N}{K}\right)
```

```tex
p < 0.05
```

```tex
\Delta G = \Delta H - T\Delta S
```

## TeX loading

MathJax loads on demand. The first equation can take longer than later equations.

If rendering fails:

- Check the TeX syntax.
- Try a smaller expression.
- Confirm that the browser can load the MathJax resource.
- Reload the editor and try again.
- Keep a copy of the TeX source outside the project.

## Equation styling

Use consistent equation color and size across the project.

Avoid stretching an equation disproportionately. Resize it while preserving its aspect ratio.

## Equation accessibility

Add alt text or a long description that gives the equation in words or accessible notation.

For important mathematics, include the source expression in the surrounding document or caption rather than relying only on the rendered artwork.

## Code windows

Code windows are designed for instructions, methods, examples, command snippets, and technical notes.

They can display code without turning a long block into one unwrapped line.

Use a code window for:

- Analysis commands
- Reproducible methods
- Short scripts
- Pipeline steps
- Instrument settings
- Configuration examples
- Pseudocode

## Adding a code window

1. Open **Add**.
2. Choose Code window.
3. Select or enter the language.
4. Paste the code.
5. Resize the object.
6. Confirm that long lines wrap or scroll as intended.

## Code-window layout

Keep code readable:

- Use a monospaced font.
- Avoid very small text.
- Break long commands across lines when the language allows it.
- Do not place a large code block inside a small journal figure.
- Use a supplementary page or repository link for full scripts.

## Code and privacy

Do not paste secrets into a code window.

Remove:

- API keys
- Passwords
- Private tokens
- Patient identifiers
- Internal hostnames
- Personal file paths

Project backups preserve editable content, so sensitive text remains in the project even if it is later hidden on the page.

## Scientific annotation tools

The annotation workspace also includes:

- Panel labels
- Callouts
- Scale bars
- Measurement lines
- Grouping brackets
- Significance brackets
- Numbered markers
- Legends

These can be combined with equations and notation.

## Statistical notation

Make statistical labels explicit.

Examples:

- `n = 12`
- `mean ± SD`
- `95% CI`
- `adjusted p = 0.031`

Define symbols and significance markers in the caption or legend.

## Gene, protein, and species names

Use the correct style for the field and organism.

FigureLoom provides text styling helpers, but it does not validate nomenclature rules. Check the current database, journal, or discipline guidance.

## Common problems

### The equation appears as plain source text

Use the TeX rendering action rather than inserting the source as an ordinary text object.

### The equation is blurry

Use the vector TeX result and export SVG when possible. Confirm that the equation was not replaced with a screenshot.

### The code is one long line

Use a code window, enable wrapping where available, or add deliberate line breaks.

### A symbol is missing

Try a font with broader Unicode coverage or render the expression with TeX.

### Subscript text is too small

Increase the main text size or use a TeX equation for complex notation.