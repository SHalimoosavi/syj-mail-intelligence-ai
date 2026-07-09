import json
import re

import httpx

from app.ai.provider import LLMProvider
from app.core.logger import log_event
from config.config import settings


class OllamaProvider(LLMProvider):
    """
    Stable Ollama JSON provider.

    Features:
    - Persistent HTTP client
    - Automatic fallback model
    - Robust JSON extraction
    - Detailed logging
    - Better diagnostics
    """

    def __init__(self):
        self.host = settings.ollama_host.rstrip("/")
        self.timeout = settings.llm_timeout_seconds

        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10,
                read=self.timeout,
                write=30,
                pool=30,
            )
        )

    async def aclose(self):
        await self._client.aclose()

    async def complete_json(self, prompt: str, model: str | None = None) -> dict:
        primary = model or settings.llm_model

        try:
            return await self._call(primary, prompt)

        except Exception as exc:
            log_event(
                "ollama_provider",
                (
                    f"Primary model '{primary}' failed "
                    f"({type(exc).__name__}: {exc}). "
                    f"Trying fallback '{settings.llm_fallback_model}'"
                ),
                level="warning",
            )

            if settings.llm_fallback_model == primary:
                raise

            return await self._call(settings.llm_fallback_model, prompt)

    async def _call(self, model: str, prompt: str) -> dict:
        response = await self._client.post(
            f"{self.host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.15,
                    "top_p": 0.9,
                },
            },
        )

        response.raise_for_status()

        payload = response.json()

        raw = payload.get("response", "")

        if not raw.strip():
            raise ValueError("Empty response returned by Ollama.")

        log_event(
            "ollama_provider",
            f"RAW MODEL OUTPUT ({model}):\n{raw}",
            level="info",
        )

        try:
            result = self._extract_json(raw)

        except Exception as exc:
            preview = raw[:1000].replace("\n", "\\n")

            log_event(
                "ollama_provider",
                (
                    f"JSON extraction failed.\n"
                    f"Model: {model}\n"
                    f"Preview: {preview}\n"
                    f"Reason: {repr(exc)}"
                ),
                level="error",
            )
            raise

        log_event(
            "ollama_provider",
            f"PARSED JSON ({model}): {repr(result)}",
            level="info",
        )

        if not isinstance(result, dict):
            raise TypeError(
                f"Expected dict from model, got {type(result).__name__}"
            )

        return result

    @staticmethod
    def _extract_json(text: str) -> dict:
        """
        Accepts responses like:

        {...}

        ```json
        {...}
        ```

        Here is the JSON:
        {...}
        """

        text = text.strip()

        text = re.sub(
            r"^```(?:json)?\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        text = re.sub(
            r"\s*```$",
            "",
            text,
        )

        try:
            return json.loads(text)

        except Exception:
            pass

        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            return json.loads(candidate)

        raise ValueError(
            f"Model did not return valid JSON.\n{text[:500]}"
        )
