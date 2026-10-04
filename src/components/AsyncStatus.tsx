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
            <p className="message" role="status">
                Cargando…
            </p>
        );
    }

    if (isEmpty && emptyText) {
        return <p className="message">{emptyText}</p>;
    }

    return null;
}
