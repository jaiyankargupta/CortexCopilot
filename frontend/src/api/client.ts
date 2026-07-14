
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ApiRequestOptions extends RequestInit {
  token?: string;
}


export async function apiClient<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    headers,
    ...restOptions,
  });

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`.trim();
    try {
      const rawText = await response.text();
      if (rawText) {
        try {
          const errorData = JSON.parse(rawText);
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((item: any) => item.msg || JSON.stringify(item)).join('; ');
          } else if (errorData.detail && typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          if (rawText.length < 300) {
            errorMessage = `${errorMessage} - ${rawText}`;
          }
        }
      }
    } catch {
      // Keep HTTP status code & statusText message if reading text stream fails
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
