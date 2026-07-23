from __future__ import annotations

import re

from PySide6.QtGui import QSyntaxHighlighter

from .native_web_parity import WebSyntaxHighlighter


class ExactWebSyntaxHighlighter(WebSyntaxHighlighter):
    """Paint accepted native lines in the same layers as the web editor."""

    CONNECTOR_PATTERN = re.compile(
        r"\b(?:the|only|rows?|sequences?|reads?|result|file|files|under|by|using|as|with|than|at least|below|above|in|on|of|for|every)\b",
        re.IGNORECASE,
    )

    def highlightBlock(self, text: str) -> None:  # noqa: N802 - Qt API name
        if not self.enabled or not text.strip():
            return
        stripped = text.strip()
        leading = len(text) - len(text.lstrip())
        if stripped.startswith("#"):
            self.setFormat(leading, len(stripped), self.comment)
            return
        if not self._accepted(stripped):
            self.setFormat(leading, len(stripped), self.invalid)
            return

        # The web layer starts with the accepted instruction color, then paints
        # arguments and ordinary connector words over it. Doing the same in Qt
        # makes the result stable on macOS instead of relying on platform text CSS.
        self.setFormat(leading, len(stripped), self.command)
        self._set_matches(text, self.CONNECTOR_PATTERN, self.word)
        self._set_matches(text, self.FILE_PATTERN, self.file)
        self._set_matches(text, self.NUMBER_PATTERN, self.value)
        self._set_matches(text, self.VALUE_AFTER_PATTERN, self.value, 1)
        self._set_matches(text, self.FIELD_AFTER_PATTERN, self.field, 1)
        if stripped[-1:] in {".", ":"}:
            self.setFormat(leading + len(stripped) - 1, 1, self.punctuation)


def install_exact_web_syntax() -> type[QSyntaxHighlighter]:
    from . import native_widgets

    native_widgets.NativeSyntaxHighlighter = ExactWebSyntaxHighlighter
    return ExactWebSyntaxHighlighter


__all__ = ["ExactWebSyntaxHighlighter", "install_exact_web_syntax"]
