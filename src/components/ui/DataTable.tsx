import { useMemo, useState, type ReactNode } from "react";

import styles from "./DataTable.module.css";

export interface Column<Row> {
    id: string;
    header: string;
    cell: (row: Row) => ReactNode;
    /** Figures: aligned to the right and in the tabular font. */
    numeric?: boolean;
    /** Value to sort by. A column without it cannot be sorted. */
    sortValue?: (row: Row) => string | number | null;
}

export type SortDirection = "ascending" | "descending";

interface DataTableProps<Row> {
    /** Name of the table for screen readers; it is not shown. */
    caption: string;
    columns: readonly Column<Row>[];
    rows: readonly Row[];
    rowKey: (row: Row) => string | number;
    /** Shown in place of the rows when there are none. */
    empty?: ReactNode;
    initialSort?: { column: string; direction: SortDirection };
}

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

function compare(a: string | number | null, b: string | number | null): number {
    if (a === null || b === null) {
        // Rows without a value go last whichever the direction.
        return a === b ? 0 : a === null ? 1 : -1;
    }

    return typeof a === "number" && typeof b === "number"
        ? a - b
        : collator.compare(String(a), String(b));
}

/**
 * A light table: sticky header, rows of `--row-height`, sorting by the columns that allow it
 * (the header is a button and `aria-sort` says the order). Under 720 px each row becomes a card
 * with the name of each column beside its value (`data-label`, `shell.css`).
 */
export function DataTable<Row>({
    caption,
    columns,
    rows,
    rowKey,
    empty,
    initialSort,
}: DataTableProps<Row>) {
    const [sort, setSort] = useState(initialSort ?? null);

    const sorted = useMemo(() => {
        const column = columns.find((item) => item.id === sort?.column);

        if (sort === null || column?.sortValue === undefined) {
            return rows;
        }

        const value = column.sortValue;
        const sign = sort.direction === "ascending" ? 1 : -1;

        return [...rows].sort((a, b) => {
            const va = value(a);
            const vb = value(b);

            return va === null || vb === null ? compare(va, vb) : sign * compare(va, vb);
        });
    }, [rows, columns, sort]);

    function toggle(column: string) {
        setSort((current) =>
            current?.column === column && current.direction === "ascending"
                ? { column, direction: "descending" }
                : { column, direction: "ascending" },
        );
    }

    return (
        <div className={styles.scroll}>
            <table className={`${styles.table} table-dense`}>
                <caption className="visually-hidden">{caption}</caption>
                <thead>
                    <tr>
                        {columns.map((column) => {
                            const active = sort?.column === column.id;

                            return (
                                <th
                                    key={column.id}
                                    scope="col"
                                    className={column.numeric ? "numeric" : undefined}
                                    aria-sort={active ? sort.direction : undefined}
                                >
                                    {column.sortValue === undefined ? (
                                        column.header
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.sort}
                                            onClick={() => toggle(column.id)}
                                        >
                                            {column.header}
                                            <span className={styles.arrow} aria-hidden="true">
                                                {active
                                                    ? sort.direction === "ascending"
                                                        ? "▲"
                                                        : "▼"
                                                    : "↕"}
                                            </span>
                                        </button>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className={styles.empty}>
                                {empty ?? "No hay nada que mostrar."}
                            </td>
                        </tr>
                    ) : (
                        sorted.map((row) => (
                            <tr key={rowKey(row)}>
                                {columns.map((column) => (
                                    <td
                                        key={column.id}
                                        data-label={column.header}
                                        className={column.numeric ? "numeric" : undefined}
                                    >
                                        {column.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
