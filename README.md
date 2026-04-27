## 🚀 Local Setup Guide

Follow these instructions to get the project running on your local machine for development.

### Prerequisites

- **Node.js** v20+
- **Redis** (Required for the queue. You can run it via Docker or install it locally).
- **Docker** and **Docker Compose** (Optional, but recommended for Option 1).

### 📦 Option 1: Docker Compose (Quickest)

Use this option to spin up everything (Redis, Backend, Worker) in one command.

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cfactory
   ```

2. **Start the services**
   ```bash
   docker compose up -d --build
   ```

3. **Run the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The app will be available at **http://localhost:5173**.

---

### 🛠️ Option 2: Manual Setup (Best for Development)

Use this option if you want to make changes to the code and see them reflected immediately without rebuilding containers.

1. **Install Dependencies**
   Run this from the root directory to install all packages for the root, frontend, backend, and worker:
   ```bash
   npm run install:all
   ```

2. **Start Redis**
   Ensure Redis is running on `localhost:6379`. If you have Docker, this is the easiest way:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. **Start Components**
   You will need **three separate terminal windows/tabs** open at the root of the project:
   *   **Terminal 1 (Backend):** 
       ```bash
       npm run dev:backend
       ```
       *(Wait for: "Backend server running on port 3001")*
   *   **Terminal 2 (Worker):** 
       ```bash
       npm run dev:worker
       ```
       *(Wait for: "Worker is starting and connecting to Redis...")*
   *   **Terminal 3 (Frontend):** 
       ```bash
       npm run dev:frontend
       ```

4. **Verify the Setup**
   *   Open **http://localhost:5173** in your browser.
   *   Upload a small JPG or PNG image.
   *   Check the **Terminal 2 (Worker)** log to see the image processing progress.
   *   Once complete, click the "Download WebP" button.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `localhost` | Redis hostname (`redis` in Docker, `localhost` for manual) |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3001` | Express server port |
| `VITE_API_URL` | `http://localhost:3001` | Frontend API URL pointing to the backend server. |

---

## 🛠️ Troubleshooting

*   **Redis Connection Failed**: Ensure Redis is running and reachable at the `REDIS_HOST` defined.
*   **CORS Issues**: If the frontend cannot reach the backend, ensure `VITE_API_URL` is set correctly to `http://localhost:3001`.
*   **Uploads Folder Missing**: The apps will try to create it, but ensure the parent directory has write permissions.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Frontend)                 │
│              React + Vite + Tailwind CSS            │
│                 http://localhost:5173               │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼ (API Calls)
┌─────────────────────────────────────────────────────┐
│                  Backend (Express.js)               │
│                    http://localhost:3001            │
└──────────┬────────────────────────────┬─────────────┘
           │                            │
           ▼ (Add Job)                  ▼ (Serve/Save)
┌───────────────────────┐    ┌────────────────────────┐
│     Redis (Queue)     │◀───│   Worker (BullMQ)      │
│       Port 6379       │    │     Image Processing   │
└───────────────────────┘    └──────────┬─────────────┘
                                        │
           ┌────────────────────────────▼─────────────┐
           │             /uploads directory           │
           │          (Shared Local Storage)          │
           └──────────────────────────────────────────┘
```

### Why This Architecture?

1.  **Asynchronous Processing**: Image processing (resize, compress, convert) is CPU-intensive. By using BullMQ, the API immediately returns a `job_id` while the heavy work happens in the background, keeping the UI responsive.
2.  **Separate Worker Process**: The Worker runs independently from the API server. This ensures that even if a heavy image processing task fails or consumes high memory, the main API remains available.
3.  **Shared Storage**: Both Backend and Worker access the same `uploads` directory. The Backend saves the original file, and the Worker reads it to generate the optimized WebP version.
4.  **Scalability**: This setup allows you to run multiple worker instances if you need to process a large volume of images simultaneously.

---

## 📂 Project Structure

```
/
├── frontend/          # React + Vite app
├── backend/           # Express.js API server
├── worker/            # BullMQ background worker
├── shared/            # Shared TypeScript types
├── docker-compose.yml # Orchestration for Redis, Backend, Worker
└── uploads/           # Storage for processed images
```

---

## 📚 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload image (multipart, field: `image`) |
| `GET` | `/api/status/:id` | Poll job status |
| `GET` | `/api/download/:id` | Download processed WebP |

---

## 🧪 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Backend**: Node.js, Express 5, TypeScript
- **Queue**: BullMQ (Redis-backed)
- **Image Processing**: Sharp
- **Infrastructure**: Docker, Docker Compose, Vercel
