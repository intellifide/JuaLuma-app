FROM node:20-bullseye AS build

WORKDIR /app

COPY support-portal/package*.json ./
RUN npm ci

COPY support-portal/ ./

ARG VITE_GCP_API_KEY
ARG VITE_API_BASE_URL

RUN if [ -z "${VITE_GCP_API_KEY}" ]; then echo "FATAL: VITE_GCP_API_KEY build-arg is required." >&2; exit 1; fi

ENV VITE_GCP_API_KEY="${VITE_GCP_API_KEY}"
ENV VITE_API_BASE_URL="${VITE_API_BASE_URL}"

RUN npm run build

FROM nginx:1.27-alpine

COPY scripts/docker/nginx_spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
