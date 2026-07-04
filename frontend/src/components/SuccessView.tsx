import { CheckCircle2, Download, RefreshCcw } from 'lucide-react';

interface SuccessViewProps {
  filename?: string;
  downloadUrl?: string;
  onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ filename, downloadUrl, onReset }) => {
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
        <a 
          href={downloadUrl || '#'}
          download
          className="button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', textDecoration: 'none' }}
        >
          <Download size={20} />
          Download .KFX
        </a>
        
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
