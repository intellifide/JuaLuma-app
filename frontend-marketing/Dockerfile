FROM node:20-bullseye
WORKDIR /app
COPY frontend-marketing/package*.json ./
RUN npm install
COPY frontend-marketing .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]
