interface MetricCardProps {
    label: string;
    value: string;
    detail?: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
    return (
        <div className="metric">
            <span className="metric-label">{label}</span>
            <span className="metric-value">{value}</span>
            {detail && <span className="metric-detail">{detail}</span>}
        </div>
    );
}
