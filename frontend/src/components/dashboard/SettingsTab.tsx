import { Settings } from 'lucide-react';
import type { DashboardAnalytics } from '../../types';

interface SettingsTabProps {
  data: DashboardAnalytics;
}

export default function SettingsTab({ data }: SettingsTabProps) {
  const contractedKva = data.billing?.contracted_demand_kva || 1501;

  return (
    <div className="rich-tab-view">
      <div className="tab-view-header">
        <div className="tab-title-box">
          <Settings size={24} color="#64748B" />
          <h2>Organization & Sensor Gateway Configuration</h2>
        </div>
        <p className="tab-desc">Manage your DISCOM tariff parameters, hardware telemetry feeds, and AI guard thresholds.</p>
      </div>

      <div className="settings-grid">
        <div className="rich-card settings-card">
          <h3>DISCOM Contract Parameters</h3>
          <div className="setting-row">
            <span>Contracted Maximum Demand (CD)</span>
            <span className="setting-val">{contractedKva} kVA</span>
          </div>
          <div className="setting-row">
            <span>Base Energy Rates (kVAh Based)</span>
            <span className="setting-val">Peak: ₹8.65 | Normal: ₹7.15 | Off-Peak: ₹6.65</span>
          </div>
          <div className="setting-row">
            <span>Excess Demand Penalty Rate</span>
            <span className="setting-val">₹1,000 / kVA excess</span>
          </div>
          <div className="setting-row">
            <span>Minimum billing demand (80% of CD)</span>
            <span className="setting-val">{(contractedKva * 0.8).toFixed(1)} kVA</span>
          </div>
          <div className="setting-row">
            <span>Electricity Duty</span>
            <span className="setting-val">6 paise / kVAh flat</span>
          </div>
        </div>

        <div className="rich-card settings-card">
          <h3>Edge Hardware Nodes</h3>
          <div className="setting-row">
            <span>Gateway Model</span>
            <span className="setting-val">Industrial IoT Edge Router</span>
          </div>
          <div className="setting-row">
            <span>Protocol Interface</span>
            <span className="setting-val">Modbus RS485 / RTU to MQTT SSL</span>
          </div>
          <div className="setting-row">
            <span>Data Sampling Frequency</span>
            <span className="setting-val">1000 ms (Granular 15-min aggregation)</span>
          </div>
          <div className="setting-row">
            <span>Firmware Status</span>
            <span className="setting-val green-num">v2.4.1 (Verified Active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
