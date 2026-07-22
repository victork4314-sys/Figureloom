"""FigureLoom Bio."""

from .runtime import Runner
from .runtime_extensions import install_runtime_extensions
from .runtime_repeat_reset import install_repeat_reset
from .sequence_management import install_sequence_management
from .genomics_core import install_genomics_core
from .unique_name_fix import install_unique_name_fix

install_runtime_extensions(Runner)
install_repeat_reset(Runner)
install_sequence_management(Runner)
install_genomics_core(Runner)
install_unique_name_fix(Runner)

__version__ = "0.3.0"

__all__ = ["Runner", "__version__"]
