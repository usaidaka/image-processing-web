import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ImageProcessJob, JobStatusResponse } from '../../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 2.2 Configure multer for multipart/form-data
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, PNG, and WebP are allowed.'));
    }
  }
});

// 2.3 Setup BullMQ queue
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const imageQueue = new Queue('image-processing', {
  connection: redisOptions
});

// 2.4 POST /api/upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const jobId = req.file.filename.split('.')[0];
    
    const jobData: ImageProcessJob = {
      jobId,
      originalFileName: req.file.originalname,
      tempFilePath: req.file.path,
      mimeType: req.file.mimetype,
    };

    await imageQueue.add('process-image', jobData, { jobId });

    res.status(200).json({ job_id: jobId, status: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during upload.' });
  }
});

// 2.5 GET /api/status/:job_id
app.get('/api/status/:job_id', async (req, res) => {
  try {
    const { job_id } = req.params;
    const job = await imageQueue.getJob(job_id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    let status = state; // 'active', 'completed', 'failed', 'waiting', 'delayed'
    
    // Map BullMQ state to our defined JobStatus
    let mappedStatus: JobStatusResponse['status'] = 'pending';
    if (state === 'active') mappedStatus = 'processing';
    else if (state === 'completed') mappedStatus = 'completed';
    else if (state === 'failed') mappedStatus = 'failed';

    const response: JobStatusResponse = {
      job_id,
      status: mappedStatus,
    };

    if (mappedStatus === 'failed') {
      response.error = job.failedReason;
    } else if (mappedStatus === 'completed') {
      response.downloadUrl = `/api/download/${job_id}`;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while fetching status.' });
  }
});

// 2.6 GET /api/download/:job_id
app.get('/api/download/:job_id', (req, res) => {
  const { job_id } = req.params;
  // Processed files will have .webp extension
  const filePath = path.join(UPLOADS_DIR, `processed_${job_id}.webp`);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/webp');
    res.download(filePath, `${job_id}.webp`);
  } else {
    // If not found, it might still be processing or failed, but download endpoint should 400 or 404
    res.status(400).json({ error: 'Image not ready or does not exist.' });
  }
});

// Basic Error handler for multer errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 20MB limit.' });
    }
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
