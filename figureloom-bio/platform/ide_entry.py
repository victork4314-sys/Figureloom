from figureloom_bio import native_account, native_ide
from figureloom_bio.native_account_runtime import install_runtime_fixes
from figureloom_bio.native_syntax_web_exact import install_exact_web_syntax
from figureloom_bio.native_web_parity import install_web_parity


install_runtime_fixes(native_account)
native_account.install_native_account(native_ide)
install_web_parity(native_ide)
install_exact_web_syntax()


if __name__ == "__main__":
    raise SystemExit(native_ide.run_native_ide())
