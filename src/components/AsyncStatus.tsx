import type { ReactNode } from "react";

import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { Skeleton, type SkeletonShape } from "./ui/Skeleton";

interface AsyncStatusProps {
    loading: boolean;
    error: string | null;
    isEmpty: boolean;
    emptyText: string;
    emptyTitle?: string;
    emptyAction?: ReactNode;
    /** `compact` when the state sits inside a block of a screen, not across it. */
    emptySize?: "compact" | "regular";
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
    emptySize,
    skeleton = "lines",
    onRetry,
}: AsyncStatusProps) {
    if (error) {
        return <ErrorState message={error} onRetry={onRetry} retrying={loading} />;
    }

    if (loading && isEmpty) {
        return <Skeleton shape={skeleton} />;
    }

    if (isEmpty && emptyText) {
        return (
            <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} size={emptySize} />
        );
    }

    return null;
}
