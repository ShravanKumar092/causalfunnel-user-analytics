import React from 'react';
import './DataTable.css';

export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found'
}) => {
  return (
    <div className="table-responsive-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={{ width: col.width, textAlign: col.align || 'left' }}
                className={col.headerClassName || ''}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = row[keyField] || rowIndex;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'clickable-row' : ''}
                >
                  {columns.map((col, colIndex) => {
                    const value = row[col.key];
                    return (
                      <td
                        key={col.key || colIndex}
                        style={{ textAlign: col.align || 'left' }}
                        className={col.cellClassName || ''}
                      >
                        {col.render ? col.render(value, row, rowIndex) : (value ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
