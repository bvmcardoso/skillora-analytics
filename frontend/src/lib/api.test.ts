import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, uploadFile, mapColumns, taskStatus, salarySummary, stackCompare } from './api';
import type { ColumnMap } from './api';

// Small helper to generate a JSON Response with proper headers
function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

// Test helper: create a complete ColumnMap with sensible defaults
function makeColumnMap(overrides: Partial<ColumnMap> = {}): ColumnMap {
  return {
    title: 'Title',
    salary: 'Salary',
    currency: 'Currency',
    country: 'Country',
    seniority: 'Seniority',
    stack: 'Stack',
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

/* ============================================================================
 * uploadFile
 * ========================================================================== */

describe('uploadFile', () => {
  it('returns normalized fileId from snake_case payload', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ file_id: 'file-123' }));

    const file = new File(['csv'], 'data.csv', { type: 'text/csv' });
    const res = await uploadFile(file);
    expect(res.fileId).toBe('file-123');
  });

  it('throws ApiError on non-2xx with JSON detail', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({ detail: 'invalid file' }, { status: 400 })
    );

    const file = new File(['csv'], 'data.csv', { type: 'text/csv' });

    // Single call + try/catch to avoid exhausting the mock and timing out
    try {
      await uploadFile(file);
      throw new Error('Expected ApiError, but resolved');
    } catch (e) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.message).toContain('invalid file');
      expect(err.payload).toBeDefined();
    }
  });
});

/* ============================================================================
 * mapColumns
 * ========================================================================== */

describe('mapColumns', () => {
  it('returns normalized taskId from snake_case payload', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ task_id: 'task-1' }));

    const res = await mapColumns('file-1', makeColumnMap({ title: 'My Title' }));
    expect(res.taskId).toBe('task-1');
  });

  it('throws ApiError on non-2xx text error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } })
    );

    await expect(mapColumns('file-1', makeColumnMap())).rejects.toBeInstanceOf(ApiError);
  });
});

/* ============================================================================
 * taskStatus (normalizes state/meta/id)
 * ========================================================================== */

describe('taskStatus', () => {
  it('uppercases state, clamps percent to [0,100], and picks id', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        task_id: 't-1',
        status: 'started',
        meta: { percent: 105, processed: 5, total: 10 },
        ready: false,
        successful: false,
      })
    );

    const res = await taskStatus('t-1');
    expect(res.id).toBe('t-1');
    expect(res.state).toBe('STARTED'); // from "started"
    expect(res.meta?.percent).toBe(100); // clamped
    expect(res.meta?.processed).toBe(5);
    expect(res.meta?.total).toBe(10);
    expect(res.ready).toBe(false);
    expect(res.successful).toBe(false);
  });
});

/* ============================================================================
 * salarySummary (accepts {data:{...}} or flat; median/count fallbacks)
 * ========================================================================== */

describe('salarySummary', () => {
  it('reads values from nested data payload with median/count fallbacks', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({ data: { median: 50, p75: 70, p90: 90, count: 10 } })
    );

    const res = await salarySummary();
    expect(res.p50).toBe(50);
    expect(res.p75).toBe(70);
    expect(res.p90).toBe(90);
    expect(res.n).toBe(10);
  });

  it('reads values from flat payload', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({ p50: 42, p75: 60, p90: 80, n: 7 })
    );

    const res = await salarySummary();
    expect(res).toEqual({ p50: 42, p75: 60, p90: 80, n: 7 });
  });
});

/* ============================================================================
 * stackCompare (accepts {data:[...]} or [...]; supports stack/tech, median fallback)
 * ========================================================================== */

describe('stackCompare', () => {
  it('handles { data: [...] } shape and maps fields', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        data: [
          { stack: 'react', p50: 50, n: 10 },
          { tech: 'vue', median: 45, count: 8 },
        ],
      })
    );

    const rows = await stackCompare();
    expect(rows).toEqual([
      { stack: 'react', p50: 50, n: 10 },
      { stack: 'vue', p50: 45, n: 8 },
    ]);
  });

  it('handles flat array shape', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse([
        { stack: 'python', p50: 60, n: 12 },
        { tech: 'go', median: 55, count: 6 },
      ])
    );

    const rows = await stackCompare();
    expect(rows).toEqual([
      { stack: 'python', p50: 60, n: 12 },
      { stack: 'go', p50: 55, n: 6 },
    ]);
  });

  it('returns [] when payload is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({}));
    const rows = await stackCompare();
    expect(rows).toEqual([]);
  });
});
