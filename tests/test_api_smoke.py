from fastapi.testclient import TestClient

from app.api.main import app


def test_health_needs_no_key():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_emails_endpoint_enforces_key_end_to_end(patch_setting):
    patch_setting("api_key", "topsecret")
    client = TestClient(app)

    assert client.get("/emails").status_code == 401
    assert client.get("/emails", headers={"X-API-Key": "wrong"}).status_code == 401

    resp = client.get("/emails", headers={"X-API-Key": "topsecret"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_settings_endpoint_never_leaks_the_database_credentials(patch_setting):
    patch_setting("api_key", "topsecret")
    client = TestClient(app)

    resp = client.get("/settings", headers={"X-API-Key": "topsecret"})
    assert resp.status_code == 200
    # The real DATABASE_URL (with credentials, if Postgres) must never appear
    # in an API response — only the redacted scheme.
    assert "***" in resp.json()["database_url"]


def test_unknown_prompt_name_is_rejected_not_path_traversed(patch_setting):
    patch_setting("api_key", "topsecret")
    client = TestClient(app)

    resp = client.get("/prompts/../../../etc/passwd", headers={"X-API-Key": "topsecret"})
    assert resp.status_code in (401, 404)  # never 200, never file contents
