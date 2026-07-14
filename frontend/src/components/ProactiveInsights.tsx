import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { InsightItem } from '../types';

interface ProactiveInsightsProps {
  insights: InsightItem[];
  onAskCopilot: (query: string) => void;
}

export default function ProactiveInsights({ insights, onAskCopilot }: ProactiveInsightsProps) {
  return (
    <div className="insights-section">
      <h2 className="section-title">
        <AlertTriangle color="var(--cortex-warning)" size={20} />
        Proactive Industrial Insights [This Week's Anomalies]
      </h2>

      <div className="insights-list">
        {insights.map(item => (
          <div key={item.id} className="insight-card">
            <div className="insight-header">
              <span className="insight-title">{item.title}</span>
              <span className={`rupee-badge ${item.rupee_impact > 0 ? 'savings' : ''}`}>
                {item.rupee_impact < 0 ? `-₹${Math.abs(item.rupee_impact).toLocaleString()} Penalty` : `+₹${item.rupee_impact.toLocaleString()} Savings`}
              </span>
            </div>
            <p className="insight-summary">{item.summary}</p>
            <button 
              className="insight-action-btn"
              onClick={() => onAskCopilot(`Explain exactly what caused the ${item.title} and what action I should take.`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>Ask Copilot for Root Cause</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
