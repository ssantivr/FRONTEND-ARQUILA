import { Suspense, lazy, useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { PageBand } from "../components/PageBand";
import { Panel } from "../components/ui/Panel";
import { SurfaceLibrary } from "../components/SurfaceLibrary";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, materialsApi } from "../services/api";
import { Skeleton } from "../components/ui/Skeleton";
import { formatMoney, formatNumber } from "../utils/format";
import { NO_CATEGORY, costByCategory, materialCost as cost } from "../utils/materials";

// Recharts is only needed once there is something to chart, so it loads apart from the app.
const CostChart = lazy(() => import("../components/CostChart"));

interface MaterialsPageProps {
    onOpenProject: (projectId: number) => void;
}

export function MaterialsPage({ onOpenProject }: MaterialsPageProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const data = useAsync(() => loadAcrossProjects(materialsApi.listByProject), []);
    const materials = [...(data.data?.items ?? [])].sort(
        (first, second) => cost(second) - cost(first),
    );
    const projectNames = new Map((data.data?.projects ?? []).map((item) => [item.id, item.name]));
    const total = materials.reduce((sum, material) => sum + cost(material), 0);
    const categories = costByCategory(materials);
    const highest = categories[0]?.amount ?? 0;
    const wanted = search.trim().toLowerCase();
    const shown = materials.filter(
        (material) =>
            (category === "" || (material.category ?? NO_CATEGORY) === category) &&
            (wanted === "" || material.name.toLowerCase().includes(wanted)),
    );

    return (
        <>
            <PageBand
                title="Todos tus materiales"
                text="Los materiales de todos tus proyectos, del más costoso al menos costoso. Para agregar o editar uno, ábrelo desde su proyecto."
                stats={
                    data.data === null
                        ? data.error === null
                            ? [
                                  { label: "Materiales", value: "—" },
                                  { label: "Costo total", value: "—" },
                                  { label: "Categoría más costosa", value: "—", detail: " " },
                              ]
                            : undefined
                        : [
                              { label: "Materiales", value: formatNumber(materials.length) },
                              { label: "Costo total", value: formatMoney(total) },
                              {
                                  label: "Categoría más costosa",
                                  value: categories[0]?.category ?? "—",
                                  detail: categories.length > 0 ? formatMoney(highest) : undefined,
                              },
                          ]
                }
                aside={
                    data.data === null && data.error === null ? (
                        <section className="band-chart" aria-hidden="true">
                            <h3>Costo por categoría</h3>
                            <Skeleton shape="lines" count={3} label="" />
                        </section>
                    ) : (
                        categories.length > 0 && (
                            <section className="band-chart" aria-label="Costo por categoría">
                                <h3>Costo por categoría</h3>
                                <Suspense
                                    fallback={<Skeleton shape="lines" count={categories.length} />}
                                >
                                    <CostChart
                                        items={categories}
                                        label="Costo por categoría de todos tus proyectos"
                                    />
                                </Suspense>
                            </section>
                        )
                    )
                }
            />{" "}
            <Panel
                title="Listado"
                actions={
                    materials.length > 0 && (
                        <div className="filters">
                            <input
                                type="search"
                                placeholder="Buscar material"
                                aria-label="Buscar material por nombre"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <select
                                aria-label="Filtrar por categoría"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                            >
                                <option value="">Todas las categorías</option>
                                {categories.map((item) => (
                                    <option key={item.category} value={item.category}>
                                        {item.category}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )
                }
            >
                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    onRetry={data.reload}
                    isEmpty={materials.length === 0}
                    emptyText="Todavía no hay materiales. Regístralos en la pestaña Materiales de un proyecto."
                />
                {materials.length > 0 && shown.length === 0 && (
                    <p className="message" role="status">
                        Ningún material coincide con el filtro.
                    </p>
                )}
                {shown.length > 0 && (
                    <div className="table-scroll">
                        <table className="table-dense">
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
                                {shown.map((material) => (
                                    <tr key={material.id}>
                                        <td data-label="Material" className="cell-lead">
                                            {material.name}
                                        </td>
                                        <td data-label="Proyecto">
                                            {projectNames.get(material.project_id) ?? "—"}
                                        </td>
                                        <td data-label="Categoría">
                                            {material.category === null ? (
                                                "—"
                                            ) : (
                                                <span className="tag">{material.category}</span>
                                            )}
                                        </td>
                                        <td data-label="Cantidad" className="numeric">
                                            {formatNumber(material.quantity)} {material.unit}
                                        </td>
                                        <td data-label="Costo unitario" className="numeric">
                                            {formatMoney(material.unit_cost)}
                                        </td>
                                        <td data-label="Subtotal" className="numeric cell-total">
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
                    </div>
                )}
            </Panel>
            <SurfaceLibrary />
        </>
    );
}
