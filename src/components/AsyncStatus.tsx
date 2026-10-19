import type { ReactNode } from "react";

import { EmptyState } from "./ui/EmptyState";
import { Skeleton, type SkeletonShape } from "./ui/Skeleton";

interface AsyncStatusProps {
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    emptyText: string;
    emptyTitle?: string;
    emptyAction?: ReactNode;
    /** Shape of the placeholder shown while loading, so it matches what is about to appear. */
    skeleton?: SkeletonShape;
    onRetry?: () => void;
}

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
        return <Skeleton shape={skeleton} />;
    }

    if (isEmpty && emptyText) {
        return <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />;
    }

    return null;
}
