import type { ReactNode } from "react";

import { Icon } from "../Icon";
import { Button } from "./Button";

import styles from "./ErrorState.module.css";

interface ErrorStateProps {
    /** What happened, in words: colour alone never says it. */
    message: ReactNode;
    /** With it, the way to try again. */
    onRetry?: () => void;
    /** The retry is running: the button says so and waits. */
    retrying?: boolean;
    className?: string;
}

/** Something failed: what happened, announced as soon as it appears, and how to try again. */
export function ErrorState({ message, onRetry, retrying = false, className }: ErrorStateProps) {
    return (
        <div className={[styles.error, className].filter(Boolean).join(" ")} role="alert">
            <Icon name="error" />
            <span className={styles.text}>{message}</span>
            {onRetry !== undefined && (
                <Button
                    variant="secondary"
                    size="sm"
                    icon="rotate"
                    disabled={retrying}
                    onClick={onRetry}
                >
                    {retrying ? "Reintentando…" : "Reintentar"}
                </Button>
            )}
        </div>
    );
}
