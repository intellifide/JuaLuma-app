FROM node:20-bullseye AS build

WORKDIR /app

COPY frontend-app/package*.json ./
RUN npm ci

COPY frontend-app/ ./

# Build-time env for Vite. Required so Identity Platform sign-up/sign-in work.
ARG VITE_GCP_API_KEY
ARG VITE_API_BASE_URL
ARG VITE_MARKETING_URL
ARG VITE_MAINTENANCE_MODE

RUN if [ -z "${VITE_GCP_API_KEY}" ]; then echo "FATAL: VITE_GCP_API_KEY build-arg is required." >&2; exit 1; fi

ENV VITE_GCP_API_KEY="${VITE_GCP_API_KEY}"
ENV VITE_API_BASE_URL="${VITE_API_BASE_URL}"
ENV VITE_MARKETING_URL="${VITE_MARKETING_URL}"
ENV VITE_MAINTENANCE_MODE="${VITE_MAINTENANCE_MODE}"

RUN npm run build

FROM nginx:1.27-alpine

# Used by nginx template envsubst: `${DOLLAR}host` -> `$host` (nginx var).
# IMPORTANT: DOLLAR must expand to a single '$' so nginx variables like $uri work.
ENV DOLLAR="$"
ENV API_UPSTREAM="http://backend:8001"
ENV API_UPSTREAM_HOST="backend"

# Use nginx's built-in envsubst entrypoint support (templates -> conf.d at runtime)
# so Cloud Run can set API_UPSTREAM without rebuilding the image.
COPY scripts/docker/nginx_spa.conf.template /etc/nginx/templates/default.conf.template
# Copy build output contents into the web root (avoid nesting under /dist).
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
