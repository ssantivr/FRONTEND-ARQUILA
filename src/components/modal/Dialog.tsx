import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
    title: string;
    size?: "small" | "large" | "viewer";
    /** A dialog that deletes or holds unsaved changes is not closed by clicking outside it. */
    closeOnBackdrop?: boolean;
    busy?: boolean;
    headerActions?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}

/** The only dialog of the application (R09): native focus trap, Escape and focus restore. */
export function Dialog({
    title,
    size = "small",
    closeOnBackdrop = false,
    busy = false,
    headerActions,
    onClose,
    children,
}: DialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const element = dialog.current;
        const opener = document.activeElement;

        if (element && !element.open) {
            element.showModal();
        }

        return () => {
            // React removes the element without closing it, so the focus is returned by hand.
            queueMicrotask(() => {
                if (!element?.isConnected && opener instanceof HTMLElement && opener.isConnected) {
                    opener.focus();
                }
            });
        };
    }, []);

    // In the body: inside a form, Enter in the dialog would send that form.
    return createPortal(
        <dialog
            ref={dialog}
            className={`modal modal-${size}`}
            aria-labelledby={titleId}
            aria-busy={busy}
            onCancel={(event) => {
                // A file input also fires cancel, and it bubbles up to here.
                if (event.target !== dialog.current) {
                    return;
                }

                event.preventDefault();

                if (!busy) {
                    onClose();
                }
            }}
            onKeyDown={(event) => {
                // Handled here: the browser force-closes a dialog on a repeated Escape.
                if (event.key === "Escape" && dialog.current?.contains(event.target as Node)) {
                    event.preventDefault();
                    event.stopPropagation();

                    if (!busy && !event.repeat) {
                        onClose();
                    }
                }
            }}
            onClose={(event) => {
                // React also hands over the close of a dialog opened from this one.
                if (event.target !== dialog.current) {
                    return;
                }

                // Only unmounting closes it: one closed by the browser is shown again.
                if (dialog.current.isConnected && !dialog.current.open) {
                    dialog.current.showModal();
                }

                if (!busy) {
                    onClose();
                }
            }}
            onClick={(event) => {
                if (closeOnBackdrop && !busy && event.target === dialog.current) {
                    onClose();
                }
            }}
        >
            <header className="modal-header">
                <h2 id={titleId}>{title}</h2>
                <div className="modal-actions">
                    {headerActions}
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={busy}
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </header>
            <div className="modal-body">{children}</div>
        </dialog>,
        document.body,
    );
}
