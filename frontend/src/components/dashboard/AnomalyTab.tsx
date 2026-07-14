import { AlertTriangle } from 'lucide-react';
import type { DashboardAnalytics } from '../../types';

interface AnomalyTabProps {
  data: DashboardAnalytics;
}

export default function AnomalyTab({ data }: AnomalyTabProps) {
  const anomalies = data.anomalies || [];

  return (
    <div className="rich-tab-view">
      <div className="tab-view-header">
        <div className="tab-title-box">
          <AlertTriangle size={24} color="#EF4444" />
          <h2>AI Anomaly Detection & Excursions</h2>
        </div>
        <p className="tab-desc">
          Automated continuous anomaly tracking across harmonic distortion, demand spikes, and phase unbalance.
        </p>
      </div>

      <div className="anomaly-cards-stack">
        {anomalies.length > 0 ? (
          anomalies.slice(0, 15).map((anom, idx) => (
            <div key={idx} className={`rich-anomaly-card ${anom.severity?.toLowerCase() === 'critical' ? 'critical' : 'warning'}`}>
              <div className="anom-top-row">
                <span className={`anom-badge ${anom.severity?.toLowerCase() === 'critical' ? 'critical-badge' : 'warning-badge'}`}>
                  {(anom.type || 'ANOMALY').replace(/_/g, ' ')}
                </span>
                <span className="anom-time">
                  {anom.timestamp ? new Date(anom.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </span>
              </div>
              <h3 className="anom-title">
                {anom.description || `${anom.type} detected on ${anom.meter_id}`}
              </h3>
              {anom.recorded_value && (
                <p className="anom-detail">
                  Recorded: <strong>{anom.recorded_value}</strong> | Limit: {anom.limit_value}
                </p>
              )}
              {anom.rupee_impact !== undefined && anom.rupee_impact !== 0 && (
                <div className="anom-impact">
                  Estimated Financial Impact: <strong className={anom.rupee_impact < 0 ? 'orange-num' : 'red-num'}>
                    ₹{Math.abs(anom.rupee_impact).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </strong>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rich-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ opacity: 0.7 }}>No system anomalies detected in this time range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
