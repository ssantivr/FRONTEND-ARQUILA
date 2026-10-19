import {
    useId,
    useState,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";

import { Icon, type IconName } from "../Icon";
import { Field } from "./Field";

import styles from "./Input.module.css";

interface LabelledProps {
    label: string;
    hint?: string;
    error?: string | null;
    optional?: boolean;
    aside?: ReactNode;
}

interface ControlProps extends InputHTMLAttributes<HTMLInputElement> {
    /** Icon inside the field, at the start («mail» for an e-mail address). */
    icon?: IconName;
    /** A unit after the value («m», «m²»). */
    unit?: string;
    /** A button at the end of the field. */
    end?: ReactNode;
}

/** The input alone, with its icon, unit or end button; `Field` gives it a label. */
export function InputControl({ icon, unit, end, className, ...rest }: ControlProps) {
    return (
        <span className={styles.box}>
            {icon !== undefined && <Icon name={icon} className={styles.lead} />}
            <input
                {...rest}
                className={[
                    styles.control,
                    icon !== undefined && styles.withIcon,
                    (unit !== undefined || end !== undefined) && styles.withEnd,
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
            />
            {unit !== undefined && (
                <span className={styles.unit} aria-hidden="true">
                    {unit}
                </span>
            )}
            {end}
        </span>
    );
}

type InputProps = LabelledProps & Omit<ControlProps, "id" | "end">;

/** A text field with its label, hint and error already wired to the control. */
export function Input({ label, hint, error, optional, aside, unit, ...rest }: InputProps) {
    // The unit is drawn, so it is also said: «Retiro, en m».
    const hintWithUnit =
        unit === undefined ? hint : [hint, `En ${unit}.`].filter(Boolean).join(" ");

    return (
        <Field label={label} hint={hintWithUnit} error={error} optional={optional} aside={aside}>
            <InputControl {...rest} unit={unit} />
        </Field>
    );
}

type PasswordInputProps = LabelledProps &
    Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type">;

/**
 * A password field with a button that shows what was typed. The button keeps one name and says
 * its state with `aria-pressed`.
 */
export function PasswordInput({
    label,
    hint,
    error,
    optional,
    aside,
    ...rest
}: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    return (
        <Field label={label} hint={hint} error={error} optional={optional} aside={aside}>
            <InputControl
                {...rest}
                icon="lock"
                type={visible ? "text" : "password"}
                end={
                    <button
                        type="button"
                        className={styles.reveal}
                        aria-label="Mostrar contraseña"
                        aria-pressed={visible}
                        onClick={() => setVisible((value) => !value)}
                    >
                        <Icon name={visible ? "eyeOff" : "eye"} />
                    </button>
                }
            />
        </Field>
    );
}

/** The select alone, for toolbars where the label is outside or hidden. */
export function SelectControl({
    className,
    children,
    ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <span className={styles.box}>
            <select
                {...rest}
                className={[styles.control, styles.select, className].filter(Boolean).join(" ")}
            >
                {children}
            </select>
            <Icon name="chevronDown" className={styles.caret} />
        </span>
    );
}

type SelectProps = LabelledProps &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
        /** The `<option>` elements. */
        children: ReactNode;
    };

/** A native select, which every platform already makes accessible, with its label and error. */
export function Select({ label, hint, error, optional, aside, children, ...rest }: SelectProps) {
    return (
        <Field label={label} hint={hint} error={error} optional={optional} aside={aside}>
            <SelectControl {...rest}>{children}</SelectControl>
        </Field>
    );
}

type TextareaProps = LabelledProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function Textarea({
    label,
    hint,
    error,
    optional,
    aside,
    className,
    ...rest
}: TextareaProps) {
    return (
        <Field label={label} hint={hint} error={error} optional={optional} aside={aside}>
            <textarea
                {...rest}
                className={[styles.control, styles.area, className].filter(Boolean).join(" ")}
            />
        </Field>
    );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
    label: string;
    /** One line under the label; for a disabled box, why it cannot be ticked. */
    description?: string;
}

/** A box to tick, with its label as the click target and an optional line under it. */
export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
    const id = useId();
    const describedBy = description === undefined ? undefined : `${id}-description`;

    return (
        <div className={[styles.check, className].filter(Boolean).join(" ")}>
            <input
                {...rest}
                id={id}
                type="checkbox"
                className={styles.tick}
                aria-describedby={describedBy}
            />
            <span className={styles.checkText}>
                <label htmlFor={id} className={styles.checkLabel}>
                    {label}
                </label>
                {description !== undefined && (
                    <span id={describedBy} className={styles.checkDescription}>
                        {description}
                    </span>
                )}
            </span>
        </div>
    );
}
