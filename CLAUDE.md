# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All services run in Docker. The backend linting and formatting commands must run inside the container via `docker compose exec`.

```bash
# Start all services (builds if needed)
make up

# Apply DB migrations
make migrate-up

# Create a new migration
make migrate-create name="describe_change"
```

**Testing**
```bash
# Run all tests (backend + frontend)
make test

# Backend only
make test-backend

# By mark
make test-unit        # @pytest.mark.unit — no I/O
make test-integration # @pytest.mark.integration — filesystem/db/network

# Single test (run from backend/)
cd backend && pytest tests/unit/api/test_health.py::test_name -vv

# Frontend
make test-frontend
```

**Linting & formatting**
```bash
make lint-backend    # Ruff + Black check (inside container)
make fmt-backend     # Autoformat with Black + Ruff (inside container)
make lint-frontend   # ESLint
make typecheck-frontend
```

## Architecture

### Request → Background → DB flow

1. **Upload** (`POST /api/jobs/ingest/upload`) — saves the file to `/data/uploads/`, returns a `file_id`.
2. **Map** (`POST /api/jobs/ingest/map`) — client submits `{file_id, column_map}`, which queues a Celery task and returns a `task_id`.
3. **Worker** (`process_file` task in `app/workers/tasks.py`) — loads file into a DataFrame, normalizes it, inserts into PostgreSQL in 1 000-row chunks, emitting `PROGRESS` state updates after each chunk.
4. **Poll** (`GET /api/jobs/ingest/tasks/{task_id}`) — returns Celery state (`PENDING → STARTED → PROGRESS → SUCCESS/FAILURE`) and result payload.

### Two separate SQLAlchemy engines

- **API layer** (`app/infrastructure/db.py`): async engine using `asyncpg` driver (`postgresql+asyncpg://`). All FastAPI route handlers use `AsyncSession` via the `get_db` dependency.
- **Worker layer** (`app/workers/tasks.py`): sync engine created inline using `psycopg` driver (`postgresql+psycopg://`). Workers cannot use the async engine because Celery runs in a synchronous context.

### Domain layout

```
backend/app/
├── core/           # Settings (pydantic-settings, .env)
├── infrastructure/ # Async SQLAlchemy engine + session dependency
├── jobs/           # Ingestion endpoints, analytics queries, Job ORM model
├── users/          # JWT auth (OAuth2PasswordRequestForm, bcrypt)
├── workers/        # celery_app.py (Redis broker+backend) + tasks.py
└── migrations/     # Alembic (uses sync engine)
```

### Frontend

React + Vite SPA at `frontend/src/`. In dev, API calls are proxied through the Vite dev server to the backend (configured via `BACKEND_URL` in docker-compose, defaults to `http://localhost:8090` for local non-Docker use). For production builds, set `VITE_API_BASE` to the absolute API URL. The ingestion UI follows the two-step upload → column-map flow, then polls task status.

### Observability (in progress)

Prometheus + Grafana services are defined in `docker-compose.yml` but commented out. The `observability/prometheus/` config and `infra/terraform/` exist but are not yet wired into the main stack. `prometheus_fastapi_instrumentator` is already initialised in `app/main.py`.

### Test setup

- `backend/tests/conftest.py` provides a `client` fixture (FastAPI `TestClient`, session-scoped).
- `pytest.ini`: `asyncio_mode = auto`, marks `unit` and `integration`.
- Integration tests touch the filesystem or a live database; unit tests must be pure/no-I/O.
