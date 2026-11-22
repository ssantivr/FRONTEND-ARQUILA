import { useState, type FormEvent } from "react";

import { errorMessage, useAsync } from "../../hooks/useAsync";
import { filesApi, projectsApi } from "../../services/api";
import { extractionsApi } from "../../services/extractions";
import { optionalText } from "../../utils/format";
import { LocationField } from "../location/LocationField";
import type { Place } from "../location/place";
import { Dialog } from "../modal/Dialog";
import { TextField } from "../TextField";

interface CreateProjectDialogProps {
    onCreated: (projectId: number) => void;
    onClose: () => void;
}

/** AI first (R13): a project starts from a document, and by hand when there is no reader. */
export function CreateProjectDialog({ onCreated, onClose }: CreateProjectDialogProps) {
    const status = useAsync(() => extractionsApi.status(), []);
    const [manual, setManual] = useState(false);
    const [name, setName] = useState("");
    const [place, setPlace] = useState<Place>({ label: "", position: null });
    const [file, setFile] = useState<File | null>(null);
    const [consent, setConsent] = useState(false);
    const [created, setCreated] = useState<number | null>(null);
    const [step, setStep] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reader = status.data?.available ? status.data : null;
    const withAI = reader !== null && !manual;
    const ready =
        name.trim() !== "" && (!withAI || (file !== null && (!reader.external || consent)));

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);

        try {
            let id = created;

            if (id === null) {
                setStep("Creando el proyecto…");

                const project = await projectsApi.create({
                    name: name.trim(),
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

            if (withAI && file) {
                setStep("La IA está armando el proyecto con tu documento…");

                const stored = await filesApi.upload(id, file);
                const result = await extractionsApi.create(id, stored.id, consent);

                if (result.status === "failed") {
                    setError("El proyecto se creó, pero la IA no pudo leer datos del documento.");
                    return;
                }
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
                {status.loading && <p className="message">Consultando la IA…</p>}
                {!status.loading && !reader && (
                    <p className="message" role="status">
                        La IA no está configurada en este servidor. Crea el proyecto a mano.
                    </p>
                )}
                {reader && (
                    <div className="segmented">
                        <button
                            type="button"
                            className="button-secondary"
                            aria-pressed={!manual}
                            onClick={() => setManual(false)}
                        >
                            Con IA (recomendado)
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
                )}
                <TextField label="Nombre" value={name} onChange={setName} max={160} required />
                <LocationField value={place} onChange={setPlace} />
                {withAI && (
                    <label className="document-drop">
                        Documento del que la IA saca descripción, terreno y plano
                        <input
                            type="file"
                            accept={reader.mime_types.join(",")}
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        />
                    </label>
                )}
                {withAI && reader.external && (
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                        />
                        Acepto enviar el documento a un servicio externo de IA
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
                        {withAI ? "Crear con IA" : "Crear proyecto"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
