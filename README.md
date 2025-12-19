# Skillora Analytics (Jobs)
**Asynchronous Data Processing Platform** — Upload, process, and analyze **250k+ job salary records in seconds** with a fully-typed FastAPI + Celery architecture.

This project is intentionally designed as a **production-oriented backend system**, focusing on scalability, operability, and long-term evolution rather than demo-level simplicity.

---

## 🎯 What This Project Demonstrates (at a glance)

- Designing **high-throughput async ingestion pipelines**
- Operating **distributed background workers** safely
- Making **explicit architectural trade-offs**
- Building systems that are **ready for real production constraints**
- Laying foundations for **AI/LLM-powered enrichment pipelines**

---

## 🎥 Live Demo
[▶️ Watch the demo video](https://www.linkedin.com/feed/update/urn:li:activity:7371158653967519744/)

---

## Overview

**Skillora Analytics** simulates a real-world SaaS data platform.

It ingests large CSV/XLSX datasets asynchronously, orchestrates background processing via **Celery + Redis**, persists structured data in **PostgreSQL**, and exposes typed analytics APIs consumed by a **React + Vite** dashboard.

The primary goal is to showcase **senior-level backend reasoning**: async workflows, system boundaries, failure handling, and production readiness.

---

## ⚡ Highlights

- **250k+ rows** processed in under **5 seconds** using async ingestion
- **Non-blocking API layer** decoupled from heavy background workloads
- **Real background jobs** with task tracking and retries
- **Fully typed backend** (FastAPI + Pydantic v2)
- **CI/CD pipeline** (lint, test, build for backend & frontend)
- **Modular architecture** designed for long-term evolution

---

## System Architecture

```text
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
                │    Celery Workers   │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │     PostgreSQL     │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │   Analytics APIs   │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │  React Dashboard   │
                └────────────────────┘
```

---

## Engineering Decisions & Trade-offs

### Why asynchronous ingestion
- Uploaded files may contain **hundreds of thousands of rows**
- Synchronous ingestion would block API workers and degrade latency
- Background processing enables **controlled concurrency** and horizontal scaling

### Task execution & reliability
- Ingestion jobs are **idempotent** to prevent duplicate inserts
- Failures are **retry-safe**
- Task status is persisted and exposed via API for client-side polling

### Concurrency & throughput
- Worker concurrency is tunable independently from API traffic
- Redis acts as a buffer to absorb ingestion spikes
- Database writes are batched to reduce transaction overhead

---

## Failure Handling & Operability

- Explicit task lifecycle: **PENDING → RUNNING → SUCCESS / FAILED**
- Failed tasks can be retried without data corruption
- Clear separation between API concerns and background execution
- Architecture supports observability hooks (logs, metrics, traces)

---

## Scaling Considerations

This project intentionally avoids premature complexity, but is designed with scale in mind:

- Redis would eventually become a bottleneck for extreme ingestion bursts
- Message brokers like **Kafka or SQS** would be more appropriate at higher scale
- File storage would move from local volumes to **S3/GCS**
- Analytics queries would require **pre-aggregation or OLAP storage**

These trade-offs are documented to demonstrate **engineering awareness**, not implementation shortcuts.

---

## AI & Future Extensions

The architecture is designed to support **AI/LLM-powered enrichment stages**, such as:

- Job title normalization
- Seniority classification
- Stack inference from free-text descriptions
- Salary outlier detection

These steps can be implemented as **independent async workers** without impacting ingestion throughput or API latency.

---

## Local Development

```bash
# Start all services
make up

# Apply database migrations
make migrate-up

# Run backend + frontend tests
make test
```

- API: http://localhost:8080 (`/docs` for OpenAPI)
- Frontend: http://localhost:5173

---

## Backend Structure (high-level)

```text
backend/
├─ app/
│  ├─ core/            # config, settings, environment
│  ├─ infrastructure/ # database & shared deps
│  ├─ users/           # auth & user domain
│  ├─ jobs/            # ingestion & analytics domain
│  ├─ workers/         # Celery tasks
│  └─ migrations/
├─ tests/
│  ├─ unit/
│  └─ integration/
└─ sample_data/
```

---

## Frontend Structure (high-level)

```text
frontend/
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ layout/
│  ├─ lib/
│  └─ styles/
└─ test/
```

---

## CI/CD

GitHub Actions pipeline runs on every push:
- Ruff + Black (backend linting)
- Pytest (backend tests)
- ESLint + TypeScript checks (frontend)
- Vitest (frontend tests)
- Vite production build

---

## Final Notes

- Sample datasets are **synthetic**
- Focus is on **architecture clarity**, not UI polish
- This repository represents how I design **production-grade backend systems**
