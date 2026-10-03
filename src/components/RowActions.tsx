interface RowActionsProps {
    label: string;
    onEdit: () => void;
    onDelete: () => void;
}

export function RowActions({ label, onEdit, onDelete }: RowActionsProps) {
    return (
        <div className="row-actions">
            <button
                type="button"
                className="button-secondary"
                aria-label={`Editar ${label}`}
                onClick={onEdit}
            >
                Editar
            </button>
            <button
                type="button"
                className="button-danger"
                aria-label={`Eliminar ${label}`}
                onClick={onDelete}
            >
                Eliminar
            </button>
        </div>
    );
}

interface FormActionsProps {
    editing: boolean;
    addLabel: string;
    disabled?: boolean;
    onCancel: () => void;
}

export function FormActions({ editing, addLabel, disabled, onCancel }: FormActionsProps) {
    return (
        <>
            <button type="submit" disabled={disabled}>
                {editing ? "Guardar cambios" : addLabel}
            </button>
            {editing && (
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Cancelar
                </button>
            )}
        </>
    );
}
