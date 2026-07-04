import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = 'https://adjjjgoie6.execute-api.eu-north-1.amazonaws.com';

export type JobState = 'IDLE' | 'INITIALIZING_JOB' | 'UPLOADING_TO_S3' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

interface JobData {
  jobId: string;
  uploadUrl: string;
  filename: string;
}

export interface JobStatusResponse {
  status: 'Pending' | 'Completed' | 'Failed';
  downloadUrl?: string;
}

export function useKonvertify() {
  const [state, setState] = useState<JobState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);

  // Monitor Supabase Realtime changes when in PROCESSING state
  useEffect(() => {
    if (state === 'PROCESSING' && jobData?.jobId) {
      const channel = supabase
        .channel(`job-${jobData.jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${jobData.jobId}`,
          },
          async (payload) => {
            const newStatus = payload.new.status;
            
            if (newStatus === 'Completed') {
              try {
                // Fetch the presigned URL from the C# backend
                const res = await fetch(`${API_BASE}/api/jobs?jobUuid=${jobData.jobId}`);
                if (!res.ok) throw new Error('Failed to fetch download URL');
                
                const data = await res.json();
                setJobStatus({ status: 'Completed', downloadUrl: data.downloadUrl });
                setState('SUCCESS');
              } catch (err) {
                setState('ERROR');
                setErrorMsg('Job completed but failed to retrieve download URL.');
              }
            } else if (newStatus === 'Failed') {
              setJobStatus({ status: 'Failed' });
              setState('ERROR');
              setErrorMsg('Conversion failed on the server.');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [state, jobData?.jobId]);

  // Handle the 10-minute timeout for polling
  useEffect(() => {
    if (state === 'PROCESSING' && startTime) {
      const interval = setInterval(() => {
        if (Date.now() - startTime > 10 * 60 * 1000) {
          setState('ERROR');
          setErrorMsg('Conversion timed out after 10 minutes.');
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [state, startTime]);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setState('INITIALIZING_JOB');
      setErrorMsg('');
      setJobStatus(null);
      
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
      
      // 3. Start processing (Realtime)
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
    setJobStatus(null);
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
