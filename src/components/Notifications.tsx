import { useEffect, useId, useRef, useState } from "react";

import { EmptyState } from "./ui/EmptyState";
import { IconButton } from "./ui/IconButton";

import styles from "./Notifications.module.css";

/**
 * The bell of the top bar. The API sends no notifications yet, so there is nothing to count and
 * no dot: the panel says so plainly instead of showing invented ones. When the backend has a
 * route for them, this is where the list goes.
 */
export function Notifications() {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

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
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeWithEscape, true);
        };
    }, [open]);

    return (
        <div ref={root} className={styles.root}>
            <IconButton
                label="Notificaciones"
                icon="bell"
                tooltipSide="bottom"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => setOpen((value) => !value)}
            />
            {open && (
                <section id={panelId} className={styles.panel} aria-label="Notificaciones">
                    <EmptyState
                        size="compact"
                        title="Sin notificaciones"
                        text="La API de ARQUILA todavía no envía avisos. Cuando los envíe, aparecerán aquí."
                    />
                </section>
            )}
        </div>
    );
}
