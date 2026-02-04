FROM node:20-bullseye

WORKDIR /app

COPY frontend-app/package*.json /app/

RUN npm ci

COPY frontend-app /app

COPY scripts/docker/ensure-node-modules.sh /usr/local/bin/ensure-node-modules
RUN chmod +x /usr/local/bin/ensure-node-modules

ENV HOST=0.0.0.0 \
    PORT=5175

EXPOSE 5175

ENTRYPOINT ["ensure-node-modules"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
