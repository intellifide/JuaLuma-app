FROM node:20-bullseye

WORKDIR /app

COPY frontend-app/package*.json /app/

RUN npm ci

COPY frontend-app /app

# Build-time env for Vite. Required so Identity Platform sign-up/sign-in work. Build fails if key is missing.
ARG VITE_GCP_API_KEY
ARG VITE_API_BASE_URL
RUN if [ -z "${VITE_GCP_API_KEY}" ]; then echo "FATAL: VITE_GCP_API_KEY build-arg is required. Set it in deploy workflow (e.g. vars.VITE_GCP_API_KEY)." >&2; exit 1; fi && \
    echo "VITE_GCP_API_KEY=$VITE_GCP_API_KEY" > .env && \
    [ -n "$VITE_API_BASE_URL" ] && echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> .env || true
ENV VITE_ENV_DIR=.

COPY scripts/docker/ensure-node-modules.sh /usr/local/bin/ensure-node-modules
RUN chmod +x /usr/local/bin/ensure-node-modules

ENV HOST=0.0.0.0 \
    PORT=5175

EXPOSE 5175

ENTRYPOINT ["ensure-node-modules"]
CMD ["sh", "-c", "npm run build && npm run preview -- --host 0.0.0.0 --port 8080"]
