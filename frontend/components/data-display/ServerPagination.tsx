'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface ServerPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
}

export function ServerPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  disabled = false,
  className = '',
}: ServerPaginationProps) {
  if (totalItems <= 0 && totalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (page > 3) {
      pages.push('...');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EAECF0' }}
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white text-xs text-slate-600 ${className}`}
      aria-label="Server pagination navigation"
    >
      {/* Range Information */}
      <div className="flex items-center gap-3">
        <span>
          Showing{' '}
          <strong className="text-slate-900 font-semibold">{startItem}</strong>
          {' - '}
          <strong className="text-slate-900 font-semibold">{endItem}</strong>
          {' of '}
          <strong className="text-slate-900 font-semibold">{totalItems.toLocaleString()}</strong>
          {' items'}
        </span>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <label htmlFor="server-page-size-select" className="text-slate-500 hidden sm:inline">
              Per page:
            </label>
            <select
              id="server-page-size-select"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ backgroundColor: '#FFFFFF' }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer text-xs transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          aria-label="First page"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(1)}
          className="p-1.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-colors text-slate-600"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          aria-label="Previous page"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-colors text-slate-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={isCurrent ? 'page' : undefined}
                disabled={disabled}
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] h-7 px-2 rounded flex items-center justify-center font-medium transition-colors ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          aria-label="Next page"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-colors text-slate-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          aria-label="Last page"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="p-1.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-colors text-slate-600"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
