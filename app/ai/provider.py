"""
Every LLM call in the app goes through this interface. To add a new backend
(OpenRouter, Together, Groq, vLLM — anything serving open-weight models),
implement `LLMProvider` and register it in `get_provider()`. Nothing else in
the codebase needs to change.

get_provider() returns a process-wide singleton (not a new instance per
call) so the underlying HTTP client's connection pool is actually reused
instead of paying TCP/TLS setup cost on every single classification/reply
call.
"""
from abc import ABC, abstractmethod
from functools import lru_cache


class LLMProvider(ABC):
    @abstractmethod
    async def complete_json(self, prompt: str, model: str | None = None) -> dict:
        """Send a prompt expecting a JSON object back. Must return a parsed
        dict. Implementations are responsible for stripping markdown fences
        and retrying/falling back on malformed JSON."""
        raise NotImplementedError

    async def aclose(self):
        """Release any held resources (HTTP connections, etc). Called once
        at process shutdown — see main.py. Default no-op for providers that
        don't hold anything persistent."""
        return None


@lru_cache(maxsize=1)
def get_provider() -> LLMProvider:
    from config.config import settings

    if settings.llm_provider == "ollama":
        from app.ai.providers.ollama_provider import OllamaProvider
        return OllamaProvider()

    raise ValueError(
        f"Unknown LLM_PROVIDER '{settings.llm_provider}'. Implement it in "
        "app/ai/providers/ and register it in app/ai/provider.py:get_provider()."
    )


async def shutdown_provider():
    """Call once at process shutdown to close the cached provider's
    connections cleanly. Safe to call even if get_provider() was never
    called (e.g. Gmail never connected, no email was ever processed)."""
    if get_provider.cache_info().currsize > 0:
        await get_provider().aclose()
