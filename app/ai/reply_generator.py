import difflib
import re
from typing import Optional

from app.ai.provider import get_provider
from app.ai.prompts import load_prompt
from app.ai.style_learner import get_style_profile_text
from app.core.logger import log_event


SAFE_MAX_CONFIDENCE = 98

# Fraction (0-1) of text similarity between the generated reply and the
# incoming email body above which the reply is considered an echo/paraphrase
# rather than a genuine response. Tune this if real replies are being
# rejected too often (raise it) or echoes are slipping through (lower it).
SIMILARITY_THRESHOLD = 0.55

# Total number of generation attempts (1 normal + regenerations) before
# falling back to the safe reply.
MAX_REPLY_ATTEMPTS = 2

# Same limit used when truncating the body for the prompt, reused here so
# the similarity check compares against exactly what the model saw rather
# than the full (possibly longer) original body.
BODY_CHAR_LIMIT = 6000

STRICT_REGENERATION_SUFFIX = """

===========================
REGENERATION NOTICE
===========================

Your previous response was too similar to the incoming email — it repeated
or closely paraphrased the sender's own sentences instead of responding to
them. Write a genuinely different reply from the recipient's perspective.
Do not reuse the sender's wording. Acknowledge the message and state the
intended action in your own words only.
"""


def _safe_reply(subject: str) -> dict:
    return {
        "reply_subject": f"Re: {subject}",
        "reply_body": (
            "Thank you for your email.\n\n"
            "I've received your message and I'm reviewing it now. "
            "I'll get back to you shortly with an update.\n\n"
            "Regards,\n"
            "Syed"
        ),
        "confidence": 60,
        "reasoning": "Fallback reply generated because the AI response was incomplete.",
    }


def _normalize_for_comparison(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _similarity_ratio(reply_body: str, original_body: str) -> float:
    reply_norm = _normalize_for_comparison(reply_body)
    body_norm = _normalize_for_comparison(original_body)

    if not reply_norm or not body_norm:
        return 0.0

    return difflib.SequenceMatcher(None, reply_norm, body_norm).ratio()


async def _call_and_validate(provider, prompt: str, subject: str) -> Optional[dict]:
    """
    Calls the model and validates the shape of its response. Returns None
    (rather than a fallback reply) on any failure so the caller can decide
    whether to retry or fall back — this function only knows about
    validity, not about similarity or retry policy.
    """

    try:
        result = await provider.complete_json(prompt)

        if not isinstance(result, dict):
            raise ValueError("Model returned a non-dictionary response.")

    except Exception as exc:

        log_event(
            "reply_generator",
            f"Model call/validation failed: {repr(exc)}",
            level="error",
        )

        return None

    reply_subject = result.get("reply_subject")
    reply_body = result.get("reply_body")
    confidence = result.get("confidence")
    reasoning = result.get("reasoning")

    if not isinstance(reply_subject, str) or not reply_subject.strip():
        reply_subject = f"Re: {subject}"

    if not reply_subject.lower().startswith("re:"):
        reply_subject = f"Re: {reply_subject}"

    if not isinstance(reply_body, str) or len(reply_body.strip()) < 20:

        log_event(
            "reply_generator",
            "Model returned missing or too-short reply_body.",
            level="warning",
        )

        return None

    try:
        confidence = int(confidence)
    except Exception:
        confidence = 75

    confidence = max(0, min(confidence, SAFE_MAX_CONFIDENCE))

    if not isinstance(reasoning, str) or not reasoning.strip():
        reasoning = "AI-generated reply."

    return {
        "reply_subject": reply_subject.strip(),
        "reply_body": reply_body.strip(),
        "confidence": confidence,
        "reasoning": reasoning.strip(),
    }


async def generate_reply(
    sender: str,
    subject: str,
    body: str,
    context: str = "",
    tone: str = "Professional",
) -> dict:

    provider = get_provider()

    body_for_generation = body[:BODY_CHAR_LIMIT]

    base_prompt = load_prompt("reply").format(
        style_profile=get_style_profile_text(),
        tone=tone,
        sender=sender,
        subject=subject,
        body=body_for_generation,
        context=context or "None available.",
    )

    for attempt in range(1, MAX_REPLY_ATTEMPTS + 1):

        prompt = (
            base_prompt
            if attempt == 1
            else base_prompt + STRICT_REGENERATION_SUFFIX
        )

        log_event(
            "reply_generator",
            f"Attempt {attempt}/{MAX_REPLY_ATTEMPTS} for '{subject}'",
            level="info",
        )

        validated = await _call_and_validate(provider, prompt, subject)

        if validated is None:

            log_event(
                "reply_generator",
                f"Attempt {attempt} produced invalid/malformed output.",
                level="warning",
            )

            if attempt == MAX_REPLY_ATTEMPTS:

                log_event(
                    "reply_generator",
                    f"All attempts invalid for '{subject}'. Returning safe fallback reply.",
                    level="warning",
                )

                return _safe_reply(subject)

            continue

        # Compare against the same truncated body the model actually saw.
        ratio = _similarity_ratio(validated["reply_body"], body_for_generation)

        log_event(
            "reply_generator",
            f"Attempt {attempt} similarity={ratio:.2f} threshold={SIMILARITY_THRESHOLD}",
            level="info",
        )

        if ratio < SIMILARITY_THRESHOLD:
            return validated

        log_event(
            "reply_generator",
            f"Similarity {ratio:.2f} exceeded threshold {SIMILARITY_THRESHOLD} "
            f"on attempt {attempt} for '{subject}'; echo/paraphrase suspected.",
            level="warning",
        )

        if attempt == MAX_REPLY_ATTEMPTS:

            log_event(
                "reply_generator",
                f"Reply for '{subject}' still too similar after "
                f"{MAX_REPLY_ATTEMPTS} attempts. Returning safe fallback reply.",
                level="warning",
            )

            return _safe_reply(subject)

    # Unreachable, but keeps the function's return type honest.
    return _safe_reply(subject)
