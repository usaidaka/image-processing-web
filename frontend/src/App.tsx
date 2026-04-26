import { useState, useEffect, useRef } from 'react';

type JobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Invalid file format. Only JPG, PNG, and WebP are allowed.');
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File size exceeds 20MB limit.');
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      
      setError(null);
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setStatus('idle');
      setJobId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setStatus('pending');
      setError(null);
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setJobId(data.job_id);
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
    }
  };

  useEffect(() => {
    let timeoutId: any;

    const checkStatus = async (currentJobId: string, retryCount: number = 0) => {
      try {
        const res = await fetch(`${API_URL}/api/status/${currentJobId}`);
        const data = await res.json();

        if (res.ok) {
          setStatus(data.status);
          
          if (data.status === 'failed') {
            setError(data.error || 'Processing failed');
          } else if (data.status === 'pending' || data.status === 'processing') {
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);
            timeoutId = setTimeout(() => checkStatus(currentJobId, retryCount + 1), backoffDelay);
          }
        } else {
          setError(data.error || 'Failed to check status');
          setStatus('failed');
        }
      } catch (err: any) {
        setError('Network error while checking status');
        setStatus('failed');
      }
    };

    if (jobId && (status === 'pending' || status === 'processing')) {
      checkStatus(jobId);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId, status, API_URL]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-zinc-100">
          Take control <br /> <span className="text-zinc-400">of your images</span>
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Fast, asynchronous image processing. Compress, resize, and convert to WebP without blocking your browser.
        </p>
      </div>

      <div className="z-10 bg-surface border border-zinc-800 p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-primary/50 bg-primary/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/jpeg, image/png, image/webp" 
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="text-sm text-zinc-300">
              {file && previewUrl ? (
                <div className="flex flex-col items-center">
                  <img src={previewUrl} alt="Preview" className="max-h-32 mb-2 rounded-md object-contain border border-zinc-700" />
                  <span className="font-semibold text-primary">{file.name}</span>
                </div>
              ) : (
                <span>Click to browse or drag & drop</span>
              )}
              <p className="text-xs text-zinc-500 mt-1">JPG, PNG, WebP up to 20MB</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {file && status === 'idle' && (
          <button 
            onClick={handleUpload}
            className="mt-6 w-full py-3 px-4 bg-primary text-zinc-950 font-bold rounded-xl hover:bg-primaryHover transition-colors focus:ring-4 focus:ring-primary/20"
          >
            Process Image
          </button>
        )}

        {(status === 'pending' || status === 'processing') && (
          <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-zinc-300">
                {status === 'pending' ? 'Queued...' : 'Optimizing and converting...'}
              </span>
            </div>
            <span className="text-xs text-primary animate-pulse">{status.toUpperCase()}</span>
          </div>
        )}

        {status === 'completed' && jobId && (
          <div className="mt-6 space-y-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
              ✓ Processing complete!
            </div>
            <a 
              href={`${API_URL}/api/download/${jobId}`}
              download
              className="block w-full py-3 px-4 bg-primary text-zinc-950 text-center font-bold rounded-xl hover:bg-primaryHover transition-colors focus:ring-4 focus:ring-primary/20"
            >
              Download WebP
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
