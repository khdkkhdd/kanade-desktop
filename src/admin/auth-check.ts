import type { AdminApiClient } from './api-client.js';

/**
 * Validate the configured admin API key by making a cheap authenticated call.
 * Treats AUTH_MISSING, AUTH, and network errors all as "not ready" — the
 * admin UI should stay hidden in any of these cases.
 */
export async function isAdminKeyValid(client: AdminApiClient): Promise<boolean> {
  const r = await client.request('GET', '/admin/search/works?q=');
  return r.ok;
}
