const raw = import.meta.env.VITE_API_BASE as string | null;

export const API_BASE = (raw && raw.replace(/\/+$/, '')) || 'http://localhost:8180';

// Just a convenience to mount urls without double quotes
export function joinUrl(...parts: string[]) {
  return parts
    .map((p) => String(p || '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}
