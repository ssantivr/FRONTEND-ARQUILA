interface ProgressBarProps {
    label: string;
    /** Share of the total, from 0 to 1. Values outside that range are clamped. */
    value: number;
}

export function ProgressBar({ label, value }: ProgressBarProps) {
    const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

    return (
        <span
            className="bar"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
        >
            <span style={{ width: `${percent}%` }} />
        </span>
    );
}
