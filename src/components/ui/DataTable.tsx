'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Download, Edit, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@mui/material';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  selectable?: boolean;
  enableColumnVisibility?: boolean;
  initialHiddenColumns?: string[];
  stickyHeader?: boolean;
  zebraStripes?: boolean;
  onRowClick?: (row: T) => void;
  onDelete?: (selectedIds: string[]) => void;
  onEdit?: (row: T) => void;
  onExport?: (selectedRows: T[]) => void;
  bulkStatusOptions?: { value: string; label: string }[];
  onBulkStatusChange?: (selectedIds: string[], status: string) => void;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  enableColumnVisibility = true,
  initialHiddenColumns = [],
  stickyHeader = true,
  zebraStripes = true,
  onRowClick,
  onDelete,
  onEdit,
  onExport,
  bulkStatusOptions = [],
  onBulkStatusChange,
  getRowClassName,
  className,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(initialHiddenColumns)
  );
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const visibleColumns = useMemo(() => {
    return columns.filter((column) => !hiddenColumns.has(column.key));
  }, [columns, hiddenColumns]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        if (columns.length - next.size <= 1) {
          return prev;
        }
        next.add(columnKey);
      }
      return next;
    });
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map((row) => String(row[keyField])));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (onDelete) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = () => {
    if (onExport) {
      const selectedRows = data.filter((row) =>
        selectedIds.has(String(row[keyField]))
      );
      onExport(selectedRows);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!onBulkStatusChange || !bulkStatus) return;
    onBulkStatusChange(Array.from(selectedIds), bulkStatus);
    setBulkStatus('');
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-[var(--accent-gold)]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[var(--accent-gold)]" />
    );
  };

  useEffect(() => {
    if (!isColumnMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(target) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(target)
      ) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  return (
    <div className={cn('space-y-4', className)}>
      {enableColumnVisibility && (
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              ref={columnButtonRef}
              onClick={() => setIsColumnMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--panel)] hover:bg-[var(--background)] transition-colors"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isColumnMenuOpen}
            >
              <Columns className="h-4 w-4" />
              Columns
            </button>
            {isColumnMenuOpen && (
              <div
                ref={columnMenuRef}
                className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 shadow-lg"
                role="menu"
              >
                {columns.map((column) => {
                  const isVisible = !hiddenColumns.has(column.key);
                  const isLastVisible = isVisible && visibleColumns.length === 1;
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--background)]"
                    >
                      <Checkbox
                        checked={isVisible}
                        onChange={() => toggleColumnVisibility(column.key)}
                        size="small"
                        disabled={isLastVisible}
                        sx={{
                          color: 'var(--text-secondary)',
                          '&.Mui-checked': { color: 'var(--accent-gold)' },
                        }}
                      />
                      <span className="truncate">{column.header}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectable && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-[var(--panel)] border border-[var(--border)] rounded-lg">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            {onBulkStatusChange && bulkStatusOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  <option value="">Update status...</option>
                  {bulkStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--border)] rounded-lg transition-colors disabled:opacity-60"
                >
                  Update
                </button>
              </div>
            )}
            {onExport && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[var(--error)] hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
        <table className="w-full">
          <thead
            className={cn(
              'bg-[var(--panel)] border-b border-[var(--border)]',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="small"
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': {
                        color: 'var(--accent-gold)',
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: 'var(--accent-gold)',
                      },
                    }}
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]',
                    column.sortable && 'cursor-pointer select-none hover:bg-[var(--background)]'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="w-12 px-4 py-3 text-left">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-[var(--background)] divide-y divide-[var(--border)]">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]"
                >
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const rowId = String(row[keyField]);
                const isSelected = selectedIds.has(rowId);
                const customRowClassName = getRowClassName?.(row, rowIndex);

                return (
                  <tr
                    key={rowId}
                    data-row-id={rowId}
                    className={cn(
                      'transition-colors',
                      zebraStripes && rowIndex % 2 === 1 && 'bg-[var(--panel)]/40',
                      onRowClick && 'cursor-pointer hover:bg-[var(--panel)]',
                      isSelected && 'bg-[var(--accent-gold)]/5',
                      customRowClassName
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          size="small"
                          sx={{
                            color: 'var(--text-secondary)',
                            '&.Mui-checked': {
                              color: 'var(--accent-gold)',
                            },
                          }}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-3 text-sm text-[var(--text-primary)]"
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || '-'}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 rounded hover:bg-[var(--panel)] transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete([rowId])}
                              className="p-1.5 rounded hover:bg-[var(--panel)] transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--error)]" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>Showing {sortedData.length} results</span>
          {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
        </div>
      )}
    </div>
  );
}
