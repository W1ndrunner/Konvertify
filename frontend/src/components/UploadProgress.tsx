import React from 'react';
import { CloudLightning } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  filename: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, filename }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          backgroundColor: 'rgba(157, 78, 221, 0.2)',
          padding: '1rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s infinite'
        }}>
          <CloudLightning size={40} color="var(--accent-color)" />
        </div>
      </div>
      
      <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Uploading to S3...</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Securely transferring {filename}
      </p>

      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${progress}%`,
          backgroundColor: 'var(--accent-color)',
          boxShadow: '0 0 10px var(--accent-color)',
          transition: 'width 0.2s ease-out'
        }} />
      </div>
      <p style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--accent-color)' }}>
        {progress}%
      </p>
    </div>
  );
};
