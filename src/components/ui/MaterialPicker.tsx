import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import styles from "./MaterialPicker.module.css";

export interface MaterialOption<Id extends string> {
    id: Id;
    label: string;
    /** The sample: the same texture the 3D viewer paints with. */
    swatch: ReactNode;
    /** One line under the name («Rugosidad 0,8»). */
    detail?: string;
}

interface MaterialPickerProps<Id extends string> {
    /** Name of the group («Acabado del muro»). */
    label: string;
    options: readonly MaterialOption<Id>[];
    value: Id | null;
    onChange: (id: Id) => void;
    /** Why nothing can be chosen now; the samples are shown but cannot be picked. */
    disabledReason?: string;
}

/**
 * The samples of the surfaces that can be applied, as a radio group: Tab enters on the chosen
 * one and the arrows move the choice. The chosen sample gets the lime outline of the selection.
 */
export function MaterialPicker<Id extends string>({
    label,
    options,
    value,
    onChange,
    disabledReason,
}: MaterialPickerProps<Id>) {
    const group = useRef<HTMLDivElement>(null);
    const reasonId = useId();
    const disabled = disabledReason !== undefined;
    const focusIndex = Math.max(
        0,
        options.findIndex((option) => option.id === value),
    );

    function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];

        if (step === undefined) {
            return;
        }

        event.preventDefault();

        const next = (index + step + options.length) % options.length;

        onChange(options[next].id);
        group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
    }

    return (
        <div className={styles.wrap}>
            <div
                ref={group}
                role="radiogroup"
                aria-label={label}
                aria-disabled={disabled || undefined}
                aria-describedby={disabled ? reasonId : undefined}
                className={styles.grid}
            >
                {options.map((option, index) => {
                    const checked = option.id === value;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            disabled={disabled}
                            tabIndex={index === focusIndex ? 0 : -1}
                            className={styles.option}
                            onClick={() => onChange(option.id)}
                            onKeyDown={(event) => onKey(event, index)}
                        >
                            <span className={styles.swatch} aria-hidden="true">
                                {option.swatch}
                            </span>
                            <span className={styles.name}>{option.label}</span>
                            {option.detail !== undefined && (
                                <span className={styles.detail}>{option.detail}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {disabled && (
                <p id={reasonId} className={styles.reason}>
                    {disabledReason}
                </p>
            )}
        </div>
    );
}
