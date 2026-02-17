FROM node:20-bullseye AS build

WORKDIR /app

COPY frontend-marketing/package*.json ./
RUN npm ci

COPY frontend-marketing/ ./
RUN npm run build

FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY frontend-marketing/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./next.config.js

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "run", "start", "--", "-p", "8080", "-H", "0.0.0.0"]
