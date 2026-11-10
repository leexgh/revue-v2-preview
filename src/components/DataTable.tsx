import React, { useMemo, useState } from 'react';

export interface Column<T> {
    id: string;
    header: React.ReactNode;
    /** Value used for sorting and for the text filter. */
    value?: (row: T) => string | number | null | undefined;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    width?: number | string;
    align?: 'left' | 'right';
}

interface DataTableProps<T> {
    rows: T[];
    columns: Column<T>[];
    rowKey: (row: T) => string;
    initialSort?: { id: string; desc: boolean };
    emptyMessage?: string;
    /** Rows matching this always sort after the rest, whatever the sort column. */
    sortLast?: (row: T) => boolean;
}

export function DataTable<T>({
    rows,
    columns,
    rowKey,
    initialSort,
    emptyMessage = 'Nothing matches these filters.',
    sortLast,
}: DataTableProps<T>) {
    const [sort, setSort] = useState<{ id: string; desc: boolean } | undefined>(
        initialSort
    );

    const sorted = useMemo(() => {
        const demote = (row: T) => (sortLast && sortLast(row) ? 1 : 0);
        const column = sort ? columns.find(item => item.id === sort.id) : undefined;
        if (!column || !column.value) {
            return sortLast ? [...rows].sort((a, b) => demote(a) - demote(b)) : rows;
        }
        const read = column.value;
        return [...rows].sort((a, b) => {
            if (demote(a) !== demote(b)) {
                return demote(a) - demote(b);
            }
            const left = read(a);
            const right = read(b);
            if (left === right) {
                return 0;
            }
            if (left === null || left === undefined || left === '') {
                return 1;
            }
            if (right === null || right === undefined || right === '') {
                return -1;
            }
            const result =
                typeof left === 'number' && typeof right === 'number'
                    ? left - right
                    : String(left).localeCompare(String(right), undefined, {
                          numeric: true,
                      });
            return sort && sort.desc ? -result : result;
        });
    }, [rows, columns, sort, sortLast]);

    const toggle = (column: Column<T>) => {
        if (column.sortable === false || !column.value) {
            return;
        }
        setSort(current =>
            current && current.id === column.id
                ? { id: column.id, desc: !current.desc }
                : { id: column.id, desc: false }
        );
    };

    return (
        <div className="table-wrap">
            <table className="data">
                <thead>
                    <tr>
                        {columns.map(column => {
                            const isSorted = sort?.id === column.id;
                            const canSort = column.sortable !== false && !!column.value;
                            return (
                                <th
                                    key={column.id}
                                    style={{
                                        width: column.width,
                                        textAlign: column.align || 'left',
                                    }}
                                    className={`${canSort ? 'sortable' : ''}${
                                        isSorted ? ' sorted' : ''
                                    }`}
                                    onClick={() => toggle(column)}
                                >
                                    {column.header}
                                    {canSort && (
                                        <span className="sort-arrow">
                                            {isSorted ? (sort?.desc ? '↓' : '↑') : '↕'}
                                        </span>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(row => (
                        <tr key={rowKey(row)}>
                            {columns.map(column => (
                                <td
                                    key={column.id}
                                    style={{ textAlign: column.align || 'left' }}
                                >
                                    {column.render
                                        ? column.render(row)
                                        : column.value
                                        ? column.value(row)
                                        : null}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {!sorted.length && (
                        <tr>
                            <td colSpan={columns.length}>
                                <div className="empty">{emptyMessage}</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
