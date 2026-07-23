"""Compatibility imports for older FigureLoom Bio programs.

Capabilities are built into the language now. Nothing needs to be installed,
enabled, or declared. The old module names remain only so saved programs and
integrations from FigureLoom Bio 0.5 keep working.
"""

from dataclasses import dataclass

from .capabilities import (
    BuiltInCommand,
    CapabilityTheme,
    COMMANDS,
    COMMAND_TO_PACKAGE,
    MICROBIOLOGY_COMMANDS,
    THEMES,
    _install_patterns,
    capability_catalog,
    expand_capabilities,
    get_theme,
    install_builtin_capabilities,
)

# Register every built-in sentence before any caller reaches parser.parse().
_install_patterns()


@dataclass(frozen=True)
class _LegacyPackage:
    name: str
    title: str
    icon: str
    description: str
    commands: tuple[BuiltInCommand, ...]
    status: str = "core"
    version: str = "built-in"


AddonCommand = BuiltInCommand
AddonPackage = CapabilityTheme
CATALOG = THEMES
PACKAGES = {
    theme.name: _LegacyPackage(
        theme.name,
        theme.title,
        theme.icon,
        theme.description,
        theme.commands,
    )
    for theme in THEMES
}
MICROBIOLOGY = get_theme("microbiology")


def normalize_addon_name(name: str) -> str:
    return name.strip().lower().lstrip(".")


def get_addon(name: str):
    return get_theme(name)


def addon_catalog():
    return capability_catalog()


def expand_addons(instructions):
    return expand_capabilities(instructions)


def install_addon_packages(runner_class):
    return install_builtin_capabilities(runner_class)
