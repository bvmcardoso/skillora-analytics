import { useEffect, useState, useMemo } from 'react';
import styles from './Dashboard.module.scss';
import Metric from '../../components/Metric/Metric';
import {
  salarySummary,
  stackCompare,
  type SalarySummary,
  type StackCompareRow,
} from '../../lib/api';
import { fmtInt, fmtNumber } from '../../lib/format';

const PAGE_SIZES = [10, 25, 50, 100];

type SortKey = 'stack' | 'p50' | 'n';
type SortDir = 'asc' | 'desc';

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  stack: 'asc',
  p50: 'desc',
  n: 'desc',
};

function Dashboard() {
  const [summary, setSummary] = useState<SalarySummary | null>(null);
  const [stacks, setStacks] = useState<StackCompareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // sort state — default: p50 descending
  const [sortKey, setSortKey] = useState<SortKey>('p50');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([salarySummary(ctrl.signal), stackCompare(ctrl.signal)])
      .then(([s, rows]) => {
        setSummary(s);
        setStacks(Array.isArray(rows) ? rows : []);
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          if (e?.name === 'AbortError') return;
          setError(e?.message || 'Failed to load analytics');
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_SORT_DIR[key]);
    }
    setPage(1);
  }

  // reset to first page when data or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [stacks, pageSize]);

  const sortedRows = useMemo(() => {
    return [...stacks].sort((a, b) => {
      const cmp = sortKey === 'stack' ? a.stack.localeCompare(b.stack) : a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [stacks, sortKey, sortDir]);

  const total = stacks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(total, startIdx + pageSize);

  const pageRows = useMemo(
    () => sortedRows.slice(startIdx, endIdx),
    [sortedRows, startIdx, endIdx],
  );

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboard__container}>
        <header className={styles.dashboard__header}>
          <h2 className={styles.dashboard__title}>Analytics Dashboard</h2>
          <p className={styles.dashboard__subtitle}>
            Review salary distribution metrics and compare compensation by technology stack.
          </p>
        </header>

        {loading && (
          <div className={styles.dashboard__state}>
            <p className={styles.dashboard__stateText}>Loading analytics data…</p>
          </div>
        )}

        {!loading && error && (
          <div className={`${styles.dashboard__state} ${styles['dashboard__state--error']}`}>
            <p className={styles.dashboard__stateText}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className={styles.dashboard__metrics} aria-label="Summary metrics">
              <Metric label="Median salary" value={summary ? fmtNumber(summary.p50, 0) : '-'} />
              <Metric label="75th percentile" value={summary ? fmtNumber(summary.p75, 0) : '-'} />
              <Metric label="90th percentile" value={summary ? fmtNumber(summary.p90, 0) : '-'} />
              <Metric label="Records analyzed" value={summary ? fmtInt(summary.n) : '-'} />
            </section>

            <section className={styles.dashboard__tableCard} aria-label="Stack comparison">
              <h3 className={styles.dashboard__tableTitle}>Stack comparison</h3>

              <div className={styles.dashboard__tableWrap}>
                <table className={styles.dashboard__table}>
                  <thead>
                    <tr>
                      {(
                        [
                          { key: 'stack', label: 'Stack' },
                          { key: 'p50', label: 'Median (p50)' },
                          { key: 'n', label: 'Records' },
                        ] as { key: SortKey; label: string }[]
                      ).map(({ key, label }) => {
                        const isActive = sortKey === key;
                        const ariaSort = isActive
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none';
                        return (
                          <th key={key} aria-sort={ariaSort}>
                            <button
                              type="button"
                              className={[
                                styles.dashboard__sortButton,
                                key !== 'stack' ? styles['dashboard__sortButton--right'] : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => handleSort(key)}
                            >
                              {label}
                              <span
                                className={[
                                  styles.dashboard__sortIcon,
                                  !isActive ? styles['dashboard__sortIcon--inactive'] : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                aria-hidden="true"
                              >
                                {!isActive ? '↕' : sortDir === 'asc' ? '↑' : '↓'}
                              </span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={`${r.stack}-${startIdx + i}`}>
                        <td>{r.stack}</td>
                        <td>{fmtNumber(r.p50, 0)}</td>
                        <td>{fmtInt(r.n)}</td>
                      </tr>
                    ))}

                    {total === 0 && (
                      <tr>
                        <td colSpan={3} className={styles.dashboard__tableEmpty}>
                          No data available. Upload a dataset to see results.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* footer: pagination */}
              {total > 0 && (
                <div className={styles.dashboard__pager}>
                  <div className={styles.dashboard__pagerStats}>
                    Showing <strong>{fmtInt(total === 0 ? 0 : startIdx + 1)}</strong>–
                    <strong>{fmtInt(endIdx)}</strong> of <strong>{fmtInt(total)}</strong>
                  </div>

                  <div className={styles.dashboard__pagerControls}>
                    <button
                      type="button"
                      className={styles.dashboard__pagerBtn}
                      onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
                      disabled={!canPrev}
                      aria-label="Previous page"
                    >
                      ‹ Prev
                    </button>

                    <span className={styles.dashboard__pagerPage}>
                      {page} / {totalPages}
                    </span>

                    <button
                      type="button"
                      className={styles.dashboard__pagerBtn}
                      onClick={() => canNext && setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={!canNext}
                      aria-label="Next page"
                    >
                      Next ›
                    </button>

                    <label className={styles.dashboard__pagerSize}>
                      Rows
                      <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                        {PAGE_SIZES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
