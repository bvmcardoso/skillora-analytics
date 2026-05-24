FROM python:3.11-slim

# Basic hardening and speed:
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Minimal build dependencies:
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Non root runtime user:
RUN useradd -u 10001 -m appuser

WORKDIR /app

# Dependencies installation:
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# App code
COPY backend /app

# Prepare data directory (Will be overridden by a volume; entrypoint will fix permission issues)
RUN mkdir -p /data/uploads && chown -R appuser:appuser /data /app

# Expose API port:
EXPOSE 8000

# Run as root only for the entrypoint to adjust ownership when volumes are mounted
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
