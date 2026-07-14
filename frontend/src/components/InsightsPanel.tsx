import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export interface WeeklyInsight {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  rupee_impact: number;
  affected_meter_id: string;
  timestamp?: string;
}

interface InsightsPanelProps {
  tenantId: string;
  accessToken: string;
  apiBaseUrl?: string;
}

import { getWeeklyInsights } from '../api';
import { insightsCache } from '../api/cache';

export default function InsightsPanel({ tenantId, accessToken }: InsightsPanelProps) {
  const [insights, setInsights] = useState<WeeklyInsight[]>(() => insightsCache[tenantId] || []);
  const [loading, setLoading] = useState<boolean>(() => !insightsCache[tenantId]);
  const [error, setError] = useState<string>('');

  const fetchInsights = useCallback(async (customSignal?: AbortSignal, forceRefresh = false) => {
    if (!tenantId || !accessToken) return;
    if (!forceRefresh && insightsCache[tenantId]) {
      setInsights(insightsCache[tenantId]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const signal = customSignal instanceof AbortSignal ? customSignal : undefined;
    try {
      const data = await getWeeklyInsights(accessToken, signal);
      const list = data.insights || [];
      insightsCache[tenantId] = list;
      setInsights(list);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load insights');
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    fetchInsights(controller.signal);
    return () => controller.abort();
  }, [fetchInsights]);

  const totalMonthlySavings = insights.reduce((acc, item) => acc + Math.abs(item.rupee_impact || 0), 0);

  if (loading) {
    return (
      <div className="rich-tab-view">
        <div className="rich-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--cortex-text)' }}>
          <p style={{ opacity: 0.7 }}>Loading live plant recommendations</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rich-tab-view">
        <div className="rich-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#EF4444' }}>{error}</p>
          <button
            onClick={() => fetchInsights()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: '#0EA5E9',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rich-tab-view">
      <div className="tab-view-header">
        <div className="tab-title-box">
          <Activity size={24} color="#0EA5E9" />
          <h2>Plant Proactive Recommendations & Financial Impact</h2>
        </div>
        <p className="tab-desc">
          Data-cited engineering recommendations with rupee-quantified financial impact across industrial feeders.
        </p>
      </div>

      <div className="rich-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <span className="stat-sub dot-green-lbl"><span className="dot dot-green" /> TOTAL IDENTIFIED FINANCIAL IMPACT</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cortex-text)', marginTop: '0.35rem' }}>
            ₹{totalMonthlySavings.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <button
            onClick={() => fetchInsights(undefined, true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid var(--cortex-border)',
              color: 'var(--cortex-text)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="anomaly-cards-stack">
        {insights.length === 0 ? (
          <div className="rich-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No actionable insights generated for this period.</p>
          </div>
        ) : (
          insights.map((item) => (
            <div
              key={item.id}
              className="rich-anomaly-card"
              style={{ borderLeft: 'none' }}
            >
              <div className="anom-top-row">
                <span className="anom-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
                  {(item.category || 'RECOMMENDATION').replace(/_/g, ' ')}
                </span>
                <span className="anom-time">
                  {item.affected_meter_id}
                </span>
              </div>
              <h3 className="anom-title">{item.title}</h3>
              <p className="anom-detail">{item.summary}</p>
              {item.rupee_impact !== undefined && item.rupee_impact !== 0 && (
                <div className="anom-impact">
                  Financial Impact: <strong style={{ color: item.rupee_impact > 100000 ? '#EF4444' : '#10B981' }}>
                    ₹{Math.abs(item.rupee_impact).toLocaleString('en-IN')} / mo
                  </strong>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
