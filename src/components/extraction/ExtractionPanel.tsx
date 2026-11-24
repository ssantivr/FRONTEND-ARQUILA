import { useRef, useState, type ChangeEvent } from "react";

import { errorMessage, useAsync } from "../../hooks/useAsync";
import { filesApi } from "../../services/api";
import { extractionsApi } from "../../services/extractions";
import type { Extraction } from "../../types/extraction";
import { useModal } from "../modal/modalContext";
import { Panel } from "../Panel";
import { ExtractionReviewModal } from "./ExtractionReviewModal";
import { REVIEW_SECTIONS } from "./reviewFields";

const DOCUMENT_TYPES = ["application/pdf", "image/png"];

interface ExtractionPanelProps {
    projectId: number;
    /** The data changed: reload what is on screen. */
    onChanged: () => void;
}

export function ExtractionPanel({ projectId, onChanged }: ExtractionPanelProps) {
    const modal = useModal();
    const availability = useAsync(() => extractionsApi.status(), []);
    const history = useAsync(() => extractionsApi.listByProject(projectId), [projectId]);
    const input = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<Extraction | null>(null);

    const status = availability.data;
    const accepted = DOCUMENT_TYPES.filter((type) => status?.mime_types.includes(type));

    function refresh() {
        history.reload();
        onChanged();
    }

    async function undo(extraction: Extraction) {
        const done = await modal.confirm({
            title: "Deshacer lo que llenó la IA",
            body: "Se quitará lo que se llenó con este documento. El archivo se conserva.",
            impact: summarize(extraction),
            confirmLabel: "Deshacer",
            action: () => extractionsApi.undo(extraction.id),
        });

        if (done) {
            refresh();
        }
    }

    async function read(file: File) {
        setError(null);
        let consent = false;

        if (!accepted.includes(file.type)) {
            setError(
                accepted.includes("application/pdf")
                    ? "Elige un archivo PDF o PNG."
                    : "Este lector solo admite imágenes PNG.",
            );
            return;
        }

        if (status && file.size > status.max_bytes) {
            setError("El documento supera el límite de 4,3 MB para leerlo con IA.");
            return;
        }

        if (status?.external) {
            const agreed = await modal.confirm({
                title: "Enviar el documento a la IA",
                body: "Para leerlo, el documento se envía a un servicio externo de inteligencia artificial.",
                impact: [
                    "No subas documentos con datos personales que no puedas compartir.",
                    "Lo que se llene solo se puede deshacer.",
                ],
                confirmLabel: "Enviar y leer",
            });

            if (!agreed) {
                return;
            }

            consent = true;
        }

        try {
            setStep("Subiendo el documento…");
            const stored = await filesApi.upload(projectId, file);

            setStep("La IA está leyendo el documento…");
            const extraction = await extractionsApi.create(projectId, stored.id, consent);

            setStep(null);

            if (extraction.status === "failed") {
                setError(
                    "La IA no pudo leer datos de este documento. El archivo quedó guardado y puedes llenar el formulario a mano.",
                );
                refresh();
            } else if (extraction.status === "review") {
                history.reload();
                setReviewing(extraction);
            } else {
                refresh();

                const undone = await modal.result({
                    title: "Datos llenados por la IA",
                    body: (
                        <ul className="dialog-impact">
                            {summarize(extraction).map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    ),
                    actionLabel: "Deshacer",
                    action: () => extractionsApi.undo(extraction.id),
                });

                if (undone) {
                    refresh();
                }
            }
        } catch (reason) {
            setError(errorMessage(reason));
            // The file may already be stored.
            refresh();
        } finally {
            setStep(null);
        }
    }

    async function handleSelect(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (file) {
            await read(file);
        }

        if (input.current) {
            input.current.value = "";
        }
    }

    const items = (history.data ?? []).filter(
        (item) => item.status === "review" || item.status === "applied",
    );

    return (
        <Panel title="Llenar con un documento">
            {availability.error && (
                <p className="message" role="status">
                    La lectura con IA no está disponible. Puedes llenar los formularios a mano.
                </p>
            )}
            {status && !status.available && (
                <p className="message" role="status">
                    La lectura con IA todavía no está configurada en este servidor. Puedes llenar
                    los formularios a mano.
                </p>
            )}
            {status?.available && (
                <label className="document-drop">
                    {accepted.includes("application/pdf")
                        ? "Sube un PDF o PNG y la IA llena el terreno y el plano"
                        : "Sube una imagen PNG y la IA llena el terreno y el plano"}
                    <input
                        ref={input}
                        type="file"
                        accept={accepted.join(",")}
                        disabled={step !== null}
                        onChange={handleSelect}
                    />
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
                                {item.status === "applied" ? "Rellenado por IA" : "Revisar"}
                            </span>
                            <span>{summarize(item).join(" · ")}</span>
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
                <ExtractionReviewModal
                    key={reviewing.id}
                    extraction={reviewing}
                    onClose={() => setReviewing(null)}
                    onApplied={() => {
                        setReviewing(null);
                        refresh();
                    }}
                />
            )}
        </Panel>
    );
}

function summarize(extraction: Extraction): string[] {
    const lines = REVIEW_SECTIONS.flatMap((section) => {
        const fields = extraction.proposal[section.id];

        if (!fields) {
            return [];
        }

        const main = fields.name ?? fields.title ?? fields.location ?? fields.description;

        return [main ? `${section.title}: ${main.value}` : section.title];
    });

    return lines.length > 0 ? lines : ["Datos del documento"];
}
