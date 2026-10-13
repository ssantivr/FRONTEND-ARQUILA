import { useEffect, useRef, useState } from "react";

import { useSaveStatus } from "../state/saveStatus";
import { Icon } from "./Icon";

/** How long «Guardado» stays on the button after a change is saved. */
const SAVED_MS = 1400;
/** A saving that starts within this time of a form being sent is taken as that form's. */
const SENT_WINDOW_MS = 1000;

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
    const sentAt = useRef(0);

    // The form says when it is sent. Reading it from the keyboard focus would fail in the
    // browsers that do not move the focus to a button when it is clicked.
    useEffect(() => {
        const form = button.current?.form;

        if (form === null || form === undefined) {
            return;
        }

        function remember() {
            sentAt.current = Date.now();
        }

        form.addEventListener("submit", remember);

        return () => form.removeEventListener("submit", remember);
    }, []);

    useEffect(() => {
        if (pending) {
            // The change is this form's if it was sent a moment before the saving started.
            if (Date.now() - sentAt.current < SENT_WINDOW_MS) {
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
                className="button-saving"
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
            <span className="visually-hidden" role="status">
                {stage === "saved" ? "Guardado." : ""}
            </span>
            {editing && (
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Cancelar
                </button>
            )}
        </>
    );
}
