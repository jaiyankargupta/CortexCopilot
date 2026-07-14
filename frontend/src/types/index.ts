export interface KpiData {
  current_month_kwh: number;
  estimated_bill_inr: number;
  recorded_peak_md_kva: number;
  contracted_demand_kva: number;
  is_violation: boolean;
  average_pf: number;
}

export interface InsightItem {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  rupee_impact: number;
  affected_meter_id: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  guardStatus?: string;
  numbersChecked?: number;
}

export interface TenantOption {
  id: string;
  name: string;
}

export interface OverviewMetricsSlot {
  energy_mwh: number;
  apparent_mvah: number;
  power_factor: number;
  cost_inr: string;
}

export interface DashboardAnalytics {
  tenant_id: string;
  time_range: string;
  contracted_demand_kva: number;
  overview: {
    today: OverviewMetricsSlot;
    yesterday: OverviewMetricsSlot;
    this_month: OverviewMetricsSlot;
  };
  active_apparent: {
    series: { time: string; kw: number; kva: number }[];
    avg_kw: number;
    avg_kva: number;
  };
  time_of_day: {
    series: { time: string; kwh: number; slot: string }[];
    min_kwh: number;
    avg_kwh: number;
    peak_kwh: number;
  };
  power_factor: {
    series: { time: string; pf: number }[];
    today_avg: number;
    rebate_threshold: number;
    penalty_threshold: number;
  };
  contract_demand: {
    series: { time: string; utilisation_pct: number; peak_kva: number }[];
    utilisation_pct: number;
    contracted_kva: number;
  };
  phase_balance: {
    series: { time: string; v_r: number; v_y: number; v_b: number; avg_v: number; i_r: number; i_y: number; i_b: number; avg_i: number }[];
    averages: { v_r: number; v_y: number; v_b: number; v_total: number; i_r: number; i_y: number; i_b: number; i_total: number };
  };
  anomalies?: any[];
  billing?: any;
}
