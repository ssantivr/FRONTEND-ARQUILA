import { useState } from "react";

/**
 * Which errors of a form are in view. A field shows its error once the user has left it with
 * something written, or once the form was sent; from then on it is checked again on every key,
 * so the message goes away as soon as the value is right. The checks are read on each render.
 */
export function useFieldErrors<Field extends string>(checks: Record<Field, () => string | null>) {
    const [shown, setShown] = useState<ReadonlySet<Field>>(() => new Set());

    return {
        /** The error to show under a field, or `null`. */
        errorOf: (field: Field): string | null => (shown.has(field) ? checks[field]() : null),
        /** Starts showing the error of a field: call it when the field is left. */
        reveal: (field: Field) =>
            setShown((previous) => (previous.has(field) ? previous : new Set(previous).add(field))),
        /** Shows the errors of these fields and returns the first that is wrong, if any. */
        validate: (fields: readonly Field[]): Field | null => {
            setShown(new Set(fields));

            return fields.find((field) => checks[field]() !== null) ?? null;
        },
        /** Forgets every error, as when the form changes to another purpose. */
        reset: () => setShown(new Set()),
    };
}
