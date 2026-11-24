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
}

/** AI first (R13): the AI proposes levels, rooms and structure; the user completes and confirms. */
export function BuildPanel({ projectId, onChanged }: BuildPanelProps) {
    const modal = useModal();
    const availability = useAsync(() => extractionsApi.status(), []);
    const history = useAsync(() => buildsApi.listByProject(projectId), [projectId]);
    const input = useRef<HTMLInputElement>(null);
    const [description, setDescription] = useState("");
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
        await propose("La IA está armando la propuesta…", async () => ({
            description: description.trim(),
        }));
    }

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (input.current) {
            input.current.value = "";
        }

        if (!file) {
            return;
        }

        if (status && !status.mime_types.includes(file.type)) {
            setError("Ese tipo de archivo no se puede leer. Sube un PDF o PNG.");
            return;
        }

        if (status && file.size > status.max_bytes) {
            setError(
                `El documento pesa más de ${megabytes(status.max_bytes)} MB, el máximo para leerlo con IA. Sube uno más liviano.`,
            );
            return;
        }

        await propose("La IA está leyendo el documento…", async () => ({
            file_id: (await filesApi.upload(projectId, file)).id,
        }));
    }

    async function undo(build: Build) {
        const done = await modal.confirm({
            title: "Deshacer lo que creó la IA",
            body: "Se quitarán los niveles, ambientes y elementos creados con esta propuesta.",
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
        <Panel title="Armar el proyecto con IA">
            {(availability.error || (status && !status.available)) && (
                <p className="message" role="status">
                    La IA no está disponible en este servidor. Crea los niveles, ambientes y
                    elementos a mano.
                </p>
            )}
            {status?.available && (
                <>
                    <form className="build-describe" onSubmit={handleDescribe}>
                        <TextField
                            label="Describe el proyecto: niveles, ambientes y medidas"
                            value={description}
                            onChange={setDescription}
                            max={MAX_DESCRIPTION_LENGTH}
                            multiline
                        />
                        <button type="submit" disabled={step !== null || !description.trim()}>
                            <Icon name="sparkles" />
                            Proponer con IA
                        </button>
                    </form>
                    <label className="document-drop build-drop">
                        <span className="build-drop-title">
                            <Icon name="upload" />O sube un PDF o PNG
                        </span>
                        <span className="build-drop-hint">
                            La IA propone niveles, ambientes y elementos estructurales. Hasta{" "}
                            {megabytes(status.max_bytes)} MB.
                        </span>
                        <input
                            ref={input}
                            type="file"
                            accept={status.mime_types.join(",")}
                            disabled={step !== null}
                            onChange={handleFile}
                        />
                    </label>
                </>
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
                        history.reload();
                        onChanged();

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
