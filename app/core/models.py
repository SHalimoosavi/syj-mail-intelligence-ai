from datetime import datetime
from app.core.time_utils import utcnow
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True)
    gmail_id = Column(String, unique=True, index=True, nullable=False)
    thread_id = Column(String, index=True)
    sender = Column(String, index=True)
    recipients = Column(Text)
    subject = Column(Text)
    body_text = Column(Text)
    body_html = Column(Text)
    has_attachments = Column(Boolean, default=False)
    received_at = Column(DateTime, default=utcnow)

    category = Column(String, index=True)
    priority = Column(String)
    classification_confidence = Column(Integer)
    classification_reason = Column(Text)

    importance_score = Column(Integer, index=True)
    importance_reason = Column(Text)
    deadline_detected = Column(String, nullable=True)

    processed = Column(Boolean, default=False)
    auto_action = Column(String, nullable=True)  # archive / ignore / notify_immediately / etc.

    # Set when classification, importance scoring, summarization, or reply
    # generation failed and fell back to safe defaults (see
    # app/workflows/pipeline.py). Surfaced in the dashboard so these emails
    # get a human look instead of silently sitting under a wrong/default
    # category forever.
    needs_manual_review = Column(Boolean, default=False, index=True)
    ai_error_detail = Column(Text, nullable=True)

    summaries = relationship("Summary", back_populates="email", uselist=False)
    drafts = relationship("Draft", back_populates="email")
    notifications = relationship("Notification", back_populates="email")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True)
    email_id = Column(Integer, ForeignKey("emails.id"))
    one_line = Column(Text)
    short = Column(Text)
    detailed = Column(Text)
    action_items = Column(JSON, default=list)
    deadlines = Column(JSON, default=list)
    requested_tasks = Column(JSON, default=list)

    email = relationship("Email", back_populates="summaries")


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True)
    email_id = Column(Integer, ForeignKey("emails.id"))
    tone = Column(String)
    reply_subject = Column(Text)
    reply_body = Column(Text)
    confidence = Column(Integer)
    reasoning = Column(Text)
    status = Column(String, default="pending")  # pending / approved / rejected / auto_sent / sent
    created_at = Column(DateTime, default=utcnow)
    sent_at = Column(DateTime, nullable=True)

    email = relationship("Email", back_populates="drafts")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    email_id = Column(Integer, ForeignKey("emails.id"))
    channel = Column(String, default="telegram")
    payload = Column(Text)
    sent_at = Column(DateTime, default=utcnow)
    delivered = Column(Boolean, default=False)

    email = relationship("Email", back_populates="notifications")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True)
    email_address = Column(String, unique=True, index=True)
    display_name = Column(String, nullable=True)
    message_count = Column(Integer, default=0)
    last_contacted_at = Column(DateTime, nullable=True)
    is_client = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)


class StyleProfile(Base):
    """Single-row table (Phase 1, single user) holding the learned writing style."""
    __tablename__ = "style_profile"

    id = Column(Integer, primary_key=True)
    avg_length_words = Column(Integer, default=0)
    common_greetings = Column(JSON, default=list)
    common_closings = Column(JSON, default=list)
    signature = Column(Text, nullable=True)
    vocabulary_notes = Column(Text, nullable=True)
    sample_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utcnow)


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True)
    level = Column(String, default="info")
    source = Column(String)  # e.g. "classifier", "poller", "reply_generator"
    message = Column(Text)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
