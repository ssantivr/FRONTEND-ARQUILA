import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { Field } from "./Field";

interface LabelledProps {
    label: string;
    hint?: string;
    error?: string | null;
}

type InputProps = LabelledProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** A text field with its label, hint and error already wired to the control. */
export function Input({ label, hint, error, ...rest }: InputProps) {
    return (
        <Field label={label} hint={hint} error={error}>
            <input {...rest} />
        </Field>
    );
}

type SelectProps = LabelledProps &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
        /** The `<option>` elements. */
        children: ReactNode;
    };

/** A native select, which every platform already makes accessible, with its label and error. */
export function Select({ label, hint, error, children, ...rest }: SelectProps) {
    return (
        <Field label={label} hint={hint} error={error}>
            <select {...rest}>{children}</select>
        </Field>
    );
}
