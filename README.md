# Skillora Analytics (Jobs)
**Asynchronous Data Processing Platform** — Upload, process, and analyze **250k+ job salary records in seconds** with a fully-typed FastAPI + Celery architecture.

[![CI](https://github.com/bvmcardoso/skillora/actions/workflows/ci.yml/badge.svg)](https://github.com/bvmcardoso/skillora/actions)
[![Docker](https://img.shields.io/badge/docker-compose-blue?logo=docker)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react)](https://react.dev/)
[![CI/CD](https://img.shields.io/badge/CI/CD-GitHub%20Actions-black?logo=githubactions)](https://github.com/bvmcardoso/skillora/actions)

## 🎥 Live Demo
[▶️ Watch the demo video](https://www.linkedin.com/feed/update/urn:li:activity:7371158653967519744/)


## Overview
**Skillora Analytics** simulates a real-world SaaS data pipeline.  
It ingests large datasets asynchronously, orchestrates background jobs via **Celery + Redis**, stores structured data in **PostgreSQL**, and exposes typed analytics APIs consumed by a **React + Vite** dashboard.

This project showcases architecture design, system orchestration, and CI/CD automation — built to demonstrate senior-level backend reasoning and full-stack delivery.

---

## ⚡ Highlights
✅ **250k+ rows** processed in under **5 seconds** (async ingestion pipeline)  
✅ **Real background tasks** with Celery workers and Redis broker  
✅ **Fully typed backend** (Pydantic v2 + FastAPI async endpoints)  
✅ **CI/CD pipeline** (Ruff + Black + Pytest + Vitest + Vite build)  
✅ **Production-ready architecture**, modular and extensible  



## Architecture Diagram

            ┌────────────────────┐
 CSV/XLSX ─▶│     FastAPI API    │
            └─────────┬──────────┘
                      │
                      ▼
            ┌────────────────────┐
            │     Redis Queue     │
            └─────────┬──────────┘
                      │
                      ▼
            ┌────────────────────┐
            │    Celery Worker    │
            └─────────┬──────────┘
                      │
                      ▼
            ┌────────────────────┐
            │     Postgres DB     │
            └─────────┬──────────┘
                      │
                      ▼
            ┌────────────────────┐
            │   Analytics APIs    │
            └─────────┬──────────┘
                      │
                      ▼
            ┌────────────────────┐
            │  React Dashboard    │
            └────────────────────┘


## Quick start

```bash
# 1) Start everything (backend, db, redis, worker, frontend)
make up

# 2) Apply database migrations
make migrate-up

# 3) Run tests (Both Backend and Frontend)
make test
```

- API: http://localhost:8080 (docs at `/docs`)  
- Frontend: http://localhost:5173

---

## Project layout

### Backend Folder Structure(Detailed)

**The backend is organized widh clear separation of concerns** 

- **core** → runtime settings, environment variables, CORS, feature flags  
- **infrastructure** → database engine, session management, common dependencies  
- **users / jobs** → domain modules (models, routers, schemas, services)  
- **workers** → Celery app and background tasks (file ingestion, analytics)  
- **tests** → unit tests, integration tests  
- **migrations** → Alembic versioned schema migrations  

#### Short overview (at a glance)
```text
backend/
├─ app/{core,infrastructure,users,jobs,workers,migrations}
├─ tests/{unit,integration}
├─ sample_data/
└─ {alembic.ini,pytest.ini,requirements.txt,ruff.toml}
```

### Frontend Folder Structure(Detailed)
**The frontend is built with React + Vite + TypeScript.  
Clear separation between components, pages, layout, styles, and utilities** 

- **components** → reusable UI blocks (button, upload form, progress/status)  
- **pages** → top-level routes (Dashboard, Upload Wizard)  
- **layout** → application shell and layout elements  
- **lib** → API client, environment helpers, formatters, polling utilities  
- **styles** → SCSS tokens, themes, and global styles  
- **test** → testing setup (Vitest + React Testing Library)  

#### Short overview (at a glance)
```
frontend/
├─ src/{components,pages,layout,lib,styles,test}
├─ public/
├─ {index.html,vite.config.ts,vitest.config.ts,tsconfig*.json,eslint.config.js}
└─ {package.json,package-lock.json}
```

## **Tooling & CI (repo root):** ##

 `docker-compose.yml`, `Makefile`, `.github/workflows/ci.yml`.  
> See the full **[CI/CD](#CI/CD)** section below.



## Environment

### Backend (`backend/.env.example`)
```
APP_NAME=skillora
ENVIRONMENT=development
DEBUG=True

DB_NAME=skillora
DB_USER=user
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432

DATABASE_URL=postgresql+asyncpg://user:password@db:5432/skillora
ALEMBIC_DATABASE_URL=postgresql+psycopg://user:password@db:5432/skillora

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379/0
UPLOAD_DIR=/data/uploads

PYTHONPATH=/app

SECRET_KEY=my_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

```

### Frontend (`frontend/.env.example`)
```
VITE_API_BASE=http://localhost:8080
```

---

## How it works (MVP flow)

1. **Upload** a CSV/XLSX  
2. **Map** your file headers to the canonical schema  
3. **Worker** parses & inserts rows into `jobs`  
4. **Query** analytics endpoints via API or frontend dashboard

### Canonical columns
- `title` (string)  
- `salary` (float, USD)  
- `currency` (default USD)  
- `country` (string)  
- `seniority` (string)  
- `stack` (comma-separated stack)

---

## Using the APIs

### Upload file
```bash
curl -F "file=@backend/sample_data/jobs_dataset_reference.csv"   http://localhost:8080/api/jobs/ingest/upload
```

### Map columns
```bash
curl -X POST http://localhost:8080/api/jobs/ingest/map   -H "Content-Type: application/json"   -d '{
    "file_id": "<uuid>.csv",
    "column_map": {
      "title": "job_title",
      "salary": "compensation",
      "currency": "currency",
      "country": "country",
      "seniority": "seniority",
      "stack": "stack"
    }
  }'
```

### Task status
```bash
curl http://localhost:8080/api/jobs/ingest/tasks/<task_id>
```

### Analytics
```bash
curl "http://localhost:8080/api/jobs/analytics/salary/summary?title=Engineer&country=USA"
curl "http://localhost:8080/api/jobs/analytics/stack/compare?title=Engineer"
```

---

## Makefile shortcuts

```bash
make up              # build & start all services
make down            # stop services
make exec            # shell into backend
make psql            # postgres shell
make logs            # tail backend logs

make migrate-create name="add_table"  # create migration
make migrate-up                       # apply migrations
make test                             # run backend+frontend tests
make ci-local                         # run full local CI pipeline
```

---

## CI/CD

- **GitHub Actions** workflow runs:
  - Ruff + Black (lint backend)
  - ESLint + TypeScript (lint/typecheck frontend)
  - Pytest (backend tests)
  - Vitest (frontend tests)
  - Vite build (frontend build)
---

## Appendix

### Full Backend tree 

```
backend/
├── alembic.ini
├── pytest.ini
├── requirements.txt
├── ruff.toml
├── sample_data/
│   └── jobs_dataset_reference.csv
├── tests/
│   ├── unit/
│   │   ├── api/
│   │   └── workers/
│   └── integration/
│       └── workers/
└── app/
    ├── main.py
    ├── core/
    │   └── config.py
    ├── infrastructure/
    │   ├── db.py
    │   └── __init__.py
    ├── users/
    │   ├── auth.py
    │   ├── models.py
    │   ├── router.py
    │   ├── schemas.py
    │   └── services.py
    ├── jobs/
    │   ├── models.py
    │   ├── router.py
    │   └── schemas.py
    ├── workers/
    │   ├── celery_app.py
    │   └── tasks.py
    └── migrations/
        ├── env.py
        ├── README
        ├── script.py.mako
        └── versions/

```

### Full Frontend tree

```
frontend/
├── dist/                        # Production build output
│   ├── index.html
│   ├── analytics.svg
│   └── assets/                  # Bundled JS/CSS/images
├── public/                      # Static assets (served as-is)
│   └── analytics.svg
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component
│   ├── components/              # Reusable building blocks
│   │   ├── Button/
│   │   ├── ColumnMapForm/
│   │   ├── FileUpload/
│   │   ├── Metric/
│   │   ├── TaskProgress/
│   │   └── TaskStatus/
│   ├── pages/                   # Route-level views
│   │   ├── Dashboard/
│   │   └── UploadWizard/
│   ├── layout/                  # App shell and wrappers
│   │   ├── AppShell.module.scss
│   │   └── AppShell.tsx
│   ├── lib/                     # Utilities & API client
│   │   ├── api.ts
│   │   ├── api.test.ts
│   │   ├── env.ts
│   │   ├── format.ts
│   │   └── poll.ts
│   ├── styles/                  # Global styles & tokens
│   │   ├── base.scss
│   │   ├── layout.scss
│   │   ├── themes.scss
│   │   └── tokens.scss
│   ├── test/
│   │   └── setupTests.ts        # Vitest/RTL setup
│   └── vite-env.d.ts            # Vite type declarations
├── index.html
├── eslint.config.js             # ESLint configuration
├── vite.config.ts               # Vite config
├── vitest.config.ts             # Vitest config
├── tsconfig.json                # TypeScript base config
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
├── package-lock.json
└── README.md
```



## Notes

- `data/uploads/` is runtime storage, not versioned  
- Celery worker consumes upload tasks from Redis  
- Frontend flow: upload → map → status → dashboard  
- Sample data under `sample_data/` is **synthetic and for demo only** — not real salaries  
- Demonstrates a full-stack MVP with typed APIs and automated CI/CD pipeline
