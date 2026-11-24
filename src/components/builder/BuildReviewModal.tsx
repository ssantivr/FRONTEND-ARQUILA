import { useRef, useState, type FormEvent } from "react";

import { errorMessage } from "../../hooks/useAsync";
import { buildsApi } from "../../services/builds";
import type { Build } from "../../types/build";
import { SURE_CONFIDENCE } from "../extraction/reviewFields";
import { Icon } from "../Icon";
import { Dialog } from "../modal/Dialog";
import { TextField } from "../TextField";
import {
    COMPONENT_FIELDS,
    COMPONENT_KINDS,
    LEVEL_FIELDS,
    PROJECT_FIELDS,
    ROOM_FIELDS,
    TERRAIN_FIELDS,
    countMissing,
    emptyItem,
    initialFields,
    initialLevels,
    toApply,
    type BuildField,
    type ItemForm,
    type LevelForm,
} from "./buildForm";

interface BuildReviewModalProps {
    build: Build;
    onApplied: (build: Build) => void;
    onClose: () => void;
}

interface PreviewSpace {
    key: string;
    name: string;
    x: number;
    y: number;
    width: number;
    depth: number;
    kind: "room" | "component";
}

function LayoutPreview({ level }: { level: LevelForm }) {
    const toSpaces = (items: ItemForm[], kind: PreviewSpace["kind"]): PreviewSpace[] =>
        items.flatMap((item) => {
            const x = Number(item.values.x_m);
            const y = Number(item.values.y_m);
            const width = Number(item.values.width_m);
            const depth = Number(item.values.depth_m);

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(width) ||
                !Number.isFinite(depth) ||
                width <= 0 ||
                depth <= 0
            ) {
                return [];
            }

            return [
                {
                    key: item.key,
                    name: item.values.name || (kind === "room" ? "Ambiente" : "Estructura"),
                    x,
                    y,
                    width,
                    depth,
                    kind,
                },
            ];
        });
    const rooms = toSpaces(level.rooms, "room");
    const components = toSpaces(level.components, "component");
    const spaces = [...rooms, ...components];

    if (rooms.length === 0) {
        return (
            <div className="build-preview-empty">
                <span className="build-preview-empty-mark" aria-hidden="true">
                    +
                </span>
                <p>La planta aparecerá aquí cuando haya ambientes con medidas y coordenadas.</p>
            </div>
        );
    }

    const minX = Math.min(0, ...spaces.map((item) => item.x));
    const minY = Math.min(0, ...spaces.map((item) => item.y));
    const maxX = Math.max(...spaces.map((item) => item.x + item.width));
    const maxY = Math.max(...spaces.map((item) => item.y + item.depth));
    const plotWidth = Math.max(maxX - minX, 1);
    const plotDepth = Math.max(maxY - minY, 1);
    const scale = Math.min(560 / plotWidth, 278 / plotDepth);
    const width = plotWidth * scale;
    const height = plotDepth * scale;
    const left = (680 - width) / 2;
    const top = 338 - (380 - height) / 2 - height;

    return (
        <div className="build-preview-canvas">
            <svg
                viewBox="0 0 680 380"
                role="img"
                aria-label={`Vista previa de ${level.values.title || "la planta"} con ${rooms.length} ambientes`}
            >
                <defs>
                    <pattern
                        id="build-preview-grid"
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M20 0H0V20" className="build-preview-grid-line" />
                    </pattern>
                </defs>
                <rect
                    x="10"
                    y="10"
                    width="660"
                    height="360"
                    rx="8"
                    className="build-preview-paper"
                />
                <rect
                    x="10"
                    y="10"
                    width="660"
                    height="360"
                    rx="8"
                    fill="url(#build-preview-grid)"
                />
                <path
                    d={`M${left} ${top + height}h${width}M${left} ${top}v${height}`}
                    className="build-preview-axis"
                />
                {spaces.map((item) => {
                    const itemWidth = item.width * scale;
                    const itemHeight = item.depth * scale;
                    const x = left + (item.x - minX) * scale;
                    const y = top + height - (item.y - minY + item.depth) * scale;

                    return (
                        <g key={item.key} className={`build-preview-space is-${item.kind}`}>
                            <rect
                                x={x}
                                y={y}
                                width={itemWidth}
                                height={itemHeight}
                                rx={item.kind === "room" ? 4 : 1}
                            />
                            {item.kind === "room" && itemWidth > 44 && itemHeight > 25 && (
                                <>
                                    <text x={x + itemWidth / 2} y={y + itemHeight / 2 - 3}>
                                        {item.name.length > 24
                                            ? `${item.name.slice(0, 21)}…`
                                            : item.name}
                                    </text>
                                    {itemWidth > 90 && itemHeight > 42 && (
                                        <text
                                            x={x + itemWidth / 2}
                                            y={y + itemHeight / 2 + 13}
                                            className="build-preview-area"
                                        >
                                            {item.width.toFixed(2)} × {item.depth.toFixed(2)} m
                                        </text>
                                    )}
                                </>
                            )}
                        </g>
                    );
                })}
                <text x="30" y="35" className="build-preview-caption">
                    {level.values.title || "PLANTA ARQUITECTÓNICA"}
                </text>
                <text x="650" y="348" className="build-preview-north">
                    N ↑
                </text>
            </svg>
        </div>
    );
}

type ItemList = "rooms" | "components";

/** The user completes and confirms what the AI proposed (R13). Nothing is saved before that. */
export function BuildReviewModal({ build, onApplied, onClose }: BuildReviewModalProps) {
    const [levels, setLevels] = useState(() => initialLevels(build.levels));
    const hasProject = Object.keys(build.project).length > 0;
    const hasTerrain = Object.keys(build.terrain).length > 0;
    const [project, setProject] = useState(() => initialFields(build.project));
    const [terrain, setTerrain] = useState(() => initialFields(build.terrain));
    const [previewIndex, setPreviewIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const missing = countMissing(
        levels,
        hasProject ? project : undefined,
        hasTerrain ? terrain : undefined,
    );
    const form = useRef<HTMLFormElement>(null);
    const errorLine = useRef<HTMLParagraphElement>(null);

    function updateLevel(index: number, change: (level: LevelForm) => LevelForm) {
        setLevels((current) => current.map((level, at) => (at === index ? change(level) : level)));
    }

    function setValue<T extends ItemForm>(form: T, name: string, value: string): T {
        return { ...form, values: { ...form.values, [name]: value } };
    }

    function updateItem(level: number, list: ItemList, item: number, name: string, value: string) {
        updateLevel(level, (current) => ({
            ...current,
            [list]: current[list].map((form, at) =>
                at === item ? setValue(form, name, value) : form,
            ),
        }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const sent = toApply(
            levels,
            hasProject ? project : undefined,
            hasTerrain ? terrain : undefined,
        );

        if ("error" in sent) {
            setError(sent.error);
            // The error is shown at the top; the first empty field takes the focus.
            requestAnimationFrame(() => {
                const field = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');

                if (field) {
                    field.focus();
                } else {
                    errorLine.current?.scrollIntoView({ block: "nearest" });
                }
            });
            return;
        }

        setSaving(true);
        setError(null);

        try {
            onApplied(await buildsApi.apply(build.id, sent.data));
        } catch (reason) {
            setError(errorMessage(reason));
            setSaving(false);
        }
    }

    function renderField(form: ItemForm, field: BuildField, onChange: (value: string) => void) {
        const value = form.values[field.name] ?? "";
        const read = form.read[field.name];
        const empty = field.required && value.trim() === "";

        return (
            <div key={field.name} className="build-field">
                {field.kind === "kind" ? (
                    <label className="field">
                        {field.label}
                        <select
                            value={value}
                            aria-invalid={empty || undefined}
                            onChange={(event) => onChange(event.target.value)}
                        >
                            <option value="">Elige un tipo</option>
                            {COMPONENT_KINDS.map((kind) => (
                                <option key={kind.value} value={kind.value}>
                                    {kind.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : (
                    <TextField
                        label={field.label}
                        value={value}
                        max={field.max ?? 20}
                        numeric={field.kind !== "text"}
                        invalid={empty}
                        onChange={onChange}
                    />
                )}
                {read ? (
                    <p className="review-source">
                        <span
                            className={
                                read.confidence >= SURE_CONFIDENCE
                                    ? "badge badge-source-ai"
                                    : "badge badge-priority-medium"
                            }
                        >
                            {read.origin === "existing"
                                ? "Dato guardado"
                                : read.origin === "ai_generated"
                                  ? "Calculado por IA"
                                  : read.origin === "document"
                                    ? "Del documento"
                                    : read.confidence >= SURE_CONFIDENCE
                                      ? "Rellenado por IA"
                                      : "Revisar"}
                        </span>
                        {read.origin === "existing"
                            ? "Valor actual del proyecto"
                            : read.source === "ai_generated"
                              ? "Distribución calculada"
                              : read.source === "document"
                                ? "Dato interpretado del documento"
                                : read.source}
                    </p>
                ) : (
                    empty && <p className="build-missing">Falta este dato</p>
                )}
            </div>
        );
    }

    function renderItems(levelIndex: number, level: LevelForm, list: ItemList) {
        const fields = list === "rooms" ? ROOM_FIELDS : COMPONENT_FIELDS;
        const noun = list === "rooms" ? "Ambiente" : "Elemento estructural";

        return (
            <div className="build-items">
                {level[list].map((item, itemIndex) => (
                    <div
                        key={item.key}
                        className="build-item"
                        role="group"
                        aria-label={`${noun} ${itemIndex + 1}`}
                    >
                        {fields.map((field) =>
                            renderField(item, field, (value) =>
                                updateItem(levelIndex, list, itemIndex, field.name, value),
                            ),
                        )}
                        <button
                            type="button"
                            onClick={() =>
                                updateLevel(levelIndex, (current) => ({
                                    ...current,
                                    [list]: current[list].filter((_, at) => at !== itemIndex),
                                }))
                            }
                            className="button-secondary build-remove"
                            aria-label={`Quitar ${noun.toLowerCase()} ${itemIndex + 1}`}
                            title={`Quitar ${noun.toLowerCase()}`}
                        >
                            <Icon name="trash" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                        updateLevel(levelIndex, (current) => ({
                            ...current,
                            [list]: [...current[list], emptyItem()],
                        }))
                    }
                >
                    {list === "rooms" ? "Agregar ambiente" : "Agregar elemento estructural"}
                </button>
            </div>
        );
    }

    return (
        <Dialog
            title="Revisar el proyecto que propone la IA"
            size="large"
            busy={saving}
            onClose={onClose}
        >
            <form ref={form} className="dialog-content build-review" onSubmit={handleSubmit}>
                <p className="dialog-text">
                    Todavía no se guardó nada. Revisa los datos del proyecto, el terreno y la
                    distribución; las medidas y coordenadas calculadas son editables antes de
                    confirmar.
                </p>
                {build.fallback && (
                    <p className="message" role="status">
                        Distribución creada por el diseñador paramétrico local.
                    </p>
                )}
                {build.truncated && (
                    <p className="message" role="status">
                        La propuesta era muy grande y se recortó: revisa que no falte nada.
                    </p>
                )}
                {missing > 0 && (
                    <p className="build-status" role="status">
                        <span className="badge badge-priority-medium">
                            {missing === 1 ? "Falta 1 dato" : `Faltan ${missing} datos`}
                        </span>
                    </p>
                )}
                {error && (
                    <p ref={errorLine} className="message message-error" role="alert">
                        {error}
                    </p>
                )}
                {hasProject && (
                    <fieldset className="review-section">
                        <legend>Proyecto</legend>
                        <div className="build-item">
                            {PROJECT_FIELDS.map((field) =>
                                renderField(project, field, (value) =>
                                    setProject((current) => setValue(current, field.name, value)),
                                ),
                            )}
                        </div>
                    </fieldset>
                )}
                {hasTerrain && (
                    <fieldset className="review-section">
                        <legend>Terreno</legend>
                        <div className="build-item">
                            {TERRAIN_FIELDS.map((field) =>
                                renderField(terrain, field, (value) =>
                                    setTerrain((current) => setValue(current, field.name, value)),
                                ),
                            )}
                        </div>
                    </fieldset>
                )}
                {build.recommendations.length > 0 && (
                    <section className="review-section" aria-label="Recomendaciones técnicas">
                        <h3>Recomendaciones técnicas</h3>
                        <ul>
                            {build.recommendations.map((recommendation, index) => (
                                <li key={`${recommendation.category}-${index}`}>
                                    <span
                                        className={`badge badge-priority-${recommendation.priority}`}
                                    >
                                        {recommendation.priority}
                                    </span>{" "}
                                    {recommendation.content}
                                </li>
                            ))}
                        </ul>
                        <p className="dialog-text">
                            Son orientativas; valida el diseño y la normativa con profesionales
                            locales antes de construir.
                        </p>
                    </section>
                )}
                {levels.length > 0 && (
                    <section className="build-layout-preview" aria-label="Vista previa del diseño">
                        <div className="build-preview-heading">
                            <div>
                                <span className="eyebrow">DISTRIBUCIÓN AUTOMÁTICA</span>
                                <h3>Vista previa de planta</h3>
                            </div>
                            {levels.length > 1 && (
                                <div
                                    className="build-preview-levels"
                                    aria-label="Nivel de vista previa"
                                >
                                    {levels.map((level, index) => (
                                        <button
                                            key={level.key}
                                            type="button"
                                            aria-pressed={previewIndex === index}
                                            onClick={() => setPreviewIndex(index)}
                                        >
                                            {level.values.title || `Nivel ${index + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <LayoutPreview level={levels[previewIndex] ?? levels[0]} />
                    </section>
                )}
                {levels.map((level, levelIndex) => (
                    <fieldset key={level.key} className="review-section build-level">
                        <legend>Nivel {levelIndex + 1}</legend>
                        <div className="build-item">
                            {LEVEL_FIELDS.map((field) =>
                                renderField(level, field, (value) =>
                                    updateLevel(levelIndex, (current) =>
                                        setValue(current, field.name, value),
                                    ),
                                ),
                            )}
                            <button
                                type="button"
                                className="button-secondary build-remove"
                                aria-label={`Quitar nivel ${levelIndex + 1}`}
                                title="Quitar nivel"
                                disabled={levels.length === 1}
                                onClick={() =>
                                    setLevels((current) =>
                                        current.filter((_, at) => at !== levelIndex),
                                    )
                                }
                            >
                                <Icon name="trash" />
                            </button>
                        </div>
                        <h3 className="build-heading">Ambientes</h3>
                        {renderItems(levelIndex, level, "rooms")}
                        <h3 className="build-heading">Elementos estructurales</h3>
                        {renderItems(levelIndex, level, "components")}
                    </fieldset>
                ))}
                <div className="dialog-buttons">
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving}>
                        {saving ? "Creando…" : "Aplicar proyecto, terreno y planos"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
