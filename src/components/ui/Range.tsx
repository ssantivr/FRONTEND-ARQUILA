interface RangeProps {
    label: string;
    value: number;
    /** The value as the user reads it, with its unit. */
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

/** A slider with its name on the left and its current value on the right. */
export function Range({ label, value, display, min, max, step, onChange, disabled }: RangeProps) {
    return (
        <label className="range">
            <span className="range-head">
                <span>{label}</span>
                {/* Not an <output>: the label would name that element instead of the slider. */}
                <span className="range-value">{display}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                aria-valuetext={display}
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </label>
    );
}
