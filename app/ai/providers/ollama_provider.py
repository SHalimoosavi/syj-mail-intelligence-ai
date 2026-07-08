import json
import re

import httpx

from app.ai.provider import LLMProvider
from app.core.logger import log_event
from config.config import settings


class OllamaProvider(LLMProvider):
    """Talks to a local or LAN Ollama server. Supports DeepSeek, Qwen, Mistral,
    Llama — anything you've `ollama pull`ed. Set OLLAMA_HOST to a remote
    machine's address if your device can't run the model itself (typical for
    phones).

    Holds one persistent httpx.AsyncClient for the lifetime of the process
    (via app.ai.provider.get_provider()'s singleton caching) instead of
    opening a fresh TCP/TLS connection on every single AI call."""

    def __init__(self):
        self.host = settings.ollama_host.rstrip("/")
        self.timeout = settings.llm_timeout_seconds
        self._client = httpx.AsyncClient(timeout=self.timeout)

    async def aclose(self):
        await self._client.aclose()

    async def complete_json(self, prompt: str, model: str | None = None) -> dict:
        target_model = model or settings.llm_model
        try:
            return await self._call(target_model, prompt)
        except Exception as exc:
            log_event(
                "ollama_provider",
                f"Primary model '{target_model}' failed ({exc}); trying fallback "
                f"'{settings.llm_fallback_model}'",
                level="warning",
            )
            return await self._call(settings.llm_fallback_model, prompt)

    async def _call(self, model: str, prompt: str) -> dict:
        response = await self._client.post(
            f"{self.host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2},
            },
        )
        response.raise_for_status()
        raw_text = response.json().get("response", "")
        return self._extract_json(raw_text)

    @staticmethod
    def _extract_json(text: str) -> dict:
        text = text.strip()
        text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise ValueError(f"Model did not return valid JSON: {text[:200]}")
