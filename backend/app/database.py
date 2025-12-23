"""
SQLite database setup and CRUD operations for Fizikl
"""

import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import SurveyAnswers, Summary, SurveyRecord

# Database file path
DB_PATH = Path("/app/data/fizikl.db")

# For local development, use relative path
if not DB_PATH.parent.exists():
    DB_PATH = Path(__file__).parent.parent / "data" / "fizikl.db"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """Get database connection with row factory"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database schema"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS surveys (
            id TEXT PRIMARY KEY,
            answers JSON NOT NULL,
            results JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create index for faster lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_surveys_created_at
        ON surveys(created_at DESC)
    """)

    conn.commit()
    conn.close()


def save_survey(
    answers: SurveyAnswers,
    results: Summary
) -> str:
    """
    Save survey answers and results to database.
    Returns the generated survey ID.
    """
    survey_id = str(uuid.uuid4())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO surveys (id, answers, results, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            survey_id,
            answers.model_dump_json(),
            results.model_dump_json(),
            datetime.utcnow().isoformat()
        )
    )

    conn.commit()
    conn.close()

    return survey_id


def get_survey(survey_id: str) -> Optional[SurveyRecord]:
    """
    Get survey by ID.
    Returns None if not found.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, answers, results, created_at FROM surveys WHERE id = ?",
        (survey_id,)
    )

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    return SurveyRecord(
        id=row["id"],
        answers=SurveyAnswers.model_validate_json(row["answers"]),
        results=Summary.model_validate_json(row["results"]),
        created_at=datetime.fromisoformat(row["created_at"])
    )


def get_recent_surveys(limit: int = 10) -> list[SurveyRecord]:
    """Get most recent surveys"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, answers, results, created_at
        FROM surveys
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (limit,)
    )

    rows = cursor.fetchall()
    conn.close()

    return [
        SurveyRecord(
            id=row["id"],
            answers=SurveyAnswers.model_validate_json(row["answers"]),
            results=Summary.model_validate_json(row["results"]),
            created_at=datetime.fromisoformat(row["created_at"])
        )
        for row in rows
    ]


# Initialize database on module import
init_db()
