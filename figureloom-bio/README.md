# FigureLoom Bio

FigureLoom Bio is a programming language that reads like ordinary instructions.

```flbio
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

The language uses normal sentences and normal periods. The difficult machinery stays underneath.

## Current working commands

```text
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Put the rows in order by age.
Put the largest age first.
Put the smallest age first.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Combine it with metadata.csv using sample.
Change control to untreated under condition.
Count the rows.
Show the result.
Show the file.
Save the result as clean-samples.csv.
Say Starting the analysis.
```

When one file is open, later instructions refer to it as **the file** or **the result**. When a workflow uses more than one file, the language uses the real filenames so the instructions remain obvious.

Combining a second table keeps the current rows and adds matching information from the other file. Rows without a match stay in the result with empty added values.

## Run the example

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
```

The same table commands also run directly in the browser IDE at `figureloom.org/ide`.

The result is shown in separate, spacious sections. Raw technical output is not mixed into the useful result.

## What works now

- Reading `.flbio` instructions as full sentences.
- Requiring a normal period after every instruction.
- Opening CSV and TSV files.
- Keeping and removing matching rows.
- Choosing and renaming columns.
- Sorting rows naturally, including numerical sorting.
- Removing duplicate rows.
- Filling empty values.
- Changing matching values.
- Combining matching information from another table.
- Counting rows.
- Showing a readable table.
- Saving CSV and TSV results.
- Printing simple messages.
- Plain errors that point to the sentence that needs fixing.

Sequence, FASTQ, comparison, queue, and deeper IDE support come next without making the visible language more complicated.
