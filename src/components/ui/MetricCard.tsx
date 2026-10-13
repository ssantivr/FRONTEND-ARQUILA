import { CountUp } from "../CountUp";

interface MetricCardProps {
    label: string;
    value: string;
    /** When given, the figure counts up to this number the first time it appears. */
    count?: { to: number; format: (value: number) => string; step?: number };
    detail?: string;
}

export function MetricCard({ label, value, count, detail }: MetricCardProps) {
    return (
        <div className="metric">
            <span className="metric-label">{label}</span>
            <span className="metric-value">
                {count === undefined ? (
                    value
                ) : (
                    <CountUp value={count.to} format={count.format} step={count.step} />
                )}
            </span>
            {detail && <span className="metric-detail">{detail}</span>}
        </div>
    );
}
