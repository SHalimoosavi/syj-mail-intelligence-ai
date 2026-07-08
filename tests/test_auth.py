import pytest
from fastapi import HTTPException

from app.core.auth import verify_api_key


@pytest.mark.asyncio
async def test_no_key_configured_allows_through_in_dev(patch_setting):
    patch_setting("api_key", "")
    await verify_api_key(x_api_key="")  # must not raise


@pytest.mark.asyncio
async def test_correct_key_passes(patch_setting):
    patch_setting("api_key", "secret123")
    await verify_api_key(x_api_key="secret123")  # must not raise


@pytest.mark.asyncio
async def test_wrong_key_rejected(patch_setting):
    patch_setting("api_key", "secret123")
    with pytest.raises(HTTPException) as exc_info:
        await verify_api_key(x_api_key="wrong")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_missing_key_rejected_when_key_is_configured(patch_setting):
    patch_setting("api_key", "secret123")
    with pytest.raises(HTTPException) as exc_info:
        await verify_api_key(x_api_key="")
    assert exc_info.value.status_code == 401
