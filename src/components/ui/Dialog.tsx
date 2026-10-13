import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import styles from "./Dialog.module.css";

interface DialogProps {
    title: string;
    /** Extra controls shown in the header, before «Cerrar». */
    actions?: ReactNode;
    /** `viewer` fills the window to show a file or a sample; `compact` wraps a short text. */
    size?: "viewer" | "compact";
    onClose: () => void;
    children: ReactNode;
}

/**
 * A modal window. Radix keeps the focus inside while it is open, closes it with Escape or a click
 * outside and gives the focus back to the control that opened it.
 */
export function Dialog({ title, actions, size = "viewer", onClose, children }: DialogProps) {
    return (
        <RadixDialog.Root
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <RadixDialog.Portal>
                <RadixDialog.Overlay className={styles.overlay} />
                <RadixDialog.Content
                    className={`${styles.dialog} ${styles[size]} modal`}
                    aria-describedby={undefined}
                >
                    <header className={styles.header}>
                        <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
                        <div className={styles.actions}>
                            {actions}
                            <RadixDialog.Close className="button-secondary">
                                Cerrar
                            </RadixDialog.Close>
                        </div>
                    </header>
                    <div className={styles.body}>{children}</div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
