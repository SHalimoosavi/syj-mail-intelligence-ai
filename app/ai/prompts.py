"""
Prompt templates used to be read once at import time (`PROMPT_TEMPLATE =
Path(...).read_text()`), which had two real problems:

1. A missing/corrupted prompt file crashed the whole app at import, not just
   the one email being classified.
2. Editing a prompt through the dashboard's Prompt Editor never actually
   took effect until the process restarted — the module-level constant was
   already baked in.

This reads the file fresh on every call instead (cheap — these are a few KB
of text) so dashboard edits apply to the very next email, and falls back to
the last successfully-read content if the file is temporarily missing.
"""
from pathlib import Path

PROMPTS_DIR = Path("config/prompts")
_last_good: dict[str, str] = {}


def load_prompt(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.txt"
    try:
        content = path.read_text()
        _last_good[name] = content
        return content
    except FileNotFoundError:
        if name in _last_good:
            return _last_good[name]
        raise RuntimeError(
            f"Prompt template '{name}.txt' not found at {path} and no "
            "previously-loaded copy is cached. Restore it from git or "
            "config/prompts/ before this can process another email."
        )
