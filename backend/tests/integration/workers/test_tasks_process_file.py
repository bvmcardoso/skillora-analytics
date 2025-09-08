import importlib
import sys
from pathlib import Path
from types import SimpleNamespace

import pandas as pd
import pytest

pytestmark = pytest.mark.integration


def import_tasks_with_noop_celery(monkeypatch: pytest.MonkeyPatch, env: dict[str, str]):
    """Import tasks with env overrides and a no-op Celery decorator."""

    class _NoopCelery:
        def task(self, *args, **kwargs):
            def _decorator(fn):
                return fn

            return _decorator

    for k, v in env.items():
        monkeypatch.setenv(k, v)

    sys.modules["app.workers.celery_app"] = SimpleNamespace(celery=_NoopCelery())
    sys.modules.pop("app.core.config", None)
    sys.modules.pop("app.workers.tasks", None)

    tasks = importlib.import_module("app.workers.tasks")
    importlib.reload(tasks)
    return tasks


class FakeSession:
    """Minimal SQLAlchemy Session stub."""

    def __init__(self, engine):
        self.engine = engine
        self.saved = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def bulk_save_objects(self, objs):
        self.saved.extend(objs)

    def commit(self):
        pass


class DummyJob:
    """Simple model stub."""

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def setup_tasks_for_test(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    tasks = import_tasks_with_noop_celery(
        monkeypatch,
        {
            "UPLOAD_DIR": str(tmp_path),
            "ALEMBIC_DATABASE_URL": "sqlite:///:memory:",
        },
    )
    monkeypatch.setattr(tasks, "create_engine", lambda *a, **k: object(), raising=True)
    monkeypatch.setattr(
        tasks, "Session", lambda engine: FakeSession(engine), raising=True
    )
    monkeypatch.setattr(tasks, "Job", DummyJob, raising=True)
    return tasks


def test_process_file_missing_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    tasks = setup_tasks_for_test(tmp_path, monkeypatch)
    res = tasks.process_file(
        file_id="does_not_exist.csv", column_map={"title": "Title"}
    )
    assert res["file_id"] == "does_not_exist.csv"
    assert res["error"] == "file not found"


def test_process_file_invalid_mapping(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    tasks = setup_tasks_for_test(tmp_path, monkeypatch)
    p = tmp_path / "data.csv"
    pd.DataFrame({"WrongA": ["x"], "WrongB": ["y"]}).to_csv(p, index=False)
    res = tasks.process_file(
        file_id="data.csv", column_map={"title": "Title", "salary": "Salary"}
    )
    assert res["error"] == "invalid mapping"
    assert set(res["columns"]) == {"WrongA", "WrongB"}


def test_process_file_normalization_empty(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    tasks = setup_tasks_for_test(tmp_path, monkeypatch)
    p = tmp_path / "data.csv"
    pd.DataFrame(
        {
            "JobTitle": ["Dev"],
            "Pay": ["NaNish"],
            "Currency": [""],
            "Country": ["BR"],
            "Seniority": ["Senior"],
            "Stack": ["Python"],
        }
    ).to_csv(p, index=False)

    column_map = {
        "title": "JobTitle",
        "salary": "Pay",
        "currency": "Currency",
        "country": "Country",
        "seniority": "Seniority",
        "stack": "Stack",
    }
    res = tasks.process_file(file_id="data.csv", column_map=column_map)
    assert res["inserted"] == 0
    assert "no valid rows" in res["note"]


def test_process_file_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    tasks = setup_tasks_for_test(tmp_path, monkeypatch)
    p = tmp_path / "data.csv"
    pd.DataFrame(
        {
            "JobTitle": ["Sr Dev", "Mid Dev", "Associate Dev"],
            "Pay": ["15000", "12000", "xpto"],
            "Currency": ["", "USD", None],
            "Country": [" BR ", "US ", "BR"],
            "Seniority": [" Senior ", "Mid", "Associate"],
            "Stack": [" Python ", "Node", "Go"],
        }
    ).to_csv(p, index=False)

    column_map = {
        "title": "JobTitle",
        "salary": "Pay",
        "currency": "Currency",
        "country": "Country",
        "seniority": "Seniority",
        "stack": "Stack",
    }

    res = tasks.process_file(file_id="data.csv", column_map=column_map)
    assert res["file_id"] == "data.csv"
    assert res["inserted"] == 2
    assert isinstance(res["sample"], list)
    assert len(res["sample"]) <= 3
    assert res["sample"][0]["currency"] == "USD"
