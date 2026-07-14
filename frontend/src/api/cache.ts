import type { DashboardAnalytics } from '../types';
import type { WeeklyInsight } from '../components/InsightsPanel';

export const analyticsCache: Record<string, DashboardAnalytics> = {};
export const insightsCache: Record<string, WeeklyInsight[]> = {};
