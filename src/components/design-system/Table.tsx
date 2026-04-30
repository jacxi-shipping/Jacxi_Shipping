import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface TableColumn<T> {
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyField: keyof T;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({ 
  data, 
  columns, 
  keyField, 
  emptyMessage = 'No data available' 
}: TableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--background)' }}>
            {columns.map((column, index) => (
              <th
                key={index}
                style={{
                  padding: '12px 16px',
                  textAlign: column.align || 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: column.width,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={String(row[keyField])} 
              style={{ 
                borderTop: '1px solid var(--border)',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(var(--text-primary-rgb), 0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((column, colIndex) => {
                let cellContent: ReactNode = null;
                
                if (column.render) {
                  cellContent = column.render(row);
                } else if (typeof column.accessor === 'function') {
                  cellContent = column.accessor(row);
                } else if (column.accessor) {
                  cellContent = row[column.accessor] as ReactNode;
                }

                return (
                  <td
                    key={colIndex}
                    style={{
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      textAlign: column.align || 'left',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

