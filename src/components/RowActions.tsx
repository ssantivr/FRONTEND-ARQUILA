import { useEffect, useRef, useState } from "react";

import { useSaveStatus } from "../state/saveStatus";
import { Icon } from "./Icon";

/** How long «Guardado» stays on the button after a change is saved. */
const SAVED_MS = 1400;

interface RowActionsProps {
    label: string;
    onEdit: () => void;
    onDelete: () => void;
}

export function RowActions({ label, onEdit, onDelete }: RowActionsProps) {
    return (
        <div className="row-actions">
            <button
                type="button"
                className="button-secondary"
                aria-label={`Editar ${label}`}
                onClick={onEdit}
            >
                Editar
            </button>
            <button
                type="button"
                className="button-danger"
                aria-label={`Eliminar ${label}`}
                onClick={onDelete}
            >
                Eliminar
            </button>
        </div>
    );
}

interface FormActionsProps {
    editing: boolean;
    addLabel: string;
    disabled?: boolean;
    onCancel: () => void;
}

type Stage = "idle" | "saving" | "saved";

/**
 * The buttons that close a form. The one that sends it tells how the sending goes: a spinner
 * and «Guardando…» while the change travels, then a check and «Guardado» for a moment. Only the
 * form that was sent reacts, although every form of the project hears the same status.
 */
export function FormActions({ editing, addLabel, disabled, onCancel }: FormActionsProps) {
    const { pending, failed } = useSaveStatus();
    const button = useRef<HTMLButtonElement>(null);
    const [stage, setStage] = useState<Stage>("idle");

    useEffect(() => {
        if (pending) {
            // The change came from this form if the cursor is still in it.
            if (button.current?.form?.contains(document.activeElement) === true) {
                setStage("saving");
            }

            return;
        }

        setStage((current) => (current === "saving" && !failed ? "saved" : "idle"));
    }, [pending, failed]);

    useEffect(() => {
        if (stage !== "saved") {
            return;
        }

        const timer = window.setTimeout(() => setStage("idle"), SAVED_MS);

        return () => window.clearTimeout(timer);
    }, [stage]);

    return (
        <>
            <button
                ref={button}
                type="submit"
                disabled={disabled === true || stage === "saving"}
                aria-busy={stage === "saving" || undefined}
            >
                {stage === "saving" && (
                    <>
                        <span className="spinner" aria-hidden="true" />
                        Guardando…
                    </>
                )}
                {stage === "saved" && (
                    <span className="button-saved motion-pop">
                        <Icon name="check" />
                        Guardado
                    </span>
                )}
                {stage === "idle" && (editing ? "Guardar cambios" : addLabel)}
            </button>
            {editing && (
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Cancelar
                </button>
            )}
        </>
    );
}
