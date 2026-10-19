import { cloneElement, useId, type ReactElement } from "react";

interface ControlProps {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
}

interface FieldProps {
    label: string;
    hint?: string;
    error?: string | null;
    /** The input, select or textarea; the field wires its label, hint and error to it. */
    children: ReactElement<ControlProps>;
}

export function Field({ label, hint, error, children }: FieldProps) {
    const id = useId();
    const noteId = `${id}-note`;
    const failed = error !== undefined && error !== null && error !== "";
    const note = failed ? error : hint;

    return (
        <div className={failed ? "field field-invalid" : "field"}>
            <label htmlFor={id}>{label}</label>
            {cloneElement(children, {
                id,
                "aria-describedby": note === undefined ? undefined : noteId,
                "aria-invalid": failed || undefined,
            })}
            {note !== undefined && (
                <p id={noteId} className="field-note" role={failed ? "alert" : undefined}>
                    {note}
                </p>
            )}
        </div>
    );
}
