export interface ImageProcessJob {
  jobId: string;
  originalFileName: string;
  tempFilePath: string;
  mimeType: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  error?: string;
  downloadUrl?: string;
}
