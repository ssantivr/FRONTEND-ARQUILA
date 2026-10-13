import type { ReactNode } from "react";

import { EmptyState } from "./ui/EmptyState";

interface AsyncStatusProps {
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    emptyText: string;
    emptyTitle?: string;
    emptyAction?: ReactNode;
    /** Shape of the placeholder shown while loading, so it matches what is about to appear. */
    skeleton?: "lines" | "cards" | "rows";
    onRetry?: () => void;
}

const PLACEHOLDERS: Record<NonNullable<AsyncStatusProps["skeleton"]>, number> = {
    lines: 3,
    cards: 4,
    rows: 5,
};

export function AsyncStatus({
    loading,
    error,
    isEmpty,
    emptyText,
    emptyTitle,
    emptyAction,
    skeleton = "lines",
    onRetry,
}: AsyncStatusProps) {
    if (error) {
        return (
            <div className="message message-error" role="alert">
                <span>{error}</span>
                {onRetry && (
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={loading}
                        onClick={onRetry}
                    >
                        {loading ? "Reintentando…" : "Reintentar"}
                    </button>
                )}
            </div>
        );
    }

    if (loading && isEmpty) {
        return (
            <div className={`skeleton skeleton-${skeleton}`} role="status">
                <span className="skeleton-text">Cargando…</span>
                {Array.from({ length: PLACEHOLDERS[skeleton] }, (_, index) => (
                    <span key={index} className="skeleton-bar" aria-hidden="true" />
                ))}
            </div>
        );
    }

    if (isEmpty && emptyText) {
        return <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />;
    }

    return null;
}
