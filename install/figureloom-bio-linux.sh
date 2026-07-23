#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_URL="${FIGURELOOM_BIO_REPOSITORY_URL:-https://github.com/victork4314-sys/Figureloom.git}"
REPOSITORY_REF="${FIGURELOOM_BIO_REPOSITORY_REF:-main}"
INSTALL_ROOT="${FIGURELOOM_BIO_INSTALL_ROOT:-/opt/figureloom-bio}"
SOURCE_DIR="${INSTALL_ROOT}/source"
VENV_DIR="${INSTALL_ROOT}/venv"
SHARE_DIR="${FIGURELOOM_BIO_SHARE_DIR:-/usr/share/figureloom-bio}"
APPLICATIONS_DIR="${FIGURELOOM_BIO_APPLICATIONS_DIR:-/usr/share/applications}"
BIN_DIR="${FIGURELOOM_BIO_BIN_DIR:-/usr/local/bin}"
SKEL_DIR="${FIGURELOOM_BIO_SKEL_DIR:-/etc/skel}"
KASM_PROFILE_DIR="${FIGURELOOM_BIO_KASM_PROFILE_DIR:-/home/kasm-default-profile}"
HOME_ROOT="${FIGURELOOM_BIO_HOME_ROOT:-/home}"
SOURCE_OVERRIDE="${FIGURELOOM_BIO_SOURCE_OVERRIDE:-}"

if [[ "${EUID}" -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
        exec sudo -E bash "$0" "$@"
    fi
    echo "Run this installer as root."
    exit 1
fi

missing_commands=()
for command in git python3; do
    command -v "${command}" >/dev/null 2>&1 || missing_commands+=("${command}")
done

if ((${#missing_commands[@]})); then
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y git python3 python3-venv ca-certificates
    else
        echo "Missing required commands: ${missing_commands[*]}"
        echo "Install Git, Python 3, and the Python venv module, then run this again."
        exit 1
    fi
fi

if [[ -n "${SOURCE_OVERRIDE}" ]]; then
    rm -rf "${SOURCE_DIR}"
    mkdir -p "${INSTALL_ROOT}"
    cp -a "${SOURCE_OVERRIDE}" "${SOURCE_DIR}"
elif [[ -d "${SOURCE_DIR}/.git" ]]; then
    git -C "${SOURCE_DIR}" fetch --depth 1 origin "${REPOSITORY_REF}"
    git -C "${SOURCE_DIR}" checkout --force FETCH_HEAD
else
    rm -rf "${SOURCE_DIR}"
    mkdir -p "${INSTALL_ROOT}"
    git clone --depth 1 --branch "${REPOSITORY_REF}" "${REPOSITORY_URL}" "${SOURCE_DIR}"
fi

rm -rf "${VENV_DIR}"
if ! python3 -m venv "${VENV_DIR}" 2>/dev/null; then
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv
        python3 -m venv "${VENV_DIR}"
    else
        echo "Python could not create the FigureLoom Bio environment."
        exit 1
    fi
fi

site_packages="$("${VENV_DIR}/bin/python" - <<'PY'
import sysconfig
print(sysconfig.get_paths()["purelib"])
PY
)"
printf '%s\n' "${SOURCE_DIR}/figureloom-bio" >"${site_packages}/figureloom-bio-source.pth"

cat >"${VENV_DIR}/bin/flbio" <<EOF
#!/usr/bin/env bash
exec "${VENV_DIR}/bin/python" -m figureloom_bio.cli "\$@"
EOF
chmod 755 "${VENV_DIR}/bin/flbio"

install -Dm755 "${SOURCE_DIR}/install/linux/figureloom-bio-ide" "${BIN_DIR}/figureloom-bio-ide"
install -Dm755 "${SOURCE_DIR}/install/linux/figureloom-bio-copy-tests" "${BIN_DIR}/figureloom-bio-copy-tests"
install -Dm755 "${SOURCE_DIR}/install/linux/figureloom-bio-quick-test" "${BIN_DIR}/figureloom-bio-quick-test"
install -Dm755 "${SOURCE_DIR}/install/linux/figureloom-bio-setup" "${BIN_DIR}/figureloom-bio-setup"
ln -sfn "${VENV_DIR}/bin/flbio" "${BIN_DIR}/flbio"

mkdir -p "${SHARE_DIR}/setup"
rm -rf "${SHARE_DIR}/test-files"
cp -a "${SOURCE_DIR}/figureloom-bio/test-files" "${SHARE_DIR}/test-files"
install -m755 "${SOURCE_DIR}/install/linux/figureloom_bio_setup.py" \
    "${SHARE_DIR}/setup/figureloom_bio_setup.py"

install -Dm755 "${SOURCE_DIR}/install/linux/Install or Update FigureLoom Bio.desktop" \
    "${APPLICATIONS_DIR}/figureloom-bio-setup.desktop"
install -Dm755 "${SOURCE_DIR}/install/linux/FigureLoom Bio IDE.desktop" \
    "${APPLICATIONS_DIR}/figureloom-bio-ide.desktop"
install -Dm755 "${SOURCE_DIR}/install/linux/FigureLoom Bio Test Files.desktop" \
    "${APPLICATIONS_DIR}/figureloom-bio-test-files.desktop"
install -Dm755 "${SOURCE_DIR}/install/linux/Run FigureLoom Bio Quick Test.desktop" \
    "${APPLICATIONS_DIR}/figureloom-bio-quick-test.desktop"

install_desktop_items() {
    local home_dir="$1"
    local owner="${2:-}"
    local desktop_dir="${home_dir}/Desktop"
    mkdir -p "${desktop_dir}"

    install -m755 "${SOURCE_DIR}/install/linux/Install or Update FigureLoom Bio.desktop" \
        "${desktop_dir}/Install or Update FigureLoom Bio.desktop"
    install -m755 "${SOURCE_DIR}/install/linux/FigureLoom Bio IDE.desktop" \
        "${desktop_dir}/FigureLoom Bio IDE.desktop"
    install -m755 "${SOURCE_DIR}/install/linux/FigureLoom Bio Test Files.desktop" \
        "${desktop_dir}/FigureLoom Bio Test Files.desktop"
    install -m755 "${SOURCE_DIR}/install/linux/Run FigureLoom Bio Quick Test.desktop" \
        "${desktop_dir}/Run FigureLoom Bio Quick Test.desktop"

    rm -rf "${desktop_dir}/FigureLoom Bio Test Files"
    cp -a "${SHARE_DIR}/test-files" "${desktop_dir}/FigureLoom Bio Test Files"

    if [[ -n "${owner}" ]]; then
        chown -R "${owner}" "${desktop_dir}"
    fi
}

install_desktop_items "${SKEL_DIR}"

if [[ -d "${KASM_PROFILE_DIR}" ]]; then
    install_desktop_items "${KASM_PROFILE_DIR}"
fi

for home_dir in "${HOME_ROOT}"/*; do
    [[ -d "${home_dir}" ]] || continue
    [[ "${home_dir}" == "${KASM_PROFILE_DIR}" ]] && continue
    owner="$(stat -c '%u:%g' "${home_dir}" 2>/dev/null || true)"
    install_desktop_items "${home_dir}" "${owner}"
done

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "${APPLICATIONS_DIR}" >/dev/null 2>&1 || true
fi

echo
echo "FigureLoom Bio is installed."
"${VENV_DIR}/bin/flbio" doctor
echo
echo "Desktop items installed:"
echo "- Install or Update FigureLoom Bio"
echo "- FigureLoom Bio IDE"
echo "- FigureLoom Bio Test Files"
echo "- Run FigureLoom Bio Quick Test"
echo
echo "For a Kasm image, commit this container or image after the installer finishes."
