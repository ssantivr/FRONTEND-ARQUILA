import { useState, type FormEvent } from "react";

import type { Project, ProjectUpdate } from "../types/api";
import { optionalText } from "../utils/format";

interface ProjectEditFormProps {
    project: Project;
    onSave: (data: ProjectUpdate) => void;
    onCancel: () => void;
}

export function ProjectEditForm({ project, onSave, onCancel }: ProjectEditFormProps) {
    const [name, setName] = useState(project.name);
    const [location, setLocation] = useState(project.location ?? "");
    const [description, setDescription] = useState(project.description ?? "");

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        onSave({
            name: name.trim(),
            location: optionalText(location) ?? null,
            description: optionalText(description) ?? null,
        });
    }

    return (
        <form className="form-row" onSubmit={handleSubmit}>
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
            <button type="submit" disabled={name.trim() === ""}>
                Guardar cambios
            </button>
            <button type="button" className="button-secondary" onClick={onCancel}>
                Cancelar
            </button>
        </form>
    );
}
