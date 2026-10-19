import { cloneElement, useId, type ReactElement, type ReactNode } from "react";

import { Icon } from "../Icon";

import styles from "./Field.module.css";

interface ControlProps {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
}

interface FieldProps {
    label: string;
    hint?: string;
    error?: string | null;
    /** Marks the field as optional next to its label; required is the norm and is not marked. */
    optional?: boolean;
    /** Something at the end of the label row, such as a link to recover the password. */
    aside?: ReactNode;
    /** The input, select or textarea; the field wires its label, hint and error to it. */
    children: ReactElement<ControlProps>;
}

/**
 * A label, its control and one note under it. The note is the hint, or the error when there is
 * one: the error comes with an icon and a word, is linked with `aria-describedby` and is
 * announced as soon as it appears.
 */
export function Field({ label, hint, error, optional = false, aside, children }: FieldProps) {
    const id = useId();
    const noteId = `${id}-note`;
    const failed = error !== undefined && error !== null && error !== "";
    const note = failed ? error : hint;

    return (
        <div className={failed ? `${styles.field} ${styles.invalid}` : styles.field}>
            <div className={styles.head}>
                <label htmlFor={id} className={styles.label}>
                    {label}
                    {optional && <span className={styles.optional}> (opcional)</span>}
                </label>
                {aside}
            </div>
            {cloneElement(children, {
                id,
                "aria-describedby": note === undefined ? undefined : noteId,
                "aria-invalid": failed || undefined,
            })}
            {note !== undefined && (
                <p id={noteId} className={styles.note} role={failed ? "alert" : undefined}>
                    {failed && <Icon name="error" />}
                    <span>{note}</span>
                </p>
            )}
        </div>
    );
}
