# Stage 1: Build (node:20 needed for sharp compilation)
FROM node:20 AS builder
WORKDIR /app
COPY worker/package*.json ./worker/
COPY shared/package*.json ./shared/
WORKDIR /app/worker
RUN npm install
WORKDIR /app
COPY shared ./shared
COPY worker ./worker
WORKDIR /app/worker
RUN npx tsc

# Stage 2: Run (reuse same image since sharp needs glibc)
FROM node:20-slim
WORKDIR /app/worker
COPY --from=builder /app/worker/dist ./dist
COPY --from=builder /app/worker/node_modules ./node_modules
COPY --from=builder /app/worker/package.json ./package.json
RUN mkdir -p /app/uploads
CMD ["node", "dist/worker/src/index.js"]
