import { useId, useState } from "react";

import { useEditState } from "../modal/editState";
import { LocationPickerModal } from "./LocationPickerModal";
import type { Place, Position } from "./place";

interface LocationFieldProps {
    value: Place;
    onChange: (place: Place) => void;
    near?: Position | null;
    withLabel?: boolean;
}

/** Opens the map in a dialog instead of asking for a text (R06). */
export function LocationField({ value, onChange, near, withLabel = true }: LocationFieldProps) {
    const id = useId();
    const edit = useEditState();
    const [open, setOpen] = useState(false);
    const { label, position } = value;

    return (
        <div className="field">
            <span id={id} className="field-label">
                Ubicación
            </span>
            <button
                type="button"
                className="button-secondary location-button"
                aria-labelledby={`${id} ${id}-value`}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
            >
                <span id={`${id}-value`}>
                    {(withLabel && label) ||
                        (position ? "Marcada en el mapa" : "Elegir en el mapa")}
                </span>
            </button>
            {position && (
                <span className="coordinates">
                    {position.latitude}, {position.longitude}
                </span>
            )}
            {open && (
                <LocationPickerModal
                    value={value}
                    near={near}
                    withLabel={withLabel}
                    onSave={(next) => {
                        edit?.noteChange("Ubicación");
                        onChange(next);
                    }}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}
