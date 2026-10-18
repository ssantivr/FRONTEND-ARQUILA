import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { CostSummary } from "../components/CostSummary";
import { SurfaceLibrary } from "../components/SurfaceLibrary";
import { DataTable } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Tabs } from "../components/ui/Tabs";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, materialsApi } from "../services/api";
import { formatMoney, formatNumber } from "../utils/format";
import { NO_CATEGORY, costByCategory, materialCost as cost } from "../utils/materials";
import { SURFACE_MATERIAL_IDS } from "../utils/surfaceMaterials";

interface MaterialsPageProps {
    onOpenProject: (projectId: number) => void;
    /** Opens the 3D editor, where a surface is put on an element. */
    onOpenViewer?: () => void;
}

type Catalog = "surfaces" | "works";
type Order = "cost" | "name" | "project";

const CATALOGS = [
    { id: "surfaces", label: "Superficies del modelo 3D" },
    { id: "works", label: "Materiales de obra" },
] as const;

/**
 * The library has two catalogues that the API and the engine really have: the surfaces the 3D
 * viewer draws (visual, fixed in the engine) and the materials of every project (budget items:
 * name, category, quantity and cost, without pictures).
 */
export function MaterialsPage({ onOpenProject, onOpenViewer }: MaterialsPageProps) {
    const [catalog, setCatalog] = useState<Catalog>("surfaces");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [order, setOrder] = useState<Order>("cost");
    const data = useAsync(() => loadAcrossProjects(materialsApi.listByProject), []);
    const materials = data.data?.items ?? [];
    const projectNames = new Map((data.data?.projects ?? []).map((item) => [item.id, item.name]));
    const total = materials.reduce((sum, material) => sum + cost(material), 0);
    const categories = costByCategory(materials);
    const wanted = search.trim().toLowerCase();
    const shown = materials
        .filter(
            (material) =>
                (category === "" || (material.category ?? NO_CATEGORY) === category) &&
                (wanted === "" || material.name.toLowerCase().includes(wanted)),
        )
        .sort((first, second) =>
            order === "name"
                ? first.name.localeCompare(second.name, "es")
                : order === "project"
                  ? (projectNames.get(first.project_id) ?? "").localeCompare(
                        projectNames.get(second.project_id) ?? "",
                        "es",
                    )
                  : cost(second) - cost(first),
        );
    const narrowed = wanted !== "" || category !== "";

    return (
        <>
            <header className="page-head">
                <div>
                    <h2>Biblioteca de materiales</h2>
                    {/* The line is there from the start, so nothing moves when the figures arrive. */}
                    <p className="page-head-meta">
                        {`${SURFACE_MATERIAL_IDS.length} superficies del motor`}
                        {data.data !== null &&
                            ` · ${formatNumber(materials.length)} materiales de obra · ${formatMoney(total)}`}
                    </p>
                </div>
            </header>

            <Tabs
                label="Catálogo"
                items={CATALOGS}
                current={catalog}
                onChange={(next) => setCatalog(next)}
            />

            {catalog === "surfaces" && <SurfaceLibrary onOpenViewer={onOpenViewer} />}

            {catalog === "works" && (
                <>
                    <Panel title="Materiales de obra">
                        <p className="message">
                            Las partidas de presupuesto de todos tus proyectos. No tienen foto ni
                            valores de dibujo: la API guarda nombre, categoría, cantidad y costo.
                            Para agregar o editar una, ábrela desde su proyecto.
                        </p>
                        <AsyncStatus
                            loading={data.loading}
                            error={data.error}
                            onRetry={data.reload}
                            isEmpty={materials.length === 0}
                            skeleton="rows"
                            emptyText="Todavía no hay materiales. Regístralos en la pestaña Materiales de un proyecto."
                        />
                        {materials.length > 0 && (
                            <>
                                <FilterBar
                                    searchLabel="Buscar material por nombre"
                                    search={search}
                                    onSearch={setSearch}
                                    resultText={`${shown.length} de ${materials.length} materiales`}
                                    active={narrowed}
                                    onClear={() => {
                                        setSearch("");
                                        setCategory("");
                                    }}
                                >
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
                                    <select
                                        aria-label="Ordenar materiales"
                                        value={order}
                                        onChange={(event) => setOrder(event.target.value as Order)}
                                    >
                                        <option value="cost">Más costosos primero</option>
                                        <option value="name">Por nombre</option>
                                        <option value="project">Por proyecto</option>
                                    </select>
                                </FilterBar>
                                <DataTable
                                    caption="Materiales de obra de todos tus proyectos"
                                    rows={shown}
                                    rowKey={(material) => material.id}
                                    empty="Ningún material coincide con el filtro."
                                    columns={[
                                        {
                                            id: "name",
                                            header: "Material",
                                            cell: (material) => material.name,
                                        },
                                        {
                                            id: "project",
                                            header: "Proyecto",
                                            cell: (material) => (
                                                <button
                                                    type="button"
                                                    className="table-link"
                                                    aria-label={`${projectNames.get(material.project_id) ?? "—"}: abrir el proyecto del material ${material.name}`}
                                                    onClick={() =>
                                                        onOpenProject(material.project_id)
                                                    }
                                                >
                                                    {projectNames.get(material.project_id) ?? "—"}
                                                </button>
                                            ),
                                        },
                                        {
                                            id: "category",
                                            header: "Categoría",
                                            cell: (material) =>
                                                material.category === null ? (
                                                    "—"
                                                ) : (
                                                    <span className="tag">{material.category}</span>
                                                ),
                                        },
                                        {
                                            id: "quantity",
                                            header: "Cantidad",
                                            numeric: true,
                                            cell: (material) =>
                                                `${formatNumber(material.quantity)} ${material.unit}`,
                                        },
                                        {
                                            id: "unit-cost",
                                            header: "Costo unitario",
                                            numeric: true,
                                            cell: (material) => formatMoney(material.unit_cost),
                                        },
                                        {
                                            id: "subtotal",
                                            header: "Subtotal",
                                            numeric: true,
                                            cell: (material) => formatMoney(cost(material)),
                                        },
                                    ]}
                                />
                            </>
                        )}
                    </Panel>
                    {/* Its height depends on how many categories there are, so it goes under the
                        list: nothing above it moves when it arrives. */}
                    {categories.length > 0 && (
                        <Panel title="Costo por categoría">
                            <CostSummary
                                items={categories}
                                label="Costo por categoría de todos tus proyectos"
                            />
                        </Panel>
                    )}
                </>
            )}
        </>
    );
}
