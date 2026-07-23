from figureloom_bio import native_account, native_ide
from figureloom_bio.native_account_runtime import install_runtime_fixes


install_runtime_fixes(native_account)
native_account.install_native_account(native_ide)


if __name__ == "__main__":
    raise SystemExit(native_ide.run_native_ide())
