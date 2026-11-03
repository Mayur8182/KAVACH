import React, { useState, useMemo } from 'react';
import { LoadingSkeleton } from '../feedback/LoadingSkeleton';
import { EmptyState } from '../feedback/EmptyState';
import { ServerPagination } from './ServerPagination';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface SharedTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  rowIdKey?: keyof T | ((row: T) => string);
  toolbarActions?: React.ReactNode;
  serverSide?: boolean;
  pagination?: PaginationConfig;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  onSearchChange?: (query: string) => void;
}

export function SharedTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items matching your criteria.',
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchFilter,
  onRowClick,
  pageSize = 15,
  rowIdKey = 'id' as any,
  toolbarActions,
  serverSide = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
}: SharedTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Search filter (client-side only when not serverSide)
  const filteredData = useMemo(() => {
    if (serverSide) return data;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, q));
    }
    return data.filter((row: any) =>
      Object.values(row).some((val) => typeof val === 'string' && val.toLowerCase().includes(q))
    );
  }, [data, searchQuery, searchFilter, serverSide]);

  // Sorting (client-side only when not serverSide)
  const sortedData = useMemo(() => {
    if (serverSide || !sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      return sortDir === 'asc' ? 1 : -1;
    });
  }, [filteredData, sortKey, sortDir, serverSide]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    if (serverSide) return data;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, serverSide, data]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getRowId = (row: T, idx: number): string => {
    if (typeof rowIdKey === 'function') return rowIdKey(row);
    if (typeof rowIdKey === 'string' && (row as any)[rowIdKey]) return String((row as any)[rowIdKey]);
    return String(idx);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Table Toolbar */}
      {(searchable || toolbarActions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            gap: '12px',
          }}
        >
          {searchable ? (
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setCurrentPage(1);
                  if (serverSide && onSearchChange) {
                    onSearchChange(val);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          ) : <div />}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toolbarActions}
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  style={{
                    padding: '10px 14px',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--color-text-muted)',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ color: 'var(--color-primary-text)' }}>
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px 14px' }}>
                  <LoadingSkeleton rows={5} height="24px" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px 14px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-danger-text)', fontSize: '12px' }}>{error}</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px 14px' }}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={getRowId(row, idx)}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 14px',
                        color: 'var(--color-text-secondary)',
                        textAlign: col.align || 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && serverSide && pagination && onPageChange ? (
        <ServerPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : (
        !loading && sortedData.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            <div>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, sortedData.length)}</strong> of{' '}
              <strong>{sortedData.length}</strong> records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  color: currentPage <= 1 ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  color: currentPage >= totalPages ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
