from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ide" / "ide-language-compiler.js"


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")
    old = """      readyPromise.then(() => {\n        replaying = true;\n        runButton.click();\n        replaying = false;\n      });"""
    new = """      readyPromise.then(() => {\n        replaying = true;\n        compileTemporarily();\n        runButton.click();\n        replaying = false;\n      });"""

    if new in source and old not in source:
        print("Compiler replay already compiles before rerunning.")
        return

    count = source.count(old)
    if count != 2:
        raise SystemExit(f"Expected two compiler replay paths, found {count}.")

    TARGET.write_text(source.replace(old, new), encoding="utf-8")
    print("Both cold-load replay paths now compile before rerunning.")


if __name__ == "__main__":
    main()
