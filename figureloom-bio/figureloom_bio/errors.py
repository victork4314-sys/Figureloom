from __future__ import annotations


def _action_for(message: str) -> tuple[str, str]:
    lower = message.casefold()
    if "period at the end" in lower:
        return (
            "The instruction is missing its final period, so FigureLoom Bio cannot tell where it ends.",
            "Add a period to the end of that instruction and run the program again.",
        )
    if "could not find the column" in lower or ("column" in lower and "not found" in lower):
        return (
            "The named column is not present in the table that is open at this line.",
            "Open the table and check its first row. Use the column name exactly as it appears there, including spaces.",
        )
    if "numeric value" in lower or "numeric values" in lower or "does not contain numeric" in lower:
        return (
            "The required column exists, but its usable cells are empty or contain text instead of numbers.",
            "Check that the column contains ordinary numbers such as 2, 3.5, or 0.01. Remove units and words from those cells.",
        )
    if "installed tool" in lower or "could not find the installed tool" in lower:
        return (
            "FigureLoom Bio understood the instruction, but the separate command-line tool is missing or tool access is turned off.",
            "Install the named tool, then enable Allow installed tools before running the program again.",
        )
    if "open a .flbio" in lower or "choose a figureloom bio program" in lower:
        return (
            "The selected file is data or a result file rather than a FigureLoom Bio program.",
            "Select a file ending in .flbio in the Files panel, then press Run.",
        )
    if "no open" in lower or "open a table" in lower or "open a fasta" in lower or "open a fastq" in lower:
        return (
            "This step needs data from an earlier Open instruction, but the required data type is not currently open.",
            "Put the matching Open the file instruction before this line, then run the program from the beginning.",
        )
    if "file" in lower and any(word in lower for word in ("missing", "not found", "could not be opened", "could not open")):
        return (
            "The program refers to a file that is not available in the current workspace or folder.",
            "Add the file in the Files panel and make sure the instruction uses the exact filename, including its extension.",
        )
    if "plottable" in lower or "volcano plot has no usable rows" in lower:
        return (
            "The requested chart columns do not contain matching usable numbers.",
            "Check the column names. Effect values must be numbers, and p values must be numbers from 0 to 1.",
        )
    if "could not match this instruction" in lower or "recognize the command word" in lower:
        return (
            "FigureLoom Bio recognized part of the sentence but could not safely match the complete instruction.",
            "Open Sentences, choose the closest built-in sentence, and change only its filename, column, value, or number.",
        )
    return (
        "FigureLoom Bio reached a step it could not complete safely. It stopped instead of guessing or presenting an incomplete result as finished.",
        "Read the original message below, correct that instruction or its input data, and run the program again.",
    )


def explain_plain_message(message: str) -> str:
    text = str(message).strip()
    if not text or ("What happened" in text and ("How to fix it" in text or "What to do" in text)):
        return text
    why, fix = _action_for(text)
    return (
        f"{text}\n\n"
        "What happened\n"
        f"{why}\n\n"
        "How to fix it\n"
        f"{fix}"
    )


class FigureLoomBioError(Exception):
    """An error that can be explained directly to the person running the program."""

    def __init__(self, message: str, *, line_number: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.line_number = line_number

    def plain_message(self) -> str:
        message = explain_plain_message(self.message)
        if self.line_number is None:
            return message
        return f"Line {self.line_number}\n\n{message}"


__all__ = ["FigureLoomBioError", "explain_plain_message"]
