FROM node:20
WORKDIR /app
COPY worker/package*.json ./worker/
COPY shared/package*.json ./shared/
WORKDIR /app/worker
RUN npm install
WORKDIR /app
COPY shared ./shared
COPY worker ./worker
WORKDIR /app/worker
CMD ["npx", "ts-node", "src/index.ts"]
