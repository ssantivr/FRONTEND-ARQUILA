import { AsyncStatus } from "../components/AsyncStatus";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, materialsApi } from "../services/api";
import type { Material } from "../types/api";
import { formatMoney, formatNumber } from "../utils/format";

interface MaterialsPageProps {
    onOpenProject: (projectId: number) => void;
}

const NO_CATEGORY = "Sin categoría";

function cost(material: Material): number {
    return material.quantity * material.unit_cost;
}

function costByCategory(materials: Material[]): [string, number][] {
    const totals = new Map<string, number>();

    for (const material of materials) {
        const category = material.category ?? NO_CATEGORY;
        totals.set(category, (totals.get(category) ?? 0) + cost(material));
    }

    return [...totals.entries()].sort((first, second) => second[1] - first[1]);
}

export function MaterialsPage({ onOpenProject }: MaterialsPageProps) {
    const data = useAsync(() => loadAcrossProjects(materialsApi.listByProject), []);
    const materials = [...(data.data?.items ?? [])].sort(
        (first, second) => cost(second) - cost(first),
    );
    const projectNames = new Map((data.data?.projects ?? []).map((item) => [item.id, item.name]));
    const total = materials.reduce((sum, material) => sum + cost(material), 0);
    const categories = costByCategory(materials);
    const highest = categories[0]?.[1] ?? 0;

    return (
        <>
            <Panel title="Materiales">
                <p className="message">
                    Los materiales de todos tus proyectos, del más costoso al menos costoso. Para
                    agregar o editar uno, ábrelo desde su proyecto.
                </p>
                <div className="metrics">
                    <MetricCard label="Materiales" value={formatNumber(materials.length)} />
                    <MetricCard label="Costo total" value={formatMoney(total)} />
                    <MetricCard
                        label="Categoría más costosa"
                        value={categories[0]?.[0] ?? "—"}
                        detail={categories.length > 0 ? formatMoney(highest) : undefined}
                    />
                </div>
            </Panel>
            {categories.length > 0 && (
                <Panel title="Costo por categoría">
                    <ul className="bar-list">
                        {categories.map(([category, amount]) => (
                            <li key={category}>
                                <span>{category}</span>
                                <span className="bar" aria-hidden="true">
                                    <span
                                        style={{
                                            width: `${highest > 0 ? (amount / highest) * 100 : 0}%`,
                                        }}
                                    />
                                </span>
                                <span className="numeric">{formatMoney(amount)}</span>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
            <Panel title="Listado">
                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    onRetry={data.reload}
                    isEmpty={materials.length === 0}
                    emptyText="Todavía no hay materiales. Regístralos en la pestaña Materiales de un proyecto."
                />
                {materials.length > 0 && (
                    <table>
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Proyecto</th>
                                <th>Categoría</th>
                                <th className="numeric">Cantidad</th>
                                <th className="numeric">Costo unitario</th>
                                <th className="numeric">Subtotal</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map((material) => (
                                <tr key={material.id}>
                                    <td data-label="Material">{material.name}</td>
                                    <td data-label="Proyecto">
                                        {projectNames.get(material.project_id) ?? "—"}
                                    </td>
                                    <td data-label="Categoría">{material.category ?? "—"}</td>
                                    <td data-label="Cantidad" className="numeric">
                                        {formatNumber(material.quantity)} {material.unit}
                                    </td>
                                    <td data-label="Costo unitario" className="numeric">
                                        {formatMoney(material.unit_cost)}
                                    </td>
                                    <td data-label="Subtotal" className="numeric">
                                        {formatMoney(cost(material))}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            aria-label={`Abrir el proyecto del material ${material.name}`}
                                            onClick={() => onOpenProject(material.project_id)}
                                        >
                                            Abrir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Panel>
        </>
    );
}
