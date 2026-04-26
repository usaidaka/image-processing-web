# Async Image Processing App

A production-ready web application that demonstrates offloading CPU-intensive tasks (image resizing, compression, and conversion to WebP) to a background worker using BullMQ and Redis.

## Features
- **Frontend**: React + Tailwind CSS with a premium Dark Mode aesthetic.
- **Backend API**: Express JS + Multer for handling multipart/form-data.
- **Worker**: Node.js + BullMQ + Sharp for high-performance image processing.
- **Queue**: Redis.
- **Infrastructure**: Fully containerized using Docker Compose.

## Architecture
1. **User** uploads an image via the React frontend.
2. **Express API** receives the file, saves it temporarily, and pushes a job to the Redis queue. It immediately returns a `job_id` to the frontend.
3. **React Frontend** starts polling the API using Exponential Backoff to check the job status.
4. **Worker** picks up the job from Redis, processes the image using `sharp` (resizes to max 1280px, compresses to 80%, converts to WebP).
5. **Worker** updates the job status to `completed`.
6. **React Frontend** sees the `completed` status and shows a "Download WebP" button.

## How to Run

Requirements: Docker & Docker Compose.

1. Clone the repository.
2. Run the application:
   ```bash
   docker-compose up --build
   ```
3. Open your browser and navigate to:
   [http://localhost:5173](http://localhost:5173)

The backend API will run on `http://localhost:3001` and Redis on `localhost:6379`.

## Directories
- `frontend/`: React Vite app
- `backend/`: Express API
- `worker/`: BullMQ processor
- `shared/`: TypeScript interfaces shared across backend and worker
- `uploads/`: Temporary storage for raw and processed images (bound as volume)
