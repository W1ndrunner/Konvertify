import React from 'react';
import { CheckCircle2, Download, RefreshCcw } from 'lucide-react';

interface SuccessViewProps {
  filename?: string;
  onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ filename, onReset }) => {
  // Since the backend doesn't currently return a Presigned Download URL,
  // we will simulate the download action or provide a placeholder.
  const handleDownload = () => {
    alert("In a full production environment, this would trigger a download using an S3 presigned URL for the converted .kfx file.");
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <CheckCircle2 size={64} color="var(--success-color)" />
      </div>
      
      <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Conversion Complete!</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        {filename ? `Your file "${filename}" has been converted to KFX.` : 'Your KFX file is ready.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <button 
          onClick={handleDownload}
          className="button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
        >
          <Download size={20} />
          Download .KFX
        </button>
        
        <button 
          onClick={onReset}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}
        >
          <RefreshCcw size={16} />
          Convert another file
        </button>
      </div>
    </div>
  );
};
