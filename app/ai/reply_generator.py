from app.ai.provider import get_provider
from app.ai.prompts import load_prompt
from app.ai.style_learner import get_style_profile_text


async def generate_reply(
    sender: str,
    subject: str,
    body: str,
    context: str = "",
    tone: str = "Professional",
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

    reply_subject = str(result.get("reply_subject", "")).strip()
    reply_body = str(result.get("reply_body", "")).strip()
    reasoning = str(result.get("reasoning", "")).strip()

    if not reply_subject:
        reply_subject = f"Re: {subject}"

    confidence = result.get("confidence", 85)

    try:
        confidence = int(confidence)
    except Exception:
        confidence = 85

    confidence = max(0, min(confidence, 98))

    incoming = body.strip().lower()
    outgoing = reply_body.lower()

    # Reject replies that simply echo the incoming email.
    if outgoing and (
        outgoing == incoming
        or outgoing in incoming
        or incoming in outgoing
    ):
        reply_body = (
            "Thank you for your email.\n\n"
            "I've received your message and will review it shortly. "
            "I'll get back to you as soon as possible.\n\n"
            "Best regards,"
        )
        confidence = min(confidence, 75)
        reasoning = (
            "Model attempted to repeat the incoming email. "
            "A safe fallback reply was generated."
        )

    return {
        "reply_subject": reply_subject,
        "reply_body": reply_body,
        "confidence": confidence,
        "reasoning": reasoning,
    }
