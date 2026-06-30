import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:5000';

export type JobState = 'IDLE' | 'INITIALIZING_JOB' | 'UPLOADING_TO_S3' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

interface JobData {
  jobId: string;
  uploadUrl: string;
  filename: string;
}

export function useKonvertify() {
  const [state, setState] = useState<JobState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Polling query
  const { data: jobStatus } = useQuery({
    queryKey: ['job', jobData?.jobId],
    queryFn: async () => {
      if (!jobData?.jobId) return null;
      
      // Check for 10-minute timeout
      if (startTime && Date.now() - startTime > 10 * 60 * 1000) {
        setState('ERROR');
        setErrorMsg('Conversion timed out after 10 minutes.');
        throw new Error('Timeout');
      }

      const res = await fetch(`${API_BASE}/api/jobs?jobUuid=${jobData.jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job status');
      const data = await res.json();
      
      if (data.status === 'Completed') {
        setState('SUCCESS');
      }
      return data;
    },
    enabled: state === 'PROCESSING' && !!jobData?.jobId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === 'Completed' || state === 'ERROR') {
        return false;
      }
      return 3000;
    },
  });

  const uploadFile = useCallback(async (file: File) => {
    try {
      setState('INITIALIZING_JOB');
      setErrorMsg('');
      
      // 1. Initialize Job
      const initRes = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      });
      
      if (!initRes.ok) throw new Error('Failed to initialize job');
      const { jobId, uploadUrl } = await initRes.json();
      setJobData({ jobId, uploadUrl, filename: file.name });
      
      setState('UPLOADING_TO_S3');
      
      // 2. Upload to S3 directly via Presigned URL using XMLHttpRequest for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/epub+zip');
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 Upload failed with status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during S3 upload'));
        
        xhr.send(file);
      });
      
      // 3. Start processing (Polling)
      setState('PROCESSING');
      setStartTime(Date.now());
      
    } catch (err: any) {
      setState('ERROR');
      setErrorMsg(err.message || 'An unexpected error occurred');
    }
  }, []);

  const reset = () => {
    setState('IDLE');
    setJobData(null);
    setErrorMsg('');
    setUploadProgress(0);
    setStartTime(null);
  };

  return {
    state,
    errorMsg,
    jobData,
    uploadProgress,
    uploadFile,
    reset,
    jobStatus,
  };
}
