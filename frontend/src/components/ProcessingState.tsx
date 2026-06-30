import React from 'react';
import { Loader2 } from 'lucide-react';

export const ProcessingState: React.FC = () => {
  return (
    <div className="glass-panel animate-fade-in" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <Loader2
          size={56}
          color="var(--accent-color)"
          style={{ animation: 'spin 2s linear infinite' }}
        />
      </div>

      <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Converting...</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Fargate is processing your file. This usually takes roughly 4 minutes depending on file size.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <span style={{
          height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)',
          animation: 'pulse 1s infinite alternate'
        }}></span>
        <span style={{
          height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)',
          animation: 'pulse 1s infinite alternate 0.2s'
        }}></span>
        <span style={{
          height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)',
          animation: 'pulse 1s infinite alternate 0.4s'
        }}></span>
      </div>
    </div>
  );
};
