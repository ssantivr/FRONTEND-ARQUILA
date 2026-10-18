import { useRef, useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { ElevationDrawing } from "../components/ElevationDrawing";
import { FloorPlan } from "../components/FloorPlan";
import { Icon } from "../components/Icon";
import { ProjectPicker } from "../components/ProjectPicker";
import { SitePlan } from "../components/SitePlan";
import { useAsync } from "../hooks/useAsync";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { structureApi, terrainsApi } from "../services/api";
import { readSiteSettings } from "../state/siteSettings";
import type { Structure, Terrain } from "../types/api";
import { buildingIndicators, planLevels, type PlanLevel } from "../utils/building";
import { facade, section, type Drawing } from "../utils/elevations";
import { formatNumber } from "../utils/format";
import { placeOpenings, type Side } from "../utils/openings";
import { printSvg } from "../utils/svg";

type Sheet =
    | { id: string; group: "Plantas"; label: string; kind: "floor"; level: PlanLevel }
    | {
          id: string;
          group: "Fachadas y corte";
          label: string;
          kind: "elevation";
          drawing: Drawing;
          sectioned: boolean;
      }
    | { id: string; group: "Implantación"; label: string; kind: "site"; terrain: Terrain };

const ELEVATIONS: { side: Side | "section"; label: string }[] = [
    { side: "front", label: "Fachada principal" },
    { side: "back", label: "Fachada posterior" },
    { side: "left", label: "Fachada lateral izquierda" },
    { side: "right", label: "Fachada lateral derecha" },
    { side: "section", label: "Corte esquemático A-A" },
];

const GROUPS = ["Plantas", "Fachadas y corte", "Implantación"] as const;

/**
 * The drawing tools a CAD program has. The plans here are generated from the rooms and terrains
 * of the project and the API keeps no strokes, so none of them can draw: each says what to do
 * instead. Measuring does work, in the bar of the drawing.
 */
const DRAWING_TOOLS = [
    "Muros",
    "Habitaciones",
    "Puertas",
    "Ventanas",
    "Líneas",
    "Cotas",
    "Textos",
    "Duplicar",
    "Eliminar",
];

function sheetsOf(structure: Structure | null, terrains: Terrain[]): Sheet[] {
    const sheets: Sheet[] = [];

    if (structure !== null) {
        for (const level of planLevels(structure)) {
            sheets.push({
                id: `floor-${level.planId}`,
                group: "Plantas",
                label: level.title,
                kind: "floor",
                level,
            });
        }

        for (const item of ELEVATIONS) {
            const drawing =
                item.side === "section" ? section(structure) : facade(structure, item.side);

            if (drawing !== null) {
                sheets.push({
                    id: `elevation-${item.side}`,
                    group: "Fachadas y corte",
                    label: item.label,
                    kind: "elevation",
                    drawing,
                    sectioned: item.side === "section",
                });
            }
        }
    }

    for (const terrain of terrains) {
        sheets.push({
            id: `site-${terrain.id}`,
            group: "Implantación",
            label: terrain.name,
            kind: "site",
            terrain,
        });
    }

    return sheets;
}

interface PlansPageProps {
    onOpenProject: (projectId: number) => void;
    /** Opens the 3D editor, where the rooms that make the drawings are moved and resized. */
    onOpenViewer?: () => void;
}

/**
 * A drawing board: the sheets of the project on the left, one sheet large in the middle with the
 * technical viewer (zoom, pan, rulers, grid, scale and measuring), and its properties, export and
 * drawing tools on the right. The sheets are generated from the terrains and rooms, so they are
 * read, measured and exported here, and changed through the project's data.
 */
export function PlansPage({ onOpenProject, onOpenViewer }: PlansPageProps) {
    const choice = useProjectChoice();
    const project = choice.project;

    return (
        <section className="board-page" aria-label="Planos 2D">
            <div className="workspace-head">
                <AsyncStatus
                    loading={choice.loading}
                    error={choice.error}
                    onRetry={choice.reload}
                    isEmpty={choice.projects.length === 0}
                    emptyTitle="Sin proyectos"
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                {project !== null && (
                    <>
                        <ProjectPicker
                            projects={choice.projects}
                            value={project.id}
                            onChange={choice.choose}
                        />
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => onOpenProject(project.id)}
                        >
                            Editar planos en el proyecto
                        </button>
                    </>
                )}
            </div>
            {project !== null && (
                <Board
                    key={project.id}
                    projectId={project.id}
                    projectName={project.name}
                    onOpenViewer={onOpenViewer}
                />
            )}
        </section>
    );
}

function Board({
    projectId,
    projectName,
    onOpenViewer,
}: {
    projectId: number;
    projectName: string;
    onOpenViewer?: () => void;
}) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const terrains = useAsync(() => terrainsApi.listByProject(projectId), [projectId]);
    const sheets = sheetsOf(structure.data, terrains.data ?? []);
    const [chosenId, setChosenId] = useState<string | null>(null);
    const sheet = sheets.find((item) => item.id === chosenId) ?? sheets[0] ?? null;
    const canvas = useRef<HTMLDivElement>(null);
    const loading = structure.loading || terrains.loading;
    const openings = placeOpenings(structure.data?.rooms ?? []);
    const indicators = structure.data === null ? null : buildingIndicators(structure.data);
    const limits = readSiteSettings(projectId);

    function print() {
        const svg = canvas.current?.querySelector<SVGSVGElement>(".plan-sheet > svg");

        if (svg !== null && svg !== undefined && sheet !== null) {
            printSvg(svg, `${sheet.label} — ${projectName}`);
        }
    }

    if (sheets.length === 0) {
        return (
            <AsyncStatus
                loading={loading}
                error={structure.error ?? terrains.error}
                onRetry={() => {
                    structure.reload();
                    terrains.reload();
                }}
                isEmpty
                emptyTitle="Todavía no hay láminas"
                emptyText="Los planos se generan con los terrenos y los cuartos del proyecto. Registra un terreno o agrega cuartos para verlos."
            />
        );
    }

    return (
        <div className="board">
            <nav className="board-sheets" aria-label="Láminas del proyecto">
                {GROUPS.map((group) => {
                    const items = sheets.filter((item) => item.group === group);

                    return (
                        items.length > 0 && (
                            <div key={group} className="board-group">
                                <p className="board-group-title">{group}</p>
                                {items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="board-sheet"
                                        aria-current={item.id === sheet?.id ? "page" : undefined}
                                        onClick={() => setChosenId(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )
                    );
                })}
            </nav>

            <div className="board-canvas" ref={canvas}>
                {sheet?.kind === "floor" && (
                    <FloorPlan level={sheet.level} projectName={projectName} openings={openings} />
                )}
                {sheet?.kind === "elevation" && (
                    <ElevationDrawing
                        drawing={sheet.drawing}
                        title={sheet.label}
                        fileName={`${sheet.sectioned ? "corte" : "fachada"}-${projectName}-${sheet.label}`}
                        sectioned={sheet.sectioned}
                    />
                )}
                {sheet?.kind === "site" && <SitePlan terrain={sheet.terrain} />}
            </div>

            <aside className="board-props" aria-label="Propiedades de la lámina">
                {sheet !== null && (
                    <section>
                        <h3>Lámina</h3>
                        <dl className="board-facts">
                            <dt>Tipo</dt>
                            <dd>{sheet.group === "Plantas" ? "Planta" : sheet.group}</dd>
                            {sheet.kind === "floor" && (
                                <>
                                    <dt>Nivel</dt>
                                    <dd className="numeric">N+{sheet.level.base.toFixed(2)}</dd>
                                    <dt>Área</dt>
                                    <dd className="numeric">{formatNumber(sheet.level.area)} m²</dd>
                                    <dt>Espacios</dt>
                                    <dd className="numeric">{sheet.level.rooms.length}</dd>
                                </>
                            )}
                            {sheet.kind === "elevation" && (
                                <>
                                    <dt>Ancho</dt>
                                    <dd className="numeric">
                                        {formatNumber(sheet.drawing.width)} m
                                    </dd>
                                    <dt>Altura</dt>
                                    <dd className="numeric">
                                        {formatNumber(sheet.drawing.height)} m
                                    </dd>
                                </>
                            )}
                            {sheet.kind === "site" && (
                                <>
                                    <dt>Área del lote</dt>
                                    <dd className="numeric">
                                        {formatNumber(sheet.terrain.area_m2)} m²
                                    </dd>
                                </>
                            )}
                            <dt>Unidades</dt>
                            <dd>Metros</dd>
                            <dt>Escala</dt>
                            <dd>Gráfica, en la esquina del plano: sigue al zoom</dd>
                        </dl>
                    </section>
                )}

                <section>
                    <h3>Exportar</h3>
                    <p className="board-note">
                        SVG con sus colores dentro, desde el botón bajo el plano. PDF con la
                        impresión del navegador: elige «Guardar como PDF».
                    </p>
                    <button type="button" className="button-secondary icon-button" onClick={print}>
                        <Icon name="download" />
                        Imprimir o guardar como PDF
                    </button>
                </section>

                {sheet?.kind === "floor" && indicators !== null && (
                    <section>
                        <h3>Ocupación del lote</h3>
                        <dl className="board-facts">
                            <dt>COS</dt>
                            <dd className="numeric">
                                {indicators.cos === null ? "—" : indicators.cos.toFixed(2)}
                                {limits.maxCos !== undefined && ` · máx. ${limits.maxCos}`}
                            </dd>
                            <dt>CUS</dt>
                            <dd className="numeric">
                                {indicators.cus === null ? "—" : indicators.cus.toFixed(2)}
                                {limits.maxCus !== undefined && ` · máx. ${limits.maxCus}`}
                            </dd>
                            <dt>Construida</dt>
                            <dd className="numeric">{formatNumber(indicators.builtArea)} m²</dd>
                        </dl>
                        <p className="board-note">
                            Los máximos se escriben en la pestaña Planos del proyecto.
                        </p>
                    </section>
                )}

                <section>
                    <h3>Herramientas de dibujo</h3>
                    <p className="board-note" id="drawing-tools-why">
                        No disponibles: los planos se generan con los cuartos y los terrenos, y la
                        API no guarda trazos. Para cambiar un plano, mueve o redimensiona sus
                        cuartos en el editor 3D. Medir sí funciona, en la barra del plano.
                    </p>
                    <div className="board-tools" role="group" aria-label="Herramientas de dibujo">
                        {DRAWING_TOOLS.map((tool) => (
                            <button
                                key={tool}
                                type="button"
                                className="board-tool"
                                aria-disabled="true"
                                aria-describedby="drawing-tools-why"
                                onClick={(event) => event.preventDefault()}
                            >
                                {tool}
                            </button>
                        ))}
                    </div>
                    {onOpenViewer !== undefined && (
                        <button
                            type="button"
                            className="button-secondary icon-button"
                            onClick={onOpenViewer}
                        >
                            <Icon name="viewer" />
                            Abrir el editor 3D
                        </button>
                    )}
                </section>
            </aside>
        </div>
    );
}
