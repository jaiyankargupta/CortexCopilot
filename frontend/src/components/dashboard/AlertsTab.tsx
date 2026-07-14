import { Bell } from 'lucide-react';

export default function AlertsTab() {
  return (
    <div className="rich-tab-view">
      <div className="tab-view-header">
        <div className="tab-title-box">
          <Bell size={24} color="#F59E0B" />
          <h2>Real-Time Telemetry Alerts Log</h2>
        </div>
        <p className="tab-desc">Live push alerts dispatched via SMS / Email / Webhook when threshold boundaries are breached.</p>
      </div>

      <div className="alerts-list">
        <div className="alert-item">
          <span className="dot dot-red" />
          <div className="alert-content">
            <div className="alert-title">High Demand Alert: Contract Limit Breached (`510.32 kVA` &gt; `300 kVA`)</div>
            <div className="alert-time">Dispatched to Plant Manager (`+91 98*** ****1`) via SMS · 14:15 PM</div>
          </div>
        </div>
        <div className="alert-item">
          <span className="dot dot-yellow" />
          <div className="alert-content">
            <div className="alert-title">Power Factor Warning: PF dropped below 0.86 threshold (`0.768 PF`)</div>
            <div className="alert-time">Dispatched to Electrical Engineer via Email · 03:15 AM</div>
          </div>
        </div>
        <div className="alert-item">
          <span className="dot dot-green" />
          <div className="alert-content">
            <div className="alert-title">Energy Meter Health Check: Main Incomer Operating Nominally</div>
            <div className="alert-time">System Telemetry Heartbeat · Every 15 min</div>
          </div>
        </div>
      </div>
    </div>
  );
}
