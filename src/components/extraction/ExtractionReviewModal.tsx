import { useState, type FormEvent } from "react";

import { errorMessage } from "../../hooks/useAsync";
import { extractionsApi } from "../../services/extractions";
import type { Extraction, ProposalSection } from "../../types/extraction";
import { MAX_TEXT_LENGTH } from "../../utils/limits";
import { Dialog } from "../modal/Dialog";
import { TextField } from "../TextField";
import { REVIEW_SECTIONS, SURE_CONFIDENCE, buildApply, initialValues } from "./reviewFields";

interface ExtractionReviewModalProps {
    extraction: Extraction;
    onApplied: () => void;
    onClose: () => void;
}

export function ExtractionReviewModal({
    extraction,
    onApplied,
    onClose,
}: ExtractionReviewModalProps) {
    const [values, setValues] = useState(() => initialValues(extraction.proposal));
    const [included, setIncluded] = useState(
        () => new Set(Object.keys(extraction.proposal) as ProposalSection[]),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggle(section: ProposalSection) {
        setIncluded((current) => {
            const next = new Set(current);

            if (!next.delete(section)) {
                next.add(section);
            }

            return next;
        });
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const built = buildApply(values, included);

        if ("error" in built) {
            setError(built.error);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await extractionsApi.apply(extraction.id, built.data);
            onApplied();
        } catch (reason) {
            setError(errorMessage(reason));
            setSaving(false);
        }
    }

    return (
        <Dialog title="Revisar lo que leyó la IA" size="large" busy={saving} onClose={onClose}>
            <form className="dialog-content" onSubmit={handleSubmit}>
                <p className="dialog-text">
                    Todavía no se guardó nada. Corrige lo que haga falta: lo que el documento no
                    dice queda vacío.
                </p>
                {REVIEW_SECTIONS.map((section) => (
                    <fieldset key={section.id} className="review-section">
                        <legend>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={included.has(section.id)}
                                    onChange={() => toggle(section.id)}
                                />
                                {section.title}
                            </label>
                        </legend>
                        {included.has(section.id) &&
                            section.fields.map((field) => {
                                const key = `${section.id}.${field.name}`;
                                const read = extraction.proposal[section.id]?.[field.name];

                                return (
                                    <div key={key} className="review-field">
                                        <TextField
                                            label={field.label}
                                            value={values[key] ?? ""}
                                            max={
                                                field.numeric ? 20 : (field.max ?? MAX_TEXT_LENGTH)
                                            }
                                            onChange={(value) =>
                                                setValues((current) => ({
                                                    ...current,
                                                    [key]: value,
                                                }))
                                            }
                                        />
                                        {read && (
                                            <p className="review-source">
                                                <span
                                                    className={
                                                        read.confidence >= SURE_CONFIDENCE
                                                            ? "badge badge-source-ai"
                                                            : "badge badge-priority-medium"
                                                    }
                                                >
                                                    {read.confidence >= SURE_CONFIDENCE
                                                        ? "Rellenado por IA"
                                                        : "Revisar"}
                                                </span>
                                                {read.source}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                    </fieldset>
                ))}
                {error && (
                    <p className="message message-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="dialog-buttons">
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving || included.size === 0}>
                        {saving ? "Guardando…" : "Guardar datos"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
