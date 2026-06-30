import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, disabled }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/epub+zip': ['.epub'],
    },
    maxFiles: 1,
    disabled
  });

  return (
    <div className="glass-panel animate-fade-in" style={{ textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Convert Your ePub to KFX</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Experience flawless formatting with our serverless conversion engine.
      </p>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragReject ? 'var(--error-color)' : isDragActive ? 'var(--accent-color)' : 'var(--panel-border)'}`,
          borderRadius: '12px',
          padding: '4rem 2rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isDragActive ? 'rgba(157, 78, 221, 0.1)' : 'transparent',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <input {...getInputProps()} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {isDragReject ? (
            <>
              <FileType size={48} color="var(--error-color)" />
              <p style={{ color: 'var(--error-color)', fontWeight: 500 }}>Only .epub files are accepted</p>
            </>
          ) : (
            <>
              <UploadCloud 
                size={64} 
                color={isDragActive ? 'var(--accent-color)' : 'var(--text-secondary)'} 
                style={{ 
                  transform: isDragActive ? 'translateY(-10px)' : 'none',
                  transition: 'transform 0.3s ease'
                }} 
              />
              <div>
                <p style={{ fontSize: '1.2rem', fontWeight: 500, color: 'white' }}>
                  {isDragActive ? 'Drop your ePub here!' : 'Drag & drop your ePub'}
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  or click to select a file
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
