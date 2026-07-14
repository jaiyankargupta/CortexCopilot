import { useState, useEffect } from 'react';
import {
  Zap, Activity, AlertTriangle,
  DollarSign, RefreshCw, Gauge,
  Bell, Settings, Sparkles,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, ReferenceLine
} from 'recharts';
import type { DashboardAnalytics } from '../types';
import InsightsPanel from './InsightsPanel';
import AnomalyTab from './dashboard/AnomalyTab';
import BillingTab from './dashboard/BillingTab';
import AlertsTab from './dashboard/AlertsTab';
import SettingsTab from './dashboard/SettingsTab';

interface RichAnalyticsDashboardProps {
  tenantId: string;
  accessToken: string;
}

import { getDashboardAnalytics, API_BASE_URL } from '../api';
import { analyticsCache } from '../api/cache';

export default function RichAnalyticsDashboard({ tenantId, accessToken }: RichAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'power' | 'insights' | 'anomaly' | 'billing' | 'alerts' | 'settings'>('power');
  const [activeCard, setActiveCard] = useState<'overview' | 'active_apparent' | 'tod' | 'pf' | 'cd' | 'phase'>('overview');
  const [timeRange, setTimeRange] = useState<'Today' | 'This Week' | 'This Month' | 'Last Month'>('Today');

  // Chart state toggles
  const [showKw, setShowKw] = useState<boolean>(true);
  const [showKva, setShowKva] = useState<boolean>(true);
  const [cdViewMode, setCdViewMode] = useState<'utilisation' | 'peak'>('utilisation');
  const [phaseMode, setPhaseMode] = useState<'Voltage' | 'Current'>('Voltage');
  const [phaseFilters, setPhaseFilters] = useState<{ r: boolean; y: boolean; b: boolean; avg: boolean }>({
    r: true, y: true, b: true, avg: true
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [tenantId, timeRange]);

  const fetchAnalyticsData = async () => {
    const cacheKey = `${tenantId}_${timeRange}`;
    if (analyticsCache[cacheKey]) {
      setAnalytics(analyticsCache[cacheKey]);
      setLoading(false);
      // Fetch in background to update cache without showing loading spinner
      fetchFreshData(cacheKey);
      return;
    }

    setAnalytics(null);
    setLoading(true);
    await fetchFreshData(cacheKey);
  };

  const fetchFreshData = async (cacheKey: string) => {
    try {
      const data = await getDashboardAnalytics(timeRange, accessToken);
      analyticsCache[cacheKey] = data;
      setAnalytics(data);
    } catch (err) {
      console.warn('Failed to fetch dashboard rich analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="rich-loading-wrapper">
        <div className="rich-loading-card">
          <RefreshCw size={32} color="#0EA5E9" className="spinner-anim" />
          <div>
            <div className="rich-loading-title">
              Syncing Industrial Analytics & Power Metrics...
            </div>
            <div className="rich-loading-desc">
              Aggregating live kW/kVA demand profiles and tariff calculations
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rich-loading-state" style={{ flexDirection: 'column', gap: '1rem' }}>
        <span>No telemetry data available for this selection.</span>
        <button
          onClick={fetchAnalyticsData}
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            background: '#0EA5E9',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const data: DashboardAnalytics = analytics;


  return (
    <div className="rich-dashboard-wrapper">
      <main className="rich-dashboard-body">
        {activeTab === 'power' && (
          <div className="power-grid-layout">
            {/* Left Active Pane */}
            <div className="power-active-pane">
              {activeCard === 'overview' && (
                <div className="rich-card overview-main-card">
                  <div className="overview-section">
                    <div className="overview-row-title">
                      <span className="row-label">TODAY</span>
                      <span className="row-sublabel">units consumed so far</span>
                    </div>
                    <div className="overview-stats-grid">
                      <div className="overview-stat-pill pill-energy">
                        <div className="stat-header"><span>ENERGY</span> <Zap size={15} className="icon-energy" /></div>
                        <div className="stat-val text-energy">{data.overview.today.energy_mwh} MWh</div>
                      </div>
                      <div className="overview-stat-pill pill-apparent">
                        <div className="stat-header"><span>APPARENT</span> <Gauge size={15} className="icon-apparent" /></div>
                        <div className="stat-val text-apparent">{data.overview.today.apparent_mvah} MVAh</div>
                      </div>
                      <div className="overview-stat-pill pill-pf">
                        <div className="stat-header"><span>LIVE POWER FACTOR</span> <Activity size={15} className="icon-pf" /></div>
                        <div className="stat-val text-pf">{data.overview.today.power_factor.toFixed(3)}</div>
                      </div>
                      <div className="overview-stat-pill pill-cost">
                        <div className="stat-header"><span>COST</span> <span>₹</span></div>
                        <div className="stat-val text-cost">{data.overview.today.cost_inr}</div>
                      </div>
                    </div>
                  </div>

                  <div className="overview-section">
                    <div className="overview-row-title">
                      <span className="row-label">YESTERDAY</span>
                      <span className="row-sublabel">12 AM – 12 AM</span>
                    </div>
                    <div className="overview-stats-grid">
                      <div className="overview-stat-pill pill-energy">
                        <div className="stat-header"><span>ENERGY</span> <Zap size={15} className="icon-energy" /></div>
                        <div className="stat-val text-energy">{data.overview.yesterday.energy_mwh} MWh</div>
                      </div>
                      <div className="overview-stat-pill pill-apparent">
                        <div className="stat-header"><span>APPARENT</span> <Gauge size={15} className="icon-apparent" /></div>
                        <div className="stat-val text-apparent">{data.overview.yesterday.apparent_mvah} MVAh</div>
                      </div>
                      <div className="overview-stat-pill pill-pf">
                        <div className="stat-header"><span>AVERAGE POWER FACTOR</span> <Activity size={15} className="icon-pf" /></div>
                        <div className="stat-val text-pf">{data.overview.yesterday.power_factor.toFixed(3)}</div>
                      </div>
                      <div className="overview-stat-pill pill-cost">
                        <div className="stat-header"><span>COST</span> <span>₹</span></div>
                        <div className="stat-val text-cost">{data.overview.yesterday.cost_inr}</div>
                      </div>
                    </div>
                  </div>

                  <div className="overview-section">
                    <div className="overview-row-title">
                      <span className="row-label">THIS MONTH</span>
                      <span className="row-sublabel">1st 12 AM → now</span>
                    </div>
                    <div className="overview-stats-grid">
                      <div className="overview-stat-pill pill-energy">
                        <div className="stat-header"><span>ENERGY</span> <Zap size={15} className="icon-energy" /></div>
                        <div className="stat-val text-energy">{data.overview.this_month.energy_mwh} MWh</div>
                      </div>
                      <div className="overview-stat-pill pill-apparent">
                        <div className="stat-header"><span>APPARENT</span> <Gauge size={15} className="icon-apparent" /></div>
                        <div className="stat-val text-apparent">{data.overview.this_month.apparent_mvah} MVAh</div>
                      </div>
                      <div className="overview-stat-pill pill-pf">
                        <div className="stat-header"><span>AVERAGE POWER FACTOR</span> <Activity size={15} className="icon-pf" /></div>
                        <div className="stat-val text-pf">{data.overview.this_month.power_factor.toFixed(3)}</div>
                      </div>
                      <div className="overview-stat-pill pill-cost">
                        <div className="stat-header"><span>COST</span> <span>₹</span></div>
                        <div className="stat-val text-cost">{data.overview.this_month.cost_inr}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rich-card-footer">
                    <h3 className="footer-title">Overview & Costing</h3>
                    <p className="footer-subtitle">Real-time energy consumption, power factor monitoring, and live cost analysis.</p>
                  </div>
                </div>
              )}

              {activeCard === 'active_apparent' && (
                <div className="rich-card chart-view-card">
                  <div className="chart-header-row">
                    <div>
                      <h2 className="chart-main-title">ACTIVE POWER & APPARENT POWER</h2>
                      <p className="chart-sub-title">Last 24 hours · kW (active) and kVA (apparent)</p>
                    </div>
                    <div className="chart-toggle-pills">
                      <button
                        className={`pill-toggle orange-pill ${showKw ? 'active' : ''}`}
                        onClick={() => setShowKw(!showKw)}
                      >
                        <span className="dot dot-orange" /> kW
                      </button>
                      <button
                        className={`pill-toggle blue-pill ${showKva ? 'active' : ''}`}
                        onClick={() => setShowKva(!showKva)}
                      >
                        <span className="dot dot-blue" /> kVA
                      </button>
                    </div>
                  </div>

                  <div className="chart-svg-box" style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.active_apparent.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cortex-border)" />
                        <XAxis dataKey="time" tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--cortex-surface)', borderColor: 'var(--cortex-border)', color: 'var(--cortex-text)' }} />
                        {showKw && <Line type="monotone" dataKey="kw" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Active Power (kW)" />}
                        {showKva && <Line type="monotone" dataKey="kva" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Apparent Power (kVA)" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-summary-pills-row">
                    <div className="summary-pill orange-bg-light">
                      <span className="summary-pill-label">AVG ACTIVE POWER</span>
                      <span className="summary-pill-val orange-val">{data.active_apparent.avg_kw} kW</span>
                    </div>
                    <div className="summary-pill blue-bg-light">
                      <span className="summary-pill-label">AVG APPARENT POWER</span>
                      <span className="summary-pill-val blue-val">{data.active_apparent.avg_kva} kVA</span>
                    </div>
                  </div>

                  <div className="rich-card-footer">
                    <h3 className="footer-title">Active & Apparent Power</h3>
                    <p className="footer-subtitle">Granular 24-hour tracking of kW and kVA utilization to spot inefficiencies.</p>
                  </div>
                </div>
              )}

              {activeCard === 'tod' && (
                <div className="rich-card chart-view-card">
                  <div className="chart-header-row">
                    <div>
                      <h2 className="chart-main-title">ENERGY BY TIME-OF-DAY</h2>
                      <p className="chart-sub-title">kWh · energy per hour Across {timeRange.toLowerCase()}</p>
                    </div>
                    <div className="filter-tabs">
                      {(['Today', 'This Week', 'This Month', 'Last Month'] as const).map((range) => (
                        <button
                          key={range}
                          className={`filter-tab-btn ${timeRange === range ? 'active' : ''}`}
                          onClick={() => setTimeRange(range)}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="chart-svg-box" style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.time_of_day.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cortex-border)" />
                        <XAxis dataKey="time" tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--cortex-surface)', borderColor: 'var(--cortex-border)', color: 'var(--cortex-text)' }} />
                        <Bar dataKey="kwh" fill="#10B981" radius={[3, 3, 0, 0]} name="Energy (kWh)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-legend-row">
                    <span className="legend-item"><span className="legend-box off-peak-box" /> Off-Peak</span>
                    <span className="legend-item"><span className="legend-box normal-box" /> Normal</span>
                    <span className="legend-item"><span className="legend-box peak-box" /> Peak</span>
                  </div>

                  <div className="tod-stats-row">
                    <div className="tod-stat-col">
                      <span className="tod-stat-lbl">MIN KWH</span>
                      <span className="tod-stat-num">{data.time_of_day.min_kwh} kWh</span>
                    </div>
                    <div className="tod-stat-col">
                      <span className="tod-stat-lbl">AVG KWH</span>
                      <span className="tod-stat-num green-num">{data.time_of_day.avg_kwh} kWh</span>
                    </div>
                    <div className="tod-stat-col">
                      <span className="tod-stat-lbl">PEAK KWH</span>
                      <span className="tod-stat-num">{data.time_of_day.peak_kwh} kWh</span>
                    </div>
                  </div>

                  <div className="rich-card-footer">
                    <h3 className="footer-title">Time-of-Day Analysis</h3>
                    <p className="footer-subtitle">Hourly breakdown of energy usage across peak, normal, and off-peak tariffs.</p>
                  </div>
                </div>
              )}

              {activeCard === 'pf' && (
                <div className="rich-card chart-view-card">
                  <div className="chart-header-row">
                    <div>
                      <h2 className="chart-main-title">POWER FACTOR</h2>
                      <div className="pf-hero-avg">{data.power_factor.today_avg}</div>
                      <p className="chart-sub-title">today average</p>
                    </div>
                    <div className="filter-tabs">
                      {(['Today', 'This Week', 'This Month', 'Last Month'] as const).map((range) => (
                        <button
                          key={range}
                          className={`filter-tab-btn ${timeRange === range ? 'active' : ''}`}
                          onClick={() => setTimeRange(range)}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pf-similarity-badge">
                    <span>≈ Similar to this week's average</span>
                  </div>

                  <div className="chart-svg-box" style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.power_factor.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cortex-border)" />
                        <XAxis dataKey="time" tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0.7, 1.0]} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--cortex-surface)', borderColor: 'var(--cortex-border)', color: 'var(--cortex-text)' }} />
                        <ReferenceLine y={0.92} stroke="#10B981" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: 'Rebate 0.92', fill: '#10B981', fontSize: 12 }} />
                        <ReferenceLine y={0.86} stroke="#F59E0B" strokeDasharray="4 4" label={{ position: 'insideBottomRight', value: 'Penalty < 0.86', fill: '#F59E0B', fontSize: 12 }} />
                        <Line type="monotone" dataKey="pf" stroke="#0E8A9C" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} name="Power Factor" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rich-card-footer">
                    <h3 className="footer-title">Power Factor Trends</h3>
                    <p className="footer-subtitle">Continuous monitoring of power factor drops to prevent utility penalties.</p>
                  </div>
                </div>
              )}

              {activeCard === 'cd' && (
                <div className="rich-card chart-view-card">
                  <div className="chart-header-row">
                    <div>
                      <h2 className="chart-main-title">CONTRACT DEMAND UTILISATION</h2>
                      <div className="cd-hero-val">{data.contract_demand.utilisation_pct}%</div>
                      <p className="chart-sub-title">Today · (peak kVA today / CD) x 100</p>
                    </div>
                    <div className="cd-toggle-box">
                      <button
                        className={`cd-toggle-btn ${cdViewMode === 'utilisation' ? 'active' : ''}`}
                        onClick={() => setCdViewMode('utilisation')}
                      >
                        Utilisation %
                      </button>
                      <button
                        className={`cd-toggle-btn ${cdViewMode === 'peak' ? 'active' : ''}`}
                        onClick={() => setCdViewMode('peak')}
                      >
                        Peak kVA
                      </button>
                    </div>
                  </div>

                  <div className="cd-mid-bar">
                    <div className="filter-tabs">
                      {(['Today', 'This Week', 'This Month', 'Last Month'] as const).map((range) => (
                        <button
                          key={range}
                          className={`filter-tab-btn ${timeRange === range ? 'active' : ''}`}
                          onClick={() => setTimeRange(range)}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <div className="cd-delta-text">↓ Today is -47.3% below this week's avg</div>
                  </div>

                  <div className="chart-svg-box" style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.contract_demand.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cortex-border)" />
                        <XAxis dataKey="time" tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} unit={cdViewMode === 'utilisation' ? '%' : ''} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--cortex-surface)', borderColor: 'var(--cortex-border)', color: 'var(--cortex-text)' }} formatter={(val: any) => [cdViewMode === 'utilisation' ? `${val}%` : `${val} kVA`, cdViewMode === 'utilisation' ? 'Utilisation' : 'Peak']} />
                        {cdViewMode === 'utilisation' && <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: 'CD 100%', fill: '#EF4444', fontSize: 12 }} />}
                        {cdViewMode === 'peak' && <ReferenceLine y={data.contract_demand.contracted_kva} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'insideTopRight', value: 'Limit', fill: '#EF4444', fontSize: 12 }} />}
                        <Area type="monotone" dataKey={cdViewMode === 'utilisation' ? 'utilisation_pct' : 'peak_kva'} stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} activeDot={{ r: 4 }} name={cdViewMode === 'utilisation' ? 'Utilisation (%)' : 'Peak (kVA)'} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rich-card-footer">
                    <h3 className="footer-title">Contract Demand Utilisation</h3>
                    <p className="footer-subtitle">Track peak kVA against your contract limits to optimize demand charges.</p>
                  </div>
                </div>
              )}

              {activeCard === 'phase' && (
                <div className="rich-card chart-view-card">
                  <div className="chart-header-row">
                    <div>
                      <span className="phase-pretitle">Deep dive</span>
                      <h2 className="chart-main-title">{phaseMode === 'Voltage' ? 'PHASE VOLTAGE (L–N)' : 'PHASE CURRENT'}</h2>
                      <div className="phase-hero-avg">{phaseMode === 'Voltage' ? `${data.phase_balance.averages.v_total} V` : `${data.phase_balance.averages.i_total} A`}</div>
                      <p className="chart-sub-title">Per phase today</p>
                    </div>
                    <div className="phase-top-controls">
                      <div className="filter-tabs">
                        {(['Today', 'This Week', 'This Month', 'Last Month'] as const).map((range) => (
                          <button
                            key={range}
                            className={`filter-tab-btn ${timeRange === range ? 'active' : ''}`}
                            onClick={() => setTimeRange(range)}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                      <div className="phase-mode-box">
                        <button
                          className={`phase-mode-btn ${phaseMode === 'Voltage' ? 'active' : ''}`}
                          onClick={() => setPhaseMode('Voltage')}
                        >
                          Voltage
                        </button>
                        <button
                          className={`phase-mode-btn ${phaseMode === 'Current' ? 'active' : ''}`}
                          onClick={() => setPhaseMode('Current')}
                        >
                          Current
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="phase-filter-pills-row">
                    <button
                      className={`phase-pill pill-r ${phaseFilters.r ? 'active' : ''}`}
                      onClick={() => setPhaseFilters(prev => ({ ...prev, r: !prev.r }))}
                    >
                      <span className="dot dot-red" /> R
                    </button>
                    <button
                      className={`phase-pill pill-y ${phaseFilters.y ? 'active' : ''}`}
                      onClick={() => setPhaseFilters(prev => ({ ...prev, y: !prev.y }))}
                    >
                      <span className="dot dot-yellow" /> Y
                    </button>
                    <button
                      className={`phase-pill pill-b ${phaseFilters.b ? 'active' : ''}`}
                      onClick={() => setPhaseFilters(prev => ({ ...prev, b: !prev.b }))}
                    >
                      <span className="dot dot-blue" /> B
                    </button>
                    <button
                      className={`phase-pill pill-avg ${phaseFilters.avg ? 'active' : ''}`}
                      onClick={() => setPhaseFilters(prev => ({ ...prev, avg: !prev.avg }))}
                    >
                      — Avg
                    </button>
                  </div>

                  <div className="chart-svg-box" style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.phase_balance.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cortex-border)" />
                        <XAxis dataKey="time" tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: 'var(--cortex-text)', fontSize: 12 }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} unit={phaseMode === 'Voltage' ? 'V' : 'A'} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--cortex-surface)', borderColor: 'var(--cortex-border)', color: 'var(--cortex-text)' }} />
                        {phaseFilters.r && <Line type="monotone" dataKey={phaseMode === 'Voltage' ? 'v_r' : 'i_r'} stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={phaseMode === 'Voltage' ? 'Phase R (V)' : 'Phase R (A)'} />}
                        {phaseFilters.y && <Line type="monotone" dataKey={phaseMode === 'Voltage' ? 'v_y' : 'i_y'} stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={phaseMode === 'Voltage' ? 'Phase Y (V)' : 'Phase Y (A)'} />}
                        {phaseFilters.b && <Line type="monotone" dataKey={phaseMode === 'Voltage' ? 'v_b' : 'i_b'} stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={phaseMode === 'Voltage' ? 'Phase B (V)' : 'Phase B (A)'} />}
                        {phaseFilters.avg && <Line type="monotone" dataKey={phaseMode === 'Voltage' ? 'avg_v' : 'avg_i'} stroke="var(--cortex-text)" strokeWidth={2.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} name={phaseMode === 'Voltage' ? 'Average (V)' : 'Average (A)'} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="phase-stats-grid">
                    <div className="phase-stat-card">
                      <span className="stat-sub dot-red-lbl"><span className="dot dot-red" /> PHASE R</span>
                      <span className="stat-main-num">{phaseMode === 'Voltage' ? `${data.phase_balance.averages.v_r} V` : `${data.phase_balance.averages.i_r} A`}</span>
                    </div>
                    <div className="phase-stat-card">
                      <span className="stat-sub dot-yellow-lbl"><span className="dot dot-yellow" /> PHASE Y</span>
                      <span className="stat-main-num">{phaseMode === 'Voltage' ? `${data.phase_balance.averages.v_y} V` : `${data.phase_balance.averages.i_y} A`}</span>
                    </div>
                    <div className="phase-stat-card">
                      <span className="stat-sub dot-blue-lbl"><span className="dot dot-blue" /> PHASE B</span>
                      <span className="stat-main-num">{phaseMode === 'Voltage' ? `${data.phase_balance.averages.v_b} V` : `${data.phase_balance.averages.i_b} A`}</span>
                    </div>
                    <div className="phase-stat-card">
                      <span className="stat-sub dot-avg-lbl"><span className="dot dot-dark" /> AVERAGE</span>
                      <span className="stat-main-num">{phaseMode === 'Voltage' ? `${data.phase_balance.averages.v_total} V` : `${data.phase_balance.averages.i_total} A`}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Sidebar Preview Stack */}
            <aside className="power-sidebar-pane">
              <div
                className={`sidebar-preview-card ${activeCard === 'overview' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('overview')}
              >
                <div className="preview-header">
                  <span className="preview-title">Overview & Costing</span>
                </div>
                <div className="preview-mini-body">
                  <div className="mini-row"><span className="mini-dot green" /> TODAY: {data.overview.today.energy_mwh} MWh</div>
                  <div className="mini-row"><span className="mini-dot blue" /> APPARENT: {data.overview.today.apparent_mvah} MVAh</div>
                  <div className="mini-row"><span className="mini-dot orange" /> COST: {data.overview.today.cost_inr}</div>
                </div>
              </div>

              <div
                className={`sidebar-preview-card ${activeCard === 'active_apparent' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('active_apparent')}
              >
                <div className="preview-header">
                  <span className="preview-title">Active & Apparent Power</span>
                </div>
                <div className="preview-mini-graph">
                  <svg viewBox="0 0 200 45">
                    <polyline fill="none" stroke="#3B82F6" strokeWidth="1.5" points="5,25 40,10 80,30 120,8 160,20 195,15" />
                    <polyline fill="none" stroke="#F59E0B" strokeWidth="1.5" points="5,28 40,14 80,33 120,12 160,23 195,18" />
                  </svg>
                </div>
              </div>

              <div
                className={`sidebar-preview-card ${activeCard === 'tod' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('tod')}
              >
                <div className="preview-header">
                  <span className="preview-title">Time-of-Day Analysis</span>
                </div>
                <div className="preview-mini-graph">
                  <svg viewBox="0 0 200 45">
                    <rect x="15" y="10" width="16" height="30" fill="#0E8A9C" rx="2" />
                    <rect x="40" y="15" width="16" height="25" fill="#0E8A9C" rx="2" />
                    <rect x="80" y="32" width="16" height="8" fill="#10B981" rx="2" />
                    <rect x="120" y="12" width="16" height="28" fill="#10B981" rx="2" />
                    <rect x="160" y="8" width="16" height="32" fill="#F97316" rx="2" />
                  </svg>
                </div>
              </div>

              <div
                className={`sidebar-preview-card ${activeCard === 'pf' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('pf')}
              >
                <div className="preview-header">
                  <span className="preview-title">Power Factor Trends</span>
                </div>
                <div className="preview-mini-graph">
                  <svg viewBox="0 0 200 45">
                    <line x1="5" y1="18" x2="195" y2="18" stroke="#10B981" strokeDasharray="2 2" strokeWidth="1" />
                    <polyline fill="none" stroke="#0E8A9C" strokeWidth="1.8" points="5,8 50,8 65,38 80,8 140,8 160,35 180,8 195,8" />
                  </svg>
                </div>
              </div>

              <div
                className={`sidebar-preview-card ${activeCard === 'cd' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('cd')}
              >
                <div className="preview-header">
                  <span className="preview-title">Contract Demand Utilisation</span>
                </div>
                <div className="preview-mini-graph">
                  <svg viewBox="0 0 200 45">
                    <line x1="5" y1="20" x2="195" y2="20" stroke="#EF4444" strokeDasharray="2 2" strokeWidth="1" />
                    <rect x="20" y="22" width="12" height="18" fill="#3B82F6" rx="1" />
                    <rect x="50" y="8" width="12" height="32" fill="#EF4444" rx="1" />
                    <rect x="85" y="25" width="12" height="15" fill="#3B82F6" rx="1" />
                    <rect x="120" y="15" width="12" height="25" fill="#F59E0B" rx="1" />
                    <rect x="160" y="6" width="12" height="34" fill="#EF4444" rx="1" />
                  </svg>
                </div>
              </div>

              <div
                className={`sidebar-preview-card ${activeCard === 'phase' ? 'active-preview' : ''}`}
                onClick={() => setActiveCard('phase')}
              >
                <div className="preview-header">
                  <span className="preview-title">Phase Balance Analytics</span>
                </div>
                <div className="preview-mini-graph">
                  <svg viewBox="0 0 200 45">
                    <polyline fill="none" stroke="#EF4444" strokeWidth="1.5" points="5,15 50,12 100,28 150,22 195,18" />
                    <polyline fill="none" stroke="#F59E0B" strokeWidth="1.5" points="5,12 50,10 100,24 150,18 195,14" />
                    <polyline fill="none" stroke="#3B82F6" strokeWidth="1.5" points="5,18 50,15 100,30 150,25 195,20" />
                  </svg>
                </div>
              </div>

            </aside>
          </div>
        )}

        {activeTab === 'insights' && (
          <InsightsPanel tenantId={tenantId} accessToken={accessToken} apiBaseUrl={API_BASE_URL} />
        )}

        {activeTab === 'anomaly' && (
          <AnomalyTab data={data} />
        )}

        {activeTab === 'billing' && (
          <BillingTab data={data} />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab />
        )}

        {activeTab === 'settings' && (
          <SettingsTab data={data} />
        )}
      </main>

      <nav className="cortex-bottom-nav">
        <button
          className={`nav-tab-item ${activeTab === 'power' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('power')}
        >
          <Zap size={20} className="nav-icon" />
          <span>Power</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'insights' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <Sparkles size={20} className="nav-icon" />
          <span>Insights</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'anomaly' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('anomaly')}
        >
          <AlertTriangle size={20} className="nav-icon" />
          <span>Anomaly</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'billing' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          <DollarSign size={20} className="nav-icon" />
          <span>Billing</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'alerts' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={20} className="nav-icon" />
          <span>Alerts</span>
        </button>

        <button
          className={`nav-tab-item ${activeTab === 'settings' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} className="nav-icon" />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
