import type { AdminSettings, ApiResult } from './types.js';

export interface AdminApiClient {
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>>;
}

export function createAdminApiClient(settings: AdminSettings): AdminApiClient {
  return {
    async request(method, path, body) {
      if (!settings.adminApiKey) {
        return { ok: false, error: { code: 'AUTH_MISSING', message: 'API Key not set' } };
      }
      const url = `${settings.apiBase}${path}`;
      const init: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.adminApiKey}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      };
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (e) {
        return { ok: false, error: { code: 'NETWORK', message: (e as Error).message } };
      }
      const payload = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, data: (payload as any).data ?? payload };
      const code =
        res.status === 401 ? 'AUTH' :
        res.status === 404 ? 'NOT_FOUND' :
        res.status === 409 ? 'DUPLICATE' :
        res.status >= 500 ? 'SERVER' : 'VALIDATION';
      return {
        ok: false,
        error: { code, message: (payload as any).error ?? `HTTP ${res.status}`, details: payload },
      };
    },
  };
}
