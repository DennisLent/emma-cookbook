FROM python:3.11-slim

ARG APP_VERSION=dev
ARG APP_GIT_SHA=local

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_VERSION=${APP_VERSION}
ENV APP_GIT_SHA=${APP_GIT_SHA}

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN apt-get update && apt-get install -y build-essential libpq-dev ffmpeg netcat-openbsd && \
    pip install --no-cache-dir -r /app/requirements.txt && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY backend /app/
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
