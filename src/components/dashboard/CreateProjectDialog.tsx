import { useEffect, useState, type FormEvent } from "react";

import { errorMessage, useAsync } from "../../hooks/useAsync";
import { filesApi, projectsApi } from "../../services/api";
import { buildsApi } from "../../services/builds";
import { extractionsApi } from "../../services/extractions";
import type { Build } from "../../types/build";
import { optionalText } from "../../utils/format";
import { BuildReviewModal } from "../builder/BuildReviewModal";
import { MAX_DESCRIPTION_LENGTH } from "../builder/buildSummary";
import { LocationField } from "../location/LocationField";
import type { Place } from "../location/place";
import { Dialog } from "../modal/Dialog";
import { TextField } from "../TextField";

interface CreateProjectDialogProps {
    onCreated: (projectId: number, openModel?: boolean) => void;
    onClose: () => void;
}

/**
 * AI first (R13): a project starts from a document, a description or both, and by hand when there
 * is no reader. The document fills project, terrain and plan; the description proposes levels,
 * rooms and structure, which the user completes and confirms.
 */
export function CreateProjectDialog({ onCreated, onClose }: CreateProjectDialogProps) {
    const status = useAsync(() => extractionsApi.status(), []);
    const [manual, setManual] = useState(false);
    const [name, setName] = useState("");
    const [place, setPlace] = useState<Place>({ label: "", position: null });
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const [documentFileId, setDocumentFileId] = useState<number | null>(null);
    const [reviewing, setReviewing] = useState<Build | null>(null);
    const [consent, setConsent] = useState(false);
    const [created, setCreated] = useState<number | null>(null);
    const [step, setStep] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reader = status.data?.available ? status.data : null;
    const withAI = !manual;
    const described = description.trim();
    const ready = withAI
        ? !status.loading &&
          !status.error &&
          (file !== null || described !== "") &&
          (!reader?.external || consent)
        : name.trim() !== "";

    useEffect(() => {
        if (!status.loading && !status.error && status.data?.available === false) {
            setManual(true);
        }
    }, [status.data?.available, status.error, status.loading]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);

        try {
            const problems: string[] = [];
            let id = created;

            if (id === null) {
                setStep("Creando el proyecto…");

                const project = await projectsApi.create({
                    name: name.trim() || "Proyecto desde IA",
                    location: optionalText(place.label),
                    ...(place.position && {
                        latitude: place.position.latitude,
                        longitude: place.position.longitude,
                        location_zoom: place.position.zoom,
                    }),
                });

                id = project.id;
                setCreated(id);
            }

            let sourceFileId = documentFileId;

            if (withAI && reader && file && sourceFileId === null) {
                setStep("La IA está armando el proyecto con tu documento…");

                const stored = await filesApi.upload(id, file);
                sourceFileId = stored.id;
                setDocumentFileId(stored.id);
                const result = await extractionsApi.create(id, stored.id, consent);

                if (result.status === "failed") {
                    problems.push("la IA no pudo leer datos del documento");
                }
            }

            if (withAI && (described !== "" || sourceFileId !== null)) {
                setStep("Diseñando la distribución completa del proyecto…");

                const source = {
                    ...(described !== "" && { description: described }),
                    ...(sourceFileId !== null && { file_id: sourceFileId }),
                };
                const build = await buildsApi.create(id, source, consent);

                if (build.status === "review") {
                    setReviewing(build);
                    return;
                }

                problems.push("la IA no encontró niveles ni ambientes en la descripción");
            }

            if (problems.length > 0) {
                setError(
                    `El proyecto se creó, pero ${problems.join(" y ")}. Puedes completarlo a mano en el proyecto.`,
                );
                return;
            }

            onCreated(id);
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setStep(null);
        }
    }

    return (
        <Dialog title="Crear proyecto" size="large" busy={step !== null} onClose={onClose}>
            <form className="dialog-content" onSubmit={handleSubmit}>
                {status.loading && <p className="message">Preparando el generador…</p>}
                {status.error && (
                    <p className="message message-error" role="alert">
                        No se pudo consultar la disponibilidad del generador: {status.error}
                    </p>
                )}
                {!status.loading && !status.error && !reader && (
                    <p className="message" role="status">
                        La IA externa no está configurada en este servidor. Puedes probar el
                        diseñador paramétrico local o crear el proyecto a mano.
                    </p>
                )}
                <div className="segmented">
                    <button
                        type="button"
                        className="button-secondary"
                        aria-pressed={!manual}
                        onClick={() => setManual(false)}
                    >
                        {reader ? "Diseño con IA" : "Diseño paramétrico local"}
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        aria-pressed={manual}
                        onClick={() => setManual(true)}
                    >
                        A mano
                    </button>
                </div>
                <TextField
                    label={withAI ? "Nombre del proyecto (opcional con diseño asistido)" : "Nombre"}
                    value={name}
                    onChange={setName}
                    max={160}
                    required={!withAI}
                />
                <LocationField value={place} onChange={setPlace} />
                {withAI && (
                    <label className="document-drop">
                        {reader
                            ? "Adjunta un plano o escribe una descripción; puedes combinar ambos"
                            : "Los documentos requieren un proveedor de lectura configurado"}
                        <input
                            type="file"
                            accept={reader?.mime_types.join(",") ?? ""}
                            disabled={!reader || status.loading || Boolean(status.error)}
                            onChange={(event) => {
                                setFile(event.target.files?.[0] ?? null);
                                setDocumentFileId(null);
                            }}
                        />
                    </label>
                )}
                {withAI && (
                    <TextField
                        label="Describe el proyecto, los espacios y las necesidades"
                        value={description}
                        onChange={setDescription}
                        max={MAX_DESCRIPTION_LENGTH}
                        multiline
                    />
                )}
                {withAI && reader?.external && (
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                        />
                        Acepto enviar el documento y la descripción a un servicio externo de IA
                    </label>
                )}
                {step && (
                    <p className="message" role="status">
                        {step}
                    </p>
                )}
                {error && (
                    <p className="message message-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="dialog-buttons">
                    {created !== null && error && (
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => onCreated(created)}
                        >
                            Abrir el proyecto
                        </button>
                    )}
                    <button type="submit" disabled={!ready || step !== null || status.loading}>
                        {withAI ? "Generar proyecto y planos completos con IA" : "Crear proyecto"}
                    </button>
                </div>
            </form>
            {reviewing && created !== null && (
                <BuildReviewModal
                    build={reviewing}
                    onApplied={() => onCreated(created, true)}
                    onClose={() => onCreated(created)}
                />
            )}
        </Dialog>
    );
}
