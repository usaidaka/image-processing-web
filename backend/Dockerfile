FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
WORKDIR /app/backend
RUN npm install
WORKDIR /app
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
CMD ["npx", "ts-node", "src/index.ts"]
