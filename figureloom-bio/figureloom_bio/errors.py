from __future__ import annotations


class FigureLoomBioError(Exception):
    """An error that can be explained directly to the person running the program."""

    def __init__(self, message: str, *, line_number: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.line_number = line_number

    def plain_message(self) -> str:
        if self.line_number is None:
            return self.message
        return f"Line {self.line_number}\n\n{self.message}"
