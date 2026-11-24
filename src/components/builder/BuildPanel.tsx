import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { errorMessage, useAsync } from "../../hooks/useAsync";
import { filesApi } from "../../services/api";
import { buildsApi } from "../../services/builds";
import { extractionsApi } from "../../services/extractions";
import type { Build, BuildSource } from "../../types/build";
import { Icon } from "../Icon";
import { useModal } from "../modal/modalContext";
import { Panel } from "../Panel";
import { TextField } from "../TextField";
import { BuildReviewModal } from "./BuildReviewModal";
import {
    MAX_DESCRIPTION_LENGTH,
    askConsent,
    megabytes,
    offerUndo,
    summarizeBuild,
} from "./buildSummary";

interface BuildPanelProps {
    projectId: number;
    /** The data changed: reload what is on screen. */
    onChanged: () => void;
    onOpenModel?: () => void;
}

/** AI first (R13): the AI proposes levels, rooms and structure; the user completes and confirms. */
export function BuildPanel({ projectId, onChanged, onOpenModel }: BuildPanelProps) {
    const modal = useModal();
    const availability = useAsync(() => extractionsApi.status(), []);
    const history = useAsync(() => buildsApi.listByProject(projectId), [projectId]);
    const input = useRef<HTMLInputElement>(null);
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<Build | null>(null);

    const status = availability.data;

    async function propose(label: string, source: () => Promise<BuildSource>) {
        setError(null);

        if (status?.external && !(await askConsent(modal))) {
            return;
        }

        setStep(label);

        try {
            const build = await buildsApi.create(
                projectId,
                await source(),
                status?.external ?? false,
            );

            history.reload();

            if (build.status === "review") {
                setReviewing(build);
            } else {
                setError(
                    "La IA no encontró niveles, ambientes ni elementos que copiar. Puedes crearlos a mano en Planos y en Modelo 3D.",
                );
            }
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setStep(null);
        }
    }

    async function handleDescribe(event: FormEvent) {
        event.preventDefault();
        await propose("Diseñando la distribución del proyecto…", async () => {
            const source: BuildSource = {};
            const prompt = description.trim();

            if (prompt !== "") {
                source.description = prompt;
            }

            if (file) {
                source.file_id = (await filesApi.upload(projectId, file)).id;
            }

            return source;
        });
    }

    function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0];

        if (input.current) {
            input.current.value = "";
        }

        if (!selected) {
            return;
        }

        if (status && !status.mime_types.includes(selected.type)) {
            setError("Ese tipo de archivo no se puede leer. Sube un PDF, PNG o JPG.");
            return;
        }

        if (status && selected.size > status.max_bytes) {
            setError(
                `El documento pesa más de ${megabytes(status.max_bytes)} MB, el máximo para leerlo con IA. Sube uno más liviano.`,
            );
            return;
        }

        setError(null);
        setFile(selected);
    }

    async function undo(build: Build) {
        const done = await modal.confirm({
            title: "Deshacer lo que creó la IA",
            body: "Se revertirán los datos del proyecto, el terreno, los niveles, ambientes y recomendaciones creados o modificados por esta propuesta, siempre que no se hayan editado después.",
            impact: summarizeBuild(build),
            confirmLabel: "Quitar lo creado",
            action: () => buildsApi.undo(build.id),
        });

        if (done) {
            history.reload();
            onChanged();
        }
    }

    const items = (history.data ?? []).filter(
        (item) => item.status === "review" || item.status === "applied",
    );

    return (
        <Panel title="Diseñar el proyecto">
            {availability.error ? (
                <p className="message message-error" role="alert">
                    No se pudo consultar la disponibilidad del generador: {availability.error}
                </p>
            ) : status && !status.available ? (
                <p className="message" role="status">
                    Sin proveedor externo, se usará el diseñador paramétrico local. Los documentos
                    de referencia requieren un lector de IA configurado.
                </p>
            ) : status?.external ? (
                <p className="message" role="status">
                    El prompt o documento se enviará al proveedor externo solo después de tu
                    confirmación.
                </p>
            ) : null}
            <form className="build-describe build-workbench" onSubmit={handleDescribe}>
                <TextField
                    label="Cuéntanos qué quieres construir"
                    value={description}
                    onChange={setDescription}
                    max={MAX_DESCRIPTION_LENGTH}
                    multiline
                />
                <span className="build-prompt-hint">
                    Incluye el tipo de proyecto, dimensiones del lote, niveles y espacios que
                    necesitas. Hasta {MAX_DESCRIPTION_LENGTH.toLocaleString("es")} caracteres.
                </span>
                <button
                    type="submit"
                    disabled={
                        step !== null ||
                        availability.loading ||
                        Boolean(availability.error) ||
                        (!description.trim() && file === null)
                    }
                >
                    <Icon name="sparkles" />
                    Generar proyecto y planos completos con IA
                </button>
            </form>
            {status?.available && (
                <label className="document-drop build-drop">
                    <span className="build-drop-title">
                        <Icon name="upload" />
                        {file ? "Cambiar documento de referencia" : "Adjuntar plano de referencia"}
                    </span>
                    <span className="build-drop-hint">
                        PDF, PNG o JPG, hasta {megabytes(status.max_bytes)} MB. Puedes combinarlo
                        con el prompt.
                    </span>
                    <input
                        ref={input}
                        type="file"
                        accept={status.mime_types.join(",")}
                        disabled={step !== null}
                        onChange={handleFile}
                    />
                </label>
            )}
            {file && (
                <div className="build-file-selection">
                    <span>{file.name}</span>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={step !== null}
                        onClick={() => setFile(null)}
                    >
                        Quitar archivo
                    </button>
                </div>
            )}
            {step && (
                <p className="message build-step" role="status">
                    <span className="build-spinner" aria-hidden="true" />
                    {step}
                </p>
            )}
            {error && (
                <p className="message message-error" role="alert">
                    {error}
                </p>
            )}
            {items.length > 0 && (
                <ul className="extraction-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <span
                                className={
                                    item.status === "applied"
                                        ? "badge badge-source-ai"
                                        : "badge badge-priority-medium"
                                }
                            >
                                {item.status === "applied" ? "Creado por IA" : "Por revisar"}
                            </span>
                            <span>{summarizeBuild(item).join(" · ")}</span>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() =>
                                    item.status === "applied" ? undo(item) : setReviewing(item)
                                }
                            >
                                {item.status === "applied" ? "Deshacer" : "Revisar"}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {reviewing && (
                <BuildReviewModal
                    key={reviewing.id}
                    build={reviewing}
                    onClose={() => setReviewing(null)}
                    onApplied={async (applied) => {
                        setReviewing(null);
                        setDescription("");
                        setFile(null);
                        history.reload();
                        onChanged();
                        onOpenModel?.();

                        if (await offerUndo(modal, applied)) {
                            history.reload();
                            onChanged();
                        }
                    }}
                />
            )}
        </Panel>
    );
}
