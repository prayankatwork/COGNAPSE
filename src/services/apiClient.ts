import { getAuthHeaders } from './authSession';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(path, {
    ...init,
    headers: {
      'x-cognapse-client': 'true',
      ...authHeaders,
      ...(init.headers || {}),
    },
  });
  return response;
}
