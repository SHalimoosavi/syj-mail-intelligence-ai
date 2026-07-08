FROM python:3.12-slim

WORKDIR /app

# Only system deps actually needed: psycopg2 needs libpq at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/data

# Runs as non-root — token.json/credentials.json get mounted in with
# appropriate ownership by docker-compose (see volumes there)
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=3).raise_for_status()" || exit 1

# main.py runs the poller + API together (single container, Phase 1/2 scale).
# Swap to `uvicorn app.api.main:app --host 0.0.0.0 --port 8000` as the CMD
# if you split the poller into its own container later.
CMD ["python", "main.py"]
