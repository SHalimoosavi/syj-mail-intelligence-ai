from app.ai.provider import get_provider
from app.ai.prompts import load_prompt


async def summarize_email(sender: str, subject: str, body: str) -> dict:
    provider = get_provider()
    prompt = load_prompt("summarize").format(sender=sender, subject=subject, body=body[:8000])
    result = await provider.complete_json(prompt)

    result.setdefault("one_line_summary", "")
    result.setdefault("short_summary", "")
    result.setdefault("detailed_summary", "")
    result.setdefault("action_items", [])
    result.setdefault("deadlines", [])
    result.setdefault("requested_tasks", [])
    return result
