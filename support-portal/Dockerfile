FROM node:20-bullseye

WORKDIR /app

# Copy package files from the support-portal directory
COPY support-portal/package*.json ./

RUN npm ci

# Copy the rest of the support-portal code
COPY support-portal .

ENV HOST=0.0.0.0 \
    PORT=5176

EXPOSE 5176

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5176"]
