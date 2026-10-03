interface AsyncStatusProps {
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    emptyText: string;
}

export function AsyncStatus({ loading, error, isEmpty, emptyText }: AsyncStatusProps) {
    if (error) {
        return (
            <p className="message message-error" role="alert">
                {error}
            </p>
        );
    }

    if (loading && isEmpty) {
        return <p className="message">Cargando…</p>;
    }

    if (isEmpty) {
        return <p className="message">{emptyText}</p>;
    }

    return null;
}
