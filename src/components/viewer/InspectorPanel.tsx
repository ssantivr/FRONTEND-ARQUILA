import { elementKey, isSpace } from "../../three/BuildingSceneManager";
import type {
    Recommendation,
    SpatialElement,
    StructureElement,
    StructureRoom,
} from "../../types/api";
import { PRIORITY_COLORS, cssColor } from "../../utils/elementColors";
import { formatMoney, formatNumber } from "../../utils/format";
import {
    SURFACE_MATERIALS,
    SURFACE_MATERIAL_IDS,
    surfaceOf,
    type ElementSurfaces,
    type SurfaceMaterialId,
} from "../../utils/surfaceMaterials";
import { WORK_STATUS_LABELS, layerLabel, workSwatch } from "../RoomWorksPanel";
import { ErrorState } from "../ui/ErrorState";
import { SelectControl } from "../ui/Input";
import { KIND_LABELS } from "./labels";
import { TransformPanel, type RoomGeometry } from "./TransformPanel";

interface InspectorPanelProps {
    /** The work element picked in the scene, if any. */
    picked: SpatialElement | null;
    selected: StructureElement | null;
    selectedRoom: StructureRoom | null;
    surfaces: ElementSurfaces;
    cost: number | undefined;
    alerts: Recommendation[];
    snap: number;
    onSnap: (snap: number) => void;
    busy: boolean;
    saveError: string | null;
    onSurface: (element: StructureElement, surface: SurfaceMaterialId) => void;
    onRoom: (room: StructureRoom, next: RoomGeometry, label: string) => void;
}

/** What is selected: its data, its material, and where it stands if it is a room. */
export function InspectorPanel({
    picked,
    selected,
    selectedRoom,
    surfaces,
    cost,
    alerts,
    snap,
    onSnap,
    busy,
    saveError,
    onSurface,
    onRoom,
}: InspectorPanelProps) {
    return (
        <aside className="hud hud-inspector" aria-live="polite" aria-label="Inspector">
            <details open>
                <summary>Inspector</summary>
                {picked !== null && (
                    <dl className="hud-picked">
                        <dt>Elemento</dt>
                        <dd>{picked.name}</dd>
                        <dt>Capa</dt>
                        <dd>
                            <span
                                className="hud-swatch"
                                style={{ background: workSwatch(picked) }}
                            />
                            {layerLabel(picked.layer)}
                        </dd>
                        <dt>Estado</dt>
                        <dd>{WORK_STATUS_LABELS[picked.work_status]}</dd>
                        <dt>Medidas</dt>
                        <dd className="numeric">
                            {formatNumber(picked.max_x_m - picked.min_x_m)} ×{" "}
                            {formatNumber(picked.max_y_m - picked.min_y_m)} ×{" "}
                            {formatNumber(picked.max_z_m - picked.min_z_m)} m
                        </dd>
                        <dt>Altura de la base</dt>
                        <dd className="numeric">+{formatNumber(picked.min_z_m)} m</dd>
                    </dl>
                )}
                {selected === null ? (
                    picked === null && (
                        <p>
                            Haz clic en un cuarto, un componente o una instalación para
                            inspeccionarlo, o doble clic para acercar la cámara a él.
                        </p>
                    )
                ) : (
                    <dl>
                        <dt>Nombre</dt>
                        <dd>{selected.name}</dd>
                        <dt>Tipo</dt>
                        <dd>{KIND_LABELS[selected.kind]}</dd>
                        <dt className="hud-wide">
                            <label htmlFor="inspector-surface">Material</label>
                        </dt>
                        <dd className="hud-wide">
                            <SelectControl
                                id="inspector-surface"
                                value={surfaceOf(surfaces, elementKey(selected), selected.kind)}
                                onChange={(event) =>
                                    onSurface(selected, event.target.value as SurfaceMaterialId)
                                }
                            >
                                {SURFACE_MATERIAL_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {SURFACE_MATERIALS[id].label}
                                    </option>
                                ))}
                            </SelectControl>
                        </dd>
                        <dt>Plano</dt>
                        <dd>{selected.plan_title}</dd>
                        <dt>Nivel</dt>
                        <dd className="numeric">{selected.level ?? "—"}</dd>
                        <dt>Medidas</dt>
                        <dd className="numeric">
                            {formatNumber(selected.width_m)} × {formatNumber(selected.depth_m)} ×{" "}
                            {formatNumber(selected.height_m)} m
                        </dd>
                        {isSpace(selected) && (
                            <>
                                <dt>Área</dt>
                                <dd className="numeric">
                                    {formatNumber(selected.width_m * selected.depth_m)} m²
                                </dd>
                            </>
                        )}
                        <dt>Volumen</dt>
                        <dd className="numeric">
                            {formatNumber(selected.width_m * selected.depth_m * selected.height_m)}{" "}
                            m³
                        </dd>
                        <dt>Altura de la base</dt>
                        <dd className="numeric">+{formatNumber(selected.base_m)} m</dd>
                        {cost !== undefined && (
                            <>
                                <dt>Costo estimado</dt>
                                <dd className="numeric">{formatMoney(cost)}</dd>
                            </>
                        )}
                    </dl>
                )}
                {selectedRoom !== null && (
                    <TransformPanel
                        room={selectedRoom}
                        snap={snap}
                        onSnap={onSnap}
                        busy={busy}
                        onCommit={(next, label) => onRoom(selectedRoom, next, label)}
                    />
                )}
                {selected !== null && selectedRoom === null && (
                    <p className="hud-note-quiet">
                        Solo los cuartos se mueven y se redimensionan aquí.
                        {selected.kind === "volume"
                            ? " Un volumen sale de un plano sin cuartos: se cambia agregando cuartos."
                            : " Columnas, vigas y muros se editan en su tabla, en la pestaña Modelo 3D del proyecto."}
                    </p>
                )}
                {saveError !== null && <ErrorState message={saveError} />}
                {alerts.length > 0 && (
                    <ul className="hud-alerts">
                        {alerts.map((alert) => (
                            <li key={alert.id}>
                                <span
                                    className="hud-swatch"
                                    style={{
                                        background: cssColor(PRIORITY_COLORS[alert.priority]),
                                    }}
                                />
                                {alert.content}
                            </li>
                        ))}
                    </ul>
                )}
            </details>
        </aside>
    );
}
