import * as RadixDialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";

import { useAnimatedClose } from "../../hooks/useAnimatedClose";
import { Button } from "./Button";

import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
    title: string;
    /** What will happen, and whether it can be undone. */
    children: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    /** A destructive action: the confirm button is red. */
    danger?: boolean;
    /** The action is running: the confirm button shows it and the window stays open. */
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Asks before an action that is hard to undo. It opens with the focus on «Cancelar», so pressing
 * Enter by habit never deletes anything; Escape and a click outside also cancel.
 */
export function ConfirmDialog({
    title,
    children,
    confirmLabel,
    cancelLabel = "Cancelar",
    danger = false,
    pending = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const closing = useAnimatedClose<HTMLDivElement>(onCancel);
    const cancel = useRef<HTMLButtonElement>(null);

    return (
        <RadixDialog.Root
            open={closing.open}
            onOpenChange={(open) => {
                if (!open && !pending) {
                    closing.requestClose();
                }
            }}
        >
            <RadixDialog.Portal>
                <RadixDialog.Overlay className={styles.overlay} />
                <RadixDialog.Content
                    ref={closing.ref}
                    role="alertdialog"
                    onAnimationEnd={closing.onAnimationEnd}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        cancel.current?.focus();
                    }}
                    className={styles.dialog}
                >
                    <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
                    <RadixDialog.Description asChild>
                        <div className={styles.text}>{children}</div>
                    </RadixDialog.Description>
                    <div className={styles.actions}>
                        <button
                            ref={cancel}
                            type="button"
                            className="button-secondary"
                            disabled={pending}
                            onClick={() => closing.requestClose()}
                        >
                            {cancelLabel}
                        </button>
                        <Button
                            variant={danger ? "danger" : "primary"}
                            loading={pending}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
