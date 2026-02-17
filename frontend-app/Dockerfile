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

COPY scripts/docker/nginx_spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
