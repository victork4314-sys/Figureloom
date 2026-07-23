from figureloom_bio import native_ide


_original_feature_names = native_ide.NativeIdeWindow.feature_names


def _feature_names_with_editor_modes(self) -> set[str]:
    names = set(_original_feature_names(self))
    labels = {
        self.tabs.tabText(index).strip().casefold()
        for index in range(self.tabs.count())
    }
    if "text" in labels:
        names.add("text_mode")
    if "blocks" in labels:
        names.add("blocks_mode")
    return names


native_ide.NativeIdeWindow.feature_names = _feature_names_with_editor_modes


if __name__ == "__main__":
    raise SystemExit(native_ide.run_native_ide())
