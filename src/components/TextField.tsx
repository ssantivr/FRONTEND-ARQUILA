import { useId } from "react";

import { MAX_TEXT_LENGTH } from "../utils/limits";

interface TextFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    max?: number;
    required?: boolean;
    multiline?: boolean;
    className?: string;
    placeholder?: string;
    /** Marked as wrong, for instance a required value that is still missing. */
    invalid?: boolean;
    /** A number, not a free text: decimal keyboard and no character counter. */
    numeric?: boolean;
}

/** A text the user types, with its limit in view (R07). */
export function TextField({
    label,
    value,
    onChange,
    max = MAX_TEXT_LENGTH,
    required,
    multiline = false,
    className = "",
    placeholder,
    invalid = false,
    numeric = false,
}: TextFieldProps) {
    const id = useId();
    const left = max - value.length;

    const common = {
        id,
        value,
        required,
        placeholder,
        maxLength: max,
        "aria-invalid": left < 0 || invalid || undefined,
        "aria-describedby": numeric ? undefined : `${id}-count`,
        inputMode: numeric ? ("decimal" as const) : undefined,
    };

    return (
        <div className={`field ${className}`.trim()}>
            <label htmlFor={id}>{label}</label>
            {multiline ? (
                <textarea {...common} rows={2} onChange={(event) => onChange(event.target.value)} />
            ) : (
                <input {...common} onChange={(event) => onChange(event.target.value)} />
            )}
            {!numeric && (
                <span id={`${id}-count`} className={left <= 0 ? "counter counter-full" : "counter"}>
                    {value.length}/{max}
                </span>
            )}
            {!numeric && left <= 0 && (
                <span className="visually-hidden" role="status">
                    Llegaste al máximo de {max} caracteres.
                </span>
            )}
        </div>
    );
}
