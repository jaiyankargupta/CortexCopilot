import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  tenantId?: string;
  tenantName?: string;
}

export default function LoadingScreen(_props?: LoadingScreenProps) {
  return (
    <div className="vireon-loading-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="vireon-loading-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2.5rem', gap: '1.25rem', textAlign: 'center' }}>
        <Loader2 size={36} color="#0EA5E9" className="minimal-spinner-main" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--cortex-text)' }}>
          Loading data...
        </div>
      </div>
    </div>
  );
}
