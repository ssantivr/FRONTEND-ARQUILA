import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { prefersReducedMotion } from "../state/motion";
import { formatMoney, formatNumber } from "../utils/format";
import type { CategoryCost } from "../utils/materials";
import styles from "./CostChart.module.css";

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 116;
const VALUE_WIDTH = 104;
const DRAW_MS = 500;

interface CostChartProps {
    items: CategoryCost[];
    /** Read by screen readers before the figures, such as «Costo por categoría de Casa Mirador». */
    label: string;
}

interface TipProps {
    active?: boolean;
    payload?: readonly { payload: CategoryCost }[];
}

function ChartTip({ active, payload }: TipProps) {
    const item = payload?.[0]?.payload;

    if (active !== true || item === undefined) {
        return null;
    }

    return (
        <div className={styles.tip}>
            <strong>{item.category}</strong>
            <span>
                {formatMoney(item.amount)} · {formatNumber(item.share)} % del total
            </span>
        </div>
    );
}

/**
 * Cost of the materials by category, one horizontal bar each, drawn with Recharts.
 *
 * The drawing is for the eye; the same figures are also in a table that only screen readers
 * read, so nobody depends on the bars or on their colour to get the numbers.
 */
export default function CostChart({ items, label }: CostChartProps) {
    return (
        <figure className={styles.chart}>
            <div aria-hidden="true">
                <ResponsiveContainer width="100%" height={items.length * ROW_HEIGHT}>
                    <BarChart
                        data={items}
                        layout="vertical"
                        margin={{ top: 0, right: VALUE_WIDTH, bottom: 0, left: 0 }}
                        barCategoryGap="28%"
                        accessibilityLayer={false}
                    >
                        <XAxis type="number" hide domain={[0, "dataMax"]} />
                        <YAxis
                            type="category"
                            dataKey="category"
                            width={LABEL_WIDTH}
                            tickLine={false}
                            axisLine={false}
                            tick={{ className: styles.name }}
                        />
                        <Tooltip
                            cursor={{ className: styles.cursor }}
                            content={<ChartTip />}
                            isAnimationActive={false}
                        />
                        <Bar
                            dataKey="amount"
                            className={styles.bar}
                            radius={[0, 6, 6, 0]}
                            background={{ className: styles.track }}
                            isAnimationActive={!prefersReducedMotion()}
                            animationDuration={DRAW_MS}
                            animationEasing="ease-out"
                        >
                            <LabelList
                                dataKey="amount"
                                position="right"
                                className={styles.value}
                                formatter={(value: unknown) => formatMoney(Number(value))}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <table className="visually-hidden">
                <caption>{label}</caption>
                <thead>
                    <tr>
                        <th scope="col">Categoría</th>
                        <th scope="col">Costo</th>
                        <th scope="col">Parte del total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.category}>
                            <th scope="row">{item.category}</th>
                            <td>{formatMoney(item.amount)}</td>
                            <td>{formatNumber(item.share)} %</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}
