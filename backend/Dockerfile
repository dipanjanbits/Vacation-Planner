FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    pkg-config \
    libssl-dev \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install deps
RUN uv sync --no-dev --frozen

# Copy application code
COPY src/ src/
COPY backend/ backend/
COPY knowledge/ knowledge/

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI with uvicorn
ENTRYPOINT ["uv", "run", "uvicorn", "backend.app:app", \
    "--host", "0.0.0.0", \
    "--port", "8000"]
