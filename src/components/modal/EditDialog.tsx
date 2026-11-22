import { useState, type ReactNode, type SyntheticEvent } from "react";

import { Dialog } from "./Dialog";
import { EditContext } from "./editState";
import { useModal } from "./modalContext";
import { useSaveState } from "./saveState";

interface EditDialogProps {
    editing: boolean;
    title: string;
    onCancel: () => void;
    children: ReactNode;
}

/** A section form stays in place to add, and moves into a dialog to update (R10). */
export function EditDialog({ editing, title, onCancel, children }: EditDialogProps) {
    if (!editing) {
        return <>{children}</>;
    }

    return (
        <UpdateDialog title={title} onCancel={onCancel}>
            {children}
        </UpdateDialog>
    );
}

function UpdateDialog({ title, onCancel, children }: Omit<EditDialogProps, "editing">) {
    const modal = useModal();
    const { pending, error } = useSaveState();
    const [changed, setChanged] = useState<string[]>([]);
    const [sent, setSent] = useState(false);

    function addChange(label: string) {
        setChanged((current) => (current.includes(label) ? current : [...current, label]));
    }

    function noteChange(event: SyntheticEvent) {
        const field = event.target as HTMLInputElement;
        const label = field.labels?.[0]?.firstChild?.textContent?.trim();

        if (label) {
            addChange(label);
        }
    }

    async function close() {
        if (changed.length > 0) {
            const discard = await modal.confirm({
                title: "Descartar los cambios",
                body: "Hay cambios sin guardar. ¿Cerrar sin guardarlos?",
                confirmLabel: "Descartar",
            });

            if (!discard) {
                return;
            }
        }

        onCancel();
    }

    return (
        <Dialog title={title} size="large" busy={pending} onClose={close}>
            <div
                className="dialog-content"
                onChangeCapture={noteChange}
                onSubmitCapture={() => setSent(true)}
            >
                <p className="message" role="status">
                    {pending
                        ? "Guardando…"
                        : changed.length > 0
                          ? `Se actualizará: ${changed.join(", ")}.`
                          : "Cambia lo que necesites y guarda."}
                </p>
                {sent && error && (
                    <p className="message message-error" role="alert">
                        {error}
                    </p>
                )}
                <EditContext.Provider value={{ noteChange: addChange, close }}>
                    {children}
                </EditContext.Provider>
            </div>
        </Dialog>
    );
}
