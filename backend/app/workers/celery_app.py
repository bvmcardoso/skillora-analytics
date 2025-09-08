from celery import Celery

from app.core.config import settings

"""
Celery application configuration for Skillora workers.

This module initializes and configures the Celery application used to run
asynchronous background tasks (e.g., file processing, analytics pipelines).
It uses Redis as both the broker and result backend.

Attributes:
    celery (Celery): The configured Celery instance with Redis as broker/backend.

Celery Configuration:
    - task_track_started: Track when tasks are started (not just queued/finished).
    - task_serializer: Serializer used when sending tasks (JSON).
    - result_serializer: Serializer used for task results (JSON).
    - accept_content: Accepted content types (only JSON).
    - worker_prefetch_multiplier: Controls how many tasks a worker prefetches
      (set to 1 for smoother load balancing on large files).
    - include: List of modules where tasks are defined.
    - task_default_queue: Default queue name for tasks.
"""

celery = Celery(
    "skillora",
    broker=f"redis://{settings.redis_host}:{settings.redis_port}/0",
    backend=f"redis://{settings.redis_host}:{settings.redis_port}/0",
)

celery.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    worker_prefetch_multiplier=1,  # smoother process on large files
    include=["app.workers.tasks"],
    task_default_queue="celery",
)
