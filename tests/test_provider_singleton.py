"""
Confirms the fix for "new AI provider (and thus new httpx.AsyncClient)
created on every call" — get_provider() must return the same instance every
time, not construct a fresh one per call.
"""
from app.ai.provider import get_provider


def test_get_provider_returns_a_singleton():
    first = get_provider()
    second = get_provider()
    assert first is second


def test_provider_has_a_persistent_http_client():
    provider = get_provider()
    # OllamaProvider specifically holds one httpx.AsyncClient for its
    # lifetime rather than opening one per request.
    assert hasattr(provider, "_client")
    client_id_first = id(provider._client)
    again = get_provider()
    assert id(again._client) == client_id_first
