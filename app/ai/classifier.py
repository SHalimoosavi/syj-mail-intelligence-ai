from app.ai.provider import get_provider
from app.ai.prompts import load_prompt
from config.config import CATEGORIES


async def classify_email(sender: str, subject: str, body: str) -> dict:
    provider = get_provider()
    prompt = load_prompt("classify").format(
        categories=", ".join(CATEGORIES),
        sender=sender,
        subject=subject,
        body=body[:6000],  # keep prompt bounded for local models
    )
    result = await provider.complete_json(prompt)

    if result.get("category") not in CATEGORIES:
        result["category"] = "Other"
    result.setdefault("priority", "Medium")
    result.setdefault("confidence", 50)
    result.setdefault("reason", "")
    return result
