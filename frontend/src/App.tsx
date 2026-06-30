import React from 'react';
import { useKonvertify } from './hooks/useKonvertify';
import { UploadZone } from './components/UploadZone';
import { UploadProgress } from './components/UploadProgress';
import { ProcessingState } from './components/ProcessingState';
import { SuccessView } from './components/SuccessView';
import { AlertCircle } from 'lucide-react';

function App() {
  const { state, errorMsg, jobData, uploadProgress, uploadFile, reset } = useKonvertify();

  return (
    <>
      <header style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #9d4edd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Konvertify
        </h1>
      </header>

      <main style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {state === 'IDLE' && (
          <UploadZone onUpload={uploadFile} />
        )}

        {(state === 'INITIALIZING_JOB' || state === 'UPLOADING_TO_S3') && (
          <UploadProgress progress={uploadProgress} filename={jobData?.filename || 'File'} />
        )}

        {state === 'PROCESSING' && (
          <ProcessingState />
        )}

        {state === 'SUCCESS' && (
          <SuccessView filename={jobData?.filename} onReset={reset} />
        )}

        {state === 'ERROR' && (
          <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', borderColor: 'var(--error-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <AlertCircle size={56} color="var(--error-color)" />
            </div>
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Oops, something went wrong</h3>
            <p style={{ color: 'var(--error-color)', marginBottom: '2rem' }}>
              {errorMsg || 'An unknown error occurred during conversion.'}
            </p>
            <button className="button-primary" onClick={reset}>
              Try Again
            </button>
          </div>
        )}
      </main>
      
      <footer style={{ position: 'absolute', bottom: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Powered by Serverless AWS &bull; ePub to KFX Engine
      </footer>
    </>
  );
}

export default App;
