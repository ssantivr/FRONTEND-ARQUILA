import { useId, type ReactNode } from "react";

import { Icon } from "../Icon";

import styles from "./FilterBar.module.css";

interface FilterBarProps {
    /** Label of the search field («Buscar proyectos»). */
    searchLabel: string;
    search: string;
    onSearch: (value: string) => void;
    /** The other filters: `Select`, `SegmentedControl`… */
    children?: ReactNode;
    /** «4 de 12 proyectos». Announced when it changes. */
    resultText?: string;
    /** True when some filter narrows the list; then «Quitar filtros» appears. */
    active?: boolean;
    onClear?: () => void;
}

/** The row above a list or a table: search, filters, how many are left and how to undo it. */
export function FilterBar({
    searchLabel,
    search,
    onSearch,
    children,
    resultText,
    active = false,
    onClear,
}: FilterBarProps) {
    const id = useId();

    return (
        <div className={styles.bar} role="search">
            <div className={styles.search}>
                <label htmlFor={id} className="visually-hidden">
                    {searchLabel}
                </label>
                <Icon name="search" />
                <input
                    id={id}
                    type="search"
                    value={search}
                    placeholder={searchLabel}
                    onChange={(event) => onSearch(event.target.value)}
                />
            </div>
            {children !== undefined && <div className={styles.filters}>{children}</div>}
            <div className={styles.end}>
                {resultText !== undefined && (
                    <span className={styles.count} role="status">
                        {resultText}
                    </span>
                )}
                {active && onClear !== undefined && (
                    <button type="button" className="button-tertiary" onClick={onClear}>
                        Quitar filtros
                    </button>
                )}
            </div>
        </div>
    );
}
