import { Button } from "./Button";

import styles from "./Pagination.module.css";

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPage: (page: number) => void;
    /** What is being counted, in the plural: «proyectos». */
    noun: string;
    disabled?: boolean;
}

/** «1–12 de 40 proyectos» with the previous and next page; nothing when all fit in one. */
export function Pagination({ page, pageSize, total, onPage, noun, disabled }: PaginationProps) {
    const pages = Math.max(1, Math.ceil(total / pageSize));

    if (total <= pageSize && page === 1) {
        return null;
    }

    const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <nav className={styles.pagination} aria-label={`Páginas de ${noun}`}>
            <Button
                variant="secondary"
                size="sm"
                icon="chevronLeft"
                disabled={disabled || page <= 1}
                onClick={() => onPage(page - 1)}
            >
                Anterior
            </Button>
            <p className={styles.where} aria-live="polite">
                <span className={styles.range}>
                    {first}–{last} de {total} {noun}
                </span>
                <span className={styles.page}>
                    Página {page} de {pages}
                </span>
            </p>
            <Button
                variant="secondary"
                size="sm"
                iconEnd="chevronRight"
                disabled={disabled || page >= pages}
                onClick={() => onPage(page + 1)}
            >
                Siguiente
            </Button>
        </nav>
    );
}
