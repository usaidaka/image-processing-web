# ⚡ Async Image Processor

A production-ready, asynchronous image processing web application. Upload images and receive compressed, resized WebP files — all processed in the background without blocking your browser.

**Live Demo:** [image-processing-web-frontend.vercel.app](https://image-processing-web-frontend.vercel.app)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                  │
│              React + Vite + Tailwind CSS             │
│           https://your-app.vercel.app/api/*          │
│                          │                           │
│              Vercel Reverse Proxy (HTTPS)            │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│               Your Server (Docker Compose)           │
│                                                      │
│  ┌────────────┐   ┌──────────┐   ┌───────────────┐  │
│  │  Backend   │──▶│  Redis   │◀──│    Worker     │  │
│  │ Express.js │   │ (Queue)  │   │ BullMQ+Sharp  │  │
│  │  Port 3001 │   └──────────┘   └───────────────┘  │
│  └────────────┘                                      │
│         │                   │                        │
│         └────────/uploads───┘  (shared Docker volume)│
└─────────────────────────────────────────────────────┘
```

### Why This Architecture?

**1. Asynchronous Processing with BullMQ**
Image processing (resize, compress, convert) is CPU-intensive and can take several seconds. Running this synchronously in the API would block the Node.js event loop and timeout HTTP requests. BullMQ decouples the upload from the processing — the API immediately returns a `job_id`, and the Worker processes the image in the background.

**2. Separate Worker Process**
The Worker runs as an entirely separate Docker container. This means:
- It can crash and restart without affecting the API server
- It can be scaled independently (run multiple workers for higher throughput)
- CPU-heavy `sharp` operations don't block API responses

**3. Shared Volume for File Storage**
Backend and Worker share a single Docker volume (`/uploads`). The Backend saves the original uploaded file and the Worker reads it, writes the processed WebP, then the Backend serves the download. This avoids the need for an external storage service for a simple setup.

**4. Vercel Proxy to Bypass Mixed Content**
Since the Frontend runs on HTTPS (Vercel) and the Backend runs on HTTP (your server), browsers block direct HTTP API calls as "Mixed Content". The `vercel.json` rewrite configuration proxies all `/api/*` requests through Vercel's infrastructure, keeping everything HTTPS from the browser's perspective.

**5. Multi-stage Docker Builds**
The Dockerfiles use multi-stage builds: TypeScript is compiled in a full Node.js build image, then only the compiled `.js` files and production `node_modules` are copied to a slim final image. This reduces the final image size by ~80%, making deployment faster and the server footprint smaller.

---

## Project Structure

```
/
├── frontend/          # React + Vite app (deployed to Vercel)
│   ├── src/
│   │   ├── App.tsx    # Main component with upload/polling logic
│   │   └── index.css  # Tailwind CSS v4 styles
│   └── vercel.json    # API proxy config (critical for HTTPS)
│
├── backend/           # Express.js API server
│   └── src/
│       └── index.ts   # Upload, status, and download endpoints
│
├── worker/            # BullMQ background worker
│   └── src/
│       └── index.ts   # Sharp image processing logic
│
├── shared/
│   └── types.ts       # Shared TypeScript interfaces
│
├── docker-compose.yml # Server orchestration (backend + worker + redis)
└── uploads/           # Processed image storage (Docker volume)
```

---

## Setup Instructions

### Prerequisites

- **Node.js** v20+
- **Docker** and **Docker Compose** v2+

### Local Development

**1. Clone the repository**

```bash
git clone <your-repo-url>
cd cfactory
```

**2. Run the backend services**

```bash
# Start Redis, Backend, and Worker
docker compose up -d --build
```

**3. Run the frontend**

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

### Production Deployment

#### Backend (Your Server)

**1. Copy the project files to your server**

```bash
rsync -avz -e 'ssh -p 2222' \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'uploads' \
  --exclude 'frontend' \
  . ubuntu@YOUR_SERVER_IP:/opt/usaid/cfactory
```

**2. Start the containers on the server**

```bash
ssh -p 2222 ubuntu@YOUR_SERVER_IP
cd /opt/usaid/cfactory
mkdir -p uploads
docker compose up -d --build
```

**3. Verify containers are running**

```bash
docker compose ps
# Should show backend, worker, and redis all "running"
```

#### Frontend (Vercel)

**1. Connect your GitHub repository to Vercel**

In the Vercel dashboard:
- Set **Root Directory** to `frontend`
- Framework Preset: **Vite**

**2. Add environment variable** (optional, only needed if `vercel.json` is not used):

| Variable | Value |
|---|---|
| `VITE_API_URL` | *(leave empty — handled by vercel.json proxy)* |

**3. Deploy** — Vercel auto-deploys on every push to `main`.

---

## Environment Variables

### Backend Container

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `redis` | Redis hostname (Docker service name) |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3001` | Express server port |

### Worker Container

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `redis` | Redis hostname (Docker service name) |
| `REDIS_PORT` | `6379` | Redis port |

### Frontend (Build-time)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` (empty) | API base URL. Empty string uses Vercel proxy. Set to `http://localhost:3001` for local dev without proxy. |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload an image (multipart/form-data, field: `image`) |
| `GET` | `/api/status/:job_id` | Poll job status |
| `GET` | `/api/download/:job_id` | Download processed WebP file |

**Upload Response:**
```json
{ "job_id": "uuid-v4" }
```

**Status Response:**
```json
{
  "status": "pending" | "processing" | "completed" | "failed",
  "error": "string (only on failure)"
}
```

---

## Image Processing Specs

- **Max upload size:** 20MB
- **Accepted formats:** JPG, PNG, WebP
- **Output format:** WebP
- **Max output dimensions:** 1280px (maintains aspect ratio)
- **Output quality:** 80%

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Queue | BullMQ (Redis-backed) |
| Image Processing | Sharp |
| Cache/Queue Broker | Redis 7 |
| Containerization | Docker, Docker Compose |
| Frontend Hosting | Vercel |
