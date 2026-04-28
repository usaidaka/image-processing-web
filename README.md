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
       VITE_API_URL=http://localhost:3001 npm run dev:frontend
       ```
       > [!IMPORTANT]
       > You must provide the `VITE_API_URL` environment variable so the frontend knows where to find the backend server.

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

### 1. `Unexpected end of JSON input` (Frontend Error)
**Symptom:** You see a red error box on the frontend immediately after uploading an image. In the browser's Network tab, the `/api/upload` request returns a `404 Not Found`.
**Root Cause:** If `VITE_API_URL` is missing from the frontend's `.env`, Vite attempts to send the API request to its own local port (e.g., `http://localhost:5173/api/upload`). Because the Vite development server doesn't have an API route there, it returns an HTML fallback page (404). When the frontend tries to parse this HTML as JSON (`await response.json()`), it throws the `Unexpected end of JSON input` error.
**Solution:** Ensure you have an `.env` file in the `frontend` directory containing:
`VITE_API_URL=http://localhost:3001`
*(See `.env.example` at the root for a template).*

### 2. `Input file is missing: /app/backend/dist/uploads/...` (Docker Error)
**Symptom:** You run the app using `docker compose up`, the frontend successfully sends the image to the backend (Status 200), but the UI shows an "Image processing failed" error regarding a missing file path.
**Root Cause:** This is a path resolution issue when building the containers. In the TypeScript source (`backend/src/index.ts`), the uploads folder is referenced as `path.join(__dirname, '../../uploads')`. When compiled and run inside Docker, the `__dirname` resolves to `/app/backend/dist/backend/src`. Stepping up two directories (`../..`) lands the path at `/app/backend/dist/uploads`, **not** `/app/uploads` (where the shared Docker volume is actually mounted). As a result, the backend saves the image in an isolated folder that the worker container cannot access.
**Solution:** For active development, use **Option 2 (Manual Setup)** as it avoids Docker pathing complications entirely. If you wish to use Docker, the source code's `UPLOADS_DIR` path needs to be updated to rely on an environment variable or absolute path rather than `__dirname`.

### 3. Other Common Issues
*   **Redis Connection Failed**: Ensure Redis is running and reachable at the `REDIS_HOST` defined. The backend and worker will log connection errors until Redis is available.
*   **CORS Issues**: If you see CORS errors in the browser console, ensure the Backend has `app.use(cors())` enabled.
*   **Uploads Folder Missing**: The apps will try to create it automatically, but ensure the project directory has proper write permissions.

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
