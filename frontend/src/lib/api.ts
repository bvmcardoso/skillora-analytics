import { API_BASE, joinUrl } from './env';

/** Public types (camelCase) **/

export type ColumnKey = 'title' | 'salary' | 'currency' | 'country' | 'seniority' | 'stack';
export type ColumnMap = Record<ColumnKey, string>;

export type UploadResponse = { fileId: string };
export type MapResponse = { taskId: string };

export type CeleryState = 'PENDING' | 'STARTED' | 'PROGRESS' | 'RETRY' | 'FAILURE' | 'SUCCESS';

export type TaskStatusResp = {
  id: string;
  state: CeleryState;
  meta?: {
    processed?: number;
    total?: number;
    percent?: number;
    [k: string]: unknown;
  };
  ready: boolean;
  successful: boolean;
  result?: unknown;
};

/** Raw (internal) **/

type RawUploadResponse = { file_id?: string; fileId?: string };
type RawMapResponse = { task_id?: string; id?: string; taskId?: string };
type RawTaskStatus = {
  task_id?: string;
  id?: string;
  status?: string;
  state?: string;
  meta?: unknown;
  result?: unknown;
  ready?: boolean;
  successful?: boolean;
};

export type SalarySummary = {
  p50: number;
  p75: number;
  p90: number;
  n: number;
};

export type StackCompareRow = {
  stack: string;
  p50: number;
  n: number;
};

/** Small helpers **/

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequestOptions = {
  method?: HttpMethod;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** snake/kebab -> camel (shallow keys) */
const toCamel = (s: string) => s.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase());
const normalizeKeys = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [toCamel(k), v]));

/* ========= Normalizers ========= */

function normalizeUpload(raw: RawUploadResponse): UploadResponse {
  const n = normalizeKeys(raw) as { fileId?: string };
  if (!n.fileId) throw new Error('Invalid upload response');
  return { fileId: n.fileId };
}

function normalizeMap(raw: RawMapResponse): MapResponse {
  const n = normalizeKeys(raw) as { taskId?: string; id?: string };
  const taskId = n.taskId ?? n.id;
  if (!taskId) throw new Error('Invalid map response');
  return { taskId };
}

interface NormalizedMeta {
  percent?: number;
  [key: string]: unknown;
}

interface NormalizedTask {
  taskId?: string;
  id?: string;
  state?: string;
  status?: string;
  meta?: NormalizedMeta;
  ready?: boolean;
  successful?: boolean;
  result?: unknown;
  [key: string]: unknown;
}

function normalizeTaskStatus(raw: RawTaskStatus): TaskStatusResp {
  const n = normalizeKeys(raw) as NormalizedTask;
  const p = n.meta?.percent;
  const bounded = typeof p === 'number' ? Math.max(0, Math.min(100, Math.round(p))) : undefined;
  return {
    id: (n.taskId ?? n.id ?? '') as string,
    state: (n.state ?? n.status ?? 'PENDING').toUpperCase() as CeleryState,
    meta: n.meta ? { ...n.meta, percent: bounded } : undefined,
    ready: Boolean(n.ready),
    successful: Boolean(n.successful),
    result: n.result,
  };
}

/** HTTP (typed, no any) **/

// Error type carrying status and payload for consistent handling across the app.
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// Extract human-friendly detail from unknown payload.
function getErrorDetail(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'detail' in (payload as Record<string, unknown>)) {
    const d = (payload as Record<string, unknown>)['detail'];
    if (typeof d === 'string') return d;
  }
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

// JSON-only request (use when expecting application/json)
async function requestJson<T>(
  path: string,
  { method = 'GET', body, headers, signal }: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE}/${joinUrl(path)}`;
  const res = await fetch(url, { method, body, headers, signal });

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');

  if (!res.ok) {
    const payload: unknown = isJson ? await res.json().catch(() => ({})) : await res.text();
    const detail = getErrorDetail(payload);
    const msg = `[${res.status}] ${res.statusText}${detail ? ` - ${detail}` : ''}`;
    throw new ApiError(msg, res.status, payload);
  }

  return (await res.json()) as T;
}

/** Endpoints **/

const INGEST = 'api/jobs/ingest';
const ANALYTICS = 'api/jobs/analytics';

/** POST /api/jobs/ingest/upload -> { file_id } */
export async function uploadFile(file: File, signal?: AbortSignal): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const raw = await requestJson<RawUploadResponse>(`${INGEST}/upload`, {
    method: 'POST',
    body: form,
    signal,
  });
  return normalizeUpload(raw);
}

/** POST /api/jobs/ingest/map -> { task_id } */
export async function mapColumns(
  fileId: string,
  columnMap: ColumnMap,
  signal?: AbortSignal
): Promise<MapResponse> {
  const body = JSON.stringify({ file_id: fileId, column_map: columnMap });
  const raw = await requestJson<RawMapResponse>(`${INGEST}/map`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  return normalizeMap(raw);
}

/** GET /api/jobs/ingest/tasks/{task_id} -> TaskStatusResp */
export async function taskStatus(taskId: string, signal?: AbortSignal): Promise<TaskStatusResp> {
  const raw = await requestJson<RawTaskStatus>(`${INGEST}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    signal,
    headers: { 'Cache-Control': 'no-cache' },
  });
  return normalizeTaskStatus(raw);
}

/** GET /api/jobs/analytics/salary/summary -> SalarySummary */
type RawSalarySummary = {
  data?: {
    p50?: unknown;
    p75?: unknown;
    p90?: unknown;
    n?: unknown;
    median?: unknown;
    count?: unknown;
  };
  p50?: unknown;
  p75?: unknown;
  p90?: unknown;
  n?: unknown;
  median?: unknown;
  count?: unknown;
};

export async function salarySummary(signal?: AbortSignal): Promise<SalarySummary> {
  const raw = await requestJson<RawSalarySummary>(`${ANALYTICS}/salary/summary`, {
    method: 'GET',
    signal,
  });

  const container: { [k: string]: unknown } =
    (raw?.data as Record<string, unknown> | undefined) ?? (raw as Record<string, unknown>) ?? {};

  const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : Number(v ?? fallback));

  return {
    p50: num(container['p50'] ?? container['median'], 0),
    p75: num(container['p75'], 0),
    p90: num(container['p90'], 0),
    n: num(container['n'] ?? container['count'], 0),
  };
}

/** GET /api/jobs/analytics/stack/compare -> StackCompareRow[] */
type RawStackCompareRow = {
  stack?: unknown;
  tech?: unknown;
  p50?: unknown;
  median?: unknown;
  n?: unknown;
  count?: unknown;
};
type RawStackCompare = { data?: unknown } | unknown;

export async function stackCompare(signal?: AbortSignal): Promise<StackCompareRow[]> {
  const raw = await requestJson<RawStackCompare>(`${ANALYTICS}/stack/compare`, {
    method: 'GET',
    signal,
  });

  // Accept either { data: [...] } or [...]
  const container = raw as { data?: unknown } | unknown;
  const maybeArr = (container as { data?: unknown })?.data ?? container;
  if (!Array.isArray(maybeArr)) return [];

  return (maybeArr as unknown[]).map((r) => {
    const row = r as RawStackCompareRow;

    const stack =
      typeof row.stack === 'string' ? row.stack : typeof row.tech === 'string' ? row.tech : '-';

    const p50 =
      typeof row.p50 === 'number'
        ? row.p50
        : typeof row.median === 'number'
        ? row.median
        : Number((row.p50 as unknown) ?? (row.median as unknown) ?? 0);

    const n =
      typeof row.n === 'number'
        ? row.n
        : typeof row.count === 'number'
        ? row.count
        : Number((row.n as unknown) ?? (row.count as unknown) ?? 0);

    return { stack: String(stack), p50: Number(p50), n: Number(n) };
  });
}
