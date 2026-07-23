from figureloom_bio import native_account, native_ide, native_widgets
from figureloom_bio.native_account_runtime import install_runtime_fixes
from figureloom_bio.native_syntax_web_exact import install_exact_web_syntax
from figureloom_bio.native_web_parity import install_web_parity


install_runtime_fixes(native_account)
native_account.install_native_account(native_ide)
install_web_parity(native_ide)

# The web-matching palette deliberately uses newer descriptive names, while the
# existing line-number painter still reads the old panel_2 key. Keep that
# internal compatibility alias so the editor cannot crash during its first
# paint event. This does not change the approved web-identical appearance.
native_widgets.LIGHT.setdefault("panel_2", native_widgets.LIGHT["editor_gutter"])
native_widgets.DARK.setdefault("panel_2", native_widgets.DARK["editor_gutter"])

install_exact_web_syntax()


if __name__ == "__main__":
    raise SystemExit(native_ide.run_native_ide())
