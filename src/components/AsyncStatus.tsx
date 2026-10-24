import type { ReactNode } from "react";

import { Icon } from "./Icon";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton, type SkeletonShape } from "./ui/Skeleton";

import styles from "./AsyncStatus.module.css";

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
            <div className={styles.error} role="alert">
                <Icon name="error" />
                <span className={styles.text}>{error}</span>
                {onRetry && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="rotate"
                        disabled={loading}
                        onClick={onRetry}
                    >
                        {loading ? "Reintentando…" : "Reintentar"}
                    </Button>
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
