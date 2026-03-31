// Use VITE_API_BASE_URL for absolute URLs (e.g. http://localhost:8788).
// If unset, defaults to relative paths so vite proxy handles them.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function apiUrl(path) {
  // If API_BASE_URL is set, use absolute URL; otherwise use relative (proxied by vite)
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
