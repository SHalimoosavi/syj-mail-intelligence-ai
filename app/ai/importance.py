from app.ai.provider import get_provider
from app.ai.prompts import load_prompt


# Values the model might emit to mean "no deadline" despite the prompt
# instructing it to use real JSON null. Compared case-insensitively after
# stripping whitespace.
_NULL_LIKE_VALUES = {"null", "none", "n/a", "na", ""}


def _normalize_deadline(value):
    if value is None:
        return None

    if isinstance(value, str) and value.strip().lower() in _NULL_LIKE_VALUES:
        return None

    return value


async def score_importance(
    sender: str, subject: str, body: str, category: str,
    is_thread_reply: bool, has_attachments: bool,
) -> dict:
    provider = get_provider()
    prompt = load_prompt("importance").format(
        sender=sender,
        subject=subject,
        is_thread_reply=is_thread_reply,
        has_attachments=has_attachments,
        category=category,
        body=body[:6000],
    )
    result = await provider.complete_json(prompt)
    result.setdefault("importance_score", 50)
    result.setdefault("deadline_detected", None)
    result.setdefault("reason", "")

    score = result["importance_score"]
    result["importance_score"] = max(1, min(100, int(score))) if isinstance(score, (int, float)) else 50

    result["deadline_detected"] = _normalize_deadline(result["deadline_detected"])

    return result
