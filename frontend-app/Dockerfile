FROM node:20-bullseye

WORKDIR /app

COPY frontend-app/package*.json /app/

RUN npm ci

COPY frontend-app /app

ENV HOST=0.0.0.0 \
    PORT=5175

EXPOSE 5175

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
