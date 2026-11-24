import { useState, type FormEvent } from "react";

import { errorMessage } from "../hooks/useAsync";
import type { Project, ProjectUpdate } from "../types/api";
import { optionalText } from "../utils/format";
import { LocationField } from "./location/LocationField";
import { positionOf, type Place } from "./location/place";
import { Dialog } from "./modal/Dialog";
import { useModal } from "./modal/modalContext";
import { TextField } from "./TextField";

interface ProjectEditFormProps {
    project: Project;
    onSave: (data: ProjectUpdate) => Promise<void>;
    onCancel: () => void;
}

export function ProjectEditForm({ project, onSave, onCancel }: ProjectEditFormProps) {
    const modal = useModal();
    const [name, setName] = useState(project.name);
    const [place, setPlace] = useState<Place>(() => ({
        label: project.location ?? "",
        position: positionOf(project),
    }));
    const [description, setDescription] = useState(project.description ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only what changed is sent: an old text over the limit does not block another change.
    function changes(): ProjectUpdate {
        const data: ProjectUpdate = {};
        const location = optionalText(place.label) ?? null;
        const about = optionalText(description) ?? null;
        const before = positionOf(project);
        const after = place.position;

        if (name.trim() !== project.name) {
            data.name = name.trim();
        }

        if (location !== (project.location ?? null)) {
            data.location = location;
        }

        if (about !== (project.description ?? null)) {
            data.description = about;
        }

        if (
            before?.latitude !== after?.latitude ||
            before?.longitude !== after?.longitude ||
            before?.zoom !== after?.zoom
        ) {
            data.latitude = after?.latitude ?? null;
            data.longitude = after?.longitude ?? null;
            data.location_zoom = after?.zoom ?? null;
        }

        return data;
    }

    const data = changes();
    const changed = [
        data.name !== undefined && "nombre",
        data.location !== undefined && "lugar",
        data.latitude !== undefined && "posición en el mapa",
        data.description !== undefined && "descripción",
    ].filter(Boolean);

    async function close() {
        if (changed.length > 0) {
            const discard = await modal.confirm({
                title: "Descartar los cambios",
                body: "Hay cambios sin guardar. ¿Cerrar sin guardarlos?",
                confirmLabel: "Descartar",
            });

            if (!discard) {
                return;
            }
        }

        onCancel();
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await onSave(data);
        } catch (reason) {
            setError(errorMessage(reason));
            setSaving(false);
        }
    }

    return (
        <Dialog title="Editar proyecto" size="large" busy={saving} onClose={close}>
            <form className="dialog-content" onSubmit={handleSubmit}>
                <TextField label="Nombre" value={name} onChange={setName} max={160} required />
                <LocationField value={place} onChange={setPlace} />
                <TextField
                    label="Descripción"
                    value={description}
                    onChange={setDescription}
                    multiline
                />
                <p className="message" role="status">
                    {changed.length > 0
                        ? `Se actualizará: ${changed.join(", ")}.`
                        : "Todavía no hay cambios."}
                </p>
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
                        onClick={close}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving || name.trim() === "" || changed.length === 0}
                    >
                        {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
