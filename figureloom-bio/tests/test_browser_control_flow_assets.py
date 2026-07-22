from __future__ import annotations

from pathlib import Path
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[2]
IDE = ROOT / "ide"


def test_combined_browser_control_flow_runtime_is_valid_javascript(tmp_path: Path) -> None:
    parts = [IDE / f"ide-control-flow-runtime.part{number:02d}" for number in range(5)]
    assert all(path.exists() for path in parts)
    source = "".join(path.read_text(encoding="utf-8") for path in parts)
    assert "window.FigureLoomBioFlow" in source
    assert "Make a recipe called" in source
    assert "Bacterial genome assembled" in source

    node = shutil.which("node")
    assert node is not None, "Node.js is required by the repository validation job."
    combined = tmp_path / "combined-control-flow-runtime.js"
    combined.write_text(source, encoding="utf-8")
    subprocess.run([node, "--check", str(combined)], check=True, capture_output=True, text=True)


def test_browser_decisions_and_microbiology_assets_are_loaded() -> None:
    examples = (IDE / "ide-bio-examples.js").read_text(encoding="utf-8")
    assert "ide-control-flow-runtime.js?v=1" in examples
    assert "ide-decisions.js?v=1" in examples
    assert "ide-decisions.css?v=1" in examples
    assert "microbiology-example.flbio" in examples
    assert "Make sure at least 4 reads remain" in examples
    assert "resistance-markers.fasta" in examples

    addon_runtime = (IDE / "ide-addon-runtime.js").read_text(encoding="utf-8")
    assert "flowWillHandle" in addon_runtime
    assert "Starting browser analysis" in addon_runtime

    wiki_index = (ROOT / "wiki" / "index.html").read_text(encoding="utf-8")
    assert "wiki-bio-decisions.js?v=1" in wiki_index
