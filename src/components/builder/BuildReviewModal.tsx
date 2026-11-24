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
    ROOM_FIELDS,
    countMissing,
    emptyItem,
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

type ItemList = "rooms" | "components";

/** The user completes and confirms what the AI proposed (R13). Nothing is saved before that. */
export function BuildReviewModal({ build, onApplied, onClose }: BuildReviewModalProps) {
    const [levels, setLevels] = useState(() => initialLevels(build.levels));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const missing = countMissing(levels);
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

        const sent = toApply(levels);

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
                            {read.confidence >= SURE_CONFIDENCE ? "Rellenado por IA" : "Revisar"}
                        </span>
                        {read.source}
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
                    Todavía no se guardó nada. La IA solo copia lo que dice el texto: las medidas y
                    posiciones que no aparecen quedan vacías para que las completes.
                </p>
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
                        {saving ? "Creando…" : "Crear niveles, ambientes y elementos"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
