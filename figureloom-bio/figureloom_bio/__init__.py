"""FigureLoom Bio."""

from .runtime import Runner
from .runtime_extensions import install_runtime_extensions
from .runtime_repeat_reset import install_repeat_reset
from .sequence_management import install_sequence_management
from .genomics_core import install_genomics_core
from .unique_name_fix import install_unique_name_fix
from .workflow_expansion import install_workflow_expansion
from .complete_language import install_complete_language
from .complete_language_parity import install_complete_language_parity
from .analysis_language import install_analysis_language
from .addon_packages import install_addon_packages
from .addon_translation import install_addon_translation
from .current_file_language import install_current_file_language
from .current_file_translation import install_current_file_translation
from .translation_completion import install_translation_completion

install_runtime_extensions(Runner)
install_repeat_reset(Runner)
install_sequence_management(Runner)
install_genomics_core(Runner)
install_unique_name_fix(Runner)
install_workflow_expansion(Runner)
install_complete_language(Runner)
install_complete_language_parity()
install_analysis_language(Runner)
install_addon_packages(Runner)
install_current_file_language(Runner)
install_addon_translation()
install_current_file_translation()
install_translation_completion()

__version__ = "0.7.0"

__all__ = ["Runner", "__version__"]
