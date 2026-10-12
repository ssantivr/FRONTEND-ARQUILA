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
        return (
            <div className="empty-state">
                <svg className="empty-art" viewBox="0 0 64 48" aria-hidden="true">
                    <path d="M4 44h56M12 44V20l20-14 20 14v24M26 44V30h12v14" />
                </svg>
                <p className="message">{emptyText}</p>
            </div>
        );
    }

    return null;
}
