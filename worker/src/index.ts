import { Worker, Job } from 'bullmq';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ImageProcessJob } from '../../shared/types';

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

console.log('Worker is starting and connecting to Redis...', redisOptions);

const imageWorker = new Worker(
  'image-processing',
  async (job: Job<ImageProcessJob>) => {
    const { jobId, originalFileName, tempFilePath } = job.data;
    
    console.log(`[Job ${jobId}] Started processing: ${originalFileName}`);
    await job.updateProgress(10);

    try {
      const outputPath = path.join(UPLOADS_DIR, `processed_${jobId}.webp`);

      // 3.3 Resize to max 1280px longest side
      // 3.4 Compress to 80% quality and convert to WebP
      await sharp(tempFilePath)
        .resize({
          width: 1280,
          height: 1280,
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      await job.updateProgress(90);

      // Clean up original file to save space (optional, but good practice)
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      await job.updateProgress(100);
      console.log(`[Job ${jobId}] Successfully processed and saved to ${outputPath}`);
      
      return { success: true, outputPath };
    } catch (error: any) {
      console.error(`[Job ${jobId}] Failed to process image:`, error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  },
  { connection: redisOptions }
);

imageWorker.on('completed', (job) => {
  console.log(`[Job ${job.id}] has completed!`);
});

imageWorker.on('failed', (job, err) => {
  console.log(`[Job ${job?.id}] has failed with ${err.message}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await imageWorker.close();
  process.exit(0);
});
