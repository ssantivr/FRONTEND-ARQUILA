import { useState, type FormEvent } from "react";

import type { Project, ProjectUpdate } from "../types/api";
import { optionalText } from "../utils/format";
import { LiveForm } from "./ui/LiveForm";

interface ProjectEditFormProps {
    project: Project;
    onSave: (data: ProjectUpdate) => void;
    onCancel: () => void;
}

export function ProjectEditForm({ project, onSave, onCancel }: ProjectEditFormProps) {
    const [name, setName] = useState(project.name);
    const [location, setLocation] = useState(project.location ?? "");
    const [description, setDescription] = useState(project.description ?? "");
    // Only an API that sends the progress can store it (contract of 20 October).
    const [progress, setProgress] = useState(
        project.progress === undefined ? null : String(project.progress),
    );
    const progressValue = progress === null || progress === "" ? null : Number(progress);
    const progressWrong =
        progressValue !== null &&
        (!Number.isInteger(progressValue) || progressValue < 0 || progressValue > 100);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        onSave({
            name: name.trim(),
            location: optionalText(location) ?? null,
            description: optionalText(description) ?? null,
            ...(progressValue === null ? {} : { progress: progressValue }),
        });
    }

    return (
        <LiveForm className="form-row" onSubmit={handleSubmit}>
            <label>
                Nombre
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={160}
                    required
                />
            </label>
            <label>
                Ubicación
                <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    maxLength={255}
                />
            </label>
            <label className="field-wide">
                Descripción
                <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                />
            </label>
            {progress !== null && (
                <label>
                    Avance (%)
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={progress}
                        aria-invalid={progressWrong || undefined}
                        aria-describedby={progressWrong ? "project-progress-error" : undefined}
                        onChange={(event) => setProgress(event.target.value)}
                    />
                    {progressWrong && (
                        <span id="project-progress-error" className="message-error">
                            Un número entero de 0 a 100.
                        </span>
                    )}
                </label>
            )}
            <button type="submit" disabled={name.trim() === "" || progressWrong}>
                Guardar cambios
            </button>
            <button type="button" className="button-secondary" onClick={onCancel}>
                Cancelar
            </button>
        </LiveForm>
    );
}
