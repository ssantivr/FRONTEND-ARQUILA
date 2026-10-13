import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";

import { formatMoney, formatNumber } from "../utils/format";
import type { CategoryCost } from "../utils/materials";
import { Skeleton } from "./ui/Skeleton";

// Recharts is only needed once there is something to chart, so it loads apart from the app.
const CostChart = lazy(() => import("./CostChart"));

interface CostSummaryProps {
    items: CategoryCost[];
    /** Read by screen readers before the figures. */
    label: string;
}

/** The same figures as a plain list, for when the chart itself cannot be loaded or drawn. */
function CostList({ items }: { items: CategoryCost[] }) {
    return (
        <ul className="cost-list">
            {items.map((item) => (
                <li key={item.category}>
                    <span>{item.category}</span>
                    <span className="numeric">
                        {formatMoney(item.amount)} · {formatNumber(item.share)} %
                    </span>
                </li>
            ))}
        </ul>
    );
}

class ChartBoundary extends Component<{ fallback: ReactNode; children: ReactNode }> {
    state = { failed: false };

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error(error, info.componentStack);
    }

    render(): ReactNode {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

/**
 * Cost by category. The chart is drawn with a library that loads apart; while it arrives the
 * place is held, and if it cannot be loaded or drawn the figures are shown as a list instead of
 * taking the whole screen down.
 */
export function CostSummary({ items, label }: CostSummaryProps) {
    return (
        <ChartBoundary fallback={<CostList items={items} />}>
            <Suspense fallback={<Skeleton shape="lines" count={items.length} />}>
                <CostChart items={items} label={label} />
            </Suspense>
        </ChartBoundary>
    );
}
