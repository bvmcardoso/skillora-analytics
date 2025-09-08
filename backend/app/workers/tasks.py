from pathlib import Path
from typing import Any, Dict, List, cast

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.jobs.models import Job
from app.workers.celery_app import celery

CANON: list[str] = ["title", "salary", "currency", "country", "seniority", "stack"]

"""
Celery tasks for file ingestion and processing.

This module defines the background task that loads uploaded CSV/XLSX files,
normalizes the data, and inserts valid records into the database. It also
provides helper functions for loading, cleaning, and tracking task progress.
"""


def _load_dataframe(path: Path) -> pd.DataFrame:
    """
    Load a DataFrame from the given file path.

    Supports CSV and Excel formats. Raises an error for unsupported file types.

    Args:
        path: Path to the file.

    Returns:
        A pandas DataFrame with the file contents.

    Raises:
        ValueError: If the file extension is not supported.
    """
    suf = path.suffix.lower()
    if suf == ".csv":
        return pd.read_csv(path)
    if suf in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    raise ValueError(f"Unsupported file type: {path.suffix}")


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and normalize a DataFrame according to the canonical schema.

    - Keeps only canonical columns.
    - Converts `salary` to numeric and drops invalid rows.
    - Strips whitespace and fills null values in text columns.
    - Ensures currency has a default fallback ("USD").

    Args:
        df: Input DataFrame.

    Returns:
        A cleaned DataFrame ready for insertion.
    """

    # keep only known columns
    cols: list[str] = [c for c in CANON if c in df.columns]
    df = cast(pd.DataFrame, df.loc[:, cols].copy())

    # basic cleaning
    if "salary" in df.columns:
        df["salary"] = pd.to_numeric(df["salary"], errors="coerce")
        df = cast(pd.DataFrame, df.loc[df["salary"].notna()].copy())

    for col in ("title", "country", "seniority", "stack", "currency"):
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()

    if "currency" in df.columns:
        df["currency"] = df["currency"].replace({None: "USD", "": "USD"}).fillna("USD")

    return df


def _update_state(self: Any | None, *, state: str, meta: dict) -> None:
    """
    Update Celery task state for progress tracking.

    This is a safe wrapper that skips updates when running in tests
    (self=None) or when the task instance does not support `update_state`.

    Args:
        self: Task instance when executed by Celery, None in tests.
        state: The state string (e.g., STARTED, PROGRESS).
        meta: A dictionary with metadata for progress reporting.
    """
    if self is not None and hasattr(self, "update_state"):
        try:
            self.update_state(state=state, meta=meta)
        except Exception:
            pass


@celery.task(name="process_file", bind=True)
def process_file(
    self: Any | None = None, file_id: str = "", column_map: dict | None = None
) -> dict:
    """
    Celery task: process an uploaded file and insert rows into the database.

    Workflow:
        1. Load file into a DataFrame (CSV/XLSX supported).
        2. Validate and rename columns based on `column_map`.
        3. Normalize the DataFrame (cleaning and default values).
        4. Insert records into the database in chunks with progress updates.
        5. Return a summary including file ID, inserted count, total rows, and sample records.

    Args:
        self: Celery task instance (injected automatically when bound).
        file_id: Name of the uploaded file in the upload directory.
        column_map: Mapping of canonical columns to source columns.

    Returns:
        A dictionary with:
            - file_id (str): The processed file ID.
            - inserted (int): Number of rows successfully inserted.
            - total (int): Total rows parsed after cleaning.
            - sample (list): First 3 records inserted for inspection.
            - error/note: Present if file not found, invalid mapping, or no valid rows.
    """
    uploads = Path(settings.upload_dir)
    path = uploads / file_id
    if not path.exists():
        return {"file_id": file_id, "error": "file not found"}

    # Load dataframe
    _update_state(self, state="STARTED", meta={"stage": "loading"})
    df = _load_dataframe(path)

    if not column_map:
        return {
            "file_id": file_id,
            "error": "invalid_mapping",
            "columns": list(df.columns),
        }

    # Validate/rename columns based on mapping
    rename_map: Dict[str, str] = {
        canon: src
        for canon, src in column_map.items()
        if canon in CANON and src in df.columns
    }
    if not rename_map:
        return {
            "file_id": file_id,
            "error": "invalid mapping",
            "columns": list(df.columns),
        }

    df = df.rename(columns={v: k for k, v in rename_map.items()})

    # Normalize and compute totals after cleaning
    df = _normalize(df)

    if df.empty:
        return {
            "file_id": file_id,
            "inserted": 0,
            "note": "no valid rows after normalization",
        }

    # Prepare records for chunked insert + progress tracking
    records: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], df.to_dict(orient="records")
    )
    total = len(records)
    processed = 0
    inserted = 0
    chunk_size = 1000

    # Using sync engine inside the worker
    engine = create_engine(
        settings.alembic_database_url, pool_pre_ping=True, future=True
    )

    # Chunked insert with progress updates
    with Session(engine) as session:
        for i in range(0, total, chunk_size):
            chunk = records[i : i + chunk_size]
            objs = [Job(**row) for row in chunk]
            session.bulk_save_objects(objs)
            session.commit()

            inserted += len(objs)
            processed = min(i + len(objs), total)
            percent = int(processed * 100 / max(total, 1))

            # Emit PROGRESS after each committed batch
            _update_state(
                self,
                state="PROGRESS",
                meta={"processed": processed, "total": total, "percent": percent},
            )

    # Final payload (SUCCESS will be inferred by Celery)
    return {
        "file_id": file_id,
        "inserted": inserted,
        "total": total,
        "sample": records[:3],
    }
