# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
WORKDIR /app/backend
RUN npm install
WORKDIR /app
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
RUN npx tsc

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app/backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "dist/backend/src/index.js"]
