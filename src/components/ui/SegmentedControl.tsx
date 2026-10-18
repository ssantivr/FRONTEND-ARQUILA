import { useRef, type KeyboardEvent } from "react";

import { Icon, type IconName } from "../Icon";

import styles from "./SegmentedControl.module.css";

export interface Segment<Value extends string> {
    value: Value;
    label: string;
    icon?: IconName;
}

interface SegmentedControlProps<Value extends string> {
    /** Name of the group for screen readers («Tema», «Vista»). */
    label: string;
    options: readonly Segment<Value>[];
    value: Value;
    onChange: (value: Value) => void;
    /** Show only the icons; the label stays as the accessible name and as a tooltip. */
    iconOnly?: boolean;
    size?: "sm" | "md";
}

/**
 * One choice among a few, all in view (theme, grid or list). It is a radio group: Tab enters on
 * the chosen option and the arrows move the choice, as in a native group of radio buttons.
 */
export function SegmentedControl<Value extends string>({
    label,
    options,
    value,
    onChange,
    iconOnly = false,
    size = "md",
}: SegmentedControlProps<Value>) {
    const group = useRef<HTMLDivElement>(null);

    function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        const step =
            event.key === "ArrowRight" || event.key === "ArrowDown"
                ? 1
                : event.key === "ArrowLeft" || event.key === "ArrowUp"
                  ? -1
                  : 0;
        const target =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : step === 0
                    ? null
                    : (index + step + options.length) % options.length;

        if (target === null) {
            return;
        }

        event.preventDefault();
        onChange(options[target].value);
        group.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[target]?.focus();
    }

    return (
        <div
            ref={group}
            role="radiogroup"
            aria-label={label}
            className={`${styles.group} ${styles[size]}`}
        >
            {options.map((option, index) => {
                const checked = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={iconOnly ? option.label : undefined}
                        title={iconOnly ? option.label : undefined}
                        tabIndex={checked ? 0 : -1}
                        className={styles.option}
                        onClick={() => onChange(option.value)}
                        onKeyDown={(event) => handleKey(event, index)}
                    >
                        {option.icon !== undefined && <Icon name={option.icon} />}
                        {!iconOnly && <span>{option.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}
