import { EmptyState } from "./ui/EmptyState";

interface AsyncStatusProps {
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    emptyText: string;
    onRetry?: () => void;
}

export function AsyncStatus({ loading, error, isEmpty, emptyText, onRetry }: AsyncStatusProps) {
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
            <div className="skeleton" role="status">
                <span className="skeleton-text">Cargando…</span>
                <span className="skeleton-bar" aria-hidden="true" />
                <span className="skeleton-bar" aria-hidden="true" />
                <span className="skeleton-bar" aria-hidden="true" />
            </div>
        );
    }

    if (isEmpty && emptyText) {
        return <EmptyState text={emptyText} />;
    }

    return null;
}
