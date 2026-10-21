import { useState } from "react";

import { useFavorites } from "../hooks/useFavorites";
import { SURFACE_PATTERNS, type PatternPixels } from "../utils/patternPixels";
import {
    SURFACE_MATERIAL_IDS,
    SURFACE_MATERIALS,
    type SurfaceMaterialId,
} from "../utils/surfaceMaterials";
import { Icon } from "./Icon";
import { SurfaceApply } from "./SurfaceApply";
import { SurfaceSwatch, cssColor } from "./SurfaceSwatch";
import { Drawer } from "./ui/Drawer";
import { FilterBar } from "./ui/FilterBar";
import { ProgressBar } from "./ui/ProgressBar";
import { Range } from "./ui/Range";

import styles from "./SurfaceLibrary.module.css";

const FAVORITES_KEY = "arquila:favorite-surfaces";

/** How the surface looks, read from the values the engine draws it with: shown as its tag. */
type Group = "Con relieve" | "Lisas" | "Metálicas" | "Translúcidas";

/**
 * The family of each surface, in the categories of a materials library. Only the ones the engine
 * has: there is no ceramic, marble or textile surface to show, so those categories are not offered.
 */
export const SURFACE_CATEGORIES: Record<SurfaceMaterialId, string> = {
    concrete: "Concreto",
    brick: "Ladrillo",
    plaster: "Pinturas y revoques",
    glass: "Vidrio",
    steel: "Metal",
    wood: "Madera",
    stone: "Piedra",
};

const CATEGORIES = [...new Set(Object.values(SURFACE_CATEGORIES))].sort((a, b) =>
    a.localeCompare(b, "es"),
);
type Order = "name" | "roughness" | "metalness";

/** The group is read from the values the engine renders with; the API has no category for them. */
function groupOf(id: SurfaceMaterialId): Group {
    const surface = SURFACE_MATERIALS[id];

    if (surface.opacity < 1) {
        return "Translúcidas";
    }

    if (surface.metalness >= 0.5) {
        return "Metálicas";
    }

    return surface.grain > 0 ? "Con relieve" : "Lisas";
}

/** How far one tile of the pattern goes on a surface; known without drawing it. */
const TILE_METRES: Partial<Record<SurfaceMaterialId, number>> = {};

function tileOf(id: SurfaceMaterialId): number | null {
    if (!(id in TILE_METRES)) {
        const make = SURFACE_PATTERNS[id];
        const pixels: PatternPixels | undefined = make?.();

        TILE_METRES[id] = pixels?.tileM;
    }

    return TILE_METRES[id] ?? null;
}

function figure(value: number): string {
    return value.toLocaleString("es", { maximumFractionDigits: 2 });
}

interface SurfaceLibraryProps {
    /** Opens the 3D editor, where a surface is put on an element. */
    onOpenViewer?: () => void;
}

/**
 * The surface finishes the 3D viewer can put on a room or component, with the values it draws
 * them with: a catalogue of the engine, not of products. The swatches are made from the same
 * pixels as the engine's textures.
 */
export function SurfaceLibrary({ onOpenViewer }: SurfaceLibraryProps) {
    const favorites = useFavorites(FAVORITES_KEY);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [order, setOrder] = useState<Order>("name");
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [openId, setOpenId] = useState<SurfaceMaterialId | null>(null);
    const wanted = search.trim().toLowerCase();
    const shown = SURFACE_MATERIAL_IDS.filter(
        (id) =>
            (!onlyFavorites || favorites.isFavorite(id)) &&
            (category === "" || SURFACE_CATEGORIES[id] === category) &&
            (wanted === "" || SURFACE_MATERIALS[id].label.toLowerCase().includes(wanted)),
    ).sort((first, second) => {
        const a = SURFACE_MATERIALS[first];
        const b = SURFACE_MATERIALS[second];

        return order === "name" ? a.label.localeCompare(b.label, "es") : b[order] - a[order];
    });
    const narrowed = wanted !== "" || category !== "" || onlyFavorites;
    const open = openId === null ? null : SURFACE_MATERIALS[openId];

    return (
        <section className={styles.library} aria-labelledby="surfaces-title">
            <div className={styles.intro}>
                <h3 id="surfaces-title">Superficies del modelo 3D</h3>
                <p className="message">
                    Los acabados que el visor 3D puede aplicar a un cuarto o a un componente, con
                    los valores con que los dibuja. Las favoritas se guardan en este navegador, no
                    en tu cuenta: no las verás en otro equipo.
                </p>
            </div>

            <FilterBar
                searchLabel="Buscar superficie"
                search={search}
                onSearch={setSearch}
                resultText={`${shown.length} de ${SURFACE_MATERIAL_IDS.length} superficies`}
                active={narrowed}
                onClear={() => {
                    setSearch("");
                    setCategory("");
                    setOnlyFavorites(false);
                }}
            >
                <select
                    aria-label="Filtrar por categoría"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                >
                    <option value="">Todas las categorías</option>
                    {CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Ordenar superficies"
                    value={order}
                    onChange={(event) => setOrder(event.target.value as Order)}
                >
                    <option value="name">Por nombre</option>
                    <option value="roughness">Más rugosas primero</option>
                    <option value="metalness">Más metálicas primero</option>
                </select>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(event) => setOnlyFavorites(event.target.checked)}
                    />
                    Solo favoritas de este navegador
                </label>
            </FilterBar>

            {shown.length === 0 && (
                <p className="message" role="status">
                    {onlyFavorites && !wanted && category === ""
                        ? "Todavía no marcaste ninguna superficie como favorita."
                        : "Ninguna superficie coincide con el filtro."}
                </p>
            )}

            <ul className={styles.grid}>
                {shown.map((id) => {
                    const surface = SURFACE_MATERIALS[id];
                    const favorite = favorites.isFavorite(id);

                    return (
                        <li key={id} className={styles.item}>
                            <button
                                type="button"
                                className={styles.card}
                                aria-haspopup="dialog"
                                onClick={() => setOpenId(id)}
                            >
                                <SurfaceSwatch id={id} className={styles.swatch} />
                                <span className={styles.body}>
                                    <span className={styles.name}>{surface.label}</span>
                                    <span className={styles.group}>
                                        {SURFACE_CATEGORIES[id]} · {groupOf(id)}
                                    </span>
                                    <span className={styles.values}>
                                        Rugosidad {figure(surface.roughness)} · Metal{" "}
                                        {figure(surface.metalness)}
                                        {surface.opacity < 1 &&
                                            ` · Opacidad ${figure(surface.opacity)}`}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={styles.favorite}
                                aria-pressed={favorite}
                                aria-label={`${favorite ? "Quitar de favoritas" : "Marcar como favorita"}: ${surface.label}`}
                                title={favorite ? "Quitar de favoritas" : "Marcar como favorita"}
                                onClick={() => favorites.toggle(id)}
                            >
                                {favorite ? "★" : "☆"}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {open !== null && openId !== null && (
                <Drawer title={open.label} onClose={() => setOpenId(null)}>
                    <div className={styles.detail}>
                        <SurfaceSwatch id={openId} className={styles.swatchLarge} />

                        <p className={styles.group}>
                            {SURFACE_CATEGORIES[openId]} · {groupOf(openId)}
                        </p>
                        <h4>Valores con que la dibuja el motor</h4>
                        <dl className={styles.values}>
                            <dt>Color base</dt>
                            <dd>
                                <span
                                    className={styles.chip}
                                    style={{ background: cssColor(open.color) }}
                                    aria-hidden="true"
                                />
                                <code>{cssColor(open.color)}</code>
                            </dd>
                            <dt>Rugosidad</dt>
                            <dd>
                                <ProgressBar label="Rugosidad" value={open.roughness} />
                                <span className="numeric">{figure(open.roughness)}</span>
                            </dd>
                            <dt>Metalicidad</dt>
                            <dd>
                                <ProgressBar label="Metalicidad" value={open.metalness} />
                                <span className="numeric">{figure(open.metalness)}</span>
                            </dd>
                            <dt>Opacidad</dt>
                            <dd>
                                <ProgressBar label="Opacidad" value={open.opacity} />
                                <span className="numeric">{figure(open.opacity)}</span>
                            </dd>
                            <dt>Relieve</dt>
                            <dd>
                                {open.grain > 0
                                    ? `Mapa de relieve generado por código (intensidad ${figure(open.grain)})`
                                    : "Liso, sin relieve"}
                            </dd>
                            <dt>Mapa normal</dt>
                            <dd>No: el motor usa un mapa de relieve (bump), no un mapa normal</dd>
                            <dt>Repetición</dt>
                            <dd>
                                {tileOf(openId) === null
                                    ? "Color liso: no tiene un dibujo que se repita"
                                    : `Una tesela cada ${figure(tileOf(openId) ?? 0)} m, a escala real`}
                            </dd>
                        </dl>

                        <h4>Editar los valores</h4>
                        <p className="message">
                            No disponible. Cada superficie tiene valores fijos en el motor y la API
                            no guarda materiales propios, así que un cambio aquí no se vería en
                            ningún modelo ni se guardaría.
                        </p>
                        <div className={styles.locked}>
                            <Range
                                label="Rugosidad"
                                value={open.roughness}
                                display={figure(open.roughness)}
                                min={0}
                                max={1}
                                step={0.05}
                                onChange={() => undefined}
                                disabled
                            />
                            <Range
                                label="Metalicidad"
                                value={open.metalness}
                                display={figure(open.metalness)}
                                min={0}
                                max={1}
                                step={0.05}
                                onChange={() => undefined}
                                disabled
                            />
                        </div>

                        <h4>Aplicar a un elemento</h4>
                        <p className="message">
                            Elige un cuarto o un componente del modelo de uno de tus proyectos. Se
                            guarda en el proyecto, igual que desde «Material» en el inspector del
                            editor 3D.
                        </p>
                        <SurfaceApply surfaceId={openId} />
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
                    </div>
                </Drawer>
            )}
        </section>
    );
}
