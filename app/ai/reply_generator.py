from app.ai.provider import get_provider
from app.ai.prompts import load_prompt
from app.ai.style_learner import get_style_profile_text


async def generate_reply(
    sender: str, subject: str, body: str, context: str = "", tone: str = "Professional",
) -> dict:
    provider = get_provider()
    prompt = load_prompt("reply").format(
        style_profile=get_style_profile_text(),
        tone=tone,
        sender=sender,
        subject=subject,
        body=body[:6000],
        context=context or "None available.",
    )
    result = await provider.complete_json(prompt)

    result.setdefault("reply_subject", f"Re: {subject}")
    result.setdefault("reply_body", "")
    result.setdefault("confidence", 0)
    result.setdefault("reasoning", "")

    conf = result["confidence"]
    result["confidence"] = max(0, min(100, int(conf))) if isinstance(conf, (int, float)) else 0
    return result
