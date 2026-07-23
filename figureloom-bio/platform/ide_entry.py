from figureloom_bio import native_account, native_ide
from figureloom_bio.desktop_reliability import install_native_worker_explanations
from figureloom_bio.native_account_runtime import install_runtime_fixes
from figureloom_bio.native_stability import install_native_stability, run_stable_ide
from figureloom_bio.native_syntax_web_exact import install_exact_web_syntax
from figureloom_bio.native_web_parity import install_web_parity


install_runtime_fixes(native_account)
native_account.install_native_account(native_ide)
install_web_parity(native_ide)
install_exact_web_syntax()
install_native_stability(native_ide)
install_native_worker_explanations(native_ide)


if __name__ == "__main__":
    raise SystemExit(run_stable_ide(native_ide))
