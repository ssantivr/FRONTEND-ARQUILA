import { useCallback, useEffect, useId, useRef, useState } from "react";

import { errorMessage } from "../hooks/useAsync";
import { notificationsApi } from "../services/api";
import { ApiError } from "../services/http";
import type { Notification } from "../types/api";
import { formatDate } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { IconButton } from "./ui/IconButton";

import styles from "./Notifications.module.css";

type Feed =
    | { state: "loading" }
    | { state: "ready"; items: Notification[] }
    | { state: "error"; message: string }
    /** The API answered 404: it is older than the route, so there is nothing to ask for. */
    | { state: "missing" };

/**
 * The bell of the top bar, with what `GET /notifications` returns. The dot and its count are the
 * unread ones; opening one marks it read. The list is asked for when the bar appears and again
 * each time the panel is opened, so it is never older than the last look at it.
 */
export function Notifications() {
    const [open, setOpen] = useState(false);
    const [feed, setFeed] = useState<Feed>({ state: "loading" });
    const [actionError, setActionError] = useState<string | null>(null);
    const panelId = useId();
    const root = useRef<HTMLDivElement>(null);

    const load = useCallback(() => {
        let cancelled = false;

        notificationsApi
            .list()
            .then((items) => {
                if (!cancelled) {
                    setFeed({ state: "ready", items });
                }
            })
            .catch((reason: unknown) => {
                if (cancelled) {
                    return;
                }

                setFeed(
                    reason instanceof ApiError && reason.status === 404
                        ? { state: "missing" }
                        : { state: "error", message: errorMessage(reason) },
                );
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(load, [load]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const cancel = load();

        function closeOutside(event: PointerEvent) {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        // Escape closes the panel and gives the focus back to the bell.
        function closeWithEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                root.current?.querySelector("button")?.focus();
            }
        }

        document.addEventListener("pointerdown", closeOutside);
        document.addEventListener("keydown", closeWithEscape, true);

        return () => {
            cancel();
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeWithEscape, true);
        };
    }, [open, load]);

    const items = feed.state === "ready" ? feed.items : [];
    const unread = items.filter((item) => item.read_at === null).length;

    /** Puts the answer of the API in place of the item, so the list does not wait for a reload. */
    function replace(next: Notification) {
        setFeed((previous) =>
            previous.state === "ready"
                ? {
                      state: "ready",
                      items: previous.items.map((item) => (item.id === next.id ? next : item)),
                  }
                : previous,
        );
    }

    async function markRead(item: Notification) {
        if (item.read_at !== null) {
            return;
        }

        setActionError(null);

        try {
            replace(await notificationsApi.markRead(item.id));
        } catch (reason) {
            setActionError(errorMessage(reason));
        }
    }

    async function markAllRead() {
        setActionError(null);

        try {
            await notificationsApi.markAllRead();
            load();
        } catch (reason) {
            setActionError(errorMessage(reason));
        }
    }

    return (
        <div ref={root} className={styles.root}>
            <IconButton
                label={unread === 0 ? "Notificaciones" : `Notificaciones: ${unread} sin leer`}
                icon="bell"
                tooltipSide="bottom"
                tooltipAlign="end"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => setOpen((value) => !value)}
            />
            {unread > 0 && (
                <span className={styles.dot} aria-hidden="true">
                    {unread > 9 ? "9+" : unread}
                </span>
            )}
            {open && (
                <section id={panelId} className={styles.panel} aria-label="Notificaciones">
                    <header className={styles.head}>
                        <h2 className={styles.title}>Notificaciones</h2>
                        {unread > 0 && (
                            <Button variant="tertiary" size="sm" onClick={() => void markAllRead()}>
                                Marcar todas como leídas
                            </Button>
                        )}
                    </header>
                    {feed.state === "missing" ? (
                        <EmptyState
                            size="compact"
                            title="Sin notificaciones"
                            text="Esta versión de la API de ARQUILA todavía no envía avisos."
                        />
                    ) : (
                        <AsyncStatus
                            loading={feed.state === "loading"}
                            error={feed.state === "error" ? feed.message : null}
                            onRetry={load}
                            isEmpty={feed.state === "ready" && items.length === 0}
                            emptyTitle="Sin notificaciones"
                            emptyText="Cuando pase algo en tu cuenta, aparecerá aquí."
                        />
                    )}
                    {actionError && (
                        <p className={styles.error} role="alert">
                            {actionError}
                        </p>
                    )}
                    {items.length > 0 && (
                        <ul className={styles.list}>
                            {items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={styles.item}
                                        data-unread={item.read_at === null || undefined}
                                        onClick={() => void markRead(item)}
                                    >
                                        {item.read_at === null && (
                                            <span className="visually-hidden">Sin leer: </span>
                                        )}
                                        <span className={styles.itemTitle}>{item.title}</span>
                                        {item.body !== null && item.body !== "" && (
                                            <span className={styles.itemBody}>{item.body}</span>
                                        )}
                                        <time
                                            className={styles.itemDate}
                                            dateTime={item.created_at}
                                        >
                                            {formatDate(item.created_at)}
                                        </time>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
}
