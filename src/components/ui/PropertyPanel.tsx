import { useEffect, useId, useState, type ReactNode } from "react";

import { DerivedTag } from "./Tag";

import styles from "./PropertyPanel.module.css";

interface PropertyPanelProps {
    /** What is selected («Cocina»). */
    title: string;
    /** Its kind («Cuarto», «Muro»). */
    kind?: string;
    actions?: ReactNode;
    children: ReactNode;
}

/** The inspector of the selection: its name and kind, then groups of properties. */
export function PropertyPanel({ title, kind, actions, children }: PropertyPanelProps) {
    return (
        <section className={styles.panel} aria-label={`Propiedades de ${title}`}>
            <header className={styles.header}>
                <div className={styles.heading}>
                    {kind !== undefined && <span className={styles.kind}>{kind}</span>}
                    <h3 className={styles.title}>{title}</h3>
                </div>
                {actions}
            </header>
            {children}
        </section>
    );
}

/** A group of properties under a small heading («Posición», «Dimensiones»). */
export function PropertySection({
    title,
    derived = false,
    children,
}: {
    title: string;
    /** The whole group was calculated by the interface. */
    derived?: boolean;
    children: ReactNode;
}) {
    const id = useId();

    return (
        <section className={styles.section} aria-labelledby={id}>
            <h4 id={id} className={styles.sectionTitle}>
                {title}
                {derived && <DerivedTag />}
            </h4>
            <dl className={styles.rows}>{children}</dl>
        </section>
    );
}

/** One read-only property: its name and its value, with the unit. */
export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className={styles.row}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.value}>{children}</dd>
        </div>
    );
}

interface PropertyFieldProps {
    label: string;
    /** The saved value. */
    value: number;
    unit: string;
    /** Called with the new value when the user confirms it (Enter or leaving the field). */
    onCommit: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    /** Decimals shown; the value is rounded to them. */
    decimals?: number;
    disabled?: boolean;
}

const format = (value: number, decimals: number) =>
    value.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

/** Accepts «2,5» as well as «2.5». */
function parse(text: string): number | null {
    const value = Number(text.trim().replace(/\s/g, "").replace(",", "."));

    return text.trim() === "" || !Number.isFinite(value) ? null : value;
}

/**
 * An editable number of the inspector. It sends nothing while the user types: Enter or leaving
 * the field confirms, Escape goes back to the saved value, and a value out of range says why
 * instead of being sent.
 */
export function PropertyField({
    label,
    value,
    unit,
    onCommit,
    min,
    max,
    step = 0.1,
    decimals = 2,
    disabled = false,
}: PropertyFieldProps) {
    const id = useId();
    const [text, setText] = useState(format(value, decimals));
    const [error, setError] = useState<string | null>(null);

    // A new saved value (undo, another client, the server rounding) replaces the draft.
    useEffect(() => {
        setText(format(value, decimals));
        setError(null);
    }, [value, decimals]);

    function commit() {
        const next = parse(text);

        if (next === null) {
            setError("Escribe un número.");
            return;
        }

        if ((min !== undefined && next < min) || (max !== undefined && next > max)) {
            setError(
                max === undefined
                    ? `Mínimo ${format(min ?? 0, decimals)} ${unit}.`
                    : `Entre ${format(min ?? 0, decimals)} y ${format(max, decimals)} ${unit}.`,
            );
            return;
        }

        const rounded = Number(next.toFixed(decimals));

        setError(null);
        setText(format(rounded, decimals));

        if (rounded !== value) {
            onCommit(rounded);
        }
    }

    return (
        <div className={styles.row}>
            <dt className={styles.label}>
                <label htmlFor={id}>
                    {label}
                    <span className="visually-hidden"> ({unit})</span>
                </label>
            </dt>
            <dd className={styles.value}>
                <span className={styles.field}>
                    <input
                        id={id}
                        className={styles.input}
                        inputMode="decimal"
                        value={text}
                        disabled={disabled}
                        step={step}
                        aria-invalid={error !== null || undefined}
                        aria-describedby={error === null ? undefined : `${id}-error`}
                        onChange={(event) => setText(event.target.value)}
                        onBlur={commit}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                commit();
                            } else if (event.key === "Escape") {
                                event.stopPropagation();
                                setText(format(value, decimals));
                                setError(null);
                            }
                        }}
                    />
                    <span className={styles.unit} aria-hidden="true">
                        {unit}
                    </span>
                </span>
                {error !== null && (
                    <span id={`${id}-error`} className={styles.error} role="alert">
                        {error}
                    </span>
                )}
            </dd>
        </div>
    );
}
