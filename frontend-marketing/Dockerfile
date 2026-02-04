FROM node:20-bullseye
WORKDIR /app
COPY frontend-marketing/package*.json ./
RUN npm install
COPY frontend-marketing .
COPY scripts/docker/ensure-node-modules.sh /usr/local/bin/ensure-node-modules
RUN chmod +x /usr/local/bin/ensure-node-modules
ENV NODE_ENV=development
EXPOSE 3000
ENV INSTALL_CMD="npm install"
ENTRYPOINT ["ensure-node-modules"]
CMD ["npm", "run", "dev"]
