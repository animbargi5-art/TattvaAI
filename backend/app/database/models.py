from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import JSON

from sqlalchemy.orm import declarative_base

from datetime import datetime


Base = declarative_base()


class Investigation(Base):

    __tablename__ = "investigations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    incident_id = Column(
        String,
        nullable=False
    )

    title = Column(
        String,
        nullable=False
    )

    severity = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        nullable=False
    )

    confidence = Column(
        Integer,
        nullable=False
    )

    report = Column(
        JSON,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class ReviewRecord(Base):
    """
    Persistent audit record of human review decisions.
    """

    __tablename__ = "review_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    review_id = Column(
        String,
        index=True,
        nullable=False
    )

    investigation_id = Column(
        String,
        index=True,
        nullable=False
    )

    old_status = Column(
        String,
        nullable=False,
        default="PENDING_REVIEW"
    )

    new_status = Column(
        String,
        nullable=False
    )

    selected_hypothesis = Column(
        String,
        nullable=True
    )

    reviewer_notes = Column(
        String,
        nullable=True
    )

    reviewer_identifier = Column(
        String,
        nullable=True
    )

    resolution_summary = Column(
        String,
        nullable=True
    )

    recommendation_decisions = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )