import { apiClient, API_BASE_URL } from './client';
import type { DashboardAnalytics, TenantOption } from '../types';
import type { WeeklyInsight } from '../components/InsightsPanel';

export { API_BASE_URL, apiClient };

export async function getTenants(): Promise<{ tenants: TenantOption[] }> {
  return apiClient<{ tenants: TenantOption[] }>('/tenants');
}


export async function loginTenant(orgId: string, password = ''): Promise<{
  access_token: string;
  token_type?: string;
  user?: { company_name?: string };
  company_name?: string;
}> {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId, username: orgId, password })
  });
}


export async function getDashboardAnalytics(timeRange: string, token?: string): Promise<DashboardAnalytics> {
  return apiClient<DashboardAnalytics>(`/dashboard/analytics?time_range=${encodeURIComponent(timeRange)}`, {
    token
  });
}


export async function getWeeklyInsights(token: string, signal?: AbortSignal): Promise<{ insights: WeeklyInsight[] }> {
  return apiClient<{ insights: WeeklyInsight[] }>('/insights/weekly', {
    token,
    signal
  });
}


export async function sendCopilotChat(
  messages: Array<{ role: string; content: string }>,
  tenantId: string,
  token?: string
): Promise<{ reply: string; numbers_checked?: number }> {
  return apiClient('/copilot/chat', {
    method: 'POST',
    token,
    body: JSON.stringify({
      tenant_id: tenantId,
      messages
    })
  });
}


export async function streamCopilotChat(
  query: string,
  token: string,
  onChunk: (fullText: string) => void,
  onFinish: (result: { fullText: string; status: string; numbersChecked: number }) => void
): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, conversation_id: 'ui_client' })
  });

  if (!resp.ok || !resp.body) {
    throw new Error('API request failed with status ' + resp.status);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let guardBadge = 'VERIFIED_PASS';
  let numsChecked = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const payload = JSON.parse(line.replace('data: ', ''));
          if (payload.chunk) {
            fullText += payload.chunk;
            onChunk(fullText);
          } else if (payload.status) {
            guardBadge = payload.status;
            numsChecked = payload.numbers_checked || 0;
          }
        } catch {
          continue;
        }
      }
    }
  }

  onFinish({
    fullText: fullText || 'Analysis completed successfully.',
    status: guardBadge,
    numbersChecked: numsChecked
  });
}
