import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:5000';

export interface JobStatusResponse {
  status: 'Pending' | 'Completed' | 'Failed';
  downloadUrl?: string; 
}

const fetchJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  // Using the backend expected query param for jobId
  const response = await fetch(`${API_BASE}/api/jobs?jobUuid=${jobId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch job status from backend');
  }
  
  return response.json();
};

/**
 * Custom hook to manage the lifecycle of a conversion job.
 * @param jobId - The UUID returned from the initial POST /api/jobs
 * @param isProcessing - Boolean indicating if we should start polling
 */
export const useJobPolling = (jobId: string | null, isProcessing: boolean) => {
  return useQuery({
    queryKey: ['conversionJob', jobId],
    queryFn: () => fetchJobStatus(jobId!),
    
    // Only execute the query if a jobId exists and we are in processing state
    enabled: !!jobId && isProcessing,
    
    // The Polling Engine: Runs every 3 seconds (3000ms)
    // Automatically stops returning a number (returning false) when completed or failed
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      
      if (currentStatus === 'Completed' || currentStatus === 'Failed') {
        return false; // Kills the polling loop
      }
      
      return 3000; 
    },
    
    // Prevents the hook from throwing away data if the user switches browser tabs
    staleTime: Infinity, 
  });
};
